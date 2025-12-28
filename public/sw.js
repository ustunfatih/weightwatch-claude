/**
 * Weightwatch Service Worker
 * S5/P5: Improved caching strategy with better offline support
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `weightwatch-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `weightwatch-dynamic-${CACHE_VERSION}`;

// Static assets to cache on install (Cache-First strategy)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-dark.svg',
];

// Font files to cache (Cache-First, long-lived)
const FONT_ASSETS = [
  '/fonts/Apercu-Regular.woff2',
  '/fonts/Apercu-Bold.woff2',
  '/fonts/Apercu-Medium.woff2',
  '/fonts/Apercu-Light.woff2',
];

// Maximum number of entries in dynamic cache
const MAX_DYNAMIC_CACHE_SIZE = 50;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Cache static assets, but don't fail if some are missing
        return Promise.allSettled([
          ...STATIC_ASSETS.map(url =>
            cache.add(url).catch(() => console.warn(`Failed to cache: ${url}`))
          ),
          ...FONT_ASSETS.map(url =>
            cache.add(url).catch(() => console.warn(`Failed to cache font: ${url}`))
          ),
        ]);
      })
  );
  // Take control immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old cache versions
            return name.startsWith('weightwatch-') &&
                   name !== STATIC_CACHE &&
                   name !== DYNAMIC_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

/**
 * Determine caching strategy based on request type
 */
function getCachingStrategy(request) {
  const url = new URL(request.url);

  // Skip cross-origin requests (except Google APIs for sync)
  if (!url.origin.includes(self.location.origin)) {
    // Allow Google APIs through but don't cache
    if (url.origin.includes('googleapis.com') || url.origin.includes('google.com')) {
      return 'network-only';
    }
    return 'network-only';
  }

  // Fonts - Cache First (immutable)
  if (url.pathname.startsWith('/fonts/')) {
    return 'cache-first';
  }

  // Static assets (images, icons) - Cache First
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    return 'cache-first';
  }

  // JavaScript and CSS bundles - Stale While Revalidate
  if (url.pathname.match(/\.(js|css)$/)) {
    return 'stale-while-revalidate';
  }

  // HTML/navigation - Network First (for fresh content)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    return 'network-first';
  }

  // Default - Network First
  return 'network-first';
}

/**
 * Cache-First Strategy: Try cache, fall back to network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback if available
    return caches.match('/index.html');
  }
}

/**
 * Network-First Strategy: Try network, fall back to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());

      // Clean up old entries
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // For navigation requests, return the cached index.html
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    throw error;
  }
}

/**
 * Stale-While-Revalidate: Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Return cached response immediately if available
  return cachedResponse || fetchPromise;
}

/**
 * Trim cache to maximum size (LRU-like)
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest entries
    const deleteCount = keys.length - maxItems;
    await Promise.all(
      keys.slice(0, deleteCount).map(key => cache.delete(key))
    );
  }
}

/**
 * Fetch event handler
 */
self.addEventListener('fetch', (event) => {
  const strategy = getCachingStrategy(event.request);

  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    case 'network-only':
    default:
      // Let the browser handle it normally
      return;
  }
});

/**
 * Handle messages from the client
 */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.keys().then(names =>
        Promise.all(names.map(name => caches.delete(name)))
      )
    );
  }
});
