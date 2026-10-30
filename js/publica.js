/* ==========================================================
   WEB DE UN CLIENTE EN aurevixweb.es/<nombre>
   GitHub Pages sirve 404.html para cualquier dirección que no existe;
   esta página mira si el nombre es una web publicada por el equipo y,
   si lo es, la enseña a pantalla completa (aislada en un iframe).
   ========================================================== */
import * as store from './store.js';
import { documento } from './vistaweb.js';

const raiz = document.getElementById('publica');
const partes = location.pathname.split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch { return x; } });
const slug = (partes[0] || '').toLowerCase();

const noEncontrada = () => { document.documentElement.classList.add('es-404'); import('./idioma.js').then(m => m.iniciarIdioma()).catch(() => {}); };

async function arrancarWeb() {
  if (!slug || store.motivoSlug(slug)) return noEncontrada();
  try { await store.iniciar(); } catch {}
  let w;
  try { w = await store.webPublica(slug); } catch { w = null; }
  if (!w || !w.archivos?.length) return noEncontrada();
  const v = { id: w.version, entrada: w.entrada, archivos: w.archivos };
  /* Estadísticas reales para el cliente (sin cookies): una visita por sesión y cada intento de contacto
     (llamar, WhatsApp, correo). Se ven en «Mis proyectos» y en el panel. */
  const dispositivo = matchMedia('(max-width:640px)').matches ? 'movil' : matchMedia('(max-width:1024px)').matches ? 'tablet' : 'ordenador';
  let origen = '';
  try { const r = document.referrer && new URL(document.referrer).hostname; if (r && r !== location.hostname) origen = r.replace(/^www\./, ''); } catch { /* sin origen */ }
  const medir = tipo => {
    if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)) return;
    if (tipo === 'visita') { try { const k = 'tm_vw_' + slug; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* sin almacenamiento */ } }
    store.contarEnWebCliente(slug, tipo, dispositivo, origen);
  };
  const paginas = new Set(w.archivos.map(a => a.ruta).filter(r => /\.html?$/i.test(r)));
  document.title = w.negocio || slug;
  // Un iframe nuevo por página: cambiar el srcdoc del mismo añadiría pasos al historial y «Atrás» no iría bien
  let marco = null;
  const nuevoMarco = html => {
    const m = document.createElement('iframe');
    m.className = 'pub-marco';
    m.title = w.negocio || 'Web';
    // Sin allow-same-origin: el código de la web no puede tocar nada de AurevixWeb
    m.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    m.srcdoc = html;
    marco = m;
    raiz.replaceChildren(m);
  };

  const rutaDeUrl = () => {
    const r = location.pathname.split('/').filter(Boolean).slice(1).map(x => { try { return decodeURIComponent(x); } catch { return x; } }).join('/');
    if (!r) return v.entrada;
    const sin = r.replace(/\/$/, '');
    return paginas.has(sin) ? sin : paginas.has(sin + '.html') ? sin + '.html' : paginas.has(sin + '.htm') ? sin + '.htm' : paginas.has((sin ? sin + '/' : '') + 'index.html') ? (sin ? sin + '/' : '') + 'index.html' : v.entrada;
  };
  // Direcciones limpias: /nombre/contacto en vez de /nombre/contacto.html
  const urlDe = ruta => '/' + slug + (ruta === v.entrada ? '' : '/' + ruta.replace(/(^|\/)index\.html?$/i, '$1').replace(/\.html?$/i, '').split('/').map(encodeURIComponent).join('/'));
  let turno = 0;
  const cargar = async (ruta, hash = '') => {
    const mio = ++turno;
    try {
      const { html } = await documento(v, ruta, hash);
      if (mio === turno) nuevoMarco(html);
    } catch {
      if (mio === turno) raiz.innerHTML = '<div class="pub-error"><b>No se ha podido abrir esta web</b><p>Prueba de nuevo en un momento.</p><button type="button" onclick="location.reload()">Reintentar</button></div>';
    }
  };
  addEventListener('message', e => {
    if (!marco || e.source !== marco.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.aw === 'ir' && paginas.has(e.data.ruta)) {
      history.pushState(null, '', urlDe(e.data.ruta));
      cargar(e.data.ruta, e.data.hash || '');
    } else if (e.data.aw === 'aviso') {
      if (e.data.tipo === 'contacto') medir('contacto');
      aviso(e.data.tipo === 'form' ? 'Los formularios aún no envían nada: es una vista previa.' : e.data.tipo === 'contacto' ? 'En la web definitiva este botón abrirá el teléfono, el correo o WhatsApp.' : 'Esa página todavía no está en esta versión.');
    }
  });
  addEventListener('popstate', () => cargar(rutaDeUrl()));
  const inicial = rutaDeUrl();
  if (location.pathname !== urlDe(inicial)) history.replaceState(null, '', urlDe(inicial));
  document.documentElement.classList.add('es-web');
  await cargar(inicial);
  medir('visita');
}

let tAviso;
function aviso(t) {
  let el = document.getElementById('pubAviso');
  if (!el) { el = document.createElement('div'); el.id = 'pubAviso'; el.className = 'pub-aviso'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = t; el.classList.add('ver');
  clearTimeout(tAviso); tAviso = setTimeout(() => el.classList.remove('ver'), 3500);
}

arrancarWeb();
