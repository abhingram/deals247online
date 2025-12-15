#!/usr/bin/env node

/**
 * Create Phase 4 Tables Script
 * Creates the essential tables for Phase 4 features
 */

import mysql from 'mysql2/promise.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function createTables() {
  let connection;

  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Create deal_analytics_summary table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS deal_analytics_summary (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT NOT NULL,
        total_views INT DEFAULT 0,
        total_clicks INT DEFAULT 0,
        total_shares INT DEFAULT 0,
        total_ratings INT DEFAULT 0,
        total_reviews INT DEFAULT 0,
        avg_rating DECIMAL(3,2) DEFAULT 0,
        conversion_rate DECIMAL(5,4) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        UNIQUE KEY unique_deal (deal_id),
        INDEX idx_conversion_rate (conversion_rate DESC),
        INDEX idx_total_views (total_views DESC)
      )
    `);

    console.log('✅ deal_analytics_summary table created');

    // Create deal_predictions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS deal_predictions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT NOT NULL,
        predicted_discount DECIMAL(5,2),
        predicted_price DECIMAL(10,2),
        confidence_score DECIMAL(3,2),
        prediction_basis ENUM('trend_analysis', 'seasonal', 'category_avg', 'price_history') NOT NULL,
        predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP NULL,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_deal_prediction (deal_id, predicted_at DESC),
        INDEX idx_confidence (confidence_score DESC)
      )
    `);

    console.log('✅ deal_predictions table created');

    // Create cache_store table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cache_store (
        cache_key VARCHAR(255) PRIMARY KEY,
        cache_value LONGTEXT NOT NULL,
        cache_type ENUM('product', 'deal', 'analytics', 'search') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expires_type (expires_at, cache_type),
        INDEX idx_type_key (cache_type, cache_key)
      )
    `);

    console.log('✅ cache_store table created');

    // Create user_segments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_segments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        segment_type ENUM('high_value', 'price_sensitive', 'deal_hunter', 'category_focused', 'inactive') NOT NULL,
        segment_score DECIMAL(3,2) DEFAULT 0,
        segment_data JSON,
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_segment (user_id, segment_type),
        INDEX idx_segment_type_score (segment_type, segment_score DESC)
      )
    `);

    console.log('✅ user_segments table created');

    console.log('🎉 All Phase 4 tables created successfully!');

  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables();
}

export { createTables };