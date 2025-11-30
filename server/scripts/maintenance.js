import db from '../config/database.js';

// Check for expiring deals and create notifications
async function checkExpiringDeals() {
  try {
    console.log('Checking for expiring deals...');

    // Get deals expiring in the next 24 hours
    const [expiringDeals] = await db.query(`
      SELECT d.id, d.title, d.expires_at, u.firebase_uid, u.email, u.display_name
      FROM deals d
      LEFT JOIN user_favorites uf ON d.id = uf.deal_id
      LEFT JOIN users u ON uf.user_id = u.firebase_uid
      WHERE d.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      AND d.deleted_at IS NULL
      AND u.firebase_uid IS NOT NULL
    `);

    // Get deals that have expired
    const [expiredDeals] = await db.query(`
      SELECT d.id, d.title, d.expires_at, u.firebase_uid, u.email, u.display_name
      FROM deals d
      LEFT JOIN user_favorites uf ON d.id = uf.deal_id
      LEFT JOIN users u ON uf.user_id = u.firebase_uid
      WHERE d.expires_at < NOW()
      AND d.deleted_at IS NULL
      AND u.firebase_uid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = u.firebase_uid
        AND n.type = 'deal_expired'
        AND n.data LIKE CONCAT('%\"dealId\":', d.id, '%')
        AND DATE(n.created_at) = CURDATE()
      )
    `);

    // Create notifications for expiring deals
    for (const deal of expiringDeals) {
      const hoursLeft = Math.ceil((new Date(deal.expires_at) - new Date()) / (1000 * 60 * 60));

      await db.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'deal_expiring', 'Deal Expiring Soon', ?, ?)
      `, [
        deal.firebase_uid,
        `The deal "${deal.title}" is expiring in ${hoursLeft} hours!`,
        JSON.stringify({ dealId: deal.id, dealTitle: deal.title, expiresAt: deal.expires_at })
      ]);
    }

    // Create notifications for expired deals
    for (const deal of expiredDeals) {
      await db.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'deal_expired', 'Deal Has Expired', ?, ?)
      `, [
        deal.firebase_uid,
        `The deal "${deal.title}" has expired.`,
        JSON.stringify({ dealId: deal.id, dealTitle: deal.title, expiredAt: deal.expires_at })
      ]);
    }

    console.log(`Created ${expiringDeals.length} expiring deal notifications and ${expiredDeals.length} expired deal notifications`);

  } catch (error) {
    console.error('Error checking expiring deals:', error);
  }
}

// Clean up old notifications (keep only last 30 days)
async function cleanupOldNotifications() {
  try {
    console.log('Cleaning up old notifications...');

    const [result] = await db.query(
      'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    console.log(`Cleaned up ${result.affectedRows} old notifications`);
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
}

// Update analytics summary cache
async function updateAnalyticsCache() {
  try {
    console.log('Updating analytics cache...');

    const today = new Date().toISOString().split('T')[0];

    // Calculate today's analytics
    const analytics = await calculateDailyAnalytics(today);

    // Insert or update cache
    await db.query(`
      INSERT INTO analytics_summary (date, total_users, new_users, total_deals, active_deals, total_views, total_clicks, total_shares, total_ratings, total_reviews, avg_rating, revenue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_users = VALUES(total_users),
        new_users = VALUES(new_users),
        total_deals = VALUES(total_deals),
        active_deals = VALUES(active_deals),
        total_views = VALUES(total_views),
        total_clicks = VALUES(total_clicks),
        total_shares = VALUES(total_shares),
        total_ratings = VALUES(total_ratings),
        total_reviews = VALUES(total_reviews),
        avg_rating = VALUES(avg_rating),
        revenue = VALUES(revenue)
    `, [
      today,
      analytics.total_users,
      analytics.new_users,
      analytics.total_deals,
      analytics.active_deals,
      analytics.total_views,
      analytics.total_clicks,
      analytics.total_shares,
      analytics.total_ratings,
      analytics.total_reviews,
      analytics.avg_rating,
      analytics.revenue
    ]);

    console.log('Analytics cache updated');
  } catch (error) {
    console.error('Error updating analytics cache:', error);
  }
}

// Helper function to calculate daily analytics
async function calculateDailyAnalytics(date) {
  try {
    // Total users
    const [userStats] = await db.query(`
      SELECT COUNT(*) as total_users FROM users
    `);

    // New users today
    const [newUsers] = await db.query(`
      SELECT COUNT(*) as new_users FROM users
      WHERE DATE(created_at) = ?
    `, [date]);

    // Deal stats
    const [dealStats] = await db.query(`
      SELECT
        COUNT(*) as total_deals,
        COUNT(CASE WHEN expires_at >= NOW() THEN 1 END) as active_deals
      FROM deals
      WHERE deleted_at IS NULL
    `);

    // Activity stats for today
    const [viewStats] = await db.query(`
      SELECT COUNT(*) as total_views FROM deal_views
      WHERE DATE(viewed_at) = ?
    `, [date]);

    const [clickStats] = await db.query(`
      SELECT COUNT(*) as total_clicks FROM deal_clicks
      WHERE DATE(clicked_at) = ?
    `, [date]);

    const [shareStats] = await db.query(`
      SELECT COUNT(*) as total_shares FROM deal_shares
      WHERE DATE(shared_at) = ?
    `, [date]);

    const [ratingStats] = await db.query(`
      SELECT
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating
      FROM deal_ratings
      WHERE DATE(created_at) = ?
    `, [date]);

    const [reviewStats] = await db.query(`
      SELECT COUNT(*) as total_reviews FROM deal_reviews
      WHERE DATE(created_at) = ?
    `, [date]);

    return {
      total_users: userStats[0].total_users,
      new_users: newUsers[0].new_users,
      total_deals: dealStats[0].total_deals,
      active_deals: dealStats[0].active_deals,
      total_views: viewStats[0].total_views,
      total_clicks: clickStats[0].total_clicks,
      total_shares: shareStats[0].total_shares,
      total_ratings: ratingStats[0].total_ratings,
      total_reviews: reviewStats[0].total_reviews,
      avg_rating: ratingStats[0].avg_rating || 0,
      revenue: 0 // Placeholder for future revenue tracking
    };
  } catch (error) {
    console.error('Error calculating daily analytics:', error);
    throw error;
  }
}

// Main function to run all maintenance tasks
async function runMaintenance() {
  try {
    console.log('Starting maintenance tasks...');

    await checkExpiringDeals();
    await cleanupOldNotifications();
    await updateAnalyticsCache();

    console.log('Maintenance tasks completed');
  } catch (error) {
    console.error('Error running maintenance:', error);
  } finally {
    process.exit(0);
  }
}

export {
  checkExpiringDeals,
  cleanupOldNotifications,
  updateAnalyticsCache,
  runMaintenance
};

// Run maintenance if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMaintenance();
}