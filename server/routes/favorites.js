import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    const [favorites] = await pool.execute(`
      SELECT d.* FROM deals d
      INNER JOIN user_favorites uf ON d.id = uf.deal_id
      WHERE uf.user_id = ?
      ORDER BY uf.created_at DESC
    `, [userId]);

    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add deal to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.body;
    const userId = req.user.firebase_uid;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    // Check if already favorited
    const [existing] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Deal already in favorites' });
    }

    // Add to favorites
    await pool.execute(
      'INSERT INTO user_favorites (user_id, deal_id, created_at) VALUES (?, ?, NOW())',
      [userId, dealId]
    );

    res.status(201).json({ message: 'Deal added to favorites' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove deal from favorites
router.delete('/:dealId', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.firebase_uid;

    await pool.execute(
      'DELETE FROM user_favorites WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );

    res.json({ message: 'Deal removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Check if deal is favorited
router.get('/:dealId/check', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.firebase_uid;

    const [result] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );

    res.json({ isFavorited: result.length > 0 });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

export default router;