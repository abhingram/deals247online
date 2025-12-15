import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testPhase6Features() {
  let connection;

  try {
    console.log('🚀 Testing Phase 6: Monetization & Business Features\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deals247',
      multipleStatements: true
    });

    console.log('✅ Database connection established');

    // Test 1: Affiliate Networks
    console.log('\n📊 Testing Affiliate Networks...');
    const [networks] = await connection.query('SELECT * FROM affiliate_networks');
    console.log(`✅ Found ${networks.length} affiliate networks:`, networks.map(n => n.name));

    // Test 2: User Subscriptions
    console.log('\n💳 Testing User Subscriptions...');
    const [subscriptions] = await connection.query('SELECT * FROM user_subscriptions LIMIT 5');
    console.log(`✅ Found ${subscriptions.length} user subscriptions`);

    console.log('\n🎉 Phase 6 Features Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Phase 6 testing failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testPhase6Features().catch(console.error);