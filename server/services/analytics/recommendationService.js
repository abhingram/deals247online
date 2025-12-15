import mysql from 'mysql2/promise.js';

/**
 * AI-Powered Recommendation Engine
 * Implements collaborative filtering, content-based filtering, and hybrid recommendations
 */
export class RecommendationService {
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
   * Get personalized deal recommendations for a user
   */
  async getPersonalizedRecommendations(userId, limit = 10, context = {}) {
    const conn = await this.connect();

    try {
      // Get user's interaction history
      const [userHistory] = await conn.execute(`
        SELECT
          dv.deal_id,
          d.category,
          d.store,
          d.discounted_price,
          COUNT(dv.id) as view_count,
          MAX(dv.created_at) as last_viewed
        FROM deal_views dv
        JOIN deals d ON dv.deal_id = d.id
        WHERE dv.user_id = ? AND d.deleted_at IS NULL
        GROUP BY dv.deal_id, d.category, d.store, d.discounted_price
        ORDER BY last_viewed DESC
        LIMIT 50
      `, [userId]);

      if (userHistory.length === 0) {
        // New user - return trending deals
        return this.getTrendingDeals(limit);
      }

      // Extract user preferences
      const userPrefs = this.extractUserPreferences(userHistory);

      // Get collaborative filtering recommendations
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userPrefs, limit);

      // Get content-based recommendations
      const contentRecs = await this.getContentBasedRecommendations(userPrefs, limit);

      // Combine and rank recommendations
      const hybridRecommendations = this.combineRecommendations(
        collaborativeRecs,
        contentRecs,
        userPrefs,
        limit
      );

      // Store recommendations for analytics
      await this.storeRecommendations(userId, hybridRecommendations, 'hybrid', context);

      return hybridRecommendations;
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return this.getTrendingDeals(limit);
    }
  }

  /**
   * Extract user preferences from interaction history
   */
  extractUserPreferences(history) {
    const categories = {};
    const stores = {};
    const priceRanges = { budget: 0, mid: 0, premium: 0 };

    history.forEach(item => {
      // Category preferences
      categories[item.category] = (categories[item.category] || 0) + item.view_count;

      // Store preferences
      stores[item.store] = (stores[item.store] || 0) + item.view_count;

      // Price range preferences
      if (item.discounted_price < 50) priceRanges.budget++;
      else if (item.discounted_price < 200) priceRanges.mid++;
      else priceRanges.premium++;
    });

    return {
      favoriteCategories: Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cat]) => cat),
      favoriteStores: Object.entries(stores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([store]) => store),
      pricePreference: Object.entries(priceRanges)
        .sort(([,a], [,b]) => b - a)[0][0]
    };
  }

  /**
   * Collaborative filtering: Find similar users and their liked deals
   */
  async getCollaborativeRecommendations(userId, userPrefs, limit) {
    const conn = await this.connect();

    try {
      // Find users with similar preferences
      const [similarUsers] = await conn.execute(`
        SELECT DISTINCT
          u.firebase_uid as user_id,
          COUNT(DISTINCT dv.deal_id) as common_interests
        FROM users u
        JOIN deal_views dv ON u.firebase_uid = dv.user_id
        JOIN deals d ON dv.deal_id = d.id
        WHERE u.firebase_uid != ?
          AND d.category IN (${userPrefs.favoriteCategories.map(() => '?').join(',')})
          AND d.deleted_at IS NULL
        GROUP BY u.firebase_uid
        ORDER BY common_interests DESC
        LIMIT 10
      `, [userId, ...userPrefs.favoriteCategories]);

      if (similarUsers.length === 0) return [];

      // Get deals liked by similar users but not by current user
      const userIds = similarUsers.map(u => u.user_id);
      const [userDeals] = await conn.execute(`
        SELECT DISTINCT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url,
          COUNT(DISTINCT dv.user_id) as user_likes,
          AVG(dr.rating) as avg_rating
        FROM deals d
        JOIN deal_views dv ON d.id = dv.deal_id
        LEFT JOIN deal_ratings dr ON d.id = dr.deal_id
        WHERE dv.user_id IN (${userIds.map(() => '?').join(',')})
          AND d.id NOT IN (
            SELECT deal_id FROM deal_views WHERE user_id = ?
          )
          AND d.deleted_at IS NULL
          AND d.expires_at > NOW()
        GROUP BY d.id, d.title, d.discounted_price, d.original_price, d.discount, d.category, d.store, d.image_url
        ORDER BY user_likes DESC, avg_rating DESC
        LIMIT ?
      `, [...userIds, userId, limit]);

      return userDeals.map(deal => ({
        ...deal,
        recommendation_score: deal.user_likes * 0.7 + (deal.avg_rating || 0) * 0.3,
        recommendation_type: 'collaborative'
      }));
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  /**
   * Content-based filtering: Recommend deals similar to user's preferences
   */
  async getContentBasedRecommendations(userPrefs, limit) {
    const conn = await this.connect();

    try {
      // Build query based on user preferences
      let whereConditions = ['d.deleted_at IS NULL', 'd.expires_at > NOW()'];
      let params = [];

      // Category preferences
      if (userPrefs.favoriteCategories.length > 0) {
        whereConditions.push(`d.category IN (${userPrefs.favoriteCategories.map(() => '?').join(',')})`);
        params.push(...userPrefs.favoriteCategories);
      }

      // Price range preferences
      const priceRanges = {
        budget: [0, 50],
        mid: [50, 200],
        premium: [200, 10000]
      };

      if (userPrefs.pricePreference && priceRanges[userPrefs.pricePreference]) {
        const [min, max] = priceRanges[userPrefs.pricePreference];
        whereConditions.push('d.discounted_price BETWEEN ? AND ?');
        params.push(min, max);
      }

      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url,
          d.total_views,
          d.avg_rating,
          d.created_at
        FROM deals d
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY
          (d.total_views * 0.4) +
          (COALESCE(d.avg_rating, 0) * 0.3) +
          (d.discount * 0.3) DESC
        LIMIT ?
      `, [...params, limit]);

      return deals.map(deal => ({
        ...deal,
        recommendation_score: (deal.total_views * 0.4) + ((deal.avg_rating || 0) * 0.3) + (deal.discount * 0.3),
        recommendation_type: 'content'
      }));
    } catch (error) {
      console.error('Error in content-based filtering:', error);
      return [];
    }
  }

  /**
   * Combine and rank recommendations from multiple sources
   */
  combineRecommendations(collaborativeRecs, contentRecs, userPrefs, limit) {
    const allRecs = [...collaborativeRecs, ...contentRecs];

    // Remove duplicates and boost collaborative recommendations
    const uniqueRecs = allRecs.reduce((acc, rec) => {
      const existing = acc.find(r => r.id === rec.id);
      if (existing) {
        // Boost collaborative recommendations
        if (rec.recommendation_type === 'collaborative') {
          existing.recommendation_score = Math.max(existing.recommendation_score, rec.recommendation_score * 1.2);
        }
      } else {
        acc.push(rec);
      }
      return acc;
    }, []);

    // Sort by recommendation score and return top results
    return uniqueRecs
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  }

  /**
   * Get trending deals for new users or fallback
   */
  async getTrendingDeals(limit = 10) {
    const conn = await this.connect();

    try {
      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url,
          d.total_views,
          d.avg_rating,
          (d.total_views * 0.5 + COALESCE(d.avg_rating, 0) * 0.3 + d.discount * 0.2) as trend_score
        FROM deals d
        WHERE d.deleted_at IS NULL
          AND d.expires_at > NOW()
          AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY trend_score DESC
        LIMIT ?
      `, [limit]);

      return deals.map(deal => ({
        ...deal,
        recommendation_score: deal.trend_score,
        recommendation_type: 'trending'
      }));
    } catch (error) {
      console.error('Error fetching trending deals:', error);
      return [];
    }
  }

  /**
   * Store recommendations for analytics and A/B testing
   */
  async storeRecommendations(userId, recommendations, type, context) {
    const conn = await this.connect();

    try {
      const recommendationInserts = recommendations.map(rec => [
        userId,
        rec.id,
        rec.recommendation_score,
        type,
        JSON.stringify(context)
      ]);

      if (recommendationInserts.length > 0) {
        await conn.execute(`
          INSERT INTO user_recommendations
          (user_id, deal_id, recommendation_score, recommendation_type, context_data)
          VALUES ${recommendationInserts.map(() => '(?, ?, ?, ?, ?)').join(', ')}
        `, recommendationInserts.flat());
      }
    } catch (error) {
      console.error('Error storing recommendations:', error);
      // Don't throw - analytics failure shouldn't break recommendations
    }
  }

  /**
   * Track recommendation performance
   */
  async trackRecommendationClick(userId, dealId) {
    const conn = await this.connect();

    try {
      await conn.execute(`
        UPDATE user_recommendations
        SET was_clicked = TRUE
        WHERE user_id = ? AND deal_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId, dealId]);
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
    }
  }

  /**
   * Track recommendation conversion
   */
  async trackRecommendationConversion(userId, dealId) {
    const conn = await this.connect();

    try {
      await conn.execute(`
        UPDATE user_recommendations
        SET was_converted = TRUE
        WHERE user_id = ? AND deal_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId, dealId]);
    } catch (error) {
      console.error('Error tracking recommendation conversion:', error);
    }
  }
}