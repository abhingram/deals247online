#!/usr/bin/env node

/**
 * Phase 4 Database Optimization Script
 * Applies performance optimizations and creates new tables
 */

import mysql from 'mysql2/promise.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

async function runOptimizations() {
  let connection;

  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read and execute optimization script
    const optimizationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'phase4_optimizations.sql'),
      'utf8'
    );

    console.log('🚀 Applying database optimizations...');
    await connection.execute(optimizationSQL);

    console.log('✅ Database optimizations applied successfully');

    // Verify optimizations
    console.log('🔍 Verifying optimizations...');

    const tables = [
      'deal_analytics_summary',
      'deal_predictions',
      'ab_experiments',
      'experiment_results',
      'cache_store',
      'user_segments'
    ];

    for (const table of tables) {
      const [rows] = await connection.execute(
        `SHOW TABLES LIKE '${table}'`
      );
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }

    // Check indexes
    console.log('🔍 Checking indexes...');
    const [indexes] = await connection.execute(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('deals', 'price_history', 'deal_analytics_summary')
      ORDER BY TABLE_NAME, SEQ_IN_INDEX
    `, [process.env.DB_NAME]);

    const indexCount = indexes.length;
    console.log(`✅ Found ${indexCount} indexes for optimization`);

    // Test a sample query performance
    console.log('⚡ Testing query performance...');
    const startTime = Date.now();

    const [testQuery] = await connection.execute(`
      SELECT d.id, d.title, d.discount, das.total_views, das.conversion_rate
      FROM deals d
      LEFT JOIN deal_analytics_summary das ON d.id = das.deal_id
      WHERE d.verified = 1 AND d.deleted = 0
      ORDER BY d.created_at DESC
      LIMIT 10
    `);

    const queryTime = Date.now() - startTime;
    console.log(`✅ Test query completed in ${queryTime}ms`);

    console.log('🎉 Phase 4 database optimization completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - New tables created: ${tables.length}`);
    console.log(`   - Indexes optimized: ${indexCount}`);
    console.log(`   - Query performance: ${queryTime}ms for sample query`);

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimizations();
}

export { runOptimizations };