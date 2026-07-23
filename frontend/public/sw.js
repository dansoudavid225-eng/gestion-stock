const CACHE_NAME = 'gestion-stock-v2';
const API_CACHE = 'gestion-stock-api-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache API GET responses
  if (url.origin === 'http://localhost:8000' && request.method === 'GET') {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // Cache static assets and pages
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response('Hors ligne', { status: 503 })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'CACHE_PRODUCTS') {
    const url = 'http://localhost:8000/api/products/';
    fetch(url)
      .then((res) => res.json())
      .then((products) => {
        const cacheKey = new Request(url);
        caches.open(API_CACHE).then((cache) => cache.put(cacheKey, new Response(JSON.stringify(products))));
      });
  }
});
