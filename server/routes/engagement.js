import express from 'express';
import db from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Record deal click
router.post('/deal/:dealId/click', async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.uid || null;
    const { ip_address, user_agent, referrer } = req.body;

    // Record click
    await db.query(`
      INSERT INTO deal_clicks (user_id, deal_id, ip_address, user_agent, referrer)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, dealId, ip_address || req.ip, user_agent || req.get('User-Agent'), referrer || req.get('Referer')]);

    // Update deal click count
    await db.query(
      'UPDATE deals SET total_clicks = total_clicks + 1, last_clicked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [dealId]
    );

    // Update user click count if logged in
    if (userId) {
      await db.query(
        'UPDATE users SET total_clicks = total_clicks + 1, last_activity = CURRENT_TIMESTAMP WHERE firebase_uid = ?',
        [userId]
      );
    }

    res.json({ message: 'Click recorded successfully' });
  } catch (error) {
    console.error('Error recording click:', error);
    res.status(500).json({ error: 'Failed to record click' });
  }
});

// Record deal share
router.post('/deal/:dealId/share', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { platform } = req.body;
    const userId = req.user.uid;
    const ipAddress = req.ip;

    const validPlatforms = ['facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'email', 'copy_link'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Record share
    await db.query(`
      INSERT INTO deal_shares (user_id, deal_id, platform, ip_address)
      VALUES (?, ?, ?, ?)
    `, [userId, dealId, platform, ipAddress]);

    // Update deal share count
    await db.query(
      'UPDATE deals SET total_shares = total_shares + 1 WHERE id = ?',
      [dealId]
    );

    res.json({ message: 'Share recorded successfully' });
  } catch (error) {
    console.error('Error recording share:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// Get deal sharing stats
router.get('/deal/:dealId/shares', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;

    const [shares] = await db.query(`
      SELECT
        platform,
        COUNT(*) as count,
        MAX(shared_at) as last_shared
      FROM deal_shares
      WHERE deal_id = ?
      GROUP BY platform
      ORDER BY count DESC
    `, [dealId]);

    res.json(shares);
  } catch (error) {
    console.error('Error fetching share stats:', error);
    res.status(500).json({ error: 'Failed to fetch share statistics' });
  }
});

// Get notifications for user
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'user_id = ?';
    let params = [userId];

    if (unreadOnly === 'true') {
      whereClause += ' AND read_at IS NULL';
    }

    const [notifications] = await db.query(`
      SELECT * FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [total] = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`,
      params
    );

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.uid;

    const [result] = await db.query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    await db.query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Create notification (admin/internal use)
router.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    // Only admins can create notifications for others
    if (req.user.role !== 'admin' && req.user.uid !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [result] = await db.query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, type, title, message, JSON.stringify(data || {})]);

    res.status(201).json({
      message: 'Notification created successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Delete notification
router.delete('/notifications/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.uid;

    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread notification count' });
  }
});

export default router;