/* deaf-signal demo — minimal PWA service worker (installability / offline shell) */
const CACHE = "deaf-signal-demo-v4";
const examplesBase = new URL("./", self.location.href);
/** Cache-first shell only (HTML / manifest / icons) — not live library modules */
const SHELL_URLS = [
  new URL("demo.html", examplesBase).href,
  new URL("manifest.webmanifest", examplesBase).href,
  new URL("icons/icon-192.png", examplesBase).href,
  new URL("icons/icon-512.png", examplesBase).href,
  new URL("icons/apple-touch-icon.png", examplesBase).href,
];
const SHELL_SET = new Set(SHELL_URLS);

function isSrcModule(url) {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    if (u.origin !== self.location.origin) return false;
    // /src/*.js (and .d.ts) — network-first so demos pick up library fixes
    return /\/src\/[^/]+\.(js|d\.ts)$/.test(u.pathname);
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for library modules under /src/
  if (isSrcModule(url)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for shell assets only
  if (SHELL_SET.has(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network
  event.respondWith(fetch(request));
});
