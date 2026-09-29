// Incrémente VERSION à chaque mise à jour de l'app pour forcer le rafraîchissement du cache
const VERSION = 'tp-v1';
const CORE = [
  './', './index.html', './manifest.webmanifest', './jspdf.umd.min.js',
  './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('tp-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Polices Google : cache au fil de l'eau (le texte reste lisible sans elles)
  if (url.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(
        caches.open(VERSION).then(c => c.match(e.request).then(hit =>
          hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit)
        ))
      );
    }
    return;
  }
  // Fichiers de l'app : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r.ok) caches.open(VERSION).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
