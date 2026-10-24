/* ==========================================================
   Service worker: la web funciona sin conexión
   Cada vez que subas cambios, sube VERSION (v13 → v14…)
   - Archivos de la web: siempre la versión más nueva de internet
     (si no hay conexión, la copia guardada). Así nunca se mezclan
     archivos viejos con nuevos.
   - Fotos de los diseños: se guardan la primera vez y después
     salen al instante.
   ========================================================== */
const VERSION = 'v30';
const CACHE = `tumarca-${VERSION}`;
const FOTOS = 'tumarca-fotos';

const ARCHIVOS = [
  './', 'index.html', 'trabaja.html', 'panel.html', 'plantilla.html', 'terminos.html', 'offline.html',
  'style.css', 'componentes.css', 'animaciones.css', 'inicio.css', 'panel.css', 'trabaja.css', 'config.js',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/plantillas.js', 'js/panel.js', 'js/pago.js', 'js/efectos.js',
  'js/iconos.js', 'js/asistente.js', 'js/proyecto.js', 'js/sitio.js', 'js/cookies.js', 'js/apariencia.js', 'js/avisos.js', 'js/colabora.js', 'js/ajustes.js', 'js/megaprompt.js', 'js/generador.js', 'js/desplegable.js',
  'ajustes.html', 'funciones.css', 'tema-claro.css', 'icons/nombre-oscuro.png',
  'manifest.json', 'icons/logo-a.png', 'icons/nombre.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ARCHIVOS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FOTOS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Internet primero; si tarda más de 4 s o no hay conexión, la copia guardada
async function redPrimero(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req, { cache: 'no-cache' }),
      new Promise((_, no) => setTimeout(() => no(new Error('lento')), 4000))
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const guardado = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (guardado) return guardado;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || cache.match('offline.html');
    return fetch(req);
  }
}

// Fotos: de la caché al instante; si no están, se descargan y se guardan
async function fotoRapida(req) {
  const cache = await caches.open(FOTOS);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    cache.put(req, res.clone());
    cache.keys().then(k => { if (k.length > 250) k.slice(0, 50).forEach(x => cache.delete(x)); });
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'images.pexels.com') { e.respondWith(fotoRapida(req)); return; }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(fotoRapida(req)); return; }
  if (url.origin !== self.location.origin) return; // Supabase, Gemini, CDN: siempre en vivo

  e.respondWith(redPrimero(req));
});
