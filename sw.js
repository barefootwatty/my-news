// Minimal service worker.
// The app itself is fetched fresh every time it opens (network-first), so an
// update goes live for everyone as soon as it's pushed. The cached copy is only
// a fallback for a slow or missing connection. Fonts and icons never change, so
// they're served straight from the cache. News is always fetched live.
const SHELL = "mynews-shell-v6";
const FILES = [
  "./", "index.html", "style.css?v=5", "app.js?v=6", "manifest.webmanifest", "icon-192.png",
  "fonts/mulish-latin-700-normal.woff2", "fonts/mulish-latin-800-normal.woff2", "fonts/mulish-latin-900-normal.woff2",
  "fonts/barlow-latin-400-normal.woff2", "fonts/barlow-latin-500-normal.woff2", "fonts/barlow-latin-600-normal.woff2",
  "fonts/caudex-latin-400-normal.woff2", "fonts/caudex-latin-400-italic.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function freshFirst(request) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(request).then(
      (hit) => hit || (request.mode === "navigate" ? caches.match("index.html") : undefined));
    // on a crawling connection, show the saved copy after 4 seconds rather than a blank screen
    const slow = setTimeout(() => {
      fromCache().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, 4000);
    fetch(request).then((res) => {
      clearTimeout(slow);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(() => {
      clearTimeout(slow);
      fromCache().then((hit) => { if (!settled) { settled = true; resolve(hit || Response.error()); } });
    });
  });
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          // article pictures etc. — leave alone
  if (url.pathname.startsWith("/api/")) return;         // news is always live
  if (/\.(woff2|png)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
    return;
  }
  e.respondWith(freshFirst(e.request));
});
