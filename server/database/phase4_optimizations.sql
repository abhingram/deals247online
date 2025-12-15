-- ============================================================================
-- PHASE 4: PERFORMANCE OPTIMIZATION & ADVANCED FEATURES
-- ============================================================================

-- Add composite indexes for better query performance (ignore if exists)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'deals'
   AND INDEX_NAME = 'idx_category_discount') = 0,
  'ALTER TABLE deals ADD INDEX idx_category_discount (category, discount, verified);',
  'SELECT "Index idx_category_discount already exists";'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'deals'
   AND INDEX_NAME = 'idx_store_discount') = 0,
  'ALTER TABLE deals ADD INDEX idx_store_discount (store, discount, verified);',
  'SELECT "Index idx_store_discount already exists";'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'deals'
   AND INDEX_NAME = 'idx_expires_verified') = 0,
  'ALTER TABLE deals ADD INDEX idx_expires_verified (expires_at, verified);',
  'SELECT "Index idx_expires_verified already exists";'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'deals'
   AND INDEX_NAME = 'idx_rating_reviews') = 0,
  'ALTER TABLE deals ADD INDEX idx_rating_reviews (rating, reviews);',
  'SELECT "Index idx_rating_reviews already exists";'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optimize price_history table for analytics queries
ALTER TABLE price_history ADD INDEX idx_product_date_range (product_id, recorded_at);
ALTER TABLE price_history ADD INDEX idx_price_trends (product_id, price, recorded_at DESC);

-- Add indexes for user analytics queries
ALTER TABLE deal_views ADD INDEX idx_user_viewed_at (user_id, viewed_at DESC);
ALTER TABLE deal_clicks ADD INDEX idx_user_clicked_at (user_id, clicked_at DESC);
ALTER TABLE deal_ratings ADD INDEX idx_user_rating (user_id, rating);

-- Optimize notifications table
ALTER TABLE notifications ADD INDEX idx_user_type_created (user_id, type, created_at DESC);
ALTER TABLE notifications ADD INDEX idx_read_status (read_status, created_at DESC);

-- Add full-text search capabilities
ALTER TABLE deals ADD FULLTEXT idx_title_description (title);
ALTER TABLE products ADD FULLTEXT idx_title (title);

-- Create materialized view for deal analytics (simulated with regular table)
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
);

-- Create table for ML-based deal predictions
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
);

-- Create table for A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  experiment_name VARCHAR(100) NOT NULL,
  experiment_type ENUM('deal_display', 'notification', 'pricing', 'category') NOT NULL,
  variant_a_description TEXT,
  variant_b_description TEXT,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT 1,
  target_percentage INT DEFAULT 50,
  INDEX idx_active_experiments (is_active, experiment_type)
);

-- Create table for experiment results
CREATE TABLE IF NOT EXISTS experiment_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  experiment_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  variant_assigned ENUM('A', 'B') NOT NULL,
  action_taken ENUM('view', 'click', 'share', 'favorite', 'purchase') NOT NULL,
  action_value DECIMAL(10,2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experiment_id) REFERENCES ab_experiments(id) ON DELETE CASCADE,
  INDEX idx_experiment_user (experiment_id, user_id),
  INDEX idx_variant_action (variant_assigned, action_taken)
);

-- Add caching table for frequently accessed data
CREATE TABLE IF NOT EXISTS cache_store (
  cache_key VARCHAR(255) PRIMARY KEY,
  cache_value LONGTEXT NOT NULL,
  cache_type ENUM('product', 'deal', 'analytics', 'search') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires_type (expires_at, cache_type),
  INDEX idx_type_key (cache_type, cache_key)
);

-- Create table for advanced user segmentation
CREATE TABLE IF NOT EXISTS user_segments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  segment_type ENUM('high_value', 'price_sensitive', 'deal_hunter', 'category_focused', 'inactive') NOT NULL,
  segment_score DECIMAL(3,2) DEFAULT 0,
  segment_data JSON,
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_segment (user_id, segment_type),
  INDEX idx_segment_type_score (segment_type, segment_score DESC)
);