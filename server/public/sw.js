const CACHE_NAME = 'qr-chat-v3';
const PRECACHE = ['/vite.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => Promise.resolve())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => (name === CACHE_NAME ? null : caches.delete(name)))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation and index.html to avoid stale UI after deploy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isNav = req.mode === 'navigate' || req.destination === 'document' || req.url.endsWith('/index.html');
  if (isNav) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // Cache-first for small static assets
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
