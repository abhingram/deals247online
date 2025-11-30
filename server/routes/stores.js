import express from 'express';
import db from '../database/connection.js';

const router = express.Router();

// Get all stores with deal counts
router.get('/', async (req, res) => {
  try {
    const [stores] = await db.query(`
      SELECT s.*, COUNT(d.id) as deal_count 
      FROM stores s 
      LEFT JOIN deals d ON s.name = d.store 
      GROUP BY s.id
    `);
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get single store
router.get('/:id', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    
    if (stores.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    res.json(stores[0]);
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

export default router;
