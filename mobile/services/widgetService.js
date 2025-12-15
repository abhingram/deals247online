import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiRequest } from './apiService';

class HomeScreenWidgetsService {
  constructor() {
    this.widgets = {
      todaysDeals: {
        id: 'todays_deals_widget',
        title: 'Today\'s Deals',
        type: 'list',
        data: [],
        lastUpdated: null,
      },
      favoriteStores: {
        id: 'favorite_stores_widget',
        title: 'Favorite Stores',
        type: 'grid',
        data: [],
        lastUpdated: null,
      },
      priceAlerts: {
        id: 'price_alerts_widget',
        title: 'Price Alerts',
        type: 'alerts',
        data: [],
        lastUpdated: null,
      },
      dealOfTheDay: {
        id: 'deal_of_day_widget',
        title: 'Deal of the Day',
        type: 'featured',
        data: null,
        lastUpdated: null,
      },
    };

    this.widgetUpdateInterval = 15 * 60 * 1000; // 15 minutes
    this.initializeWidgets();
  }

  // Initialize widgets and load saved data
  async initializeWidgets() {
    try {
      await this.loadWidgetData();
      await this.requestWidgetPermissions();
      this.startWidgetUpdates();
    } catch (error) {
      console.error('Error initializing widgets:', error);
    }
  }

  // Load saved widget data from storage
  async loadWidgetData() {
    try {
      const savedWidgets = await AsyncStorage.getItem('widgetData');
      if (savedWidgets) {
        const parsedWidgets = JSON.parse(savedWidgets);
        this.widgets = { ...this.widgets, ...parsedWidgets };
      }
    } catch (error) {
      console.error('Error loading widget data:', error);
    }
  }

  // Save widget data to storage
  async saveWidgetData() {
    try {
      await AsyncStorage.setItem('widgetData', JSON.stringify(this.widgets));
    } catch (error) {
      console.error('Error saving widget data:', error);
    }
  }

  // Request permissions for widgets (iOS mainly)
  async requestWidgetPermissions() {
    if (Platform.OS === 'ios') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Widget permissions not granted');
      }
    }
  }

  // Start periodic widget updates
  startWidgetUpdates() {
    // Update widgets immediately
    this.updateAllWidgets();

    // Set up periodic updates
    setInterval(() => {
      this.updateAllWidgets();
    }, this.widgetUpdateInterval);
  }

  // Update all widgets with fresh data
  async updateAllWidgets() {
    try {
      await Promise.all([
        this.updateTodaysDealsWidget(),
        this.updateFavoriteStoresWidget(),
        this.updatePriceAlertsWidget(),
        this.updateDealOfTheDayWidget(),
      ]);

      await this.saveWidgetData();
      this.notifyWidgetUpdate();
    } catch (error) {
      console.error('Error updating widgets:', error);
    }
  }

  // Update today's deals widget
  async updateTodaysDealsWidget() {
    try {
      const response = await apiRequest('/api/deals/today?limit=5');
      if (response.success) {
        this.widgets.todaysDeals.data = response.deals.map(deal => ({
          id: deal.id,
          title: deal.title,
          store: deal.store,
          discount: deal.discount,
          image: deal.image,
          url: `/deal/${deal.id}`,
        }));
        this.widgets.todaysDeals.lastUpdated = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error updating today\'s deals widget:', error);
    }
  }

  // Update favorite stores widget
  async updateFavoriteStoresWidget() {
    try {
      const favoriteStores = await AsyncStorage.getItem('favoriteStores');
      if (favoriteStores) {
        const stores = JSON.parse(favoriteStores);
        const storeDeals = [];

        for (const store of stores.slice(0, 6)) { // Limit to 6 stores
          try {
            const response = await apiRequest(`/api/deals/store/${store.id}?limit=1`);
            if (response.success && response.deals.length > 0) {
              storeDeals.push({
                id: store.id,
                name: store.name,
                logo: store.logo,
                deal: response.deals[0],
                url: `/store/${store.id}`,
              });
            }
          } catch (error) {
            console.error(`Error fetching deals for store ${store.id}:`, error);
          }
        }

        this.widgets.favoriteStores.data = storeDeals;
        this.widgets.favoriteStores.lastUpdated = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error updating favorite stores widget:', error);
    }
  }

  // Update price alerts widget
  async updatePriceAlertsWidget() {
    try {
      const alerts = await AsyncStorage.getItem('priceAlerts');
      if (alerts) {
        const parsedAlerts = JSON.parse(alerts);
        const activeAlerts = parsedAlerts.filter(alert =>
          alert.isActive && new Date(alert.expiryDate) > new Date()
        ).slice(0, 3); // Limit to 3 alerts

        this.widgets.priceAlerts.data = activeAlerts.map(alert => ({
          id: alert.id,
          productName: alert.productName,
          targetPrice: alert.targetPrice,
          currentPrice: alert.currentPrice,
          store: alert.store,
          url: `/deal/${alert.dealId}`,
        }));
        this.widgets.priceAlerts.lastUpdated = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error updating price alerts widget:', error);
    }
  }

  // Update deal of the day widget
  async updateDealOfTheDayWidget() {
    try {
      const response = await apiRequest('/api/deals/deal-of-day');
      if (response.success) {
        this.widgets.dealOfTheDay.data = {
          id: response.deal.id,
          title: response.deal.title,
          store: response.deal.store,
          discount: response.deal.discount,
          image: response.deal.image,
          description: response.deal.description,
          url: `/deal/${response.deal.id}`,
        };
        this.widgets.dealOfTheDay.lastUpdated = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error updating deal of the day widget:', error);
    }
  }

  // Get widget data for specific widget
  getWidgetData(widgetId) {
    return this.widgets[widgetId] || null;
  }

  // Get all widget data
  getAllWidgetData() {
    return this.widgets;
  }

  // Configure widget settings
  async configureWidget(widgetId, settings) {
    try {
      if (this.widgets[widgetId]) {
        this.widgets[widgetId] = { ...this.widgets[widgetId], ...settings };
        await this.saveWidgetData();

        // Update native widget if needed
        if (Platform.OS === 'ios') {
          await this.updateiOSWidget(widgetId);
        } else if (Platform.OS === 'android') {
          await this.updateAndroidWidget(widgetId);
        }
      }
    } catch (error) {
      console.error('Error configuring widget:', error);
    }
  }

  // Update iOS widget
  async updateiOSWidget(widgetId) {
    // iOS widget updates would be handled through WidgetKit
    // This is a placeholder for the actual implementation
    console.log(`Updating iOS widget: ${widgetId}`);
  }

  // Update Android widget
  async updateAndroidWidget(widgetId) {
    // Android widget updates would be handled through AppWidgetProvider
    // This is a placeholder for the actual implementation
    console.log(`Updating Android widget: ${widgetId}`);
  }

  // Notify system of widget update
  async notifyWidgetUpdate() {
    try {
      // Send notification to native side for widget updates
      if (Platform.OS === 'ios') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Widgets Updated',
            body: 'Your home screen widgets have been refreshed with the latest deals.',
            data: { type: 'widget_update' },
          },
          trigger: null, // Show immediately
        });
      }
    } catch (error) {
      console.error('Error notifying widget update:', error);
    }
  }

  // Handle widget tap (deep linking)
  handleWidgetTap(widgetId, itemId) {
    // Navigate to appropriate screen based on widget and item
    let route = '/';

    switch (widgetId) {
      case 'todays_deals_widget':
      case 'deal_of_day_widget':
        route = `/deal/${itemId}`;
        break;
      case 'favorite_stores_widget':
        route = `/store/${itemId}`;
        break;
      case 'price_alerts_widget':
        route = `/deal/${itemId}`;
        break;
    }

    return route;
  }

  // Enable/disable widget
  async setWidgetEnabled(widgetId, enabled) {
    try {
      if (this.widgets[widgetId]) {
        this.widgets[widgetId].enabled = enabled;
        await this.saveWidgetData();

        if (enabled) {
          // Refresh widget data when enabled
          await this.updateWidget(widgetId);
        }
      }
    } catch (error) {
      console.error('Error setting widget enabled state:', error);
    }
  }

  // Update specific widget
  async updateWidget(widgetId) {
    try {
      switch (widgetId) {
        case 'todays_deals_widget':
          await this.updateTodaysDealsWidget();
          break;
        case 'favorite_stores_widget':
          await this.updateFavoriteStoresWidget();
          break;
        case 'price_alerts_widget':
          await this.updatePriceAlertsWidget();
          break;
        case 'deal_of_day_widget':
          await this.updateDealOfTheDayWidget();
          break;
      }
      await this.saveWidgetData();
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  }

  // Get widget statistics
  getWidgetStats() {
    const stats = {};
    Object.keys(this.widgets).forEach(widgetId => {
      const widget = this.widgets[widgetId];
      stats[widgetId] = {
        itemCount: widget.data ? (Array.isArray(widget.data) ? widget.data.length : 1) : 0,
        lastUpdated: widget.lastUpdated,
        enabled: widget.enabled !== false,
      };
    });
    return stats;
  }

  // Clean up old widget data
  async cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago

      Object.keys(this.widgets).forEach(widgetId => {
        const widget = this.widgets[widgetId];
        if (widget.lastUpdated && new Date(widget.lastUpdated) < cutoffDate) {
          // Clear old data
          widget.data = widget.type === 'list' || widget.type === 'grid' ? [] : null;
        }
      });

      await this.saveWidgetData();
    } catch (error) {
      console.error('Error cleaning up old widget data:', error);
    }
  }
}

// Create singleton instance
const homeScreenWidgetsService = new HomeScreenWidgetsService();

export default homeScreenWidgetsService;