// Service Worker for OverTrain PWA
// Handles offline functionality and caching

const CACHE_NAME = 'overtrain-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential assets')
      return cache.addAll(ASSETS_TO_CACHE)
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event - network-first strategy, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls - let them go through normally
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => {
      return new Response('Offline - data not available', { status: 503 })
    }))
    return
  }

  // Network-first strategy for all requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache responses with errors
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }
        return response
      })
      .catch(() => {
        // Fallback to cached version or offline page
        return caches.match(request).then((response) => {
          return response || caches.match('/') || new Response('Offline', { status: 503 })
        })
      })
  )
})

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName)
        })
      )
    }).then(() => {
      console.log('[SW] All caches cleared')
      event.ports[0].postMessage({ cleared: true })
    })
  }
})

// Background sync for workout data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workouts') {
    console.log('[SW] Syncing workouts in background...')
    // Background sync logic will be implemented when needed
  }
})
