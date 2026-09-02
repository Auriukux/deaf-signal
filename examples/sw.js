/* deaf-signal demo — minimal PWA service worker (installability / offline shell) */
const CACHE = "deaf-signal-demo-v3";
const examplesBase = new URL("./", self.location.href);
const repoRoot = new URL("../", self.location.href);
const PRECACHE_URLS = [
  new URL("demo.html", examplesBase).href,
  new URL("manifest.webmanifest", examplesBase).href,
  new URL("icons/icon-192.png", examplesBase).href,
  new URL("icons/icon-512.png", examplesBase).href,
  new URL("icons/apple-touch-icon.png", examplesBase).href,
  new URL("src/index.js", repoRoot).href,
  new URL("src/signals.js", repoRoot).href,
  new URL("src/presets.js", repoRoot).href,
  new URL("src/alerts.js", repoRoot).href,
  new URL("src/notify.js", repoRoot).href,
  new URL("src/listen.js", repoRoot).href,
];
const PRECACHE_SET = new Set(PRECACHE_URLS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for precached shell assets; network fallback otherwise
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && PRECACHE_SET.has(url.href)) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
