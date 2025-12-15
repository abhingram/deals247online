import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { NotificationService } from '../services/notifications/notificationService.js';

const router = express.Router();

// Helper function to execute database queries with retry logic
const executeQueryWithRetry = async (query, params, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await db.query(query, params);
    } catch (error) {
      console.error(`Database query attempt ${i + 1} failed:`, error.message);

      // If it's the last retry, throw the error
      if (i === retries) {
        throw error;
      }

      // For connection errors, wait before retrying
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`Retrying database query in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }
};

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let whereClause = 'user_id = ?';
    let params = [userId];

    if (unread_only === 'true') {
      whereClause += ' AND read_at IS NULL';
    }

    const [notifications] = await executeQueryWithRetry(`
      SELECT
        id,
        type,
        title,
        message,
        data,
        read_at,
        created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count for pagination
    const [countResult] = await executeQueryWithRetry(`
      SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}
    `, params);

    res.json({
      notifications,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const notificationId = req.params.id;

    const [result] = await executeQueryWithRetry(`
      UPDATE notifications
      SET read_at = NOW()
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `, [notificationId, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found or already read' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    await executeQueryWithRetry(`
      UPDATE notifications
      SET read_at = NOW()
      WHERE user_id = ? AND read_at IS NULL
    `, [userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    const [preferences] = await executeQueryWithRetry(`
      SELECT * FROM notification_preferences WHERE user_id = ?
    `, [userId]);

    if (preferences.length === 0) {
      // Return default preferences
      const defaultPrefs = {
        deal_expiring: true,
        deal_expired: false,
        new_deal: true,
        price_drop: true,
        system: true,
        email_enabled: true,
        push_enabled: true
      };
      res.json(defaultPrefs);
    } else {
      res.json(preferences[0]);
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const {
      deal_expiring,
      deal_expired,
      new_deal,
      price_drop,
      system,
      email_enabled,
      push_enabled
    } = req.body;

    await executeQueryWithRetry(`
      INSERT INTO notification_preferences (
        user_id,
        deal_expiring,
        deal_expired,
        new_deal,
        price_drop,
        system,
        email_enabled,
        push_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        deal_expiring = VALUES(deal_expiring),
        deal_expired = VALUES(deal_expired),
        new_deal = VALUES(new_deal),
        price_drop = VALUES(price_drop),
        system = VALUES(system),
        email_enabled = VALUES(email_enabled),
        push_enabled = VALUES(push_enabled)
    `, [
      userId,
      deal_expiring ?? true,
      deal_expired ?? false,
      new_deal ?? true,
      price_drop ?? true,
      system ?? true,
      email_enabled ?? true,
      push_enabled ?? true
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Create notification (internal use - for system notifications)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    // Only allow system/admin to create notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [result] = await executeQueryWithRetry(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, type, title, message, JSON.stringify(data || {})]);

    res.json({ success: true, notificationId: result.insertId });
  } catch (error) {
    console.error('Error creating notification:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    const [result] = await executeQueryWithRetry(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND read_at IS NULL
    `, [userId]);

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ===== PHASE 4: SMART NOTIFICATIONS ENDPOINTS =====

// Get personalized notifications for user
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const notificationService = new NotificationService();

    const notifications = await notificationService.createPersonalizedNotifications(userId);

    await notificationService.disconnect();

    res.json({
      user_id: userId,
      personalized_notifications: notifications
    });
  } catch (error) {
    console.error('Error getting personalized notifications:', error);
    res.status(500).json({ error: 'Failed to get personalized notifications' });
  }
});

// Get expiring deal notifications
router.get('/expiring-deals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { hours = 24 } = req.query;

    const notificationService = new NotificationService();

    const notifications = await notificationService.createExpiringDealNotifications(userId, parseInt(hours));

    await notificationService.disconnect();

    res.json({
      user_id: userId,
      expiring_deals: notifications,
      time_window_hours: hours
    });
  } catch (error) {
    console.error('Error getting expiring deal notifications:', error);
    res.status(500).json({ error: 'Failed to get expiring deal notifications' });
  }
});

// Update user notification preferences (enhanced for Phase 4)
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const {
      email_enabled,
      push_enabled,
      deal_categories,
      price_range_min,
      price_range_max,
      discount_threshold,
      favorite_stores
    } = req.body;

    await executeQueryWithRetry(`
      INSERT INTO notification_preferences
        (user_id, email_enabled, push_enabled, deal_categories, price_range_min, price_range_max, discount_threshold, favorite_stores, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        email_enabled = VALUES(email_enabled),
        push_enabled = VALUES(push_enabled),
        deal_categories = VALUES(deal_categories),
        price_range_min = VALUES(price_range_min),
        price_range_max = VALUES(price_range_max),
        discount_threshold = VALUES(discount_threshold),
        favorite_stores = VALUES(favorite_stores),
        updated_at = NOW()
    `, [
      userId,
      email_enabled !== undefined ? email_enabled : true,
      push_enabled !== undefined ? push_enabled : true,
      JSON.stringify(deal_categories || []),
      price_range_min || null,
      price_range_max || null,
      discount_threshold || 0,
      JSON.stringify(favorite_stores || [])
    ]);

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        email_enabled: email_enabled !== undefined ? email_enabled : true,
        push_enabled: push_enabled !== undefined ? push_enabled : true,
        deal_categories: deal_categories || [],
        price_range_min: price_range_min || null,
        price_range_max: price_range_max || null,
        discount_threshold: discount_threshold || 0,
        favorite_stores: favorite_stores || []
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);

    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

export default router;