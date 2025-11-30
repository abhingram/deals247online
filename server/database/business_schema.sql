-- Business Features Schema for Deals247
-- This file contains database tables for affiliate management, trust indicators, and business analytics

-- Create affiliate_links table for managing affiliate marketing
CREATE TABLE IF NOT EXISTS affiliate_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  original_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  commission_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  category VARCHAR(100),
  store VARCHAR(100),
  is_active BOOLEAN DEFAULT 1,
  total_clicks INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0.00,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_category (category),
  INDEX idx_store (store),
  INDEX idx_created_by (created_by)
);

-- Create affiliate_clicks table for tracking affiliate link clicks
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  affiliate_link_id INT NOT NULL,
  user_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE CASCADE,
  INDEX idx_affiliate_link_id (affiliate_link_id),
  INDEX idx_user_id (user_id),
  INDEX idx_clicked_at (clicked_at)
);

-- Create affiliate_conversions table for tracking conversions and commissions
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  affiliate_link_id INT NOT NULL,
  affiliate_click_id INT,
  user_id VARCHAR(255),
  order_id VARCHAR(255),
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'approved', 'paid', 'rejected') DEFAULT 'pending',
  payout_date TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE CASCADE,
  FOREIGN KEY (affiliate_click_id) REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
  INDEX idx_affiliate_link_id (affiliate_link_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create deal_verifications table for tracking deal verification status
CREATE TABLE IF NOT EXISTS deal_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deal_id INT NOT NULL,
  verified_by VARCHAR(255) NOT NULL,
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verification_notes TEXT,
  trust_score DECIMAL(3,2) DEFAULT 0.00,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  INDEX idx_deal_id (deal_id),
  INDEX idx_verified_by (verified_by),
  INDEX idx_verification_status (verification_status),
  INDEX idx_trust_score (trust_score)
);

-- Create store_reliability table for tracking store trust scores
CREATE TABLE IF NOT EXISTS store_reliability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_name VARCHAR(100) NOT NULL UNIQUE,
  total_deals INT DEFAULT 0,
  verified_deals INT DEFAULT 0,
  total_ratings INT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  trust_score DECIMAL(3,2) DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_name (store_name),
  INDEX idx_trust_score (trust_score)
);

-- Create business_analytics table for advanced business metrics
CREATE TABLE IF NOT EXISTS business_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  affiliate_revenue DECIMAL(10,2) DEFAULT 0.00,
  commission_paid DECIMAL(10,2) DEFAULT 0.00,
  total_affiliate_clicks INT DEFAULT 0,
  total_affiliate_conversions INT DEFAULT 0,
  verified_deals_count INT DEFAULT 0,
  user_engagement_score DECIMAL(5,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  roi_percentage DECIMAL(5,2) DEFAULT 0.00,
  top_performing_category VARCHAR(100),
  top_performing_store VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (date),
  INDEX idx_date (date)
);

-- Create commission_payouts table for tracking affiliate payouts
CREATE TABLE IF NOT EXISTS commission_payouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  affiliate_user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'processing', 'paid', 'failed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_details JSON,
  processed_by VARCHAR(255),
  processed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_affiliate_user_id (affiliate_user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create bulk_import_logs table for tracking bulk operations
CREATE TABLE IF NOT EXISTS bulk_import_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  imported_by VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  format ENUM('csv', 'json') NOT NULL,
  total_records INT DEFAULT 0,
  successful_imports INT DEFAULT 0,
  failed_imports INT DEFAULT 0,
  errors JSON,
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_imported_by (imported_by),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Add business-related columns to existing tables
ALTER TABLE deals ADD COLUMN IF NOT EXISTS affiliate_link_id INT NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_affiliate_earnings DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_commissions DECIMAL(10,2) DEFAULT 0.00;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_affiliate_link_id ON deals(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_deals_is_verified ON deals(is_verified);
CREATE INDEX IF NOT EXISTS idx_deals_trust_score ON deals(trust_score);
CREATE INDEX IF NOT EXISTS idx_users_is_affiliate ON users(is_affiliate);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);

-- Insert sample affiliate links
INSERT INTO affiliate_links (name, original_url, affiliate_url, commission_rate, commission_type, category, store, created_by) VALUES
('Amazon Electronics Deal', 'https://amazon.com/electronics', 'https://amazon.com/electronics?tag=deals247-20', 8.00, 'percentage', 'Electronics', 'Amazon', 'admin_user_123'),
('Best Buy Tech Deals', 'https://bestbuy.com/tech', 'https://bestbuy.com/tech?ref=deals247', 5.00, 'percentage', 'Electronics', 'Best Buy', 'admin_user_123'),
('Nike Running Shoes', 'https://nike.com/running', 'https://nike.com/running?ref=deals247', 6.00, 'percentage', 'Fashion', 'Nike', 'admin_user_123')
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample store reliability data
INSERT INTO store_reliability (store_name, total_deals, verified_deals, total_ratings, total_reviews, avg_rating, trust_score) VALUES
('Amazon', 50, 45, 1200, 800, 4.6, 9.2),
('Best Buy', 30, 28, 800, 600, 4.5, 8.8),
('Apple Store', 20, 20, 600, 400, 4.8, 9.6),
('Nike', 25, 22, 500, 350, 4.4, 8.4),
('Target', 35, 30, 700, 500, 4.3, 8.1)
ON DUPLICATE KEY UPDATE store_name=store_name;

-- Insert sample business analytics data
INSERT INTO business_analytics (date, total_revenue, affiliate_revenue, commission_paid, total_affiliate_clicks, total_affiliate_conversions, verified_deals_count, user_engagement_score, conversion_rate, roi_percentage, top_performing_category, top_performing_store) VALUES
(CURDATE(), 1250.75, 850.50, 425.25, 1250, 85, 45, 8.5, 6.8, 245.0, 'Electronics', 'Amazon'),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 980.25, 620.00, 310.00, 980, 62, 42, 8.2, 6.3, 198.0, 'Electronics', 'Best Buy'),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 1100.00, 750.00, 375.00, 1100, 75, 48, 8.7, 6.8, 220.0, 'Fashion', 'Nike')
ON DUPLICATE KEY UPDATE date=date;