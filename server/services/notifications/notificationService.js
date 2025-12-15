import mysql from 'mysql2/promise.js';
import { AnalyticsService } from '../analytics/analyticsService.js';

/**
 * Enhanced Notification Service
 * Implements smart notifications based on user behavior, segments, and deal predictions
 */
export class NotificationService {
  constructor() {
    this.connection = null;
    this.analyticsService = new AnalyticsService();
  }

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
      });
    }
    return this.connection;
  }

  /**
   * Create personalized deal notifications based on user segments
   */
  async createPersonalizedNotifications(userId) {
    const conn = await this.connect();

    // Get user segments
    const [segments] = await conn.execute(`
      SELECT segment_type, segment_score, segment_data
      FROM user_segments
      WHERE user_id = ? AND segment_score > 0.5
      ORDER BY segment_score DESC
    `, [userId]);

    if (segments.length === 0) return [];

    const notifications = [];

    for (const segment of segments) {
      const segmentData = JSON.parse(segment.segment_data || '{}');

      switch (segment.segment_type) {
        case 'price_sensitive':
          notifications.push(...await this.createPriceSensitiveNotifications(userId, segmentData));
          break;
        case 'deal_hunter':
          notifications.push(...await this.createDealHunterNotifications(userId, segmentData));
          break;
        case 'high_value':
          notifications.push(...await this.createHighValueNotifications(userId, segmentData));
          break;
      }
    }

    return notifications;
  }

  /**
   * Create notifications for price-sensitive users
   */
  async createPriceSensitiveNotifications(userId, segmentData) {
    const conn = await this.connect();

    // Find deals with high discounts that match user's interests
    const [deals] = await conn.execute(`
      SELECT d.id, d.title, d.discount, d.category, d.store,
             d.expires_at, p.predicted_discount
      FROM deals d
      LEFT JOIN deal_predictions p ON d.id = p.deal_id
      LEFT JOIN user_favorites uf ON d.id = uf.deal_id AND uf.user_id = ?
      LEFT JOIN deal_views dv ON d.id = dv.deal_id AND dv.user_id = ?
      WHERE d.discount >= 40
        AND d.verified = 1
        AND d.deleted = 0
        AND (d.expires_at IS NULL OR d.expires_at > NOW())
        AND (uf.id IS NOT NULL OR dv.id IS NOT NULL OR p.confidence_score > 0.7)
      ORDER BY d.discount DESC, p.confidence_score DESC
      LIMIT 5
    `, [userId, userId]);

    return deals.map(deal => ({
      userId,
      type: 'price_drop',
      title: `🔥 ${deal.discount}% Off: ${deal.title.substring(0, 50)}...`,
      message: `Massive discount on ${deal.store} - don't miss out!`,
      dealId: deal.id,
      priority: 'high',
      data: { discount: deal.discount, category: deal.category }
    }));
  }

  /**
   * Create notifications for deal hunter users
   */
  async createDealHunterNotifications(userId, segmentData) {
    const conn = await this.connect();

    // Find trending deals and new high-value deals
    const [deals] = await conn.execute(`
      SELECT d.id, d.title, d.discount, d.category, d.store,
             d.created_at, das.total_views, das.conversion_rate
      FROM deals d
      JOIN deal_analytics_summary das ON d.id = das.deal_id
      WHERE d.verified = 1
        AND d.deleted = 0
        AND d.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND das.total_views > 10
        AND das.conversion_rate > 0.05
      ORDER BY das.conversion_rate DESC, das.total_views DESC
      LIMIT 3
    `);

    return deals.map(deal => ({
      userId,
      type: 'new_deal',
      title: `⚡ Hot New Deal: ${deal.title.substring(0, 50)}...`,
      message: `${deal.discount}% off at ${deal.store} - trending now!`,
      dealId: deal.id,
      priority: 'medium',
      data: { views: deal.total_views, conversion: deal.conversion_rate }
    }));
  }

  /**
   * Create notifications for high-value users
   */
  async createHighValueNotifications(userId, segmentData) {
    const conn = await this.connect();

    // Find premium deals and exclusive offers
    const [deals] = await conn.execute(`
      SELECT d.id, d.title, d.discount, d.category, d.store,
             d.original_price, das.avg_rating
      FROM deals d
      JOIN deal_analytics_summary das ON d.id = das.deal_id
      WHERE d.verified = 1
        AND d.deleted = 0
        AND d.original_price > 500
        AND das.avg_rating >= 4.0
        AND (d.expires_at IS NULL OR d.expires_at > DATE_ADD(NOW(), INTERVAL 24 HOUR))
      ORDER BY d.original_price DESC, das.avg_rating DESC
      LIMIT 2
    `);

    return deals.map(deal => ({
      userId,
      type: 'premium_deal',
      title: `💎 Premium Deal: ${deal.title.substring(0, 50)}...`,
      message: `Exclusive ${deal.discount}% off on premium ${deal.category} from ${deal.store}`,
      dealId: deal.id,
      priority: 'medium',
      data: { price: deal.original_price, rating: deal.avg_rating }
    }));
  }

  /**
   * Create expiring deal notifications
   */
  async createExpiringDealNotifications() {
    const conn = await this.connect();

    // Find deals expiring in next 24 hours
    const [expiringDeals] = await conn.execute(`
      SELECT d.id, d.title, d.expires_at, d.store, d.discount
      FROM deals d
      WHERE d.verified = 1
        AND d.deleted = 0
        AND d.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `);

    const notifications = [];

    for (const deal of expiringDeals) {
      // Get users who viewed this deal recently
      const [interestedUsers] = await conn.execute(`
        SELECT DISTINCT dv.user_id
        FROM deal_views dv
        WHERE dv.deal_id = ?
          AND dv.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        LIMIT 50
      `, [deal.id]);

      for (const user of interestedUsers) {
        notifications.push({
          userId: user.user_id,
          type: 'deal_expiring',
          title: `⏰ Deal Expires Soon: ${deal.title.substring(0, 50)}...`,
          message: `${deal.discount}% off at ${deal.store} - expires ${new Date(deal.expires_at).toLocaleString()}`,
          dealId: deal.id,
          priority: 'high',
          data: { expires_at: deal.expires_at }
        });
      }
    }

    return notifications;
  }

  /**
   * Send notification batch
   */
  async sendNotificationBatch(notifications) {
    const conn = await this.connect();

    const values = notifications.map(n => [
      n.userId,
      n.type,
      n.title,
      n.message,
      JSON.stringify({
        dealId: n.dealId,
        priority: n.priority,
        data: n.data
      }),
      'unread',
      new Date()
    ]);

    if (values.length > 0) {
      await conn.execute(`
        INSERT INTO notifications
        (user_id, type, title, message, data, read_status, created_at)
        VALUES ?
      `, [values]);
    }

    return notifications.length;
  }

  /**
   * Clean up old notifications (keep last 30 days)
   */
  async cleanupOldNotifications() {
    const conn = await this.connect();

    const [result] = await conn.execute(`
      DELETE FROM notifications
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND read_status = 'read'
    `);

    return result.affectedRows;
  }

  /**
   * Get notification preferences for user
   */
  async getUserPreferences(userId) {
    const conn = await this.connect();

    const [prefs] = await conn.execute(`
      SELECT * FROM notification_preferences
      WHERE user_id = ?
    `, [userId]);

    return prefs[0] || {
      deal_expiring: true,
      deal_expired: false,
      new_deal: true,
      price_drop: true,
      system: true,
      email_enabled: true,
      push_enabled: true
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId, preferences) {
    const conn = await this.connect();

    await conn.execute(`
      INSERT INTO notification_preferences
      (user_id, deal_expiring, deal_expired, new_deal, price_drop, system, email_enabled, push_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      preferences.deal_expiring || true,
      preferences.deal_expired || false,
      preferences.new_deal || true,
      preferences.price_drop || true,
      preferences.system || true,
      preferences.email_enabled || true,
      preferences.push_enabled || true
    ]);
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    await this.analyticsService.disconnect();
  }
}