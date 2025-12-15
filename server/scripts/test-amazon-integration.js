#!/usr/bin/env node

/**
 * Amazon Integration Test Script
 * Tests the Amazon PA-API integration components
 */

import { amazonClient } from '../services/amazon/amazonClient.js';
import { amazonNormalizer } from '../services/amazon/amazonNormalizer.js';
import { amazonIngestor } from '../services/amazon/amazonIngestor.js';
import { amazonRefresher } from '../services/amazon/amazonRefresher.js';
import db from '../config/database.js';

async function testAmazonIntegration() {
  console.log('🧪 Starting Amazon Integration Tests...\n');

  try {
    // Test 1: API Connection
    console.log('1️⃣ Testing Amazon API Connection...');
    try {
      const testParams = {
        Keywords: 'laptop',
        ItemCount: 2,
        SearchIndex: 'Electronics'
      };

      const response = await amazonClient.searchItems(testParams);
      console.log('✅ API Connection successful');
      console.log(`   Found ${response.Items?.length || 0} items\n`);

    } catch (error) {
      console.log('❌ API Connection failed:', error.message);
      console.log('   Please check your Amazon credentials and network connection\n');
      return;
    }

    // Test 2: Data Normalization
    console.log('2️⃣ Testing Data Normalization...');
    try {
      const testParams = {
        Keywords: 'phone',
        ItemCount: 1,
        SearchIndex: 'Electronics'
      };

      const response = await amazonClient.searchItems(testParams);

      if (response.Items && response.Items.length > 0) {
        const normalized = amazonNormalizer.normalizeSearchResults(response);
        console.log('✅ Data normalization successful');
        console.log(`   Normalized ${normalized.length} products`);
        if (normalized.length > 0) {
          console.log(`   Sample product: ${normalized[0].title?.substring(0, 50)}...`);
        }
        console.log('');
      } else {
        console.log('⚠️  No items to normalize\n');
      }

    } catch (error) {
      console.log('❌ Data normalization failed:', error.message);
      console.log('');
    }

    // Test 3: Database Connection
    console.log('3️⃣ Testing Database Connection...');
    try {
      const [result] = await db.query('SELECT 1 as test');
      console.log('✅ Database connection successful\n');

    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('');
      return;
    }

    // Test 4: Product Ingestion (Small test)
    console.log('4️⃣ Testing Product Ingestion...');
    try {
      const testResults = await amazonIngestor.ingestCategory('Electronics', [], 3);
      console.log('✅ Product ingestion successful');
      console.log(`   Ingested ${testResults.length} products\n`);

    } catch (error) {
      console.log('❌ Product ingestion failed:', error.message);
      console.log('');
    }

    // Test 5: Statistics
    console.log('5️⃣ Testing Statistics Retrieval...');
    try {
      const ingestorStats = await amazonIngestor.getStats();
      const refresherStats = await amazonRefresher.getStats();

      console.log('✅ Statistics retrieval successful');
      console.log('   Ingestor Stats:', ingestorStats);
      console.log('   Refresher Stats:', refresherStats);
      console.log('');

    } catch (error) {
      console.log('❌ Statistics retrieval failed:', error.message);
      console.log('');
    }

    console.log('🎉 Amazon Integration Tests Completed!');
    console.log('\nNext Steps:');
    console.log('1. Run full ingestion: POST /api/internal/amazon/ingest');
    console.log('2. Set up scheduled refresh: Use cron or similar');
    console.log('3. Monitor performance and adjust batch sizes as needed');

  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    // Close database connection
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAmazonIntegration();
}

export { testAmazonIntegration };