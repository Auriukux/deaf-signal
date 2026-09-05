/* deaf-signal demo — minimal PWA service worker (installability / offline shell + notifications) */
/* Bump CACHE when demo.html (or other shell assets) change so PWA clients pick up new HTML. */
const CACHE = "deaf-signal-demo-v12";
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
const DEMO_URL = new URL("demo.html", examplesBase).href;

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

  // Network-first for library modules under /src/ (put on ok so offline match works)
  if (isSrcModule(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
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

/** Focus an open demo client, or open demo.html */
function focusOrOpenDemo() {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) {
        try {
          const href = client.url || "";
          if (
            (href === DEMO_URL || href.startsWith(DEMO_URL) || /\/demo\.html(\?|#|$)/.test(href)) &&
            "focus" in client
          ) {
            return client.focus();
          }
        } catch {
          /* continue */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(DEMO_URL);
      }
      return undefined;
    });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusOrOpenDemo());
});

/**
 * Page → SW message: { type: 'deaf-signal-notify', title, options }
 * Shows a system notification via the service worker registration.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "deaf-signal-notify") return;
  const title = data.title != null ? String(data.title) : "Alert";
  const options =
    data.options && typeof data.options === "object" ? { ...data.options } : {};
  // Match library default: no OS notification sound unless silent: false
  if (options.silent === undefined) options.silent = true;
  event.waitUntil(
    self.registration.showNotification(title, options).catch(() => {
      /* permission / platform may reject */
    })
  );
});
