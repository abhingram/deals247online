import express from 'express';
import db from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // Check for firebase_uid in query params, body, or headers (prioritize query params for GET requests)
    const firebase_uid = req.query.firebase_uid || req.body?.firebase_uid || req.headers['firebase-uid'];

    if (!firebase_uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await db.query(
      'SELECT role FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create or update user profile
router.post('/profile', async (req, res) => {
  try {
    const { firebase_uid, email, display_name, photo_url } = req.body;

    if (!firebase_uid || !email) {
      return res.status(400).json({ error: 'Firebase UID and email are required' });
    }

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id, role FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (existingUsers.length > 0) {
      // Update existing user
      await db.query(
        'UPDATE users SET email = ?, display_name = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = ?',
        [email, display_name, photo_url, firebase_uid]
      );

      res.json({
        id: existingUsers[0].id,
        role: existingUsers[0].role,
        message: 'Profile updated successfully'
      });
    } else {
      // Create new user (default role is 'user')
      const [result] = await db.query(
        'INSERT INTO users (firebase_uid, email, display_name, photo_url) VALUES (?, ?, ?, ?)',
        [firebase_uid, email, display_name, photo_url]
      );

      res.status(201).json({
        id: result.insertId,
        role: 'user',
        message: 'Profile created successfully'
      });
    }
  } catch (error) {
    console.error('Profile creation/update error:', error);
    res.status(500).json({ error: 'Failed to create/update profile' });
  }
});

// Get user profile and role
router.get('/profile/:firebase_uid', async (req, res) => {
  try {
    const { firebase_uid } = req.params;

    const [users] = await db.query(
      'SELECT id, firebase_uid, email, display_name, photo_url, role, created_at FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get all users (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, firebase_uid, email, display_name, photo_url, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user role (Admin only)
router.put('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    await db.query(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, id]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting admin users
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user profile (authenticated)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { displayName, email } = req.body;

    // Validate input
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Update user profile in database
    await db.query(
      'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = ?',
      [displayName.trim(), userId]
    );

    // Note: Email updates require Firebase re-authentication and are handled on the frontend
    // We don't update email here to avoid authentication issues

    res.json({
      message: 'Profile updated successfully',
      displayName: displayName.trim()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password for email/password accounts (placeholder - requires Firebase Admin SDK)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { currentPassword, newPassword } = req.body;

    // This would require Firebase Admin SDK for server-side password changes
    // For now, return a message that password changes should be done through Firebase Auth

    res.json({
      message: 'Password change request received. Please use Firebase Authentication for password changes.',
      note: 'Client-side password changes are recommended for security.'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;