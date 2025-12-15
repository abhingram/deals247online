import db from '../../config/database.js';
import { amazonClient } from './amazonClient.js';
import { amazonNormalizer } from './amazonNormalizer.js';

/**
 * Amazon Product Refresher
 * Handles price monitoring and deal detection
 */
export class AmazonRefresher {
  constructor() {
    this.batchSize = 20; // Check 20 products at a time
    this.dealThreshold = 0.15; // 15% discount threshold for deals
  }

  /**
   * Refresh prices for all active products
   */
  async refreshAllPrices() {
    console.log('🔄 Starting price refresh for all products');

    try {
      const products = await this.getActiveProducts();
      console.log(`Found ${products.length} active products to refresh`);

      const results = {
        processed: 0,
        priceChanges: 0,
        newDeals: 0,
        errors: 0
      };

      // Process in batches
      for (let i = 0; i < products.length; i += this.batchSize) {
        const batch = products.slice(i, i + this.batchSize);
        const batchResults = await this.refreshBatch(batch);
        results.processed += batchResults.processed;
        results.priceChanges += batchResults.priceChanges;
        results.newDeals += batchResults.newDeals;
        results.errors += batchResults.errors;

        // Rate limiting delay
        if (i + this.batchSize < products.length) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Price refresh completed:`, results);
      return results;

    } catch (error) {
      console.error('❌ Failed to refresh prices:', error);
      throw error;
    }
  }

  /**
   * Refresh prices for a specific category
   */
  async refreshCategory(category) {
    console.log(`🔄 Starting price refresh for category: ${category}`);

    try {
      const products = await this.getActiveProductsByCategory(category);
      return await this.refreshBatch(products);

    } catch (error) {
      console.error(`❌ Failed to refresh category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Refresh a batch of products
   */
  async refreshBatch(products) {
    const results = {
      processed: 0,
      priceChanges: 0,
      newDeals: 0,
      errors: 0
    };

    for (const product of products) {
      try {
        const updated = await this.refreshSingleProduct(product);

        if (updated.priceChanged) {
          results.priceChanges++;
        }

        if (updated.newDeal) {
          results.newDeals++;
        }

        results.processed++;

      } catch (error) {
        console.error(`Error refreshing product ${product.id}:`, error);
        results.errors++;
        continue;
      }
    }

    return results;
  }

  /**
   * Refresh a single product's price
   */
  async refreshSingleProduct(product) {
    try {
      // Get current price from Amazon
      const currentData = await amazonClient.getItems([product.external_product_id]);

      if (!currentData || !currentData.Items || currentData.Items.length === 0) {
        console.warn(`No data found for product ${product.external_product_id}`);
        return { priceChanged: false, newDeal: false };
      }

      const amazonProduct = currentData.Items[0];
      const normalizedData = amazonNormalizer.normalizeItem(amazonProduct);

      const oldPrice = product.current_price;
      const newPrice = normalizedData.price;
      const newMrp = normalizedData.mrp;
      const newDiscountPercent = normalizedData.discount_percent;

      let priceChanged = false;
      let newDeal = false;

      // Check if price changed
      if (oldPrice !== newPrice) {
        priceChanged = true;

        // Update product
        await db.query(
          `UPDATE products SET
            current_price = ?,
            mrp = ?,
            discount_percent = ?,
            image_url = ?,
            product_url = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            newPrice,
            newMrp,
            newDiscountPercent,
            normalizedData.image_url,
            normalizedData.product_url,
            product.id
          ]
        );

        // Record price history
        await this.recordPriceHistory(product.id, {
          price: newPrice,
          mrp: newMrp,
          discount_percent: newDiscountPercent
        });

        // Check if this creates a new deal
        if (this.isDeal(newDiscountPercent)) {
          newDeal = await this.createOrUpdateDeal(product.id, normalizedData);
        }
      }

      return { priceChanged, newDeal };

    } catch (error) {
      console.error(`Error refreshing product ${product.id}:`, error);
      throw error;
    }
  }

  /**
   * Record price history
   */
  async recordPriceHistory(productId, priceData) {
    try {
      await db.query(
        `INSERT INTO price_history
          (product_id, price, mrp, discount_percent, source)
        VALUES (?, ?, ?, ?, ?)`,
        [
          productId,
          priceData.price,
          priceData.mrp,
          priceData.discount_percent,
          'amazon_refresh'
        ]
      );
    } catch (error) {
      console.error('Error recording price history:', error);
    }
  }

  /**
   * Check if discount qualifies as a deal
   */
  isDeal(discountPercent) {
    return discountPercent >= this.dealThreshold;
  }

  /**
   * Create or update a deal in the deals table
   */
  async createOrUpdateDeal(productId, productData) {
    try {
      // Check if deal already exists for this product
      const [existing] = await db.query(
        'SELECT id FROM deals WHERE product_id = ? AND is_active = 1',
        [productId]
      );

      if (existing.length > 0) {
        // Update existing deal
        await db.query(
          `UPDATE deals SET
            title = ?,
            description = ?,
            original_price = ?,
            discounted_price = ?,
            discount_percentage = ?,
            image_url = ?,
            deal_url = ?,
            store = ?,
            category = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            productData.title,
            `Great deal on ${productData.title}`,
            productData.mrp,
            productData.price,
            productData.discount_percent,
            productData.image_url,
            productData.product_url,
            productData.store,
            productData.category,
            existing[0].id
          ]
        );

        return false; // Not a new deal, just updated

      } else {
        // Create new deal
        await db.query(
          `INSERT INTO deals
            (product_id, title, description, original_price, discounted_price,
             discount_percentage, image_url, deal_url, store, category, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            productData.title,
            `Great deal on ${productData.title}`,
            productData.mrp,
            productData.price,
            productData.discount_percent,
            productData.image_url,
            productData.product_url,
            productData.store,
            productData.category,
            true
          ]
        );

        return true; // New deal created
      }

    } catch (error) {
      console.error('Error creating/updating deal:', error);
      return false;
    }
  }

  /**
   * Get all active products
   */
  async getActiveProducts() {
    try {
      const [products] = await db.query(
        'SELECT * FROM products WHERE is_active = 1 ORDER BY updated_at ASC'
      );
      return products;
    } catch (error) {
      console.error('Error getting active products:', error);
      return [];
    }
  }

  /**
   * Get active products by category
   */
  async getActiveProductsByCategory(category) {
    try {
      const [products] = await db.query(
        'SELECT * FROM products WHERE is_active = 1 AND category = ? ORDER BY updated_at ASC',
        [category]
      );
      return products;
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  }

  /**
   * Clean up expired deals (products no longer on sale)
   */
  async cleanupExpiredDeals() {
    console.log('🧹 Starting cleanup of expired deals');

    try {
      // Find deals where product discount is below threshold
      const [expiredDeals] = await db.query(`
        SELECT d.id, d.product_id, p.discount_percent
        FROM deals d
        JOIN products p ON d.product_id = p.id
        WHERE d.is_active = 1 AND p.discount_percent < ?
      `, [this.dealThreshold]);

      if (expiredDeals.length > 0) {
        const dealIds = expiredDeals.map(deal => deal.id);

        await db.query(
          'UPDATE deals SET is_active = 0, updated_at = NOW() WHERE id IN (?)',
          [dealIds]
        );

        console.log(`✅ Cleaned up ${expiredDeals.length} expired deals`);
        return expiredDeals.length;
      }

      console.log('✅ No expired deals to clean up');
      return 0;

    } catch (error) {
      console.error('❌ Failed to cleanup expired deals:', error);
      throw error;
    }
  }

  /**
   * Get refresh statistics
   */
  async getStats() {
    try {
      const [productStats] = await db.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
          AVG(current_price) as avg_price,
          MAX(discount_percent) as max_discount
        FROM products
      `);

      const [dealStats] = await db.query(`
        SELECT
          COUNT(*) as total_deals,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_deals,
          AVG(discount_percentage) as avg_deal_discount
        FROM deals
      `);

      const [historyStats] = await db.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT product_id) as products_with_history
        FROM price_history
        WHERE DATE(created_at) = CURDATE()
      `);

      return {
        products: productStats[0],
        deals: dealStats[0],
        priceHistory: historyStats[0]
      };

    } catch (error) {
      console.error('Error getting refresh stats:', error);
      return null;
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const amazonRefresher = new AmazonRefresher();