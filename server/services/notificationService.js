import db from '../config/database.js';

class NotificationService {
  // Create notification for a user
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      const [result] = await db.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, type, title, message, JSON.stringify(data)]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for deals expiring soon
  static async notifyExpiringDeals() {
    try {
      // Get deals expiring in the next 24 hours
      const [expiringDeals] = await db.query(`
        SELECT d.id, d.title, d.expires_at
        FROM deals d
        WHERE d.deleted_at IS NULL
        AND d.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        AND d.expires_at > NOW()
      `);

      for (const deal of expiringDeals) {
        // Get users who have favorited this deal or viewed it recently
        const [interestedUsers] = await db.query(`
          SELECT DISTINCT u.firebase_uid, u.email, np.deal_expiring
          FROM users u
          LEFT JOIN user_favorites uf ON u.firebase_uid = uf.user_id AND uf.deal_id = ?
          LEFT JOIN deal_views dv ON u.firebase_uid = dv.user_id AND dv.deal_id = ? AND dv.viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
          LEFT JOIN notification_preferences np ON u.firebase_uid = np.user_id
          WHERE (uf.id IS NOT NULL OR dv.id IS NOT NULL)
          AND COALESCE(np.deal_expiring, 1) = 1
        `, [deal.id, deal.id]);

        for (const user of interestedUsers) {
          const hoursLeft = Math.ceil((new Date(deal.expires_at) - new Date()) / (1000 * 60 * 60));

          await this.createNotification(
            user.firebase_uid,
            'deal_expiring',
            'Deal Expiring Soon!',
            `${deal.title} expires in ${hoursLeft} hours. Don't miss out!`,
            { dealId: deal.id, expiresAt: deal.expires_at }
          );
        }
      }

      console.log(`Created notifications for ${expiringDeals.length} expiring deals`);
    } catch (error) {
      console.error('Error in notifyExpiringDeals:', error);
    }
  }

  // Create notifications for new deals in favorite categories
  static async notifyNewDeals() {
    try {
      // Get deals created in the last hour
      const [newDeals] = await db.query(`
        SELECT d.id, d.title, d.category, d.store, d.created_at
        FROM deals d
        WHERE d.deleted_at IS NULL
        AND d.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `);

      for (const deal of newDeals) {
        // Get users who have favorited deals in this category and have notifications enabled
        const [interestedUsers] = await db.query(`
          SELECT DISTINCT u.firebase_uid, np.new_deal
          FROM users u
          INNER JOIN user_favorites uf ON u.firebase_uid = uf.user_id
          INNER JOIN deals d2 ON uf.deal_id = d2.id AND d2.category = ?
          LEFT JOIN notification_preferences np ON u.firebase_uid = np.user_id
          WHERE COALESCE(np.new_deal, 1) = 1
          AND u.firebase_uid NOT IN (
            SELECT user_id FROM notifications
            WHERE type = 'new_deal' AND data->'$.dealId' = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          )
        `, [deal.category, deal.id]);

        for (const user of interestedUsers) {
          await this.createNotification(
            user.firebase_uid,
            'new_deal',
            'New Deal in Your Favorite Category!',
            `Check out this new ${deal.category} deal: ${deal.title}`,
            { dealId: deal.id, category: deal.category }
          );
        }
      }

      console.log(`Created notifications for ${newDeals.length} new deals`);
    } catch (error) {
      console.error('Error in notifyNewDeals:', error);
    }
  }

  // Create notifications for price drops
  static async notifyPriceDrops() {
    try {
      // This would require tracking price history
      // For now, we'll create notifications for deals with significant discounts
      const [discountedDeals] = await db.query(`
        SELECT d.id, d.title, d.discount, d.created_at
        FROM deals d
        WHERE d.deleted_at IS NULL
        AND d.discount >= 50
        AND d.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `);

      for (const deal of discountedDeals) {
        // Get users who have viewed similar deals recently
        const [interestedUsers] = await db.query(`
          SELECT DISTINCT u.firebase_uid, np.price_drop
          FROM users u
          INNER JOIN deal_views dv ON u.firebase_uid = dv.user_id
          INNER JOIN deals d2 ON dv.deal_id = d2.id AND d2.category = (SELECT category FROM deals WHERE id = ?)
          LEFT JOIN notification_preferences np ON u.firebase_uid = np.user_id
          WHERE dv.viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND COALESCE(np.price_drop, 1) = 1
          AND u.firebase_uid NOT IN (
            SELECT user_id FROM notifications
            WHERE type = 'price_drop' AND data->'$.dealId' = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          )
        `, [deal.id, deal.id]);

        for (const user of interestedUsers) {
          await this.createNotification(
            user.firebase_uid,
            'price_drop',
            'Massive Price Drop!',
            `${deal.discount}% off on ${deal.title}!`,
            { dealId: deal.id, discount: deal.discount }
          );
        }
      }

      console.log(`Created notifications for ${discountedDeals.length} price drops`);
    } catch (error) {
      console.error('Error in notifyPriceDrops:', error);
    }
  }

  // Send system notification to all users
  static async sendSystemNotification(title, message, data = {}) {
    try {
      // Get all users with system notifications enabled
      const [users] = await db.query(`
        SELECT u.firebase_uid
        FROM users u
        LEFT JOIN notification_preferences np ON u.firebase_uid = np.user_id
        WHERE COALESCE(np.system, 1) = 1
      `);

      for (const user of users) {
        await this.createNotification(
          user.firebase_uid,
          'system',
          title,
          message,
          data
        );
      }

      console.log(`Sent system notification to ${users.length} users`);
    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }

  // Clean up old read notifications (older than 30 days)
  static async cleanupOldNotifications() {
    try {
      const [result] = await db.query(`
        DELETE FROM notifications
        WHERE read_at IS NOT NULL
        AND read_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      console.log(`Cleaned up ${result.affectedRows} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

export default NotificationService;