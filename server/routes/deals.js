import express from 'express';
import db from '../database/connection.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all deals with advanced filters and sorting
router.get('/', async (req, res) => {
  try {
    const {
      category,
      store,
      minPrice,
      maxPrice,
      minDiscount,
      maxDiscount,
      minRating,
      verified,
      search,
      sortBy = 'newest',
      limit = 12,
      offset = 0,
      hasComments
    } = req.query;

    let query = `
      SELECT *,
             CASE
               WHEN expires_at IS NOT NULL AND expires_at > NOW()
               THEN TIMESTAMPDIFF(HOUR, NOW(), expires_at)
               ELSE NULL
             END as hours_until_expiry
      FROM deals
      WHERE deleted = 0
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM deals WHERE deleted = 0';
    const params = [];
    const countParams = [];

    // Search functionality
    if (search) {
      const searchCondition = ' AND (title LIKE ? OR store LIKE ? OR category LIKE ?)';
      query += searchCondition;
      countQuery += searchCondition;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    if (store) {
      query += ' AND store = ?';
      countQuery += ' AND store = ?';
      params.push(store);
      countParams.push(store);
    }

    if (minPrice) {
      query += ' AND discounted_price >= ?';
      countQuery += ' AND discounted_price >= ?';
      params.push(parseFloat(minPrice));
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND discounted_price <= ?';
      countQuery += ' AND discounted_price <= ?';
      params.push(parseFloat(maxPrice));
      countParams.push(parseFloat(maxPrice));
    }

    if (minDiscount) {
      query += ' AND discount >= ?';
      countQuery += ' AND discount >= ?';
      params.push(parseInt(minDiscount));
      countParams.push(parseInt(minDiscount));
    }

    if (maxDiscount) {
      query += ' AND discount <= ?';
      countQuery += ' AND discount <= ?';
      params.push(parseInt(maxDiscount));
      countParams.push(parseInt(maxDiscount));
    }

    if (minRating) {
      query += ' AND rating >= ?';
      countQuery += ' AND rating >= ?';
      params.push(parseFloat(minRating));
      countParams.push(parseFloat(minRating));
    }

    if (verified === 'true') {
      query += ' AND verified = 1';
      countQuery += ' AND verified = 1';
    }

    if (hasComments === 'true') {
      query += ' AND total_reviews > 0';
      countQuery += ' AND total_reviews > 0';
    }

    // Advanced sorting options
    let orderBy = 'created_at DESC'; // default: newest
    switch (sortBy) {
      case 'newest':
        orderBy = 'created_at DESC';
        break;
      case 'ending_soon':
        orderBy = 'expires_at ASC NULLS LAST';
        break;
      case 'highest_rated':
        orderBy = 'rating DESC, reviews DESC';
        break;
      case 'most_popular':
      case 'most_viewed':
        orderBy = 'total_views DESC, total_clicks DESC';
        break;
      case 'lowest_price':
        orderBy = 'discounted_price ASC';
        break;
      case 'highest_discount':
      case 'discount_desc':
        orderBy = 'discount DESC';
        break;
      case 'best_value':
        orderBy = '(original_price - discounted_price) DESC';
        break;
      case 'most_commented':
        orderBy = 'total_reviews DESC';
        break;
    }

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [deals] = await db.query(query, params);

    // Get total count for pagination with same filters
    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      deals,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get single deal by ID
router.get('/:id', async (req, res) => {
  try {
    const [deals] = await db.query('SELECT * FROM deals WHERE id = ? AND deleted = 0', [req.params.id]);
    
    if (deals.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(deals[0]);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const {
      title,
      store,
      original_price,
      discounted_price,
      discount,
      rating,
      reviews,
      image,
      category,
      expires_at,
      verified
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO deals (title, store, original_price, discounted_price, discount, 
       rating, reviews, image, category, expires_at, verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, store, original_price, discounted_price, discount, rating, reviews, 
       image, category, expires_at, verified || 0]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Deal created successfully' 
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await db.query(`UPDATE deals SET ${fields} WHERE id = ?`, values);
    
    res.json({ message: 'Deal updated successfully' });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Soft delete deal (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE deals SET deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// Get deleted deals (Admin only)
router.get('/admin/deleted', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const [deals] = await db.query(
      'SELECT * FROM deals WHERE deleted = 1 ORDER BY deleted_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query('SELECT COUNT(*) as total FROM deals WHERE deleted = 1');
    
    res.json({
      deals,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching deleted deals:', error);
    res.status(500).json({ error: 'Failed to fetch deleted deals' });
  }
});

// Restore deal (Admin only)
router.post('/:id/restore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE deals SET deleted = 0, deleted_at = NULL WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Deal restored successfully' });
  } catch (error) {
    console.error('Error restoring deal:', error);
    res.status(500).json({ error: 'Failed to restore deal' });
  }
});

// Record deal view (when user views a deal)
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check if deal exists and is not deleted
    const [deals] = await db.query('SELECT id FROM deals WHERE id = ? AND deleted = 0', [id]);
    if (deals.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Record the view (use INSERT IGNORE to avoid duplicates for same user/deal in same session)
    await db.query(
      'INSERT INTO deal_views (user_id, deal_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE viewed_at = NOW()',
      [userId, id]
    );

    res.json({ message: 'Deal view recorded' });
  } catch (error) {
    console.error('Error recording deal view:', error);
    res.status(500).json({ error: 'Failed to record deal view' });
  }
});

// Get user's deal history
router.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const [views] = await db.query(
      `SELECT dv.*, d.title, d.store, d.original_price, d.discounted_price, d.discount,
              d.image, d.category, d.rating, d.reviews, d.expires_at, d.verified
       FROM deal_views dv
       JOIN deals d ON dv.deal_id = d.id
       WHERE dv.user_id = ? AND d.deleted = 0
       ORDER BY dv.viewed_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM deal_views dv
       JOIN deals d ON dv.deal_id = d.id
       WHERE dv.user_id = ? AND d.deleted = 0`,
      [userId]
    );

    res.json({
      history: views,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching deal history:', error);
    res.status(500).json({ error: 'Failed to fetch deal history' });
  }
});

export default router;
