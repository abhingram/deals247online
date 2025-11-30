import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000
    });

    console.log('Connected to database successfully');

    // Create saved_searches table
    console.log('Creating saved_searches table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        search_query VARCHAR(500),
        filters JSON,
        sort_by VARCHAR(50) DEFAULT 'newest',
        is_default BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_is_default (is_default)
      )
    `);

    // Create search_history table
    console.log('Creating search_history table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255),
        search_query VARCHAR(500),
        filters JSON,
        results_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create deal_comparisons table
    console.log('Creating deal_comparisons table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS deal_comparisons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_ids JSON NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create user_recommendations table
    console.log('Creating user_recommendations table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT NOT NULL,
        recommendation_score DECIMAL(3,2) DEFAULT 0,
        reason VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_recommendation_score (recommendation_score)
      )
    `);

    console.log('✅ All missing tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlState) {
      console.error('SQL State:', error.sqlState);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

createMissingTables();