import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createSocialTables() {
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

    // Enhance deal_reviews table with photos
    console.log('Enhancing deal_reviews table...');
    await connection.execute(`
      ALTER TABLE deal_reviews
      ADD COLUMN IF NOT EXISTS photos JSON DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS pros TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS cons TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_helpful INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_unhelpful INT DEFAULT 0
    `);

    // Create review_photos table for better photo management
    console.log('Creating review_photos table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_photos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        review_id INT NOT NULL,
        photo_url VARCHAR(500) NOT NULL,
        photo_order INT DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES deal_reviews(id) ON DELETE CASCADE,
        INDEX idx_review_id (review_id)
      )
    `);

    // Create user_generated_content table
    console.log('Creating user_generated_content table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_generated_content (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT,
        content_type ENUM('guide', 'tip', 'unboxing', 'review') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        tags JSON DEFAULT NULL,
        images JSON DEFAULT NULL,
        videos JSON DEFAULT NULL,
        featured BOOLEAN DEFAULT 0,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        views_count INT DEFAULT 0,
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_content_type (content_type),
        INDEX idx_status (status),
        INDEX idx_featured (featured)
      )
    `);

    // Create content_likes table
    console.log('Creating content_likes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS content_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        content_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_id) REFERENCES user_generated_content(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_content (user_id, content_id),
        INDEX idx_user_id (user_id),
        INDEX idx_content_id (content_id)
      )
    `);

    // Create content_comments table
    console.log('Creating content_comments table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS content_comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        content_id INT NOT NULL,
        parent_comment_id INT DEFAULT NULL,
        comment TEXT NOT NULL,
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (content_id) REFERENCES user_generated_content(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES content_comments(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_content_id (content_id),
        INDEX idx_parent_comment (parent_comment_id)
      )
    `);

    // Create deal_discussions table for forum-like discussions
    console.log('Creating deal_discussions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS deal_discussions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category ENUM('question', 'discussion', 'tip', 'complaint', 'general') DEFAULT 'discussion',
        pinned BOOLEAN DEFAULT 0,
        locked BOOLEAN DEFAULT 0,
        replies_count INT DEFAULT 0,
        likes_count INT DEFAULT 0,
        views_count INT DEFAULT 0,
        last_reply_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_deal_id (deal_id),
        INDEX idx_user_id (user_id),
        INDEX idx_category (category),
        INDEX idx_pinned (pinned),
        INDEX idx_locked (locked)
      )
    `);

    // Create discussion_replies table
    console.log('Creating discussion_replies table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS discussion_replies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        discussion_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        parent_reply_id INT DEFAULT NULL,
        content TEXT NOT NULL,
        likes_count INT DEFAULT 0,
        is_answer BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (discussion_id) REFERENCES deal_discussions(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies(id) ON DELETE CASCADE,
        INDEX idx_discussion_id (discussion_id),
        INDEX idx_user_id (user_id),
        INDEX idx_parent_reply (parent_reply_id),
        INDEX idx_is_answer (is_answer)
      )
    `);

    // Create discussion_likes table
    console.log('Creating discussion_likes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS discussion_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        discussion_id INT DEFAULT NULL,
        reply_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discussion_id) REFERENCES deal_discussions(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_id) REFERENCES discussion_replies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_discussion (user_id, discussion_id),
        UNIQUE KEY unique_user_reply (user_id, reply_id),
        INDEX idx_user_id (user_id),
        INDEX idx_discussion_id (discussion_id),
        INDEX idx_reply_id (reply_id)
      )
    `);

    // Create social_shares table for enhanced sharing
    console.log('Creating social_shares table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS social_shares (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255),
        content_type ENUM('deal', 'review', 'guide', 'discussion') NOT NULL,
        content_id INT NOT NULL,
        platform ENUM('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email', 'copy_link') NOT NULL,
        share_url VARCHAR(1000),
        shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        INDEX idx_user_id (user_id),
        INDEX idx_content_type (content_type),
        INDEX idx_content_id (content_id),
        INDEX idx_platform (platform)
      )
    `);

    // Create user_follows table for following users
    console.log('Creating user_follows table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id INT PRIMARY KEY AUTO_INCREMENT,
        follower_id VARCHAR(255) NOT NULL,
        following_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, following_id),
        INDEX idx_follower_id (follower_id),
        INDEX idx_following_id (following_id)
      )
    `);

    // Add social fields to users table
    console.log('Adding social fields to users table...');
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS social_links JSON DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS badges JSON DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_content INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_likes_received INT DEFAULT 0
    `);

    console.log('✅ All social and community tables created successfully!');

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

createSocialTables();