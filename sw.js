/* Service Worker — Perpustakaan Sekolah PWA
 * Strategi:
 *  - App shell (html, css, js, ikon) di-precache => buka INSTAN & jalan OFFLINE.
 *  - Aset GET lain (font, library CDN) => stale-while-revalidate (di-cache saat online).
 *  - Request POST (panggilan API GAS) => TIDAK di-cache, selalu ke network.
 *  Naikkan versi cache di bawah setiap kali app.js / app.css berubah agar update terpasang.
 */
var CACHE = 'perpus-v2';
var SHELL = ['./', './index.html', './app.css', './app.js', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // Biarkan request non-GET (POST ke API GAS) lewat ke network apa adanya.
  if (req.method !== 'GET') return;

  // Navigasi halaman: coba network, kalau offline pakai index.html dari cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('./index.html'); }));
    return;
  }

  // Aset GET (lokal + CDN): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
