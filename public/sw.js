// Enhanced Service Worker for Deals247 PWA - Phase 10
const CACHE_NAME = 'deals247-v2';
const STATIC_CACHE_NAME = 'deals247-static-v2';
const API_CACHE_NAME = 'deals247-api-v2';
const IMAGE_CACHE_NAME = 'deals247-images-v2';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/pwa-icon.svg',
  '/offline.html',
  '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/deals?limit=20',
  '/api/categories',
  '/api/stores?limit=10'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing (Phase 10)...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('Caching API resources');
        return cache.addAll(API_CACHE_URLS);
      })
    ]).catch((error) => {
      console.error('Error during installation:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating (Phase 10)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes('deals247-v2')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Enhanced fetch event with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first + cache strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle images with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static resources with stale-while-revalidate
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default network-first strategy
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Handle API requests with advanced caching
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful GET requests
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
  } catch (error) {
    console.log('Network failed for API request:', request.url);
  }

  // Fallback to cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return appropriate offline response
  if (request.url.includes('/api/deals')) {
    return new Response(JSON.stringify({
      deals: [],
      message: 'You are offline. Please check your connection.',
      offline: true,
      cached: false
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }

  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'You are currently offline. Some features may not be available.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cached image is still fresh (24 hours)
    const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date'));
    const now = new Date();
    const age = now - cacheDate;

    if (age < 24 * 60 * 60 * 1000) { // 24 hours
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone and add cache timestamp
      const responseClone = networkResponse.clone();
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers),
          'sw-cache-date': new Date().toISOString()
        }
      });

      cache.put(request, responseWithTimestamp);
    }
    return networkResponse;
  } catch (error) {
    // Return cached version if available
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('', { status: 404 });
  }
}

// Handle static resources with stale-while-revalidate
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // Return cached version immediately if available, then update cache
  if (cachedResponse) {
    // Update cache in background
    fetchPromise.catch(() => {}); // Ignore errors
    return cachedResponse;
  }

  return fetchPromise;
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Return offline page for navigation failures
    const cache = await caches.open(STATIC_CACHE_NAME);
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    return new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }

  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }

  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

// Push notification event with enhanced features
self.addEventListener('push', (event) => {
  console.log('Push notification received (Phase 10):', event);

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || 'New deal available!',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    image: data.image, // Rich notification image
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: data.urgent || false,
    silent: data.silent || false,
    data: data,
    actions: [
      {
        action: 'view',
        title: 'View Deal',
        icon: '/icons/view.png'
      },
      {
        action: 'favorite',
        title: 'Add to Favorites',
        icon: '/icons/favorite.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    // Enhanced notification features
    tag: data.tag || 'deal-notification', // Group similar notifications
    renotify: data.renotify || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Deals247', options)
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked (Phase 10):', event);

  event.notification.close();

  const data = event.notification.data;
  let urlToOpen = '/';

  switch (event.action) {
    case 'view':
      urlToOpen = data.dealId ? `/deal/${data.dealId}` : '/deals';
      break;
    case 'favorite':
      // Handle favorite action (would need to communicate with main thread)
      urlToOpen = data.dealId ? `/deal/${data.dealId}` : '/deals';
      break;
    default:
      urlToOpen = data.url || '/';
  }

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);

  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }

  if (event.tag === 'update-deals') {
    event.waitUntil(updateDealsCache());
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: '2.0.0',
      features: ['offline-support', 'push-notifications', 'background-sync']
    });
  }

  if (event.data && event.data.type === 'CACHE_DEAL') {
    event.waitUntil(cacheDealData(event.data.deal));
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearOldCache());
  }
});

// Sync offline actions
async function syncOfflineActions() {
  try {
    console.log('Syncing offline actions...');

    // Get stored offline actions from IndexedDB or similar
    // This would sync pending favorites, ratings, searches, etc.

    // For now, simulate sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Offline actions synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing offline actions:', error);
    return false;
  }
}

// Sync favorites
async function syncFavorites() {
  try {
    console.log('Syncing favorites...');
    // Implementation would sync favorite deals with server
    return true;
  } catch (error) {
    console.error('Error syncing favorites:', error);
    return false;
  }
}

// Sync content in background
async function syncContent() {
  try {
    console.log('Periodic content sync...');

    const cache = await caches.open(API_CACHE_NAME);

    // Update popular deals
    try {
      await cache.add('/api/deals?popular=true&limit=10');
    } catch (e) {
      console.log('Failed to update popular deals cache');
    }

    // Update categories
    try {
      await cache.add('/api/categories');
    } catch (e) {
      console.log('Failed to update categories cache');
    }

    console.log('Content sync completed');
  } catch (error) {
    console.error('Error during content sync:', error);
  }
}

// Update deals cache
async function updateDealsCache() {
  try {
    console.log('Updating deals cache...');

    const cache = await caches.open(API_CACHE_NAME);

    // Update today's deals
    await cache.add('/api/deals?filter=today&limit=20');

    // Update featured deals
    await cache.add('/api/deals?featured=true&limit=10');

    console.log('Deals cache updated');
  } catch (error) {
    console.error('Error updating deals cache:', error);
  }
}

// Cache deal data
async function cacheDealData(deal) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const request = new Request(`/api/deals/${deal.id}`);
    const response = new Response(JSON.stringify(deal), {
      headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(request, response);
    console.log('Deal cached:', deal.id);
  } catch (error) {
    console.error('Error caching deal:', error);
  }
}

// Clear old cache entries
async function clearOldCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const keys = await cache.keys();

    for (const request of keys) {
      // Remove entries older than 7 days
      const response = await cache.match(request);
      if (response) {
        const cacheDate = new Date(response.headers.get('sw-cache-date') || response.headers.get('date'));
        const age = Date.now() - cacheDate.getTime();

        if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
          await cache.delete(request);
        }
      }
    }

    console.log('Old cache entries cleared');
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
}