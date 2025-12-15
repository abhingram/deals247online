import express from 'express';
import db from '../database/connection.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all affiliate links
router.get('/links', authenticateAdmin, async (req, res) => {
  try {
    const [links] = await db.execute(`
      SELECT al.*, u.display_name as created_by_name
      FROM affiliate_links al
      LEFT JOIN users u ON al.created_by = u.firebase_uid
      ORDER BY al.created_at DESC
    `);

    res.json(links);
  } catch (error) {
    console.error('Error fetching affiliate links:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate links' });
  }
});

// Create new affiliate link
router.post('/links', authenticateAdmin, async (req, res) => {
  try {
    const { name, original_url, affiliate_url, commission_rate, commission_type, category, store } = req.body;
    const firebaseUid = req.user.uid;

    const [result] = await db.execute(`
      INSERT INTO affiliate_links (name, original_url, affiliate_url, commission_rate, commission_type, category, store, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, original_url, affiliate_url, commission_rate, commission_type || 'percentage', category, store, firebaseUid]);

    res.status(201).json({
      id: result.insertId,
      message: 'Affiliate link created successfully'
    });
  } catch (error) {
    console.error('Error creating affiliate link:', error);
    res.status(500).json({ error: 'Failed to create affiliate link' });
  }
});

// Update affiliate link
router.put('/links/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, original_url, affiliate_url, commission_rate, commission_type, category, store, is_active } = req.body;

    await db.execute(`
      UPDATE affiliate_links
      SET name = ?, original_url = ?, affiliate_url = ?, commission_rate = ?,
          commission_type = ?, category = ?, store = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, original_url, affiliate_url, commission_rate, commission_type, category, store, is_active, id]);

    res.json({ message: 'Affiliate link updated successfully' });
  } catch (error) {
    console.error('Error updating affiliate link:', error);
    res.status(500).json({ error: 'Failed to update affiliate link' });
  }
});

// Delete affiliate link
router.delete('/links/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute('DELETE FROM affiliate_links WHERE id = ?', [id]);

    res.json({ message: 'Affiliate link deleted successfully' });
  } catch (error) {
    console.error('Error deleting affiliate link:', error);
    res.status(500).json({ error: 'Failed to delete affiliate link' });
  }
});

// Record affiliate click
router.post('/links/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, ip_address, user_agent, referrer } = req.body;

    // Record the click
    const [clickResult] = await db.execute(`
      INSERT INTO affiliate_clicks (affiliate_link_id, user_id, ip_address, user_agent, referrer)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user_id, ip_address, user_agent, referrer]);

    // Update affiliate link click count
    await db.execute(`
      UPDATE affiliate_links
      SET total_clicks = total_clicks + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({
      click_id: clickResult.insertId,
      message: 'Affiliate click recorded successfully'
    });
  } catch (error) {
    console.error('Error recording affiliate click:', error);
    res.status(500).json({ error: 'Failed to record affiliate click' });
  }
});

// Get commission data
router.get('/commissions', authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, status, affiliate_link_id } = req.query;

    let query = `
      SELECT ac.*, al.name as link_name, al.commission_rate, u.display_name as affiliate_name
      FROM affiliate_conversions ac
      JOIN affiliate_links al ON ac.affiliate_link_id = al.id
      LEFT JOIN users u ON ac.user_id = u.firebase_uid
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND ac.created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND ac.created_at <= ?';
      params.push(end_date);
    }

    if (status) {
      query += ' AND ac.status = ?';
      params.push(status);
    }

    if (affiliate_link_id) {
      query += ' AND ac.affiliate_link_id = ?';
      params.push(affiliate_link_id);
    }

    query += ' ORDER BY ac.created_at DESC';

    const [commissions] = await db.execute(query, params);

    // Calculate summary statistics
    const summary = {
      total_commissions: commissions.length,
      pending_amount: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
      approved_amount: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
      paid_amount: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
    };

    res.json({
      commissions,
      summary
    });
  } catch (error) {
    console.error('Error fetching commission data:', error);
    res.status(500).json({ error: 'Failed to fetch commission data' });
  }
});

// Create commission conversion
router.post('/commissions', authenticateAdmin, async (req, res) => {
  try {
    const { affiliate_link_id, affiliate_click_id, user_id, order_id, commission_amount, currency, notes } = req.body;

    const [result] = await db.execute(`
      INSERT INTO affiliate_conversions (affiliate_link_id, affiliate_click_id, user_id, order_id, commission_amount, currency, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [affiliate_link_id, affiliate_click_id, user_id, order_id, commission_amount, currency || 'USD', notes]);

    // Update affiliate link conversion count and total commission
    await db.execute(`
      UPDATE affiliate_links
      SET total_conversions = total_conversions + 1,
          total_commission = total_commission + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [commission_amount, affiliate_link_id]);

    res.status(201).json({
      id: result.insertId,
      message: 'Commission recorded successfully'
    });
  } catch (error) {
    console.error('Error creating commission:', error);
    res.status(500).json({ error: 'Failed to create commission' });
  }
});

// Update commission status
router.put('/commissions/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payout_date } = req.body;

    await db.execute(`
      UPDATE affiliate_conversions
      SET status = ?, payout_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, payout_date, id]);

    res.json({ message: 'Commission status updated successfully' });
  } catch (error) {
    console.error('Error updating commission status:', error);
    res.status(500).json({ error: 'Failed to update commission status' });
  }
});

export default router;