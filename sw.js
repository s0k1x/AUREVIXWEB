/* ==========================================================
   Service worker: la web funciona sin conexión
   Cada vez que subas cambios, sube VERSION (v13 → v14…)
   - Páginas, CSS, JS y config: al instante desde la copia guardada de
     ESTA versión (la web abre sin esperar a internet y todas las piezas
     son siempre de la misma versión). Lo que aún no está guardado va por
     internet y se guarda.
   - Por detrás se comprueba si la página ha cambiado en internet; si es
     así (alguien publicó sin subir VERSION), se vuelve a descargar todo y
     la página se recarga sola una vez. Cada VERSION nueva también lo
     descarga todo al instalarse y borra la copia anterior.
   - Fotos de los diseños: se guardan la primera vez y después
     salen al instante.
   ========================================================== */
const VERSION = 'v126';
const CACHE = `tumarca-${VERSION}`;
const FOTOS = 'tumarca-fotos';

const ARCHIVOS = [
  './', 'trabaja-con-nosotros', 'panel', 'diseno', 'terminos-y-privacidad', 'sin-conexion', 'vista-previa', 'seguimiento',
  'css/style.css', 'css/componentes.css', 'css/animaciones.css', 'css/inicio.css', 'css/panel.css', 'css/trabaja.css', 'config.js',
  'js/portada/app.js', 'js/base/ui.js', 'js/base/store.js', 'js/portada/plantillas.js', 'js/cuenta/panel.js', 'js/cuenta/pago.js', 'js/base/efectos.js',
  'js/vendor/supabase.js', 'js/base/sinzoom.js', 'js/base/iconos.js', 'js/asistente/asistente.js', 'js/cuenta/proyecto.js', 'js/cuenta/negocio.js', 'js/cuenta/seo.js', 'js/base/sitio.js', 'js/base/cookies.js', 'js/base/apariencia.js', 'js/base/avisos.js', 'js/cuenta/colabora.js', 'js/cuenta/ajustes.js', 'js/base/otp.js', 'js/portada/calculadora.js', 'js/base/validar.js', 'js/cuenta/dominio.js', 'js/base/idioma.js', 'js/base/idioma-en.js', 'js/portada/publica.js', 'js/cuenta/vistaweb.js', 'js/cuenta/vista.js', 'js/portada/seguimiento.js', 'js/base/desplegable.js', 'js/base/zip.js', 'js/cuenta/brief.js', 'js/base/temporada.js', 'js/base/push.js', 'js/base/verificacion.js', 'js/portada/presupuesto.js',
  'ajustes', 'css/funciones.css', 'css/widgets.css', 'css/tema-claro.css', 'css/pulido.css', 'css/temporadas.css', 'css/iconos-vivos.css', 'css/paginas.css', 'js/portada/pagina.js', 'icons/nombre-oscuro.png',
  'fuentes/fuentes.css', 'fuentes/instrument-sans-latin-046090.woff2', 'fuentes/instrument-sans-latin-ext-284bb9.woff2', 'fuentes/bricolage-grotesque-latin-a97232.woff2', 'fuentes/bricolage-grotesque-latin-ext-a4fe79.woff2', 'fuentes/jetbrains-mono-latin-f70309.woff2', 'fuentes/jetbrains-mono-latin-ext-a83f17.woff2',
  'manifest.json', 'icons/logo-a.png', 'icons/logo-a-verde.png', 'js/asistente/mascota.js', 'js/base/estado-web.js', 'js/portada/llamada.js', 'js/cuenta/firma.js', 'js/portada/antes-despues.js', 'js/base/borradores.js', 'js/portada/inclinar.js', 'js/portada/cierre.js', 'js/portada/escena-datos.js', 'js/portada/personas.js', 'icons/nombre.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
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

// Notificaciones push (las manda la función «notificar» de Supabase, ver js/base/push.js)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { texto: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'AurevixWeb', {
    body: d.texto || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-96.png',
    tag: d.tag || 'aurevix',
    renotify: true,
    data: { url: d.url || './' }
  }));
});
// Al tocarla: si la web ya está abierta, se usa esa pestaña; si no, se abre
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.location.origin);
  if (url.origin !== self.location.origin) return;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    const abierta = lista.find(c => new URL(c.url).origin === url.origin);
    if (abierta) return abierta.navigate(url.href).then(c => (c || abierta).focus()).catch(() => abierta.focus());
    return self.clients.openWindow(url.href);
  }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'images.pexels.com') { e.respondWith(fotoRapida(req)); return; }
  if (url.origin !== self.location.origin) return; // Supabase, Gemini, CDN: siempre en vivo

  // Páginas y código: siempre internet primero (comprobando con el servidor, normalmente un 304 sin descarga)
  // y la copia guardada solo sin conexión o si tarda. Así nunca se mezcla una página nueva con código viejo.
  const codigo = req.mode === 'navigate' || ['document', 'script', 'style', 'manifest'].includes(req.destination) || /\.(m?js|css|json)$/.test(url.pathname);
  e.respondWith(codigo ? redPrimero(req) : guardadoYActualiza(req, e));
});
