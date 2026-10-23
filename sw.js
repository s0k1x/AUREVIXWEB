/* ==========================================================
   Service worker — la web funciona sin conexión
   👉 Cada vez que subas cambios, sube VERSION (v1 → v2…)
   ========================================================== */
const VERSION = 'v3';
const CACHE = `tumarca-${VERSION}`;

const ARCHIVOS = [
  './', 'index.html', 'trabaja.html', 'panel.html', 'plantilla.html', 'terminos.html', 'offline.html',
  'style.css', 'componentes.css', 'animaciones.css', 'inicio.css', 'panel.css', 'config.js',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/plantillas.js', 'js/panel.js', 'js/pago.js', 'js/efectos.js',
  'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase / Google: siempre por internet (login y datos en vivo)
  if (/googleapis\.com$|gstatic\.com$|firebaseapp\.com$|google\.com$/.test(url.hostname) &&
      !/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;

  // Páginas: primero internet; sin conexión, la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); }
          return res;
        })
        .catch(async () =>
          (await caches.match(req, { ignoreSearch: true })) ||
          (await caches.match('index.html')) ||
          caches.match('offline.html'))
    );
    return;
  }

  // Archivos propios y fuentes: rápido desde caché y se actualizan por detrás
  const propio = url.origin === self.location.origin;
  const fuentes = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!propio && !fuentes) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const guardado = await cache.match(req);
      const red = fetch(req)
        .then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
