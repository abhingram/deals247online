import db from '../../config/database.js';
import { amazonClient } from './amazonClient.js';
import { amazonNormalizer } from './amazonNormalizer.js';

/**
 * Amazon Product Ingestor
 * Orchestrates bulk ingestion of Amazon products
 */
export class AmazonIngestor {
  constructor() {
    this.batchSize = 10; // Process 10 products at a time
    this.delayBetweenBatches = 2000; // 2 seconds between batches
  }

  /**
   * Ingest products for a specific category
   */
  async ingestCategory(category, keywords = [], maxItems = 100) {
    console.log(`🚀 Starting ingestion for category: ${category}`);

    try {
      const products = [];
      let totalProcessed = 0;

      // Generate search queries for the category
      const searchQueries = this.generateSearchQueries(category, keywords);

      for (const query of searchQueries) {
        if (totalProcessed >= maxItems) break;

        try {
          const batchProducts = await this.searchAndIngestBatch(query, Math.min(10, maxItems - totalProcessed));
          products.push(...batchProducts);
          totalProcessed += batchProducts.length;

          // Rate limiting delay
          if (totalProcessed < maxItems) {
            await this.delay(this.delayBetweenBatches);
          }

        } catch (error) {
          console.error(`Error processing query "${query}":`, error);
          continue; // Continue with next query
        }
      }

      console.log(`✅ Completed ingestion for ${category}: ${products.length} products`);
      return products;

    } catch (error) {
      console.error(`❌ Failed to ingest category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Search and ingest a batch of products
   */
  async searchAndIngestBatch(searchQuery, itemCount = 10) {
    try {
      // Search Amazon
      const searchParams = {
        Keywords: searchQuery,
        ItemCount: itemCount,
        SearchIndex: 'All'
      };

      const searchResponse = await amazonClient.searchItems(searchParams);

      // Normalize results
      const normalizedProducts = amazonNormalizer.normalizeSearchResults(searchResponse);

      // Store in database
      const storedProducts = await this.storeProducts(normalizedProducts);

      return storedProducts;

    } catch (error) {
      console.error('Error in search and ingest batch:', error);
      throw error;
    }
  }

  /**
   * Store products in database
   */
  async storeProducts(products) {
    const storedProducts = [];

    for (const product of products) {
      try {
        const stored = await this.storeSingleProduct(product);
        if (stored) {
          storedProducts.push(stored);
        }
      } catch (error) {
        console.error(`Error storing product ${product.external_product_id}:`, error);
        continue; // Continue with next product
      }
    }

    return storedProducts;
  }

  /**
   * Store a single product with conflict resolution
   */
  async storeSingleProduct(product) {
    try {
      // Check if product already exists
      const [existing] = await db.query(
        'SELECT id, current_price FROM products WHERE external_product_id = ? AND store = ?',
        [product.external_product_id, product.store]
      );

      let productId;

      if (existing.length > 0) {
        // Update existing product
        productId = existing[0].id;

        await db.query(
          `UPDATE products SET
            title = ?,
            current_price = ?,
            mrp = ?,
            discount_percent = ?,
            image_url = ?,
            product_url = ?,
            category = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            product.title,
            product.price,
            product.mrp,
            product.discount_percent,
            product.image_url,
            product.product_url,
            product.category,
            productId
          ]
        );

        // Record price history if price changed
        if (existing[0].current_price !== product.price) {
          await this.recordPriceHistory(productId, product);
        }

      } else {
        // Insert new product
        const [result] = await db.query(
          `INSERT INTO products
            (external_product_id, store, title, current_price, mrp, discount_percent,
             image_url, product_url, category, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.external_product_id,
            product.store,
            product.title,
            product.price,
            product.mrp,
            product.discount_percent,
            product.image_url,
            product.product_url,
            product.category,
            true
          ]
        );

        productId = result.insertId;

        // Record initial price history
        await this.recordPriceHistory(productId, product);
      }

      return { ...product, id: productId };

    } catch (error) {
      console.error('Error storing product:', error);
      throw error;
    }
  }

  /**
   * Record price history
   */
  async recordPriceHistory(productId, product) {
    try {
      await db.query(
        `INSERT INTO price_history
          (product_id, price, mrp, discount_percent, source)
        VALUES (?, ?, ?, ?, ?)`,
        [
          productId,
          product.price,
          product.mrp,
          product.discount_percent,
          'amazon_api'
        ]
      );
    } catch (error) {
      console.error('Error recording price history:', error);
    }
  }

  /**
   * Generate search queries for a category
   */
  generateSearchQueries(category, customKeywords = []) {
    const baseKeywords = this.getCategoryKeywords(category);
    const allKeywords = [...baseKeywords, ...customKeywords];

    // Generate combinations for better coverage
    const queries = [];

    // Single keywords
    queries.push(...allKeywords.slice(0, 10)); // Limit to avoid too many requests

    // Popular product combinations
    if (category === 'Electronics') {
      queries.push('smartphone', 'laptop', 'headphones', 'smart watch');
    } else if (category === 'Fashion') {
      queries.push('shirt', 'jeans', 'shoes', 'watch');
    }

    return [...new Set(queries)]; // Remove duplicates
  }

  /**
   * Get keywords for a category
   */
  getCategoryKeywords(category) {
    const categoryKeywords = {
      'Electronics': ['phone', 'laptop', 'tablet', 'headphones', 'charger', 'power bank', 'earbuds'],
      'Fashion': ['shirt', 'jeans', 'shoes', 'watch', 'bag', 'jewelry', 'sunglasses'],
      'Home': ['kitchen', 'furniture', 'decor', 'appliance', 'utensil', 'bedding'],
      'Books': ['novel', 'textbook', 'biography', 'self-help', 'cookbook'],
      'Sports': ['equipment', 'clothing', 'shoes', 'accessories', 'fitness'],
      'Beauty': ['skincare', 'makeup', 'haircare', 'fragrance', 'personal care'],
      'Toys': ['games', 'puzzles', 'educational', 'outdoor', 'building'],
      'Automotive': ['car accessories', 'bike accessories', 'maintenance', 'tools']
    };

    return categoryKeywords[category] || [category.toLowerCase()];
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get ingestion statistics
   */
  async getStats() {
    try {
      const [productStats] = await db.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
          COUNT(DISTINCT category) as categories,
          AVG(discount_percent) as avg_discount
        FROM products
      `);

      const [historyStats] = await db.query(`
        SELECT COUNT(*) as total_price_records
        FROM price_history
      `);

      return {
        products: productStats[0],
        priceHistory: historyStats[0]
      };

    } catch (error) {
      console.error('Error getting ingestion stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const amazonIngestor = new AmazonIngestor();