-- Create users table for role management
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  firebase_uid VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  photo_url TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_firebase_uid (firebase_uid),
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  store VARCHAR(100) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  discounted_price DECIMAL(10, 2) NOT NULL,
  discount INT NOT NULL,
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews INT DEFAULT 0,
  image TEXT,
  category VARCHAR(100),
  expires_at DATETIME,
  verified BOOLEAN DEFAULT 0,
  deleted BOOLEAN DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_store (store),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted (deleted)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  logo TEXT,
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  deal_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_deal (user_id, deal_id),
  INDEX idx_user_id (user_id),
  INDEX idx_deal_id (deal_id)
);

-- Create deal_views table for tracking user interactions
CREATE TABLE IF NOT EXISTS deal_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  deal_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_deal_id (deal_id),
  INDEX idx_viewed_at (viewed_at)
);

-- Create deal_clicks table for tracking deal clicks
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
);

-- Create deal_ratings table for user ratings
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
);

-- Create deal_reviews table for user reviews
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
);

-- Create deal_review_votes table for helpful votes
CREATE TABLE IF NOT EXISTS deal_review_votes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  review_id INT NOT NULL,
  vote_type ENUM('helpful', 'not_helpful') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES deal_reviews(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_review_vote (user_id, review_id),
  INDEX idx_user_id (user_id),
  INDEX idx_review_id (review_id)
);

-- Create deal_shares table for tracking social shares
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
);

-- Create analytics_summary table for cached analytics data
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
);

-- Create notification_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  deal_expiring BOOLEAN DEFAULT 1,
  deal_expired BOOLEAN DEFAULT 0,
  new_deal BOOLEAN DEFAULT 1,
  price_drop BOOLEAN DEFAULT 1,
  system BOOLEAN DEFAULT 1,
  email_enabled BOOLEAN DEFAULT 1,
  push_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Create notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  type ENUM('deal_expiring', 'deal_expired', 'new_deal', 'price_drop', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_read_at (read_at),
  INDEX idx_created_at (created_at)
);

-- Create saved_searches table for user saved searches
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
);

-- Create search_history table for tracking user searches
CREATE TABLE IF NOT EXISTS search_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255),
  search_query VARCHAR(500),
  filters JSON,
  results_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_search_query (search_query(100))
);

-- Create deal_comparisons table for deal comparison feature
CREATE TABLE IF NOT EXISTS deal_comparisons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  deal_ids JSON NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Create user_recommendations table for storing personalized recommendations
CREATE TABLE IF NOT EXISTS user_recommendations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  deal_id INT NOT NULL,
  recommendation_score DECIMAL(3,2) DEFAULT 0,
  reason ENUM('viewed_similar', 'favorited_category', 'price_range', 'popular_in_category', 'trending') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_deal_id (deal_id),
  INDEX idx_recommendation_score (recommendation_score),
  INDEX idx_reason (reason)
);

-- Add subcategories to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INT NULL AFTER name;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level TINYINT DEFAULT 1 AFTER parent_id;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER level;

-- Add analytics fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_views INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_clicks INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP NULL;

-- Add analytics fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_views INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_clicks INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_favorites INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Insert sample subcategories
INSERT INTO categories (name, slug, icon, parent_id, level, sort_order) VALUES
('Smartphones', 'smartphones', 'Smartphone', (SELECT id FROM categories WHERE slug = 'electronics'), 2, 1),
('Laptops', 'laptops', 'Laptop', (SELECT id FROM categories WHERE slug = 'computers'), 2, 1),
('Gaming Laptops', 'gaming-laptops', 'Gamepad2', (SELECT id FROM categories WHERE slug = 'computers'), 2, 2),
('Kitchen Appliances', 'kitchen-appliances', 'ChefHat', (SELECT id FROM categories WHERE slug = 'home'), 2, 1),
('Cleaning', 'cleaning', 'Sparkles', (SELECT id FROM categories WHERE slug = 'home'), 2, 2),
('Running Shoes', 'running-shoes', 'Shoe', (SELECT id FROM categories WHERE slug = 'fashion'), 2, 1),
('Smart Watches', 'smart-watches', 'Watch', (SELECT id FROM categories WHERE slug = 'watches'), 2, 1),
('Fiction', 'fiction', 'BookOpen', (SELECT id FROM categories WHERE slug = 'books'), 2, 1),
('Non-Fiction', 'non-fiction', 'BookOpen', (SELECT id FROM categories WHERE slug = 'books'), 2, 2)
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample categories
INSERT INTO categories (name, slug, icon) VALUES
('Electronics', 'electronics', 'Smartphone'),
('Computers', 'computers', 'Laptop'),
('Home & Kitchen', 'home', 'Home'),
('Fashion', 'fashion', 'Shirt'),
('Watches', 'watches', 'Watch'),
('Gaming', 'gaming', 'Gamepad2'),
('Books', 'books', 'BookOpen'),
('Baby & Kids', 'baby', 'Baby')
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample stores
INSERT INTO stores (name, website) VALUES
('Amazon', 'https://amazon.com'),
('Best Buy', 'https://bestbuy.com'),
('Walmart', 'https://walmart.com'),
('Target', 'https://target.com'),
('Apple Store', 'https://apple.com'),
('Nike', 'https://nike.com'),
('GameStop', 'https://gamestop.com'),
('Dyson', 'https://dyson.com'),
('B&H Photo', 'https://bhphotovideo.com'),
('Levi\'s', 'https://levis.com')
ON DUPLICATE KEY UPDATE name=name;

-- Add soft delete columns to deals table (for existing databases)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
-- Add index for deleted column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_deleted ON deals(deleted);

-- Insert sample deals
INSERT INTO deals (title, store, original_price, discounted_price, discount, rating, reviews, image, category, expires_at, verified) VALUES
('Apple iPhone 15 Pro Max - 256GB', 'Amazon', 1199.00, 999.00, 17, 4.8, 2453, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop', 'Electronics', DATE_ADD(NOW(), INTERVAL 2 DAY), 1),
('Sony WH-1000XM5 Wireless Headphones', 'Best Buy', 399.00, 298.00, 25, 4.9, 1876, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', 'Electronics', DATE_ADD(NOW(), INTERVAL 5 DAY), 1),
('MacBook Pro 14" M3 Pro - 512GB', 'Apple Store', 1999.00, 1799.00, 10, 4.7, 892, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop', 'Computers', DATE_ADD(NOW(), INTERVAL 1 DAY), 1),
('Samsung 65" QLED 4K Smart TV', 'Walmart', 1299.00, 899.00, 31, 4.6, 1234, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop', 'Electronics', DATE_ADD(NOW(), INTERVAL 3 DAY), 0),
('Nike Air Max 270 Running Shoes', 'Nike', 150.00, 89.00, 41, 4.5, 3421, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', 'Fashion', DATE_ADD(NOW(), INTERVAL 4 DAY), 1),
('KitchenAid Stand Mixer - 5 Quart', 'Target', 449.00, 299.00, 33, 4.9, 5678, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', 'Home & Kitchen', DATE_ADD(NOW(), INTERVAL 6 DAY), 1),
('PlayStation 5 Console', 'GameStop', 499.00, 449.00, 10, 4.8, 8901, 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop', 'Gaming', DATE_ADD(NOW(), INTERVAL 2 DAY), 1),
('Dyson V15 Detect Cordless Vacuum', 'Dyson', 749.00, 599.00, 20, 4.7, 2109, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', 'Home & Kitchen', DATE_ADD(NOW(), INTERVAL 7 DAY), 0),
('Apple Watch Series 9 GPS + Cellular', 'Amazon', 529.00, 429.00, 19, 4.8, 4532, 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop', 'Watches', DATE_ADD(NOW(), INTERVAL 3 DAY), 1),
('Canon EOS R6 Mark II Camera Body', 'B&H Photo', 2499.00, 2299.00, 8, 4.9, 678, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop', 'Electronics', DATE_ADD(NOW(), INTERVAL 5 DAY), 1),
('Levi\'s 501 Original Fit Jeans', 'Levi\'s', 69.00, 39.00, 43, 4.6, 12456, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', 'Fashion', DATE_ADD(NOW(), INTERVAL 8 DAY), 1),
('Kindle Paperwhite (16 GB)', 'Amazon', 149.00, 99.00, 34, 4.7, 34521, 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=400&h=400&fit=crop', 'Books', DATE_ADD(NOW(), INTERVAL 4 DAY), 1);

-- Insert sample users for testing
INSERT INTO users (firebase_uid, email, display_name, role, total_views, total_clicks, total_favorites, total_ratings, total_reviews) VALUES
('admin_user_123', 'admin@test.com', 'Admin User', 'admin', 150, 45, 12, 8, 5),
('test_user_456', 'user@test.com', 'Test User', 'user', 89, 23, 15, 12, 8),
('demo_user_789', 'demo@test.com', 'Demo User', 'user', 67, 18, 8, 6, 4)
ON DUPLICATE KEY UPDATE email=email;

-- Insert sample deal views
INSERT INTO deal_views (user_id, deal_id, viewed_at) VALUES
('admin_user_123', 1, NOW()),
('admin_user_123', 2, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('test_user_456', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('test_user_456', 3, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('demo_user_789', 2, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('demo_user_789', 4, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('admin_user_123', 5, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('test_user_456', 6, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
('demo_user_789', 7, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
('admin_user_123', 8, DATE_SUB(NOW(), INTERVAL 9 HOUR));

-- Insert sample deal clicks
INSERT INTO deal_clicks (user_id, deal_id, clicked_at, ip_address, user_agent) VALUES
('admin_user_123', 1, NOW(), '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('test_user_456', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
('demo_user_789', 2, DATE_SUB(NOW(), INTERVAL 2 HOUR), '192.168.1.3', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'),
('admin_user_123', 3, DATE_SUB(NOW(), INTERVAL 3 HOUR), '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('test_user_456', 4, DATE_SUB(NOW(), INTERVAL 4 HOUR), '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

-- Insert sample deal ratings
INSERT INTO deal_ratings (user_id, deal_id, rating, created_at) VALUES
('admin_user_123', 1, 5, NOW()),
('test_user_456', 1, 4, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('demo_user_789', 2, 5, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('admin_user_123', 3, 4, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('test_user_456', 4, 3, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('demo_user_789', 5, 5, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('admin_user_123', 6, 4, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('test_user_456', 7, 5, DATE_SUB(NOW(), INTERVAL 7 HOUR));

-- Insert sample deal reviews
INSERT INTO deal_reviews (user_id, deal_id, rating, title, comment, verified_purchase, helpful_votes, created_at) VALUES
('admin_user_123', 1, 5, 'Excellent product!', 'This iPhone is amazing. Great camera and performance.', 1, 3, NOW()),
('test_user_456', 1, 4, 'Good value', 'Solid phone, good battery life and features.', 0, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('demo_user_789', 2, 5, 'Best headphones ever', 'Amazing sound quality and noise cancellation.', 1, 5, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('admin_user_123', 3, 4, 'Great laptop', 'Perfect for work and development tasks.', 1, 2, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('test_user_456', 4, 3, 'Good TV', 'Picture quality is excellent, worth the price.', 0, 1, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- Insert sample deal shares
INSERT INTO deal_shares (user_id, deal_id, platform, shared_at) VALUES
('admin_user_123', 1, 'facebook', NOW()),
('test_user_456', 2, 'twitter', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('demo_user_789', 3, 'whatsapp', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('admin_user_123', 4, 'linkedin', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('test_user_456', 5, 'email', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('demo_user_789', 6, 'copy_link', DATE_SUB(NOW(), INTERVAL 5 HOUR));

-- Insert sample analytics summary data
INSERT INTO analytics_summary (date, total_users, new_users, total_deals, active_deals, total_views, total_clicks, total_shares, total_ratings, total_reviews, avg_rating, revenue) VALUES
(CURDATE(), 3, 1, 12, 10, 45, 12, 6, 8, 5, 4.25, 0.00),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 2, 0, 12, 11, 38, 9, 4, 6, 4, 4.17, 0.00),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 2, 1, 11, 9, 32, 7, 3, 4, 3, 4.00, 0.00),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 1, 0, 10, 8, 28, 6, 2, 3, 2, 4.33, 0.00)
ON DUPLICATE KEY UPDATE total_users=VALUES(total_users), total_views=VALUES(total_views);

-- Update deals table with aggregated analytics data
UPDATE deals SET
  total_views = (SELECT COUNT(*) FROM deal_views WHERE deal_views.deal_id = deals.id),
  total_clicks = (SELECT COUNT(*) FROM deal_clicks WHERE deal_clicks.deal_id = deals.id),
  total_shares = (SELECT COUNT(*) FROM deal_shares WHERE deal_shares.deal_id = deals.id),
  total_ratings = (SELECT COUNT(*) FROM deal_ratings WHERE deal_ratings.deal_id = deals.id),
  total_reviews = (SELECT COUNT(*) FROM deal_reviews WHERE deal_reviews.deal_id = deals.id),
  avg_rating = COALESCE((SELECT AVG(rating) FROM deal_ratings WHERE deal_ratings.deal_id = deals.id), 0),
  last_viewed_at = (SELECT MAX(viewed_at) FROM deal_views WHERE deal_views.deal_id = deals.id),
  last_clicked_at = (SELECT MAX(clicked_at) FROM deal_clicks WHERE deal_clicks.deal_id = deals.id);

-- Update users table with aggregated analytics data
UPDATE users SET
  total_views = (SELECT COUNT(*) FROM deal_views WHERE deal_views.user_id = users.firebase_uid),
  total_clicks = (SELECT COUNT(*) FROM deal_clicks WHERE deal_clicks.user_id = users.firebase_uid),
  total_favorites = (SELECT COUNT(*) FROM user_favorites WHERE user_favorites.user_id = users.firebase_uid),
  total_ratings = (SELECT COUNT(*) FROM deal_ratings WHERE deal_ratings.user_id = users.firebase_uid),
  total_reviews = (SELECT COUNT(*) FROM deal_reviews WHERE deal_reviews.user_id = users.firebase_uid),
  last_activity = GREATEST(
    COALESCE((SELECT MAX(viewed_at) FROM deal_views WHERE deal_views.user_id = users.firebase_uid), users.created_at),
    COALESCE((SELECT MAX(clicked_at) FROM deal_clicks WHERE deal_clicks.user_id = users.firebase_uid), users.created_at),
    users.created_at
  );
