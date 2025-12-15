#!/usr/bin/env node

/**
 * Amazon Integration Scheduler
 * Production-ready scheduler for automated Amazon operations
 * Can be run via cron jobs or PM2
 */

import { amazonIngestor } from '../services/amazon/amazonIngestor.js';
import { amazonRefresher } from '../services/amazon/amazonRefresher.js';
import db from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

class AmazonScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = {
      ingestion: null,
      refresh: null,
      cleanup: null
    };
  }

  /**
   * Run daily ingestion (should be scheduled for 2 AM daily)
   */
  async runDailyIngestion() {
    if (this.isRunning) {
      console.log('⏳ Daily ingestion already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting daily Amazon product ingestion...');

    try {
      const categories = ['Electronics', 'Fashion', 'Home', 'Books', 'Sports', 'Beauty'];
      const results = {};

      for (const category of categories) {
        try {
          console.log(`📦 Ingesting category: ${category}`);
          const categoryResults = await amazonIngestor.ingestCategory(category, [], 150);
          results[category] = {
            success: true,
            products: categoryResults.length
          };
          console.log(`✅ ${category}: ${categoryResults.length} products ingested`);
        } catch (error) {
          console.error(`❌ Failed to ingest ${category}:`, error.message);
          results[category] = {
            success: false,
            error: error.message
          };
        }

        // Rate limiting between categories
        await this.delay(5000);
      }

      this.lastRun.ingestion = new Date();
      console.log('✅ Daily ingestion completed:', results);

      // Send notification (you can integrate with your notification system)
      await this.sendNotification('Daily Ingestion Complete', results);

    } catch (error) {
      console.error('💥 Daily ingestion failed:', error);
      await this.sendNotification('Daily Ingestion Failed', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run hourly price refresh (should be scheduled every hour)
   */
  async runHourlyRefresh() {
    if (this.isRunning) {
      console.log('⏳ Hourly refresh already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting hourly Amazon price refresh...');

    try {
      const results = await amazonRefresher.refreshAllPrices();
      this.lastRun.refresh = new Date();

      console.log('✅ Hourly refresh completed:', results);

      // Send notification if new deals found
      if (results.newDeals > 0) {
        await this.sendNotification('New Deals Detected!', {
          newDeals: results.newDeals,
          priceChanges: results.priceChanges,
          processed: results.processed
        });
      }

    } catch (error) {
      console.error('💥 Hourly refresh failed:', error);
      await this.sendNotification('Hourly Refresh Failed', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run weekly maintenance (should be scheduled weekly)
   */
  async runWeeklyMaintenance() {
    if (this.isRunning) {
      console.log('⏳ Weekly maintenance already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🧹 Starting weekly Amazon maintenance...');

    try {
      // Cleanup expired deals
      const cleanedCount = await amazonRefresher.cleanupExpiredDeals();
      console.log(`🗑️ Cleaned up ${cleanedCount} expired deals`);

      // Get final statistics
      const stats = await amazonRefresher.getStats();

      this.lastRun.cleanup = new Date();

      console.log('✅ Weekly maintenance completed');

      // Send comprehensive report
      await this.sendNotification('Weekly Maintenance Report', {
        cleaned_deals: cleanedCount,
        current_stats: stats
      });

    } catch (error) {
      console.error('💥 Weekly maintenance failed:', error);
      await this.sendNotification('Weekly Maintenance Failed', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Health check (can be called frequently)
   */
  async runHealthCheck() {
    try {
      console.log('🏥 Running Amazon integration health check...');

      const stats = await amazonRefresher.getStats();
      const ingestorStats = await amazonIngestor.getStats();

      const health = {
        timestamp: new Date(),
        database: true, // If we got here, DB is working
        ingestor: ingestorStats !== null,
        refresher: stats !== null,
        stats: {
          products: ingestorStats?.products || {},
          deals: stats?.deals || {},
          priceHistory: stats?.priceHistory || {}
        }
      };

      console.log('✅ Health check completed:', health);
      return health;

    } catch (error) {
      console.error('💥 Health check failed:', error);
      return {
        timestamp: new Date(),
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification (integrate with your notification system)
   */
  async sendNotification(title, data) {
    try {
      // This is a placeholder - integrate with your actual notification system
      // Could be email, Slack, Discord, etc.

      const notification = {
        title,
        data,
        timestamp: new Date(),
        source: 'amazon-scheduler'
      };

      console.log('📤 Notification:', notification);

      // Example: Send to your notification service
      // await notificationService.send(notification);

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      uptime: process.uptime()
    };
  }
}

// CLI Interface
const scheduler = new AmazonScheduler();

const command = process.argv[2];

switch (command) {
  case 'daily':
    await scheduler.runDailyIngestion();
    break;

  case 'hourly':
    await scheduler.runHourlyRefresh();
    break;

  case 'weekly':
    await scheduler.runWeeklyMaintenance();
    break;

  case 'health':
    const health = await scheduler.runHealthCheck();
    console.log(JSON.stringify(health, null, 2));
    break;

  case 'status':
    console.log(JSON.stringify(scheduler.getStatus(), null, 2));
    break;

  default:
    console.log(`
Amazon Integration Scheduler

Usage: node scheduler.js <command>

Commands:
  daily    - Run daily product ingestion
  hourly   - Run hourly price refresh
  weekly   - Run weekly maintenance
  health   - Run health check
  status   - Get scheduler status

Cron Examples:
  # Daily ingestion at 2 AM
  0 2 * * * cd /path/to/deals247 && node server/scripts/scheduler.js daily

  # Hourly refresh
  0 * * * * cd /path/to/deals247 && node server/scripts/scheduler.js hourly

  # Weekly maintenance (Sundays at 3 AM)
  0 3 * * 0 cd /path/to/deals247 && node server/scripts/scheduler.js weekly

  # Health check every 15 minutes
  */15 * * * * cd /path/to/deals247 && node server/scripts/scheduler.js health
`);
    break;
}

// Cleanup
if (db && db.end) {
  await db.end();
}