import { useState, useEffect } from 'react';
import offlineStorage from '@/lib/offlineStorage';

/**
 * Hook for managing online/offline status and data synchronization
 */
export const useOfflineSync = (user) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if (user?.uid) {
        syncSavedDeals();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const syncSavedDeals = async () => {
    if (!user?.uid || !isOnline) return;

    setIsSyncing(true);
    try {
      // Get unsynced deals from offline storage
      const unsyncedDeals = await offlineStorage.getUnsyncedDeals(user.uid);

      if (unsyncedDeals.length > 0) {
        // In a real implementation, you would sync these with your backend
        // For now, we'll just mark them as synced
        const dealIds = unsyncedDeals.map(deal => deal.id);
        await offlineStorage.markDealsAsSynced(dealIds);

        console.log(`Synced ${unsyncedDeals.length} saved deals`);
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing saved deals:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveDealOffline = async (deal) => {
    if (!user?.uid) return;

    try {
      await offlineStorage.saveDeal(deal, user.uid);
      if (isOnline) {
        // Trigger sync if online
        syncSavedDeals();
      }
    } catch (error) {
      console.error('Error saving deal offline:', error);
    }
  };

  const removeSavedDealOffline = async (dealId) => {
    if (!user?.uid) return;

    try {
      await offlineStorage.removeSavedDeal(dealId, user.uid);
      if (isOnline) {
        // Trigger sync if online
        syncSavedDeals();
      }
    } catch (error) {
      console.error('Error removing saved deal offline:', error);
    }
  };

  const getSavedDealsOffline = async () => {
    if (!user?.uid) return [];

    try {
      return await offlineStorage.getSavedDeals(user.uid);
    } catch (error) {
      console.error('Error getting saved deals offline:', error);
      return [];
    }
  };

  const isDealSavedOffline = async (dealId) => {
    if (!user?.uid) return false;

    try {
      return await offlineStorage.isDealSaved(dealId, user.uid);
    } catch (error) {
      console.error('Error checking if deal is saved offline:', error);
      return false;
    }
  };

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncSavedDeals,
    saveDealOffline,
    removeSavedDealOffline,
    getSavedDealsOffline,
    isDealSavedOffline
  };
};

/**
 * Hook for caching API responses
 */
export const useApiCache = () => {
  const cacheApiResponse = async (url, data, ttl = 3600000) => {
    try {
      await offlineStorage.cacheApiResponse(url, data, ttl);
    } catch (error) {
      console.error('Error caching API response:', error);
    }
  };

  const getCachedApiResponse = async (url) => {
    try {
      return await offlineStorage.getCachedApiResponse(url);
    } catch (error) {
      console.error('Error getting cached API response:', error);
      return null;
    }
  };

  return {
    cacheApiResponse,
    getCachedApiResponse
  };
};

/**
 * Hook for caching deals data
 */
export const useDealsCache = () => {
  const cacheDeals = async (deals, category = 'general') => {
    try {
      await offlineStorage.cacheDeals(deals, category);
    } catch (error) {
      console.error('Error caching deals:', error);
    }
  };

  const getCachedDeals = async (category = null, limit = 50) => {
    try {
      return await offlineStorage.getCachedDeals(category, limit);
    } catch (error) {
      console.error('Error getting cached deals:', error);
      return [];
    }
  };

  return {
    cacheDeals,
    getCachedDeals
  };
};