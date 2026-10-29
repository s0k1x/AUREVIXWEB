/* ==========================================================
   Service worker: la web funciona sin conexión
   Cada vez que subas cambios, sube VERSION (v13 → v14…)
   - Páginas (HTML): internet primero (máx. 2,5 s); si tarda o no hay
     conexión, la copia guardada.
   - CSS, JS, imágenes y config: al instante desde la copia guardada y
     se actualizan por detrás (la app abre sin esperar a la red). Cada
     VERSION nueva vuelve a descargarlo todo al instalarse y borra la
     copia anterior, así que no se mezclan versiones.
   - Fotos de los diseños: se guardan la primera vez y después
     salen al instante.
   - Librería (/library/ y /biblioteca-ui/): NO se guarda (son miles de
     archivos); va siempre por internet con la caché normal del navegador.
   ========================================================== */
const VERSION = 'v54';
const CACHE = `tumarca-${VERSION}`;
const FOTOS = 'tumarca-fotos';

const ARCHIVOS = [
  './', 'trabaja-con-nosotros', 'panel', 'diseno', 'terminos-y-privacidad', 'sin-conexion', 'vista-previa',
  'style.css', 'componentes.css', 'animaciones.css', 'inicio.css', 'panel.css', 'trabaja.css', 'config.js',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/plantillas.js', 'js/panel.js', 'js/pago.js', 'js/efectos.js',
  'js/vendor/supabase.js', 'js/sinzoom.js', 'js/iconos.js', 'js/asistente.js', 'js/proyecto.js', 'js/sitio.js', 'js/cookies.js', 'js/apariencia.js', 'js/avisos.js', 'js/colabora.js', 'js/ajustes.js', 'js/contrasena.js', 'js/calculadora.js', 'js/validar.js', 'js/dominio.js', 'js/idioma.js', 'js/idioma-en.js', 'js/publica.js', 'js/vistaweb.js', 'js/vista.js', 'js/desplegable.js', 'js/zip.js', 'js/brief.js',
  'ajustes', 'funciones.css', 'widgets.css', 'tema-claro.css', 'pulido.css', 'icons/nombre-oscuro.png',
  'fuentes/fuentes.css', 'fuentes/instrument-sans-latin-046090.woff2', 'fuentes/instrument-sans-latin-ext-284bb9.woff2', 'fuentes/bricolage-grotesque-latin-a97232.woff2', 'fuentes/bricolage-grotesque-latin-ext-a4fe79.woff2', 'fuentes/jetbrains-mono-latin-f70309.woff2', 'fuentes/jetbrains-mono-latin-ext-a83f17.woff2',
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

// Páginas: internet primero; si tarda más de 2,5 s o no hay conexión, la copia guardada
async function redPrimero(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req, { cache: 'no-cache' }),
      new Promise((_, no) => setTimeout(() => no(new Error('lento')), 2500))
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const guardado = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (guardado) return guardado;
    if (req.mode === 'navigate') return (await cache.match('./')) || cache.match('sin-conexion');
    return fetch(req);
  }
}

// CSS y JS: internet primero (si tarda más de 2,5 s o no hay conexión, la copia guardada).
// Así el HTML nuevo nunca se mezcla con el JS o el CSS de la versión anterior.
// Fuentes e imágenes propias: la copia guardada al instante y, por detrás, la de internet.
async function guardadoYActualiza(req, e) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(req);
  const red = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  if (guardado) {
    e.waitUntil(red.catch(() => {}));
    return guardado;
  }
  return red;
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
  if (url.origin !== self.location.origin) return; // Supabase, Gemini, CDN: siempre en vivo
  if (/\/(library|biblioteca-ui)\//.test(url.pathname)) return; // la librería no se guarda en el móvil

  const codigo = req.mode === 'navigate' || ['document', 'script', 'style', 'manifest'].includes(req.destination) || /\.(m?js|css|json)$/.test(url.pathname);
  e.respondWith(codigo ? redPrimero(req) : guardadoYActualiza(req, e));
});
