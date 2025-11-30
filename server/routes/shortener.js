import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// GET /s/:shortCode - Redirect to original URL
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Query database for the short code
    const [rows] = await pool.execute(
      'SELECT long_url, clicks FROM shortened_urls WHERE short_code = ?',
      [shortCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Short URL not found',
        message: 'The shortened URL you are looking for does not exist.'
      });
    }

    const { long_url, clicks } = rows[0];

    // Increment click count
    await pool.execute(
      'UPDATE shortened_urls SET clicks = clicks + 1 WHERE short_code = ?',
      [shortCode]
    );

    // Redirect to the original URL
    res.redirect(302, long_url);
  } catch (error) {
    console.error('Error handling short URL redirect:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while processing your request.'
    });
  }
});

// POST /api/shortener - Create a new shortened URL (admin only)
router.post('/', async (req, res) => {
  try {
    const { longUrl, shortCode } = req.body;

    if (!longUrl) {
      return res.status(400).json({
        error: 'Missing URL',
        message: 'Please provide a URL to shorten.'
      });
    }

    // Basic URL validation
    try {
      new URL(longUrl);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid URL.'
      });
    }

    // Check if short code already exists
    const [existing] = await pool.execute(
      'SELECT id FROM shortened_urls WHERE short_code = ?',
      [shortCode]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Short code exists',
        message: 'This short code is already in use. Please try a different one.'
      });
    }

    // Insert new shortened URL
    const [result] = await pool.execute(
      'INSERT INTO shortened_urls (short_code, long_url, created_by) VALUES (?, ?, ?)',
      [shortCode, longUrl, req.body.createdBy || null]
    );

    const shortUrl = `${req.protocol}://${req.get('host')}/s/${shortCode}`;

    res.json({
      success: true,
      data: {
        id: result.insertId,
        shortCode,
        shortUrl,
        longUrl,
        clicks: 0,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while creating the short URL.'
    });
  }
});

// GET /api/shortener - Get all shortened URLs (admin only)
router.get('/', async (req, res) => {
  try {
    // Query all shortened URLs
    const [rows] = await pool.execute(
      'SELECT id, short_code, long_url, clicks, created_by, created_at FROM shortened_urls ORDER BY created_at DESC'
    );

    // Format the response
    const urls = rows.map(row => ({
      id: row.id,
      shortCode: row.short_code,
      longUrl: row.long_url,
      shortUrl: `${req.protocol}://${req.get('host')}/s/${row.short_code}`,
      clicks: row.clicks,
      createdBy: row.created_by,
      createdAt: row.created_at.toISOString()
    }));

    res.json({
      success: true,
      data: urls
    });
  } catch (error) {
    console.error('Error fetching shortened URLs:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while fetching shortened URLs.'
    });
  }
});

// DELETE /api/shortener/:id - Delete a shortened URL (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM shortened_urls WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Shortened URL not found.'
      });
    }

    res.json({
      success: true,
      message: 'Shortened URL deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting shortened URL:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while deleting the shortened URL.'
    });
  }
});

export default router;