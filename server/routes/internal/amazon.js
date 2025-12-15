import express from 'express';
import { amazonIngestor } from '../../services/amazon/amazonIngestor.js';
import { amazonRefresher } from '../../services/amazon/amazonRefresher.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/internal/amazon/stats
 * Get Amazon integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const ingestorStats = await amazonIngestor.getStats();
    const refresherStats = await amazonRefresher.getStats();

    res.json({
      success: true,
      data: {
        ingestor: ingestorStats,
        refresher: refresherStats
      }
    });

  } catch (error) {
    console.error('Error getting Amazon stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * POST /api/internal/amazon/ingest
 * Trigger product ingestion for categories
 */
router.post('/ingest', async (req, res) => {
  try {
    const { categories, keywords, maxItems = 100 } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: 'Categories array is required'
      });
    }

    const results = {};

    for (const category of categories) {
      try {
        const categoryResults = await amazonIngestor.ingestCategory(
          category,
          keywords || [],
          maxItems
        );
        results[category] = {
          success: true,
          products: categoryResults.length
        };
      } catch (error) {
        console.error(`Error ingesting category ${category}:`, error);
        results[category] = {
          success: false,
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error triggering ingestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger ingestion'
    });
  }
});

/**
 * POST /api/internal/amazon/refresh
 * Trigger price refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { category } = req.body;

    let results;

    if (category) {
      results = await amazonRefresher.refreshCategory(category);
    } else {
      results = await amazonRefresher.refreshAllPrices();
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error triggering refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger refresh'
    });
  }
});

/**
 * POST /api/internal/amazon/cleanup
 * Clean up expired deals
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await amazonRefresher.cleanupExpiredDeals();

    res.json({
      success: true,
      data: {
        cleaned_deals: cleanedCount
      }
    });

  } catch (error) {
    console.error('Error cleaning up deals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup deals'
    });
  }
});

/**
 * GET /api/internal/amazon/products
 * Get products with optional filtering
 */
router.get('/products', async (req, res) => {
  try {
    const { category, store, limit = 50, offset = 0, active_only = true } = req.query;

    let query = `
      SELECT
        p.*,
        ph.price as last_price_change,
        ph.created_at as last_price_change_date
      FROM products p
      LEFT JOIN price_history ph ON p.id = ph.product_id
      AND ph.id = (
        SELECT MAX(id) FROM price_history WHERE product_id = p.id
      )
    `;

    const params = [];
    const conditions = [];

    if (active_only === 'true') {
      conditions.push('p.is_active = 1');
    }

    if (category) {
      conditions.push('p.category = ?');
      params.push(category);
    }

    if (store) {
      conditions.push('p.store = ?');
      params.push(store);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [products] = await req.db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM products p';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [countResult] = await req.db.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + products.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get products'
    });
  }
});

/**
 * GET /api/internal/amazon/deals
 * Get Amazon-generated deals
 */
router.get('/deals', async (req, res) => {
  try {
    const { limit = 50, offset = 0, active_only = true } = req.query;

    let query = `
      SELECT
        d.*,
        p.title as product_title,
        p.image_url as product_image,
        p.external_product_id
      FROM deals d
      JOIN products p ON d.product_id = p.id
      WHERE d.store = 'amazon'
    `;

    const params = [];

    if (active_only === 'true') {
      query += ' AND d.is_active = 1';
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [deals] = await req.db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM deals d WHERE d.store = \'amazon\'';
    if (active_only === 'true') {
      countQuery += ' AND d.is_active = 1';
    }

    const [countResult] = await req.db.query(countQuery);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        deals,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + deals.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error getting Amazon deals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deals'
    });
  }
});

/**
 * GET /api/internal/amazon/price-history/:productId
 * Get price history for a product
 */
router.get('/price-history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 100 } = req.query;

    const [history] = await req.db.query(
      `SELECT * FROM price_history
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [productId, parseInt(limit)]
    );

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price history'
    });
  }
});

/**
 * POST /api/internal/amazon/test-connection
 * Test Amazon API connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    // Simple test search
    const testParams = {
      Keywords: 'test',
      ItemCount: 1,
      SearchIndex: 'All'
    };

    const response = await amazonClient.searchItems(testParams);

    res.json({
      success: true,
      data: {
        connection: 'successful',
        response_items: response.Items ? response.Items.length : 0
      }
    });

  } catch (error) {
    console.error('Amazon API connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

export default router;