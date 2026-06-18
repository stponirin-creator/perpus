/* Service Worker — Perpustakaan Sekolah PWA
 * Strategi:
 *  - Kode aplikasi (HTML/JS/CSS, same-origin) => NETWORK-FIRST.
 *      Saat ONLINE selalu ambil versi terbaru (jadi update app.js langsung kepakai),
 *      saat OFFLINE pakai cache (app tetap terbuka).
 *  - Library CDN & font (cross-origin) => CACHE-FIRST (di-cache saat online sekali).
 *  - Request POST (panggilan API GAS) => TIDAK disentuh, selalu ke network.
 *  Naikkan versi cache di bawah setiap kali app.js / app.css diubah.
 */
var CACHE = 'perpus-v3';
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
  if (req.method !== 'GET') return; // POST ke API GAS lewat ke network apa adanya

  var url = new URL(req.url);
  var sameOrigin = (url.origin === self.location.origin);

  // Kode aplikasi & navigasi => network-first (selalu terbaru saat online).
  if (req.mode === 'navigate' || sameOrigin) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Library CDN / font => cache-first (lalu simpan saat pertama online).
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
