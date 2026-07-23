const CACHE_NAME = 'gestion-stock-v3';
const API_CACHE = 'gestion-stock-api-v2';

let API_ORIGIN = '';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_API_URL') {
    API_ORIGIN = event.data.url;
  }
  if (event.data === 'CACHE_PRODUCTS' && API_ORIGIN) {
    const url = `${API_ORIGIN}/api/products/`;
    fetch(url)
      .then((res) => res.json())
      .then((products) => {
        const cacheKey = new Request(url);
        caches.open(API_CACHE).then((cache) => cache.put(cacheKey, new Response(JSON.stringify(products))));
      });
  }
});

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (API_ORIGIN && url.origin === API_ORIGIN && request.method === 'GET') {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => { cache.put(request, response.clone()); return response; })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response('Hors ligne', { status: 503 })))
  );
});
