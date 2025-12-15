import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { CacheService } from '../services/cache/cacheService.js';

const router = express.Router();

// ===== CACHE MANAGEMENT ENDPOINTS =====

// Get cache statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const cacheService = new CacheService();

    const stats = await cacheService.getStats();

    await cacheService.disconnect();

    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Clear cache by type
router.delete('/clear/:type', authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { pattern } = req.query;

    const cacheService = new CacheService();

    let clearedCount = 0;

    if (pattern) {
      // Clear cache entries matching pattern
      clearedCount = await cacheService.clearByPattern(pattern);
    } else {
      // Clear all cache entries of specific type
      clearedCount = await cacheService.clearByType(type);
    }

    await cacheService.disconnect();

    res.json({
      message: `Cleared ${clearedCount} cache entries`,
      type: type,
      pattern: pattern || null,
      cleared_count: clearedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Clear all cache
router.delete('/clear-all', authenticateAdmin, async (req, res) => {
  try {
    const cacheService = new CacheService();

    const clearedCount = await cacheService.clearAll();

    await cacheService.disconnect();

    res.json({
      message: `Cleared all ${clearedCount} cache entries`,
      cleared_count: clearedCount
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
    res.status(500).json({ error: 'Failed to clear all cache' });
  }
});

// Get cached item by key
router.get('/item/:key', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = new CacheService();

    const item = await cacheService.get(key);

    await cacheService.disconnect();

    if (item === null) {
      return res.status(404).json({ error: 'Cache item not found' });
    }

    res.json({
      key: key,
      data: item
    });
  } catch (error) {
    console.error('Error getting cached item:', error);
    res.status(500).json({ error: 'Failed to get cached item' });
  }
});

// Set cache item manually
router.post('/item', authenticateAdmin, async (req, res) => {
  try {
    const { key, value, ttl = 3600 } = req.body; // Default 1 hour TTL

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const cacheService = new CacheService();

    await cacheService.set(key, value, ttl);

    await cacheService.disconnect();

    res.json({
      message: 'Cache item set successfully',
      key: key,
      ttl: ttl
    });
  } catch (error) {
    console.error('Error setting cache item:', error);
    res.status(500).json({ error: 'Failed to set cache item' });
  }
});

// Clean up expired cache entries
router.post('/cleanup', authenticateAdmin, async (req, res) => {
  try {
    const cacheService = new CacheService();

    const cleanedCount = await cacheService.cleanupExpired();

    await cacheService.disconnect();

    res.json({
      message: `Cleaned up ${cleanedCount} expired cache entries`,
      cleaned_count: cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    res.status(500).json({ error: 'Failed to cleanup cache' });
  }
});

export default router;