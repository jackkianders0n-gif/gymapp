// PB Tracker service worker — offline app shell
const CACHE = "pbtracker-v4";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Supabase API always goes to the network (live auth + data); the app handles offline itself.
  if (url.hostname.endsWith("supabase.co")) return;

  // HTML: network-first so app updates appear when online, cache fallback when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)).catch(() => {}); return res; })
        .catch(() => caches.match(req).then(h => h || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (CDN libraries, icons, fonts): cache-first.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const c = res.clone();
      caches.open(CACHE).then(k => k.put(req, c)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
