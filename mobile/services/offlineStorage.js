import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Open database connection
const db = SQLite.openDatabase('deals247.db');

class OfflineStorageService {
  constructor() {
    this.isOnline = true;
    this.initDatabase();
    this.setupNetworkListener();
  }

  // Initialize database tables
  async initDatabase() {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Offline deals cache
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS offline_deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deal_id INTEGER UNIQUE,
            deal_data TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_synced BOOLEAN DEFAULT 0
          )`,
          [],
          () => console.log('Offline deals table created'),
          (_, error) => console.error('Error creating offline deals table:', error)
        );

        // Offline favorites
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS offline_favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deal_id INTEGER UNIQUE,
            user_id TEXT,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_synced BOOLEAN DEFAULT 0
          )`,
          [],
          () => console.log('Offline favorites table created'),
          (_, error) => console.error('Error creating offline favorites table:', error)
        );

        // Offline user actions (clicks, views)
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS offline_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT,
            deal_id INTEGER,
            user_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_synced BOOLEAN DEFAULT 0
          )`,
          [],
          () => console.log('Offline actions table created'),
          (_, error) => console.error('Error creating offline actions table:', error)
        );

        // Sync queue for pending operations
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation_type TEXT,
            endpoint TEXT,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            retry_count INTEGER DEFAULT 0
          )`,
          [],
          () => console.log('Sync queue table created'),
          (_, error) => console.error('Error creating sync queue table:', error)
        );
      }, reject, resolve);
    });
  }

  // Setup network connectivity listener
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      if (!wasOnline && this.isOnline) {
        // Came back online, trigger sync
        this.syncPendingData();
      }
    });
  }

  // Cache deal for offline viewing
  async cacheDeal(dealData) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO offline_deals (deal_id, deal_data, last_updated, is_synced)
           VALUES (?, ?, ?, 1)`,
          [dealData.id, JSON.stringify(dealData), new Date().toISOString()],
          (_, result) => {
            console.log('Deal cached offline:', dealData.id);
            resolve(result);
          },
          (_, error) => {
            console.error('Error caching deal:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Get cached deals
  async getCachedDeals(limit = 50) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM offline_deals ORDER BY last_updated DESC LIMIT ?`,
          [limit],
          (_, { rows }) => {
            const deals = [];
            for (let i = 0; i < rows.length; i++) {
              try {
                deals.push(JSON.parse(rows.item(i).deal_data));
              } catch (e) {
                console.error('Error parsing cached deal:', e);
              }
            }
            resolve(deals);
          },
          (_, error) => {
            console.error('Error getting cached deals:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Add deal to favorites offline
  async addToFavoritesOffline(dealId, userId) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR IGNORE INTO offline_favorites (deal_id, user_id, is_synced)
           VALUES (?, ?, 0)`,
          [dealId, userId],
          (_, result) => {
            console.log('Deal added to offline favorites:', dealId);
            resolve(result);
          },
          (_, error) => {
            console.error('Error adding to offline favorites:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Get offline favorites
  async getOfflineFavorites(userId) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT deal_id FROM offline_favorites WHERE user_id = ?`,
          [userId],
          (_, { rows }) => {
            const favorites = [];
            for (let i = 0; i < rows.length; i++) {
              favorites.push(rows.item(i).deal_id);
            }
            resolve(favorites);
          },
          (_, error) => {
            console.error('Error getting offline favorites:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Record user action offline
  async recordActionOffline(actionType, dealId, userId) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO offline_actions (action_type, deal_id, user_id, is_synced)
           VALUES (?, ?, ?, 0)`,
          [actionType, dealId, userId],
          (_, result) => {
            console.log('Action recorded offline:', actionType, dealId);
            resolve(result);
          },
          (_, error) => {
            console.error('Error recording offline action:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Add operation to sync queue
  async addToSyncQueue(operationType, endpoint, data) {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO sync_queue (operation_type, endpoint, data)
           VALUES (?, ?, ?)`,
          [operationType, endpoint, JSON.stringify(data)],
          (_, result) => {
            console.log('Added to sync queue:', operationType);
            resolve(result);
          },
          (_, error) => {
            console.error('Error adding to sync queue:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Sync pending data when online
  async syncPendingData() {
    if (!this.isOnline) return;

    console.log('Starting data synchronization...');

    try {
      // Sync favorites
      await this.syncFavorites();

      // Sync actions
      await this.syncActions();

      // Process sync queue
      await this.processSyncQueue();

      console.log('Data synchronization completed');
    } catch (error) {
      console.error('Error during data sync:', error);
    }
  }

  // Sync favorites with server
  async syncFavorites() {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM offline_favorites WHERE is_synced = 0`,
          [],
          async (_, { rows }) => {
            for (let i = 0; i < rows.length; i++) {
              const favorite = rows.item(i);
              try {
                // TODO: Make API call to sync favorite
                console.log('Syncing favorite:', favorite.deal_id);

                // Mark as synced
                tx.executeSql(
                  `UPDATE offline_favorites SET is_synced = 1 WHERE id = ?`,
                  [favorite.id]
                );
              } catch (error) {
                console.error('Error syncing favorite:', error);
              }
            }
            resolve();
          },
          reject
        );
      });
    });
  }

  // Sync user actions with server
  async syncActions() {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM offline_actions WHERE is_synced = 0 LIMIT 50`,
          [],
          async (_, { rows }) => {
            for (let i = 0; i < rows.length; i++) {
              const action = rows.item(i);
              try {
                // TODO: Make API call to sync action
                console.log('Syncing action:', action.action_type, action.deal_id);

                // Mark as synced
                tx.executeSql(
                  `UPDATE offline_actions SET is_synced = 1 WHERE id = ?`,
                  [action.id]
                );
              } catch (error) {
                console.error('Error syncing action:', error);
              }
            }
            resolve();
          },
          reject
        );
      });
    });
  }

  // Process sync queue
  async processSyncQueue() {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM sync_queue WHERE retry_count < 3 ORDER BY created_at ASC LIMIT 10`,
          [],
          async (_, { rows }) => {
            for (let i = 0; i < rows.length; i++) {
              const operation = rows.item(i);
              try {
                // TODO: Make API call based on operation
                console.log('Processing sync queue item:', operation.operation_type);

                // Remove from queue on success
                tx.executeSql(
                  `DELETE FROM sync_queue WHERE id = ?`,
                  [operation.id]
                );
              } catch (error) {
                // Increment retry count
                tx.executeSql(
                  `UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`,
                  [operation.id]
                );
                console.error('Error processing sync queue item:', error);
              }
            }
            resolve();
          },
          reject
        );
      });
    });
  }

  // Clear old cached data
  async clearOldCache(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `DELETE FROM offline_deals WHERE last_updated < ?`,
          [cutoffDate.toISOString()],
          (_, result) => {
            console.log('Cleared old cached deals:', result.rowsAffected);
            resolve(result);
          },
          (_, error) => {
            console.error('Error clearing old cache:', error);
            reject(error);
          }
        );
      });
    });
  }

  // Get storage stats
  async getStorageStats() {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT
            (SELECT COUNT(*) FROM offline_deals) as deals_count,
            (SELECT COUNT(*) FROM offline_favorites) as favorites_count,
            (SELECT COUNT(*) FROM offline_actions) as actions_count,
            (SELECT COUNT(*) FROM sync_queue) as queue_count`,
          [],
          (_, { rows }) => {
            resolve(rows.item(0));
          },
          reject
        );
      });
    });
  }
}

export default new OfflineStorageService();