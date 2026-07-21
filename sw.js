// Minimal service worker: cache the app shell so it opens fast.
// News itself is always fetched live.
const SHELL = "mynews-shell-v1";
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon-192.png"];

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
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return; // news is always live
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
