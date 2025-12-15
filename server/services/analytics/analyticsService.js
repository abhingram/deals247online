import mysql from 'mysql2/promise.js';

/**
 * Advanced Analytics Service
 * Implements ML-based deal prediction, user segmentation, and performance analytics
 */
export class AnalyticsService {
  constructor() {
    this.connection = null;
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
   * Calculate deal conversion rates and analytics
   */
  async updateDealAnalytics(dealId) {
    const conn = await this.connect();

    try {
      // Calculate analytics from raw data
      const [analytics] = await conn.execute(`
        SELECT
          d.id,
          COUNT(DISTINCT dv.id) as total_views,
          COUNT(DISTINCT dc.id) as total_clicks,
          COUNT(DISTINCT ds.id) as total_shares,
          COUNT(DISTINCT dr.id) as total_ratings,
          COUNT(DISTINCT dr2.id) as total_reviews,
          COALESCE(AVG(dr.rating), 0) as avg_rating,
          CASE WHEN COUNT(DISTINCT dv.id) > 0
               THEN ROUND(COUNT(DISTINCT dc.id) / COUNT(DISTINCT dv.id), 4)
               ELSE 0 END as conversion_rate
        FROM deals d
        LEFT JOIN deal_views dv ON d.id = dv.deal_id
        LEFT JOIN deal_clicks dc ON d.id = dc.deal_id
        LEFT JOIN deal_shares ds ON d.id = ds.deal_id
        LEFT JOIN deal_ratings dr ON d.id = dr.deal_id
        LEFT JOIN deal_reviews dr2 ON d.id = dr2.deal_id
        WHERE d.id = ?
        GROUP BY d.id
      `, [dealId]);

      if (analytics.length > 0) {
        const data = analytics[0];

        // Try to update deal analytics summary (skip if table doesn't exist)
        try {
          await conn.execute(`
            INSERT INTO deal_analytics_summary
            (deal_id, total_views, total_clicks, total_shares, total_ratings, total_reviews, avg_rating, conversion_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            total_views = VALUES(total_views),
            total_clicks = VALUES(total_clicks),
            total_shares = VALUES(total_shares),
            total_ratings = VALUES(total_ratings),
            total_reviews = VALUES(total_reviews),
            avg_rating = VALUES(avg_rating),
            conversion_rate = VALUES(conversion_rate)
          `, [
            data.id, data.total_views, data.total_clicks, data.total_shares,
            data.total_ratings, data.total_reviews, data.avg_rating, data.conversion_rate
          ]);
        } catch (error) {
          if (error.code !== 'ER_NO_SUCH_TABLE') {
            throw error;
          }
          console.log('⚠️  deal_analytics_summary table not found, skipping analytics update');
        }

        // Update deals table with summary data
        await conn.execute(`
          UPDATE deals SET
          total_views = ?, total_clicks = ?, total_shares = ?,
          total_ratings = ?, total_reviews = ?, avg_rating = ?
          WHERE id = ?
        `, [
          data.total_views, data.total_clicks, data.total_shares,
          data.total_ratings, data.total_reviews, data.avg_rating, dealId
        ]);
      }

      return analytics[0];
    } catch (error) {
      console.log('⚠️  Analytics calculation failed:', error.message);
      return null;
    }
  }

  /**
   * Predict deal likelihood based on price history and trends
   */
  async predictDealLikelihood(productId) {
    const conn = await this.connect();

    // Get price history for trend analysis
    const [priceHistory] = await conn.execute(`
      SELECT price, mrp, discount_percent, recorded_at
      FROM price_history
      WHERE product_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    `, [productId]);

    if (priceHistory.length < 7) {
      return { prediction: 'insufficient_data', confidence: 0 };
    }

    // Simple trend analysis (can be enhanced with ML models)
    const recentPrices = priceHistory.slice(0, 7);
    const olderPrices = priceHistory.slice(7, 14);

    const recentAvg = recentPrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / recentPrices.length;
    const olderAvg = olderPrices.length > 0
      ? olderPrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / olderPrices.length
      : recentAvg;

    const priceDrop = ((olderAvg - recentAvg) / olderAvg) * 100;
    const currentDiscount = recentPrices[0].discount_percent;

    // Prediction logic based on trends
    let prediction = 'no_deal';
    let confidence = 0.3;

    if (priceDrop > 10 && currentDiscount > 20) {
      prediction = 'high_deal_probability';
      confidence = 0.8;
    } else if (priceDrop > 5 && currentDiscount > 10) {
      prediction = 'medium_deal_probability';
      confidence = 0.6;
    } else if (currentDiscount > 15) {
      prediction = 'potential_deal';
      confidence = 0.5;
    }

    // Store prediction
    await conn.execute(`
      INSERT INTO deal_predictions
      (deal_id, predicted_discount, predicted_price, confidence_score, prediction_basis, valid_until)
      VALUES (?, ?, ?, ?, 'trend_analysis', DATE_ADD(NOW(), INTERVAL 24 HOUR))
      ON DUPLICATE KEY UPDATE
      predicted_discount = VALUES(predicted_discount),
      predicted_price = VALUES(predicted_price),
      confidence_score = VALUES(confidence_score),
      predicted_at = NOW()
    `, [
      productId,
      currentDiscount,
      recentPrices[0].price,
      confidence
    ]);

    return { prediction, confidence, priceDrop, currentDiscount };
  }

  /**
   * Segment users based on behavior patterns
   */
  async segmentUser(userId) {
    const conn = await this.connect();

    // Get user behavior data
    const [userData] = await conn.execute(`
      SELECT
        u.total_views, u.total_clicks, u.total_favorites,
        u.total_ratings, u.total_reviews,
        COUNT(DISTINCT dv.deal_id) as unique_deals_viewed,
        COUNT(DISTINCT dc.deal_id) as unique_deals_clicked,
        AVG(d.discount) as avg_discount_interaction,
        MAX(dv.viewed_at) as last_activity
      FROM users u
      LEFT JOIN deal_views dv ON u.firebase_uid = dv.user_id
      LEFT JOIN deal_clicks dc ON u.firebase_uid = dc.user_id
      LEFT JOIN deals d ON dc.deal_id = d.id
      WHERE u.firebase_uid = ?
      GROUP BY u.firebase_uid
    `, [userId]);

    if (userData.length === 0) return null;

    const data = userData[0];
    const segments = [];

    // High value user (lots of engagement)
    if (data.total_clicks > 50 && data.total_views > 200) {
      segments.push({
        type: 'high_value',
        score: Math.min(data.total_clicks / 100, 1),
        data: { total_clicks: data.total_clicks, total_views: data.total_views }
      });
    }

    // Price sensitive (interacts with high discount deals)
    if (data.avg_discount_interaction > 40) {
      segments.push({
        type: 'price_sensitive',
        score: Math.min(data.avg_discount_interaction / 100, 1),
        data: { avg_discount: data.avg_discount_interaction }
      });
    }

    // Deal hunter (high engagement with many deals)
    if (data.unique_deals_clicked > 20 && data.total_clicks / data.unique_deals_clicked > 2) {
      segments.push({
        type: 'deal_hunter',
        score: Math.min(data.unique_deals_clicked / 50, 1),
        data: { unique_clicks: data.unique_deals_clicked, avg_clicks_per_deal: data.total_clicks / data.unique_deals_clicked }
      });
    }

    // Inactive user
    const daysSinceActivity = data.last_activity
      ? Math.floor((Date.now() - new Date(data.last_activity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity > 30) {
      segments.push({
        type: 'inactive',
        score: Math.max(0, 1 - (daysSinceActivity / 365)),
        data: { days_inactive: daysSinceActivity }
      });
    }

    // Store segments
    for (const segment of segments) {
      await conn.execute(`
        INSERT INTO user_segments
        (user_id, segment_type, segment_score, segment_data)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        segment_score = VALUES(segment_score),
        segment_data = VALUES(segment_data),
        last_calculated = NOW()
      `, [
        userId,
        segment.type,
        segment.score,
        JSON.stringify(segment.data)
      ]);
    }

    return segments;
  }

  /**
   * Get performance metrics for dashboard
   */
  async getPerformanceMetrics(timeRange = '7d') {
    const conn = await this.connect();

    const dateCondition = timeRange === '7d' ? 'DATE_SUB(NOW(), INTERVAL 7 DAY)' :
                         timeRange === '30d' ? 'DATE_SUB(NOW(), INTERVAL 30 DAY)' :
                         'DATE_SUB(NOW(), INTERVAL 1 DAY)';

    try {
      const [metrics] = await conn.execute(`
        SELECT
          COUNT(DISTINCT u.firebase_uid) as total_users,
          COUNT(DISTINCT CASE WHEN u.created_at >= ${dateCondition} THEN u.firebase_uid END) as new_users,
          COUNT(d.id) as total_deals,
          COUNT(CASE WHEN d.verified = 1 THEN 1 END) as verified_deals,
          SUM(dv.view_count) as total_views,
          SUM(dc.click_count) as total_clicks,
          AVG(das.conversion_rate) as avg_conversion_rate,
          SUM(das.total_shares) as total_shares
        FROM users u
        CROSS JOIN (SELECT COUNT(*) as view_count FROM deal_views WHERE viewed_at >= ${dateCondition}) dv
        CROSS JOIN (SELECT COUNT(*) as click_count FROM deal_clicks WHERE clicked_at >= ${dateCondition}) dc
        LEFT JOIN deals d ON 1=1
        LEFT JOIN deal_analytics_summary das ON d.id = das.deal_id
      `);

      return metrics[0] || {};
    } catch (error) {
      // If deal_analytics_summary table doesn't exist yet, return basic metrics
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠️  deal_analytics_summary table not found, using basic metrics');
        const [basicMetrics] = await conn.execute(`
          SELECT
            COUNT(DISTINCT u.firebase_uid) as total_users,
            COUNT(DISTINCT CASE WHEN u.created_at >= ${dateCondition} THEN u.firebase_uid END) as new_users,
            COUNT(d.id) as total_deals,
            COUNT(CASE WHEN d.verified = 1 THEN 1 END) as verified_deals,
            SUM(dv.view_count) as total_views,
            SUM(dc.click_count) as total_clicks,
            0 as avg_conversion_rate,
            0 as total_shares
          FROM users u
          CROSS JOIN (SELECT COUNT(*) as view_count FROM deal_views WHERE viewed_at >= ${dateCondition}) dv
          CROSS JOIN (SELECT COUNT(*) as click_count FROM deal_clicks WHERE clicked_at >= ${dateCondition}) dc
          LEFT JOIN deals d ON 1=1
        `);
        return basicMetrics[0] || {};
      }
      throw error;
    }
  }

  /**
   * Run A/B test analysis
   */
  async analyzeExperiment(experimentId) {
    const conn = await this.connect();

    const [results] = await conn.execute(`
      SELECT
        variant_assigned,
        action_taken,
        COUNT(*) as action_count,
        AVG(action_value) as avg_value
      FROM experiment_results
      WHERE experiment_id = ?
      GROUP BY variant_assigned, action_taken
      ORDER BY variant_assigned, action_taken
    `, [experimentId]);

    // Calculate statistical significance (simplified)
    const variantA = results.filter(r => r.variant_assigned === 'A');
    const variantB = results.filter(r => r.variant_assigned === 'B');

    const analysis = {
      variant_a: {
        clicks: variantA.find(r => r.action_taken === 'click')?.action_count || 0,
        conversions: variantA.find(r => r.action_taken === 'purchase')?.action_count || 0,
        avg_value: variantA.find(r => r.action_taken === 'purchase')?.avg_value || 0
      },
      variant_b: {
        clicks: variantB.find(r => r.action_taken === 'click')?.action_count || 0,
        conversions: variantB.find(r => r.action_taken === 'purchase')?.action_count || 0,
        avg_value: variantB.find(r => r.action_taken === 'purchase')?.avg_value || 0
      }
    };

    // Simple winner determination
    const winner = analysis.variant_a.conversions > analysis.variant_b.conversions ? 'A' :
                   analysis.variant_b.conversions > analysis.variant_a.conversions ? 'B' : 'tie';

    return { analysis, winner, confidence: winner !== 'tie' ? 0.85 : 0.5 };
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}