// ctOS — service worker for offline / PWA support (GitHub Pages friendly)
const CACHE_NAME = 'ctos-cache-v1';

// Cache relative to this file's own location, so it works whether the site
// is served from the domain root or a GitHub Pages project subpath
// (https://username.github.io/reponame/).
const SCOPE = self.registration.scope; // e.g. https://user.github.io/repo/
const APP_URLS = [
  SCOPE,
  SCOPE + 'index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first, falling back to network, falling back to whatever's cached
// if the network is unavailable (offline). Also opportunistically updates
// the cache whenever a fresh network response succeeds.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Serve cached copy immediately if we have one, otherwise wait on network.
      return cached || networkFetch;
    })
  );
});
