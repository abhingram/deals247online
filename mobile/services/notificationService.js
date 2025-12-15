import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.notificationToken = null;
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.notificationToken = token;
        await this.registerTokenWithServer(token);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('Notification service initialized');
      return true;

    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Get push notification token
  async getPushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with actual project ID
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register token with server
  async registerTokenWithServer(token) {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      await axios.post('http://localhost:5000/api/notifications/register', {
        userId,
        token,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        }
      });

      console.log('Push token registered with server');
    } catch (error) {
      console.error('Error registering token with server:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle foreground notification
    });

    // Handle notification response (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });

    // Store listeners for cleanup
    this.listeners = { notificationListener, responseListener };
  }

  // Handle notification response
  async handleNotificationResponse(response) {
    const { notification } = response;
    const data = notification.request.content.data;

    try {
      // Handle different notification types
      switch (data.type) {
        case 'deal_alert':
          // Navigate to deal details
          this.navigateToDeal(data.dealId);
          break;
        case 'price_drop':
          // Navigate to deal with price drop
          this.navigateToDeal(data.dealId);
          break;
        case 'store_update':
          // Navigate to store page
          this.navigateToStore(data.storeId);
          break;
        case 'reminder':
          // Navigate to deal
          this.navigateToDeal(data.dealId);
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  // Schedule local notification
  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#FF6B35',
        },
        trigger: trigger || { seconds: 1 }, // Show immediately if no trigger
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  // Schedule deal reminder
  async scheduleDealReminder(dealId, dealTitle, reminderTime) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Deal Reminder',
          body: `Don't miss out: ${dealTitle}`,
          data: { type: 'reminder', dealId },
          sound: 'default',
        },
        trigger: { date: reminderTime },
      });
    } catch (error) {
      console.error('Error scheduling deal reminder:', error);
    }
  }

  // Send test notification
  async sendTestNotification() {
    await this.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from Deals247',
      { type: 'test' }
    );
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get notification badge count
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Set notification badge
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Navigation handlers (to be implemented based on navigation structure)
  navigateToDeal(dealId) {
    // TODO: Implement navigation to deal details
    console.log('Navigate to deal:', dealId);
  }

  navigateToStore(storeId) {
    // TODO: Implement navigation to store
    console.log('Navigate to store:', storeId);
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences) {
    try {
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));

      // Update server with preferences
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        await axios.put('http://localhost:5000/api/notifications/preferences', {
          userId,
          preferences
        });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  // Get notification preferences
  async getNotificationPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('notificationPreferences');
      return preferences ? JSON.parse(preferences) : {
        dealAlerts: true,
        priceDrops: true,
        storeUpdates: true,
        reminders: true,
        marketing: false,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {};
    }
  }

  // Cleanup listeners
  cleanup() {
    if (this.listeners) {
      this.listeners.notificationListener?.remove();
      this.listeners.responseListener?.remove();
    }
  }
}

export default new NotificationService();