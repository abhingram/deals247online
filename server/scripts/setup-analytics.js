import db from '../database/connection.js';

console.log('Creating analytics tables...');

async function createTables() {
  try {
    // Create deal_views table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_views (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_viewed_at (viewed_at)
      )
    `);

    // Create deal_clicks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_clicks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255),
        deal_id INT NOT NULL,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_clicked_at (clicked_at)
      )
    `);

    // Create deal_ratings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_ratings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT NOT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_deal_rating (user_id, deal_id),
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_rating (rating)
      )
    `);

    // Create deal_reviews table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT NOT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        verified_purchase BOOLEAN DEFAULT 0,
        helpful_votes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create deal_shares table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_shares (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255),
        deal_id INT NOT NULL,
        platform ENUM('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'email', 'copy_link') NOT NULL,
        shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_platform (platform),
        INDEX idx_shared_at (shared_at)
      )
    `);

    // Create analytics_summary table
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_summary (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL,
        total_users INT DEFAULT 0,
        new_users INT DEFAULT 0,
        total_deals INT DEFAULT 0,
        active_deals INT DEFAULT 0,
        total_views INT DEFAULT 0,
        total_clicks INT DEFAULT 0,
        total_shares INT DEFAULT 0,
        total_ratings INT DEFAULT 0,
        total_reviews INT DEFAULT 0,
        avg_rating DECIMAL(3,2) DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date (date),
        INDEX idx_date (date)
      )
    `);

    console.log('✅ Analytics tables created successfully');

    // Add analytics columns to deals table
    await db.query(`
      ALTER TABLE deals
      ADD COLUMN IF NOT EXISTS total_views INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_clicks INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP NULL
    `);

    // Add analytics columns to users table
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS total_views INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_clicks INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_favorites INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    console.log('✅ Analytics columns added to existing tables');

    // Insert sample data
    await db.query(`
      INSERT IGNORE INTO users (firebase_uid, email, display_name, role) VALUES
      ('admin_user_123', 'admin@test.com', 'Admin User', 'admin'),
      ('test_user_456', 'user@test.com', 'Test User', 'user'),
      ('demo_user_789', 'demo@test.com', 'Demo User', 'user')
    `);

    await db.query(`
      INSERT IGNORE INTO deal_views (user_id, deal_id, viewed_at) VALUES
      ('admin_user_123', 1, NOW()),
      ('admin_user_123', 2, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
      ('test_user_456', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
      ('test_user_456', 3, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
      ('demo_user_789', 2, DATE_SUB(NOW(), INTERVAL 4 HOUR))
    `);

    await db.query(`
      INSERT IGNORE INTO deal_clicks (user_id, deal_id, clicked_at, ip_address) VALUES
      ('admin_user_123', 1, NOW(), '192.168.1.1'),
      ('test_user_456', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), '192.168.1.2'),
      ('demo_user_789', 2, DATE_SUB(NOW(), INTERVAL 2 HOUR), '192.168.1.3')
    `);

    await db.query(`
      INSERT IGNORE INTO deal_ratings (user_id, deal_id, rating) VALUES
      ('admin_user_123', 1, 5),
      ('test_user_456', 1, 4),
      ('demo_user_789', 2, 5),
      ('admin_user_123', 3, 4)
    `);

    await db.query(`
      INSERT IGNORE INTO deal_reviews (user_id, deal_id, rating, title, comment, verified_purchase) VALUES
      ('admin_user_123', 1, 5, 'Excellent product!', 'This iPhone is amazing. Great camera and performance.', 1),
      ('test_user_456', 1, 4, 'Good value', 'Solid phone, good battery life and features.', 0),
      ('demo_user_789', 2, 5, 'Best headphones ever', 'Amazing sound quality and noise cancellation.', 1)
    `);

    await db.query(`
      INSERT IGNORE INTO deal_shares (user_id, deal_id, platform, shared_at) VALUES
      ('admin_user_123', 1, 'facebook', NOW()),
      ('test_user_456', 2, 'twitter', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
      ('demo_user_789', 3, 'whatsapp', DATE_SUB(NOW(), INTERVAL 2 HOUR))
    `);

    // Update deals with aggregated data
    await db.query(`
      UPDATE deals SET
        total_views = (SELECT COUNT(*) FROM deal_views WHERE deal_views.deal_id = deals.id),
        total_clicks = (SELECT COUNT(*) FROM deal_clicks WHERE deal_clicks.deal_id = deals.id),
        total_shares = (SELECT COUNT(*) FROM deal_shares WHERE deal_shares.deal_id = deals.id),
        total_ratings = (SELECT COUNT(*) FROM deal_ratings WHERE deal_ratings.deal_id = deals.id),
        total_reviews = (SELECT COUNT(*) FROM deal_reviews WHERE deal_reviews.deal_id = deals.id),
        avg_rating = COALESCE((SELECT AVG(rating) FROM deal_ratings WHERE deal_ratings.deal_id = deals.id), 0)
    `);

    // Update users with aggregated data
    await db.query(`
      UPDATE users SET
        total_views = (SELECT COUNT(*) FROM deal_views WHERE deal_views.user_id = users.firebase_uid),
        total_clicks = (SELECT COUNT(*) FROM deal_clicks WHERE deal_clicks.user_id = users.firebase_uid),
        total_ratings = (SELECT COUNT(*) FROM deal_ratings WHERE deal_ratings.user_id = users.firebase_uid),
        total_reviews = (SELECT COUNT(*) FROM deal_reviews WHERE deal_reviews.user_id = users.firebase_uid)
    `);

    console.log('✅ Sample analytics data inserted and aggregated');
    console.log('🎉 Analytics setup completed successfully!');

  } catch (error) {
    console.error('❌ Error creating analytics tables:', error);
    throw error;
  }
}

createTables().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});