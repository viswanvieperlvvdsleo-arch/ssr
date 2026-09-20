const CACHE_NAME = 'sj-info-business-solutions-cache-v3';
const URLS_TO_CACHE = [
  '/app-download',
  '/ssr-app',
  '/manifest.json',
  '/logo/192.png',
  '/logo/512.png',
  '/SJINFOBUSINESSSOLUTIONSLOGO.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isPrivateRequest = url.origin === self.location.origin && (
    url.pathname.startsWith('/api/') || url.pathname.startsWith('/ssr-app/')
  );
  if (isPrivateRequest || event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets use network first; private account data is never cached here.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
