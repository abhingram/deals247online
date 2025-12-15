import mysql from 'mysql2/promise.js';
import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

// Phase 8: Advanced Analytics & AI/ML Database Schema

async function createAnalyticsTables() {
  try {
    console.log('🔄 Creating Phase 8 Analytics Tables...');

    // Analytics Events Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_type VARCHAR(50) NOT NULL,
        user_id INT,
        session_id VARCHAR(100),
        event_data JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        url VARCHAR(500),
        referrer VARCHAR(500),
        INDEX idx_event_type (event_type),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_session_id (session_id)
      )
    `);
    console.log('✅ Created analytics_events table');

    // User Behavior Analytics
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        page_views INT DEFAULT 0,
        deals_viewed INT DEFAULT 0,
        deals_clicked INT DEFAULT 0,
        time_spent_seconds INT DEFAULT 0,
        favorite_categories JSON,
        last_activity TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        INDEX idx_last_activity (last_activity)
      )
    `);
    console.log('✅ Created user_analytics table');

    // Deal Performance Analytics
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS deal_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT,
        views INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        avg_time_spent INT DEFAULT 0,
        bounce_rate DECIMAL(5,2) DEFAULT 0,
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_deal_date (deal_id, date),
        INDEX idx_deal_id (deal_id),
        INDEX idx_date (date)
      )
    `);
    console.log('✅ Created deal_analytics table');

    // Recommendation Engine Data
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        deal_id INT,
        recommendation_score DECIMAL(5,4),
        recommendation_type VARCHAR(50),
        context_data JSON,
        was_clicked BOOLEAN DEFAULT FALSE,
        was_converted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_deal (user_id, deal_id),
        INDEX idx_score (recommendation_score),
        INDEX idx_type (recommendation_type)
      )
    `);
    console.log('✅ Created user_recommendations table');

    // ML Model Performance Tracking
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ml_model_metrics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        model_name VARCHAR(100),
        model_version VARCHAR(50),
        metric_name VARCHAR(100),
        metric_value DECIMAL(10,4),
        dataset_size INT,
        training_time_seconds INT,
        accuracy DECIMAL(5,4),
        \`precision\` DECIMAL(5,4),
        recall DECIMAL(5,4),
        f1_score DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_model_version (model_name, model_version),
        INDEX idx_metric (metric_name)
      )
    `);
    console.log('✅ Created ml_model_metrics table');

    // Price Intelligence Data
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS price_intelligence (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id VARCHAR(100),
        product_name VARCHAR(255),
        current_price DECIMAL(10,2),
        original_price DECIMAL(10,2),
        discount_percentage DECIMAL(5,2),
        predicted_price DECIMAL(10,2),
        price_trend VARCHAR(20),
        confidence_score DECIMAL(5,4),
        competitors_data JSON,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_trend (price_trend),
        INDEX idx_updated (last_updated)
      )
    `);
    console.log('✅ Created price_intelligence table');

    // Chatbot Conversations
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(100),
        user_id INT,
        user_message TEXT,
        bot_response TEXT,
        intent VARCHAR(100),
        confidence DECIMAL(5,4),
        was_helpful BOOLEAN,
        conversation_context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id),
        INDEX idx_user (user_id),
        INDEX idx_intent (intent)
      )
    `);
    console.log('✅ Created chatbot_conversations table');

    // A/B Testing Framework
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        test_name VARCHAR(100),
        test_description TEXT,
        variant_a_name VARCHAR(50),
        variant_b_name VARCHAR(50),
        variant_a_config JSON,
        variant_b_config JSON,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        status ENUM('draft', 'running', 'completed', 'cancelled') DEFAULT 'draft',
        winner_variant VARCHAR(50),
        statistical_significance DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_dates (start_date, end_date)
      )
    `);
    console.log('✅ Created ab_tests table');

    // A/B Test Results
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ab_test_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        test_id INT,
        variant VARCHAR(50),
        users_count INT DEFAULT 0,
        conversions INT DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        avg_session_duration INT DEFAULT 0,
        bounce_rate DECIMAL(5,2) DEFAULT 0,
        date DATE,
        FOREIGN KEY (test_id) REFERENCES ab_tests(id),
        UNIQUE KEY unique_test_variant_date (test_id, variant, date),
        INDEX idx_test_date (test_id, date)
      )
    `);
    console.log('✅ Created ab_test_results table');

    // Automated Reports
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS automated_reports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        report_name VARCHAR(100),
        report_type VARCHAR(50),
        report_config JSON,
        recipients JSON,
        last_generated TIMESTAMP,
        next_generation TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (report_type),
        INDEX idx_active (is_active),
        INDEX idx_next_gen (next_generation)
      )
    `);
    console.log('✅ Created automated_reports table');

    console.log('🎉 Phase 8 Analytics Tables Created Successfully!');
    console.log('📊 Ready for AI/ML features implementation');

  } catch (error) {
    console.error('❌ Error creating analytics tables:', error);
    process.exit(1);
  }
}

// Run the script
createAnalyticsTables().catch(console.error);