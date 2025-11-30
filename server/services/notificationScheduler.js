import NotificationService from '../services/notificationService.js';

// Run notification checks every hour
export const startNotificationScheduler = () => {
  console.log('🔔 Starting notification scheduler...');

  // Run immediately on startup
  runNotificationChecks();

  // Then run every hour
  setInterval(runNotificationChecks, 60 * 60 * 1000); // 1 hour
};

async function runNotificationChecks() {
  try {
    console.log('🔔 Running scheduled notification checks...');

    await Promise.all([
      NotificationService.notifyExpiringDeals(),
      NotificationService.notifyNewDeals(),
      NotificationService.notifyPriceDrops(),
      NotificationService.cleanupOldNotifications()
    ]);

    console.log('✅ Notification checks completed');
  } catch (error) {
    console.error('❌ Error in notification scheduler:', error);
  }
}