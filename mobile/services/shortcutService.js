import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as QuickActions from 'expo-quick-actions';
import { apiRequest } from './apiService';

class AppShortcutsService {
  constructor() {
    this.shortcuts = [
      {
        id: 'scan_deal',
        title: 'Scan Deal',
        subtitle: 'Scan QR code for deals',
        icon: 'qr-code',
        type: 'scan',
        enabled: true,
      },
      {
        id: 'todays_deals',
        title: 'Today\'s Deals',
        subtitle: 'View today\'s best deals',
        icon: 'today',
        type: 'navigation',
        route: '/today',
        enabled: true,
      },
      {
        id: 'favorite_stores',
        title: 'Favorite Stores',
        subtitle: 'Quick access to favorites',
        icon: 'heart',
        type: 'navigation',
        route: '/favorites',
        enabled: true,
      },
      {
        id: 'search',
        title: 'Search Deals',
        subtitle: 'Find specific deals',
        icon: 'search',
        type: 'navigation',
        route: '/search',
        enabled: true,
      },
      {
        id: 'nearby_deals',
        title: 'Nearby Deals',
        subtitle: 'Find deals near you',
        icon: 'location',
        type: 'navigation',
        route: '/nearby',
        enabled: true,
      },
      {
        id: 'price_tracker',
        title: 'Price Tracker',
        subtitle: 'Track price changes',
        icon: 'trending-down',
        type: 'navigation',
        route: '/price-tracker',
        enabled: true,
      },
      {
        id: 'submit_deal',
        title: 'Submit Deal',
        subtitle: 'Share a great deal',
        icon: 'plus',
        type: 'navigation',
        route: '/submit-deal',
        enabled: true,
      },
      {
        id: 'compare_deals',
        title: 'Compare Deals',
        subtitle: 'Compare multiple deals',
        icon: 'compare',
        type: 'navigation',
        route: '/comparisons',
        enabled: true,
      },
    ];

    this.dynamicShortcuts = [];
    this.initializeShortcuts();
  }

  // Initialize shortcuts
  async initializeShortcuts() {
    try {
      await this.loadShortcutPreferences();
      await this.setupQuickActions();
      await this.updateDynamicShortcuts();
    } catch (error) {
      console.error('Error initializing shortcuts:', error);
    }
  }

  // Load user shortcut preferences
  async loadShortcutPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('shortcutPreferences');
      if (preferences) {
        const parsedPrefs = JSON.parse(preferences);
        this.shortcuts = this.shortcuts.map(shortcut => ({
          ...shortcut,
          enabled: parsedPrefs[shortcut.id] !== undefined ? parsedPrefs[shortcut.id] : shortcut.enabled,
        }));
      }
    } catch (error) {
      console.error('Error loading shortcut preferences:', error);
    }
  }

  // Save shortcut preferences
  async saveShortcutPreferences() {
    try {
      const preferences = {};
      this.shortcuts.forEach(shortcut => {
        preferences[shortcut.id] = shortcut.enabled;
      });
      await AsyncStorage.setItem('shortcutPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving shortcut preferences:', error);
    }
  }

  // Setup quick actions for the app
  async setupQuickActions() {
    try {
      const enabledShortcuts = this.shortcuts.filter(shortcut => shortcut.enabled);

      const quickActions = enabledShortcuts.map(shortcut => ({
        id: shortcut.id,
        title: shortcut.title,
        subtitle: shortcut.subtitle,
        icon: this.getShortcutIcon(shortcut.icon),
        data: { type: shortcut.type, route: shortcut.route },
      }));

      await QuickActions.setQuickActions(quickActions);
    } catch (error) {
      console.error('Error setting up quick actions:', error);
    }
  }

  // Get platform-specific icon
  getShortcutIcon(iconName) {
    // Map icon names to platform-specific identifiers
    const iconMap = {
      'qr-code': Platform.OS === 'ios' ? 'qrcode' : 'ic_qr_code',
      'today': Platform.OS === 'ios' ? 'calendar' : 'ic_today',
      'heart': Platform.OS === 'ios' ? 'heart' : 'ic_favorite',
      'search': Platform.OS === 'ios' ? 'search' : 'ic_search',
      'location': Platform.OS === 'ios' ? 'location' : 'ic_location',
      'trending-down': Platform.OS === 'ios' ? 'trending.down' : 'ic_trending_down',
      'plus': Platform.OS === 'ios' ? 'plus' : 'ic_add',
      'compare': Platform.OS === 'ios' ? 'arrow.left.and.right' : 'ic_compare',
    };

    return iconMap[iconName] || iconName;
  }

  // Update dynamic shortcuts based on user behavior
  async updateDynamicShortcuts() {
    try {
      const dynamicShortcuts = [];

      // Add recently viewed deals
      const recentDeals = await this.getRecentDeals();
      recentDeals.slice(0, 2).forEach(deal => {
        dynamicShortcuts.push({
          id: `recent_deal_${deal.id}`,
          title: deal.title.substring(0, 20) + (deal.title.length > 20 ? '...' : ''),
          subtitle: `${deal.discount}% off at ${deal.store}`,
          icon: 'recent',
          type: 'deal',
          data: { dealId: deal.id },
          expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        });
      });

      // Add favorite stores
      const favoriteStores = await this.getFavoriteStores();
      favoriteStores.slice(0, 2).forEach(store => {
        dynamicShortcuts.push({
          id: `favorite_store_${store.id}`,
          title: store.name,
          subtitle: 'View store deals',
          icon: 'store',
          type: 'store',
          data: { storeId: store.id },
          expires: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        });
      });

      this.dynamicShortcuts = dynamicShortcuts;
      await this.updateAllShortcuts();
    } catch (error) {
      console.error('Error updating dynamic shortcuts:', error);
    }
  }

  // Get recent deals from user history
  async getRecentDeals() {
    try {
      const history = await AsyncStorage.getItem('dealHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        return parsedHistory.slice(0, 5); // Last 5 viewed deals
      }
      return [];
    } catch (error) {
      console.error('Error getting recent deals:', error);
      return [];
    }
  }

  // Get favorite stores
  async getFavoriteStores() {
    try {
      const favorites = await AsyncStorage.getItem('favoriteStores');
      if (favorites) {
        return JSON.parse(favorites).slice(0, 3); // Top 3 favorites
      }
      return [];
    } catch (error) {
      console.error('Error getting favorite stores:', error);
      return [];
    }
  }

  // Update all shortcuts (static + dynamic)
  async updateAllShortcuts() {
    try {
      const enabledShortcuts = this.shortcuts.filter(shortcut => shortcut.enabled);
      const allShortcuts = [...enabledShortcuts, ...this.dynamicShortcuts];

      const quickActions = allShortcuts.map(shortcut => ({
        id: shortcut.id,
        title: shortcut.title,
        subtitle: shortcut.subtitle,
        icon: this.getShortcutIcon(shortcut.icon),
        data: shortcut.data,
      }));

      await QuickActions.setQuickActions(quickActions);
    } catch (error) {
      console.error('Error updating all shortcuts:', error);
    }
  }

  // Handle shortcut press
  async handleShortcutPress(shortcut) {
    try {
      const { type, route, dealId, storeId } = shortcut.data || {};

      switch (type) {
        case 'navigation':
          return { action: 'navigate', route };
        case 'deal':
          return { action: 'navigate', route: `/deal/${dealId}` };
        case 'store':
          return { action: 'navigate', route: `/store/${storeId}` };
        case 'scan':
          return { action: 'scan_qr' };
        default:
          return { action: 'navigate', route: '/' };
      }
    } catch (error) {
      console.error('Error handling shortcut press:', error);
      return { action: 'navigate', route: '/' };
    }
  }

  // Enable/disable shortcut
  async setShortcutEnabled(shortcutId, enabled) {
    try {
      const shortcutIndex = this.shortcuts.findIndex(s => s.id === shortcutId);
      if (shortcutIndex !== -1) {
        this.shortcuts[shortcutIndex].enabled = enabled;
        await this.saveShortcutPreferences();
        await this.setupQuickActions();
      }
    } catch (error) {
      console.error('Error setting shortcut enabled state:', error);
    }
  }

  // Get all shortcuts
  getAllShortcuts() {
    return {
      static: this.shortcuts,
      dynamic: this.dynamicShortcuts,
    };
  }

  // Get enabled shortcuts
  getEnabledShortcuts() {
    return this.shortcuts.filter(shortcut => shortcut.enabled);
  }

  // Add custom shortcut
  async addCustomShortcut(shortcut) {
    try {
      const newShortcut = {
        id: `custom_${Date.now()}`,
        title: shortcut.title,
        subtitle: shortcut.subtitle,
        icon: shortcut.icon || 'star',
        type: shortcut.type || 'navigation',
        route: shortcut.route,
        enabled: true,
        custom: true,
      };

      this.shortcuts.push(newShortcut);
      await this.saveShortcutPreferences();
      await this.setupQuickActions();

      return newShortcut.id;
    } catch (error) {
      console.error('Error adding custom shortcut:', error);
      throw error;
    }
  }

  // Remove custom shortcut
  async removeCustomShortcut(shortcutId) {
    try {
      const shortcutIndex = this.shortcuts.findIndex(s => s.id === shortcutId);
      if (shortcutIndex !== -1 && this.shortcuts[shortcutIndex].custom) {
        this.shortcuts.splice(shortcutIndex, 1);
        await this.saveShortcutPreferences();
        await this.setupQuickActions();
      }
    } catch (error) {
      console.error('Error removing custom shortcut:', error);
    }
  }

  // Reorder shortcuts
  async reorderShortcuts(shortcutIds) {
    try {
      const reorderedShortcuts = [];
      shortcutIds.forEach(id => {
        const shortcut = this.shortcuts.find(s => s.id === id);
        if (shortcut) {
          reorderedShortcuts.push(shortcut);
        }
      });

      // Add any remaining shortcuts that weren't in the reorder list
      this.shortcuts.forEach(shortcut => {
        if (!shortcutIds.includes(shortcut.id)) {
          reorderedShortcuts.push(shortcut);
        }
      });

      this.shortcuts = reorderedShortcuts;
      await this.saveShortcutPreferences();
      await this.setupQuickActions();
    } catch (error) {
      console.error('Error reordering shortcuts:', error);
    }
  }

  // Get shortcut usage statistics
  async getShortcutStats() {
    try {
      const stats = await AsyncStorage.getItem('shortcutUsageStats');
      return stats ? JSON.parse(stats) : {};
    } catch (error) {
      console.error('Error getting shortcut stats:', error);
      return {};
    }
  }

  // Track shortcut usage
  async trackShortcutUsage(shortcutId) {
    try {
      const stats = await this.getShortcutStats();
      stats[shortcutId] = (stats[shortcutId] || 0) + 1;
      await AsyncStorage.setItem('shortcutUsageStats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error tracking shortcut usage:', error);
    }
  }

  // Suggest shortcuts based on usage
  async getSuggestedShortcuts() {
    try {
      const stats = await this.getShortcutStats();
      const suggestions = [];

      // Suggest enabling popular shortcuts that are disabled
      Object.entries(stats).forEach(([shortcutId, usageCount]) => {
        if (usageCount > 5) { // Used more than 5 times
          const shortcut = this.shortcuts.find(s => s.id === shortcutId);
          if (shortcut && !shortcut.enabled) {
            suggestions.push({
              shortcut,
              reason: 'Frequently used but disabled',
            });
          }
        }
      });

      return suggestions;
    } catch (error) {
      console.error('Error getting shortcut suggestions:', error);
      return [];
    }
  }

  // Reset shortcuts to defaults
  async resetToDefaults() {
    try {
      // Reset all shortcuts to enabled
      this.shortcuts = this.shortcuts.map(shortcut => ({
        ...shortcut,
        enabled: true,
      }));

      this.dynamicShortcuts = [];
      await AsyncStorage.removeItem('shortcutPreferences');
      await AsyncStorage.removeItem('shortcutUsageStats');
      await this.setupQuickActions();
      await this.updateDynamicShortcuts();
    } catch (error) {
      console.error('Error resetting shortcuts:', error);
    }
  }
}

// Create singleton instance
const appShortcutsService = new AppShortcutsService();

export default appShortcutsService;