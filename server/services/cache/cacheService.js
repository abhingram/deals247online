import mysql from 'mysql2/promise.js';
import crypto from 'crypto';

/**
 * Caching Service
 * Implements Redis-like caching with database backend for frequently accessed data
 */
export class CacheService {
  constructor() {
    this.connection = null;
    this.memoryCache = new Map(); // In-memory cache for hot data
    this.maxMemoryItems = 1000;
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
   * Generate cache key
   */
  generateKey(type, identifier, params = {}) {
    const keyData = { type, identifier, ...params };
    const keyString = JSON.stringify(keyData);
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Get cached data
   */
  async get(cacheKey) {
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached.expires_at > new Date()) {
        return JSON.parse(cached.cache_value);
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Check database cache
    try {
      const conn = await this.connect();
      const [rows] = await conn.execute(`
        SELECT cache_value, expires_at
        FROM cache_store
        WHERE cache_key = ? AND expires_at > NOW()
      `, [cacheKey]);

      if (rows.length > 0) {
        const data = JSON.parse(rows[0].cache_value);

        // Store in memory cache for faster access
        this.memoryCache.set(cacheKey, {
          cache_value: rows[0].cache_value,
          expires_at: new Date(rows[0].expires_at)
        });

        // Clean up memory cache if too large
        if (this.memoryCache.size > this.maxMemoryItems) {
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }

        return data;
      }
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        // Table doesn't exist, rely on memory cache only
        return null;
      }
      throw error;
    }

    return null;
  }

  /**
   * Set cached data
   */
  async set(cacheKey, data, ttlSeconds = 300, type = 'general') {
    try {
      const conn = await this.connect();
      const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
      const value = JSON.stringify(data);

      // Store in database
      await conn.execute(`
        INSERT INTO cache_store
        (cache_key, cache_value, cache_type, expires_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        cache_value = VALUES(cache_value),
        expires_at = VALUES(expires_at),
        created_at = NOW()
      `, [cacheKey, value, type, expiresAt]);

      // Store in memory cache
      this.memoryCache.set(cacheKey, {
        cache_value: value,
        expires_at: expiresAt
      });

      return true;
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠️  cache_store table not found, using memory-only cache');
        // Store in memory cache only
        const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
        this.memoryCache.set(cacheKey, {
          cache_value: JSON.stringify(data),
          expires_at: expiresAt
        });
        return true;
      }
      throw error;
    }
  }

  /**
   * Delete cached data
   */
  async delete(cacheKey) {
    const conn = await this.connect();

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from database
    await conn.execute(`
      DELETE FROM cache_store WHERE cache_key = ?
    `, [cacheKey]);

    return true;
  }

  /**
   * Clear cache by type
   */
  async clearByType(type) {
    const conn = await this.connect();

    // Clear memory cache for this type
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.cache_type === type) {
        this.memoryCache.delete(key);
      }
    }

    // Clear database cache
    await conn.execute(`
      DELETE FROM cache_store WHERE cache_type = ?
    `, [type]);

    return true;
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  async getOrSet(cacheKey, dataFetcher, ttlSeconds = 300, type = 'general') {
    let data = await this.get(cacheKey);

    if (data === null) {
      data = await dataFetcher();
      if (data !== null) {
        await this.set(cacheKey, data, ttlSeconds, type);
      }
    }

    return data;
  }

  /**
   * Cache deal data
   */
  async getCachedDeal(dealId) {
    const cacheKey = this.generateKey('deal', dealId);
    return this.getOrSet(cacheKey, async () => {
      const conn = await this.connect();
      const [deals] = await conn.execute(`
        SELECT d.*, das.total_views, das.total_clicks, das.conversion_rate
        FROM deals d
        LEFT JOIN deal_analytics_summary das ON d.id = das.deal_id
        WHERE d.id = ? AND d.deleted = 0
      `, [dealId]);

      return deals[0] || null;
    }, 600, 'deal'); // 10 minute cache
  }

  /**
   * Cache product data
   */
  async getCachedProduct(productId) {
    const cacheKey = this.generateKey('product', productId);
    return this.getOrSet(cacheKey, async () => {
      const conn = await this.connect();
      const [products] = await conn.execute(`
        SELECT p.*, ph.price as current_price, ph.discount_percent
        FROM products p
        LEFT JOIN price_history ph ON p.id = ph.product_id
        WHERE p.id = ? AND p.is_active = 1
        ORDER BY ph.recorded_at DESC
        LIMIT 1
      `, [productId]);

      return products[0] || null;
    }, 300, 'product'); // 5 minute cache
  }

  /**
   * Cache search results
   */
  async getCachedSearch(query, filters = {}) {
    const cacheKey = this.generateKey('search', query, filters);
    return this.getOrSet(cacheKey, async () => {
      const conn = await this.connect();

      let whereClause = 'd.deleted = 0 AND d.verified = 1';
      const params = [];

      if (query) {
        whereClause += ' AND MATCH(d.title) AGAINST(? IN NATURAL LANGUAGE MODE)';
        params.push(query);
      }

      if (filters.category) {
        whereClause += ' AND d.category = ?';
        params.push(filters.category);
      }

      if (filters.store) {
        whereClause += ' AND d.store = ?';
        params.push(filters.store);
      }

      if (filters.minDiscount) {
        whereClause += ' AND d.discount >= ?';
        params.push(filters.minDiscount);
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const [deals] = await conn.execute(`
        SELECT d.*, das.total_views, das.conversion_rate
        FROM deals d
        LEFT JOIN deal_analytics_summary das ON d.id = das.deal_id
        WHERE ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return deals;
    }, 180, 'search'); // 3 minute cache
  }

  /**
   * Cache analytics data
   */
  async getCachedAnalytics(timeRange = '7d') {
    const cacheKey = this.generateKey('analytics', timeRange);
    return this.getOrSet(cacheKey, async () => {
      const conn = await this.connect();

      const dateCondition = timeRange === '7d' ? 'DATE_SUB(NOW(), INTERVAL 7 DAY)' :
                           timeRange === '30d' ? 'DATE_SUB(NOW(), INTERVAL 30 DAY)' :
                           'DATE_SUB(NOW(), INTERVAL 1 DAY)';

      try {
        const [analytics] = await conn.execute(`
          SELECT
            COUNT(DISTINCT u.firebase_uid) as total_users,
            COUNT(DISTINCT CASE WHEN u.created_at >= ${dateCondition} THEN u.firebase_uid END) as new_users,
            COUNT(d.id) as total_deals,
            COUNT(CASE WHEN d.verified = 1 THEN 1 END) as verified_deals,
            COALESCE(SUM(das.total_views), 0) as total_views,
            COALESCE(SUM(das.total_clicks), 0) as total_clicks,
            COALESCE(AVG(das.conversion_rate), 0) as avg_conversion_rate
          FROM users u
          CROSS JOIN deals d
          LEFT JOIN deal_analytics_summary das ON d.id = das.deal_id
          WHERE d.deleted = 0
        `);

        return analytics[0] || {};
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE' && error.sqlMessage.includes('deal_analytics_summary')) {
          console.warn('⚠️  deal_analytics_summary table not found, using basic analytics');
          // Fallback to basic analytics without the analytics summary table
          const [basicAnalytics] = await conn.execute(`
            SELECT
              COUNT(DISTINCT u.firebase_uid) as total_users,
              COUNT(DISTINCT CASE WHEN u.created_at >= ${dateCondition} THEN u.firebase_uid END) as new_users,
              COUNT(d.id) as total_deals,
              COUNT(CASE WHEN d.verified = 1 THEN 1 END) as verified_deals,
              0 as total_views,
              0 as total_clicks,
              0 as avg_conversion_rate
            FROM users u
            CROSS JOIN deals d
            WHERE d.deleted = 0
          `);

          return basicAnalytics[0] || {};
        }
        throw error;
      }
    }, 600, 'analytics'); // 10 minute cache
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired() {
    const conn = await this.connect();

    // Clean up memory cache
    const now = new Date();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expires_at <= now) {
        this.memoryCache.delete(key);
      }
    }

    // Clean up database cache
    const [result] = await conn.execute(`
      DELETE FROM cache_store WHERE expires_at <= NOW()
    `);

    return result.affectedRows;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCache: {
        items: this.memoryCache.size,
        maxItems: this.maxMemoryItems
      }
    };
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}