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
const VERSION = 'v97';
const CACHE = `tumarca-${VERSION}`;
const FOTOS = 'tumarca-fotos';

const ARCHIVOS = [
  './', 'trabaja-con-nosotros', 'panel', 'diseno', 'terminos-y-privacidad', 'sin-conexion', 'vista-previa',
  'css/style.css', 'css/componentes.css', 'css/animaciones.css', 'css/inicio.css', 'css/panel.css', 'css/trabaja.css', 'config.js',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/plantillas.js', 'js/panel.js', 'js/pago.js', 'js/efectos.js',
  'js/vendor/supabase.js', 'js/sinzoom.js', 'js/iconos.js', 'js/asistente.js', 'js/proyecto.js', 'js/negocio.js', 'js/seo.js', 'js/sitio.js', 'js/cookies.js', 'js/apariencia.js', 'js/avisos.js', 'js/colabora.js', 'js/ajustes.js', 'js/otp.js', 'js/calculadora.js', 'js/validar.js', 'js/dominio.js', 'js/idioma.js', 'js/idioma-en.js', 'js/publica.js', 'js/vistaweb.js', 'js/vista.js', 'js/desplegable.js', 'js/zip.js', 'js/brief.js', 'js/temporada.js', 'js/push.js', 'js/verificacion.js', 'js/presupuesto.js',
  'ajustes', 'css/funciones.css', 'css/widgets.css', 'css/tema-claro.css', 'css/pulido.css', 'css/temporadas.css', 'css/iconos-vivos.css', 'css/paginas.css', 'js/pagina.js', 'icons/nombre-oscuro.png',
  'fuentes/fuentes.css', 'fuentes/instrument-sans-latin-046090.woff2', 'fuentes/instrument-sans-latin-ext-284bb9.woff2', 'fuentes/bricolage-grotesque-latin-a97232.woff2', 'fuentes/bricolage-grotesque-latin-ext-a4fe79.woff2', 'fuentes/jetbrains-mono-latin-f70309.woff2', 'fuentes/jetbrains-mono-latin-ext-a83f17.woff2',
  'manifest.json', 'icons/logo-a.png', 'icons/logo-a-verde.png', 'js/mascota.js', 'js/estado-web.js', 'js/llamada.js', 'js/firma.js', 'js/antes-despues.js', 'js/borradores.js', 'js/inclinar.js', 'icons/nombre.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
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

// Páginas y código: la copia de esta versión al instante; si no está, internet (y se guarda)
async function deLaVersion(req, e) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
  if (!guardado) return redPrimero(req);
  if (req.mode === 'navigate') e.waitUntil(comprobarCambios(req, guardado.clone()));
  return guardado;
}

// ¿Ha cambiado la web en internet sin cambiar VERSION? Como mucho una vez por minuto
let ultimaComprobacion = 0;
async function comprobarCambios(req, guardado) {
  if (Date.now() - ultimaComprobacion < 60000) return;
  ultimaComprobacion = Date.now();
  try {
    const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (!res.ok || res.redirected) return;
    const [nuevo, viejo] = await Promise.all([res.clone().text(), guardado.text()]);
    if (nuevo === viejo) return;
    const cache = await caches.open(CACHE);
    await cache.put(req, res);
    await Promise.all(ARCHIVOS.map(a => cache.add(new Request(a, { cache: 'reload' })).catch(() => {})));
    // Lo que no está en ARCHIVOS (páginas de sector, guías…) se vuelve a pedir la próxima vez
    const sueltas = (await cache.keys()).filter(r => !ARCHIVOS.some(a => new URL(a, self.registration.scope).href === r.url) && r.url !== req.url);
    await Promise.all(sueltas.map(r => cache.delete(r)));
    (await self.clients.matchAll({ type: 'window' })).forEach(c => c.postMessage({ tipo: 'aurevix-nueva' }));
  } catch { /* sin conexión: ya se comprobará */ }
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

// Notificaciones push (las manda la función «notificar» de Supabase, ver js/push.js)
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

  const codigo = req.mode === 'navigate' || ['document', 'script', 'style', 'manifest'].includes(req.destination) || /\.(m?js|css|json)$/.test(url.pathname);
  e.respondWith(codigo ? deLaVersion(req, e) : guardadoYActualiza(req, e));
});
