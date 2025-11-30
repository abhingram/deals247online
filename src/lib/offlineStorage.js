/**
 * Offline Storage Service
 * Handles caching of deals and user data for offline functionality
 */

class OfflineStorage {
  constructor() {
    this.dbName = 'Deals247_Offline';
    this.version = 1;
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Offline storage initialization failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Offline storage initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('savedDeals')) {
          const savedDealsStore = db.createObjectStore('savedDeals', { keyPath: 'id' });
          savedDealsStore.createIndex('userId', 'userId', { unique: false });
          savedDealsStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('cachedDeals')) {
          const cachedDealsStore = db.createObjectStore('cachedDeals', { keyPath: 'id' });
          cachedDealsStore.createIndex('category', 'category', { unique: false });
          cachedDealsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        if (!db.objectStoreNames.contains('apiCache')) {
          const apiCacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
          apiCacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async ensureInit() {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return this.initPromise;
  }

  // Saved Deals Management
  async saveDeal(deal, userId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readwrite');
      const store = transaction.objectStore('savedDeals');

      const savedDeal = {
        ...deal,
        userId,
        savedAt: new Date().toISOString(),
        synced: navigator.onLine // Mark as synced if online
      };

      const request = store.put(savedDeal);

      request.onsuccess = () => resolve(savedDeal);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSavedDeal(dealId, userId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readwrite');
      const store = transaction.objectStore('savedDeals');

      const request = store.delete(dealId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSavedDeals(userId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readonly');
      const store = transaction.objectStore('savedDeals');
      const index = store.index('userId');

      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async isDealSaved(dealId, userId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readonly');
      const store = transaction.objectStore('savedDeals');

      const request = store.get(dealId);

      request.onsuccess = () => {
        const deal = request.result;
        resolve(deal && deal.userId === userId);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cached Deals Management
  async cacheDeals(deals, category = 'general') {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedDeals'], 'readwrite');
      const store = transaction.objectStore('cachedDeals');

      const cachedDeals = deals.map(deal => ({
        ...deal,
        category,
        lastAccessed: new Date().toISOString(),
        cachedAt: new Date().toISOString()
      }));

      let completed = 0;
      const total = cachedDeals.length;

      if (total === 0) {
        resolve([]);
        return;
      }

      cachedDeals.forEach(deal => {
        const request = store.put(deal);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve(cachedDeals);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getCachedDeals(category = null, limit = 50) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedDeals'], 'readonly');
      const store = transaction.objectStore('cachedDeals');

      let request;
      if (category) {
        const index = store.index('category');
        request = index.getAll(category);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let deals = request.result;
        // Sort by last accessed (most recent first)
        deals.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
        resolve(deals.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // API Cache Management
  async cacheApiResponse(url, data, ttl = 3600000) { // 1 hour default TTL
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['apiCache'], 'readwrite');
      const store = transaction.objectStore('apiCache');

      const cacheEntry = {
        url,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      };

      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve(cacheEntry);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedApiResponse(url) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['apiCache'], 'readonly');
      const store = transaction.objectStore('apiCache');

      const request = store.get(url);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry && entry.expiresAt > Date.now()) {
          resolve(entry.data);
        } else {
          // Cache miss or expired
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // User Preferences
  async setUserPreference(key, value) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readwrite');
      const store = transaction.objectStore('userPreferences');

      const request = store.put({ key, value, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserPreference(key) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readonly');
      const store = transaction.objectStore('userPreferences');

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Management
  async getUnsyncedDeals(userId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readonly');
      const store = transaction.objectStore('savedDeals');
      const index = store.index('synced');

      const request = index.getAll(false);

      request.onsuccess = () => {
        const unsynced = request.result.filter(deal => deal.userId === userId);
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markDealsAsSynced(dealIds) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['savedDeals'], 'readwrite');
      const store = transaction.objectStore('savedDeals');

      let completed = 0;
      const total = dealIds.length;

      if (total === 0) {
        resolve();
        return;
      }

      dealIds.forEach(dealId => {
        const getRequest = store.get(dealId);

        getRequest.onsuccess = () => {
          const deal = getRequest.result;
          if (deal) {
            deal.synced = true;
            const putRequest = store.put(deal);

            putRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  }

  // Cleanup old cache entries
  async cleanup() {
    await this.ensureInit();
    const now = Date.now();

    // Clean up expired API cache
    const apiTransaction = this.db.transaction(['apiCache'], 'readwrite');
    const apiStore = apiTransaction.objectStore('apiCache');
    const apiIndex = apiStore.index('timestamp');

    const apiRequest = apiIndex.openCursor();
    apiRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.expiresAt < now) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // Clean up old cached deals (keep only recent 200)
    const dealsTransaction = this.db.transaction(['cachedDeals'], 'readwrite');
    const dealsStore = dealsTransaction.objectStore('cachedDeals');
    const dealsIndex = dealsStore.index('lastAccessed');

    const dealsRequest = dealsIndex.openCursor(null, 'prev'); // Most recent first
    let count = 0;
    dealsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && count > 200) {
        cursor.delete();
        cursor.continue();
      } else if (cursor) {
        count++;
        cursor.continue();
      }
    };
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;