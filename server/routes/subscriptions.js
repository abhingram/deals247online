import express from 'express';
import db from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    const [subscriptions] = await db.query(`
      SELECT * FROM user_subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.json({
        tier: 'free',
        status: 'inactive',
        features: {
          maxFavorites: 50,
          advancedSearch: false,
          earlyAccess: false,
          prioritySupport: false,
          analytics: false
        }
      });
    }

    const subscription = subscriptions[0];
    const features = getSubscriptionFeatures(subscription.tier);

    res.json({
      ...subscription,
      features
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create or update subscription
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { tier, paymentProvider, subscriptionId, customerId, priceId, amount, billingCycle } = req.body;

    // Validate tier
    const validTiers = ['free', 'premium', 'vip'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Check if user already has an active subscription
    const [existing] = await db.query(`
      SELECT id FROM user_subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `, [userId]);

    if (existing.length > 0) {
      // Update existing subscription
      await db.query(`
        UPDATE user_subscriptions
        SET tier = ?, payment_provider = ?, subscription_id = ?, customer_id = ?,
            price_id = ?, amount = ?, billing_cycle = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [tier, paymentProvider, subscriptionId, customerId, priceId, amount, billingCycle, existing[0].id]);
    } else {
      // Create new subscription
      const currentPeriodEnd = new Date();
      if (billingCycle === 'yearly') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      await db.query(`
        INSERT INTO user_subscriptions (
          user_id, tier, status, payment_provider, subscription_id, customer_id,
          price_id, amount, billing_cycle, current_period_start, current_period_end
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `, [userId, tier, paymentProvider, subscriptionId, customerId, priceId, amount, billingCycle, currentPeriodEnd]);
    }

    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;
    const { cancelAtPeriodEnd = true } = req.body;

    const [result] = await db.query(`
      UPDATE user_subscriptions
      SET cancel_at_period_end = ?, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `, [cancelAtPeriodEnd, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.firebase_uid;

    const [result] = await db.query(`
      UPDATE user_subscriptions
      SET cancel_at_period_end = FALSE, cancelled_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `, [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Get subscription plans/features
router.get('/plans', (req, res) => {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      billingCycle: 'monthly',
      features: {
        maxFavorites: 50,
        advancedSearch: false,
        earlyAccess: false,
        prioritySupport: false,
        analytics: false,
        apiAccess: false
      }
    },
    premium: {
      name: 'Premium',
      price: 4.99,
      billingCycle: 'monthly',
      features: {
        maxFavorites: -1, // unlimited
        advancedSearch: true,
        earlyAccess: true,
        prioritySupport: false,
        analytics: true,
        apiAccess: false
      }
    },
    vip: {
      name: 'VIP',
      price: 9.99,
      billingCycle: 'monthly',
      features: {
        maxFavorites: -1, // unlimited
        advancedSearch: true,
        earlyAccess: true,
        prioritySupport: true,
        analytics: true,
        apiAccess: true
      }
    }
  };

  res.json(plans);
});

// Check feature access
router.get('/features/:feature', authenticateToken, async (req, res) => {
  try {
    const { feature } = req.params;
    const userId = req.user.firebase_uid;

    const [subscriptions] = await db.query(`
      SELECT tier FROM user_subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    const tier = subscriptions.length > 0 ? subscriptions[0].tier : 'free';
    const features = getSubscriptionFeatures(tier);

    const hasAccess = features[feature] || false;

    res.json({
      tier,
      feature,
      hasAccess,
      limit: features[feature] === -1 ? 'unlimited' : features[feature]
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

// Admin: Get all subscriptions
router.get('/admin/subscriptions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, tier, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT us.*, u.display_name, u.email
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.firebase_uid
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND us.status = ?';
      params.push(status);
    }

    if (tier) {
      query += ' AND us.tier = ?';
      params.push(tier);
    }

    query += ' ORDER BY us.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [subscriptions] = await db.query(query, params);

    // Get summary stats
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN tier = 'premium' AND status = 'active' THEN 1 ELSE 0 END) as premium_subscriptions,
        SUM(CASE WHEN tier = 'vip' AND status = 'active' THEN 1 ELSE 0 END) as vip_subscriptions,
        SUM(amount) as total_revenue
      FROM user_subscriptions
    `);

    res.json({
      subscriptions,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Admin: Update subscription status
router.put('/admin/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, tier, cancelAtPeriodEnd } = req.body;

    const updateData = {
      updated_at: new Date()
    };

    if (status) updateData.status = status;
    if (tier) updateData.tier = tier;
    if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;

    const [result] = await db.query(
      'UPDATE user_subscriptions SET ? WHERE id = ?',
      [updateData, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Helper function to get subscription features
function getSubscriptionFeatures(tier) {
  const features = {
    free: {
      maxFavorites: 50,
      advancedSearch: false,
      earlyAccess: false,
      prioritySupport: false,
      analytics: false,
      apiAccess: false
    },
    premium: {
      maxFavorites: -1, // unlimited
      advancedSearch: true,
      earlyAccess: true,
      prioritySupport: false,
      analytics: true,
      apiAccess: false
    },
    vip: {
      maxFavorites: -1, // unlimited
      advancedSearch: true,
      earlyAccess: true,
      prioritySupport: true,
      analytics: true,
      apiAccess: true
    }
  };

  return features[tier] || features.free;
}

export default router;