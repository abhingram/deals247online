import express from 'express';
import db from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get sponsored deals for display
router.get('/deals', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    let query = `
      SELECT sd.*, d.title, d.store, d.original_price, d.discounted_price,
             d.discount, d.image, d.category, d.expires_at, d.verified
      FROM sponsored_deals sd
      JOIN deals d ON sd.deal_id = d.id
      WHERE sd.status = 'active'
      AND sd.start_date <= CURRENT_TIMESTAMP
      AND sd.end_date >= CURRENT_TIMESTAMP
      AND sd.budget > sd.spent
    `;
    const params = [];

    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }

    query += ' ORDER BY sd.sponsored_priority DESC, sd.cpc DESC LIMIT ?';
    params.push(parseInt(limit));

    const [sponsoredDeals] = await db.query(query, params);

    // Mark as sponsored in response
    const deals = sponsoredDeals.map(deal => ({
      ...deal,
      isSponsored: true,
      sponsoredBy: deal.advertiser_name
    }));

    res.json(deals);
  } catch (error) {
    console.error('Error fetching sponsored deals:', error);
    res.status(500).json({ error: 'Failed to fetch sponsored deals' });
  }
});

// Track sponsored deal impression
router.post('/impression/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.firebase_uid || null;
    const { ip_address, user_agent, referrer } = req.body;

    // Update impression count
    await db.query(
      'UPDATE sponsored_deals SET impressions = impressions + 1 WHERE deal_id = ? AND status = "active"',
      [dealId]
    );

    // Log impression for analytics
    await db.query(`
      INSERT INTO deal_clicks (user_id, deal_id, clicked_at, ip_address, user_agent, referrer)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'sponsored_impression')
    `, [userId, dealId, req.ip || ip_address, req.get('User-Agent') || user_agent, referrer]);

    res.json({ message: 'Impression tracked successfully' });
  } catch (error) {
    console.error('Error tracking impression:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

// Track sponsored deal click
router.post('/click/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.firebase_uid || null;
    const { ip_address, user_agent, referrer } = req.body;

    // Update click count and calculate cost
    const [sponsoredDeal] = await db.query(
      'SELECT id, cpc FROM sponsored_deals WHERE deal_id = ? AND status = "active"',
      [dealId]
    );

    if (sponsoredDeal.length > 0) {
      const cost = sponsoredDeal[0].cpc;
      await db.query(
        'UPDATE sponsored_deals SET clicks = clicks + 1, spent = spent + ? WHERE deal_id = ?',
        [cost, dealId]
      );
    }

    // Log click for analytics
    await db.query(`
      INSERT INTO deal_clicks (user_id, deal_id, clicked_at, ip_address, user_agent, referrer)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'sponsored_click')
    `, [userId, dealId, req.ip || ip_address, req.get('User-Agent') || user_agent, referrer]);

    res.json({ message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Track sponsored deal conversion
router.post('/conversion/:dealId', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.firebase_uid;
    const { order_value, order_id } = req.body;

    // Update conversion count and calculate revenue
    const [sponsoredDeal] = await db.query(
      'SELECT id, cpm, cpc FROM sponsored_deals WHERE deal_id = ? AND status = "active"',
      [dealId]
    );

    if (sponsoredDeal.length > 0) {
      // For conversions, we might use a different pricing model (e.g., percentage of order value)
      // For now, using a simple CPA (cost per acquisition) model
      const conversionCost = order_value * 0.05; // 5% of order value
      await db.query(
        'UPDATE sponsored_deals SET conversions = conversions + 1, spent = spent + ? WHERE deal_id = ?',
        [conversionCost, dealId]
      );

      // Log conversion
      await db.query(`
        INSERT INTO affiliate_commissions (
          user_id, deal_id, order_id, commission_amount, order_value,
          status, transaction_date, notes
        ) VALUES (?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP, 'Sponsored deal conversion')
      `, [userId, dealId, order_id, conversionCost, order_value]);
    }

    res.json({ message: 'Conversion tracked successfully' });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Create sponsored deal campaign (Admin/Admins only)
router.post('/campaigns', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      dealId,
      advertiserName,
      advertiserEmail,
      budget,
      cpc,
      cpm,
      startDate,
      endDate,
      targetingRules
    } = req.body;

    // Validate required fields
    if (!dealId || !advertiserName || !budget || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if deal exists
    const [deals] = await db.query('SELECT id FROM deals WHERE id = ?', [dealId]);
    if (deals.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Create sponsored deal campaign
    const [result] = await db.query(`
      INSERT INTO sponsored_deals (
        deal_id, advertiser_name, advertiser_email, budget, cpc, cpm,
        start_date, end_date, targeting_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dealId,
      advertiserName,
      advertiserEmail,
      budget,
      cpc || 0.50, // default ₹0.50 per click
      cpm || 5.00, // default ₹5.00 per 1000 impressions
      startDate,
      endDate,
      JSON.stringify(targetingRules || {})
    ]);

    res.status(201).json({
      id: result.insertId,
      message: 'Sponsored deal campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating sponsored deal campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update sponsored deal campaign
router.put('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, budget, cpc, cpm, endDate, targetingRules } = req.body;

    const updateData = { updated_at: new Date() };

    if (status) updateData.status = status;
    if (budget !== undefined) updateData.budget = budget;
    if (cpc !== undefined) updateData.cpc = cpc;
    if (cpm !== undefined) updateData.cpm = cpm;
    if (endDate) updateData.end_date = endDate;
    if (targetingRules) updateData.targeting_rules = JSON.stringify(targetingRules);

    const [result] = await db.query(
      'UPDATE sponsored_deals SET ? WHERE id = ?',
      [updateData, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sponsored deal campaign not found' });
    }

    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Error updating sponsored deal campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Get sponsored deals campaigns (Admin)
router.get('/admin/campaigns', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT sd.*, d.title as deal_title, d.store, d.category
      FROM sponsored_deals sd
      JOIN deals d ON sd.deal_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND sd.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sd.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [campaigns] = await db.query(query, params);

    // Get summary stats
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(budget) as total_budget,
        SUM(spent) as total_spent,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(conversions) as total_conversions,
        AVG(cpc) as avg_cpc,
        AVG(cpm) as avg_cpm
      FROM sponsored_deals
    `);

    res.json({
      campaigns,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching sponsored deals campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get advertising revenue analytics
router.get('/analytics/revenue', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date) {
      dateFilter += ' AND DATE(sd.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      dateFilter += ' AND DATE(sd.created_at) <= ?';
      params.push(end_date);
    }

    // Get daily advertising revenue
    const [dailyRevenue] = await db.query(`
      SELECT
        DATE(sd.created_at) as date,
        SUM(sd.spent) as revenue,
        SUM(sd.impressions) as impressions,
        SUM(sd.clicks) as clicks,
        SUM(sd.conversions) as conversions
      FROM sponsored_deals sd
      WHERE sd.status IN ('active', 'completed') ${dateFilter}
      GROUP BY DATE(sd.created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);

    // Get campaign performance
    const [campaignPerformance] = await db.query(`
      SELECT
        d.title as deal_title,
        sd.advertiser_name,
        sd.spent,
        sd.impressions,
        sd.clicks,
        sd.conversions,
        CASE WHEN sd.impressions > 0 THEN (sd.clicks / sd.impressions) * 100 ELSE 0 END as ctr,
        CASE WHEN sd.clicks > 0 THEN (sd.conversions / sd.clicks) * 100 ELSE 0 END as conversion_rate,
        CASE WHEN sd.impressions > 0 THEN (sd.spent / (sd.impressions / 1000)) ELSE 0 END as cpm_actual,
        CASE WHEN sd.clicks > 0 THEN (sd.spent / sd.clicks) ELSE 0 END as cpc_actual
      FROM sponsored_deals sd
      JOIN deals d ON sd.deal_id = d.id
      WHERE sd.status IN ('active', 'completed') ${dateFilter}
      ORDER BY sd.spent DESC
      LIMIT 20
    `, params);

    res.json({
      dailyRevenue,
      campaignPerformance
    });
  } catch (error) {
    console.error('Error fetching advertising analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;