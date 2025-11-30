import express from 'express';
import db from '../database/connection.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Bulk import deals
router.post('/deals/import', authenticateAdmin, async (req, res) => {
  try {
    const { deals, format } = req.body;
    const firebaseUid = req.user.uid;

    if (!Array.isArray(deals) || deals.length === 0) {
      return res.status(400).json({ error: 'Deals array is required and cannot be empty' });
    }

    // Create import log
    const [logResult] = await db.execute(`
      INSERT INTO bulk_import_logs (imported_by, format, total_records, status)
      VALUES (?, ?, ?, 'processing')
    `, [firebaseUid, format || 'json', deals.length]);

    const importLogId = logResult.insertId;

    let successfulImports = 0;
    let failedImports = 0;
    const errors = [];

    // Process each deal
    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i];

      try {
        // Validate required fields
        if (!deal.title || !deal.store || !deal.original_price || !deal.discounted_price) {
          throw new Error('Missing required fields: title, store, original_price, discounted_price');
        }

        // Calculate discount percentage
        const discount = deal.discount || Math.round(((deal.original_price - deal.discounted_price) / deal.original_price) * 100);

        // Insert deal
        await db.execute(`
          INSERT INTO deals (title, store, original_price, discounted_price, discount, rating, reviews, image, category, expires_at, verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          deal.title,
          deal.store,
          deal.original_price,
          deal.discounted_price,
          discount,
          deal.rating || 0,
          deal.reviews || 0,
          deal.image || null,
          deal.category || null,
          deal.expires_at || null,
          deal.verified || 0
        ]);

        successfulImports++;
      } catch (error) {
        failedImports++;
        errors.push({
          row: i + 1,
          deal: deal.title || `Deal ${i + 1}`,
          error: error.message
        });
      }
    }

    // Update import log
    const status = failedImports === 0 ? 'completed' : (successfulImports === 0 ? 'failed' : 'completed');
    await db.execute(`
      UPDATE bulk_import_logs
      SET successful_imports = ?, failed_imports = ?, errors = ?, status = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [successfulImports, failedImports, JSON.stringify(errors), status, importLogId]);

    res.json({
      import_id: importLogId,
      total_records: deals.length,
      successful_imports: successfulImports,
      failed_imports: failedImports,
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Import completed: ${successfulImports} successful, ${failedImports} failed`
    });
  } catch (error) {
    console.error('Error importing deals:', error);
    res.status(500).json({ error: 'Failed to import deals' });
  }
});

// Bulk export deals
router.get('/deals/export', authenticateAdmin, async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      category,
      store,
      verified,
      format = 'json',
      limit = 1000
    } = req.query;

    let query = `
      SELECT
        id, title, store, original_price, discounted_price, discount,
        rating, reviews, image, category, expires_at, verified,
        total_views, total_clicks, total_shares, total_ratings,
        total_reviews, avg_rating, created_at, updated_at
      FROM deals
      WHERE deleted = 0
    `;
    const params = [];

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (store) {
      query += ' AND store = ?';
      params.push(store);
    }

    if (verified !== undefined) {
      query += ' AND verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [deals] = await db.execute(query, params);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Title', 'Store', 'Original Price', 'Discounted Price', 'Discount %',
        'Rating', 'Reviews', 'Image URL', 'Category', 'Expires At', 'Verified',
        'Total Views', 'Total Clicks', 'Total Shares', 'Total Ratings',
        'Total Reviews', 'Average Rating', 'Created At', 'Updated At'
      ];

      const csvRows = deals.map(deal => [
        deal.id,
        `"${deal.title.replace(/"/g, '""')}"`,
        `"${deal.store}"`,
        deal.original_price,
        deal.discounted_price,
        deal.discount,
        deal.rating,
        deal.reviews,
        deal.image || '',
        deal.category || '',
        deal.expires_at || '',
        deal.verified ? 'Yes' : 'No',
        deal.total_views || 0,
        deal.total_clicks || 0,
        deal.total_shares || 0,
        deal.total_ratings || 0,
        deal.total_reviews || 0,
        deal.avg_rating || 0,
        deal.created_at,
        deal.updated_at
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deals_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="deals_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(deals);
    }
  } catch (error) {
    console.error('Error exporting deals:', error);
    res.status(500).json({ error: 'Failed to export deals' });
  }
});

// Get import template
router.get('/deals/template', authenticateAdmin, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const template = {
      title: 'Sample Deal Title',
      store: 'Amazon',
      original_price: 99.99,
      discounted_price: 79.99,
      discount: 20,
      rating: 4.5,
      reviews: 100,
      image: 'https://example.com/image.jpg',
      category: 'Electronics',
      expires_at: '2024-12-31 23:59:59',
      verified: 1
    };

    if (format === 'csv') {
      const csvHeaders = Object.keys(template);
      const csvValues = Object.values(template).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      );

      const csvContent = [csvHeaders, csvValues]
        .map(row => row.join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="deals_import_template.csv"');
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="deals_import_template.json"');
      res.json([template]);
    }
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Get bulk import logs
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const [logs] = await db.execute(`
      SELECT bil.*, u.display_name as imported_by_name
      FROM bulk_import_logs bil
      LEFT JOIN users u ON bil.imported_by = u.firebase_uid
      ORDER BY bil.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching import logs:', error);
    res.status(500).json({ error: 'Failed to fetch import logs' });
  }
});

export default router;