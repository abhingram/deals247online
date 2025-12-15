import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createPhase6Tables() {
  let connection;

  try {
    console.log('🚀 Creating Phase 6 Monetization Tables...\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deals247',
      multipleStatements: true
    });

    console.log('✅ Database connection established');

    // Create affiliate networks table
    console.log('📊 Creating affiliate_networks table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS affiliate_networks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        api_endpoint VARCHAR(255),
        api_key VARCHAR(255),
        api_secret VARCHAR(255),
        commission_rate DECIMAL(5,4) DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_code (code)
      )
    `);

    // Create affiliate links table
    console.log('🔗 Creating affiliate_links table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS affiliate_links (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT NOT NULL,
        network_id INT NOT NULL,
        original_url TEXT NOT NULL,
        affiliate_url TEXT NOT NULL,
        affiliate_code VARCHAR(255),
        commission_rate DECIMAL(5,4),
        is_active BOOLEAN DEFAULT 1,
        click_count INT DEFAULT 0,
        conversion_count INT DEFAULT 0,
        last_clicked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        FOREIGN KEY (network_id) REFERENCES affiliate_networks(id) ON DELETE CASCADE,
        UNIQUE KEY unique_deal_network (deal_id, network_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_network_id (network_id),
        INDEX idx_active (is_active)
      )
    `);

    // Create affiliate commissions table
    console.log('💵 Creating affiliate_commissions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        deal_id INT,
        network_id INT NOT NULL,
        affiliate_link_id INT,
        order_id VARCHAR(255),
        commission_amount DECIMAL(10,2) NOT NULL,
        order_value DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled') DEFAULT 'pending',
        transaction_date TIMESTAMP,
        processed_date TIMESTAMP NULL,
        payout_date TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (network_id) REFERENCES affiliate_networks(id) ON DELETE CASCADE,
        FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_network_id (network_id),
        INDEX idx_status (status),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_payout_date (payout_date)
      )
    `);

    // Create user subscriptions table
    console.log('💳 Creating user_subscriptions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        tier ENUM('free', 'premium', 'vip') DEFAULT 'free',
        status ENUM('active', 'inactive', 'cancelled', 'expired', 'past_due') DEFAULT 'active',
        payment_provider VARCHAR(50),
        subscription_id VARCHAR(255),
        customer_id VARCHAR(255),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        cancelled_at TIMESTAMP NULL,
        trial_start TIMESTAMP NULL,
        trial_end TIMESTAMP NULL,
        price_id VARCHAR(255),
        amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_tier (tier),
        INDEX idx_status (status),
        INDEX idx_current_period_end (current_period_end)
      )
    `);

    // Create sponsored deals table
    console.log('📢 Creating sponsored_deals table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sponsored_deals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        deal_id INT NOT NULL,
        advertiser_id VARCHAR(255) NOT NULL,
        advertiser_name VARCHAR(255) NOT NULL,
        advertiser_email VARCHAR(255),
        budget DECIMAL(10,2) NOT NULL,
        spent DECIMAL(10,2) DEFAULT 0,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        cpc DECIMAL(5,2),
        cpm DECIMAL(5,2),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status ENUM('pending', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'pending',
        targeting_rules JSON,
        payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        INDEX idx_deal_id (deal_id),
        INDEX idx_advertiser_id (advertiser_id),
        INDEX idx_status (status),
        INDEX idx_start_end (start_date, end_date),
        INDEX idx_payment_status (payment_status)
      )
    `);

    // Create revenue analytics table
    console.log('📈 Creating revenue_analytics table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS revenue_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL,
        affiliate_commission DECIMAL(10,2) DEFAULT 0,
        subscription_revenue DECIMAL(10,2) DEFAULT 0,
        advertising_revenue DECIMAL(10,2) DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        affiliate_clicks INT DEFAULT 0,
        affiliate_conversions INT DEFAULT 0,
        new_subscriptions INT DEFAULT 0,
        active_subscriptions INT DEFAULT 0,
        churned_subscriptions INT DEFAULT 0,
        ad_impressions INT DEFAULT 0,
        ad_clicks INT DEFAULT 0,
        ad_conversions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date (date),
        INDEX idx_date (date)
      )
    `);

    // Add affiliate fields to deals table
    console.log('🔄 Updating deals table with affiliate fields...');
    await connection.query(`
      ALTER TABLE deals
      ADD COLUMN IF NOT EXISTS affiliate_network VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(5,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sponsored_priority INT DEFAULT 0
    `);

    // Add revenue fields to analytics_summary table
    console.log('🔄 Updating analytics_summary table...');
    await connection.query(`
      ALTER TABLE analytics_summary
      ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS subscription_revenue DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS advertising_revenue DECIMAL(10,2) DEFAULT 0
    `);

    // Insert default affiliate networks
    console.log('🌐 Inserting default affiliate networks...');
    await connection.query(`
      INSERT INTO affiliate_networks (name, code, commission_rate, is_active) VALUES
      ('Amazon Associates', 'amazon', 0.08, 1),
      ('CJ Affiliate', 'cj', 0.10, 0),
      ('Rakuten Advertising', 'rakuten', 0.12, 0),
      ('ShareASale', 'shareasale', 0.15, 0)
      ON DUPLICATE KEY UPDATE name=name
    `);

    console.log('\n🎉 Phase 6 tables created successfully!');
    console.log('✅ Affiliate marketing system ready');
    console.log('✅ Premium subscription system ready');
    console.log('✅ Sponsored deals platform ready');
    console.log('✅ Revenue analytics system ready');

  } catch (error) {
    console.error('❌ Phase 6 table creation failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

createPhase6Tables().catch(console.error);