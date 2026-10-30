/* ==========================================================
   REVISIÓN SEO DE LA WEB DE UN CLIENTE (panel → Web del cliente)
   Lee los archivos de una versión subida (sin publicarla) y revisa lo
   básico para Google: título, descripción, H1, idioma, móvil, textos
   alternativos de las fotos, enlaces internos rotos, peso de los
   archivos e indexación (noindex). Todo en el navegador: no se envía
   nada fuera. Para velocidad real está «Revisa tu web» (PageSpeed).
   ========================================================== */
import { archivoWeb } from './store.js';
import { esc, icono, tamano } from './ui.js';

const KB = 1024;
const esHTML = a => /\.html?$/i.test(a.ruta);
const normal = r => r.replace(/^\.?\//, '').replace(/\/+/g, '/').toLowerCase();

/** Resuelve un enlace relativo de una página a la ruta de un archivo de la versión */
function destino(desde, href) {
  const limpio = href.split('#')[0].split('?')[0];
  if (!limpio) return null;
  const base = desde.includes('/') ? desde.slice(0, desde.lastIndexOf('/') + 1) : '';
  const partes = (limpio.startsWith('/') ? limpio.slice(1) : base + limpio).split('/');
  const out = [];
  for (const p of partes) { if (p === '..') out.pop(); else if (p !== '.' && p !== '') out.push(p); }
  let r = out.join('/');
  try { r = decodeURIComponent(r); } catch {}
  return r;
}

/** Revisa una versión: { paginas, problemas: [{ nivel: 'mal'|'medio', pagina, txt }], bytes, nota } */
export async function revisarVersion(v) {
  const archivos = v.archivos || [];
  const rutas = new Set(archivos.map(a => normal(a.ruta)));
  const existe = r => rutas.has(normal(r)) || rutas.has(normal(r + '/index.html')) || rutas.has(normal(r + '.html'));
  const problemas = [], ok = [];
  const mal = (pagina, txt) => problemas.push({ nivel: 'mal', pagina, txt });
  const medio = (pagina, txt) => problemas.push({ nivel: 'medio', pagina, txt });
  const html = archivos.filter(esHTML).slice(0, 30);
  if (!html.length) return { paginas: 0, problemas: [{ nivel: 'mal', pagina: '', txt: 'La versión no tiene ninguna página .html' }], ok, bytes: 0, nota: 0 };

  const titulos = new Map();
  for (const a of html) {
    const doc = new DOMParser().parseFromString(await (await archivoWeb(a)).text(), 'text/html');
    const pg = a.ruta;
    const t = doc.title.trim();
    if (!t) mal(pg, 'Sin título (<title>): es lo que sale en Google en azul');
    else if (t.length < 15 || t.length > 65) medio(pg, `El título tiene ${t.length} caracteres (mejor entre 15 y 65): «${t.slice(0, 70)}»`);
    if (t) titulos.set(t, [...(titulos.get(t) || []), pg]);
    const d = doc.querySelector('meta[name="description"]')?.content?.trim() || '';
    if (!d) mal(pg, 'Sin descripción (meta description): el texto gris bajo el título en Google');
    else if (d.length < 50 || d.length > 160) medio(pg, `La descripción tiene ${d.length} caracteres (mejor entre 50 y 160)`);
    const h1 = doc.querySelectorAll('h1').length;
    if (!h1) mal(pg, 'No hay ningún título principal (H1)');
    else if (h1 > 1) medio(pg, `Hay ${h1} títulos H1: deja uno por página`);
    if (!doc.documentElement.getAttribute('lang')) medio(pg, 'Falta el idioma de la página (<html lang="es">)');
    if (!doc.querySelector('meta[name="viewport"]')) mal(pg, 'Falta la etiqueta viewport: en el móvil se verá pequeña');
    if (/noindex/i.test(doc.querySelector('meta[name="robots"]')?.content || '')) mal(pg, 'La página tiene «noindex»: Google no la mostrará');
    const sinAlt = [...doc.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
    if (sinAlt) medio(pg, `${sinAlt} foto${sinAlt === 1 ? '' : 's'} sin texto alternativo (alt)`);
    if (!doc.querySelector('meta[property="og:title"], meta[property="og:image"]')) medio(pg, 'Sin vista previa para WhatsApp y redes (etiquetas og:title / og:image)');
    // Enlaces y recursos internos que no existen en la versión
    const rotos = new Set();
    doc.querySelectorAll('a[href], img[src], link[href], script[src], source[src], video[src]').forEach(el => {
      const href = el.getAttribute('href') ?? el.getAttribute('src') ?? '';
      if (!href || /^(https?:|mailto:|tel:|data:|blob:|javascript:|#|\/\/|whatsapp:|sms:)/i.test(href)) return;
      const r = destino(pg, href);
      if (r && !existe(r)) rotos.add(href);
    });
    if (rotos.size) mal(pg, `${rotos.size} enlace${rotos.size === 1 ? '' : 's'} o archivo${rotos.size === 1 ? '' : 's'} que no existe${rotos.size === 1 ? '' : 'n'}: ${[...rotos].slice(0, 5).join(', ')}${rotos.size > 5 ? '…' : ''}`);
  }
  for (const [t, pgs] of titulos) if (pgs.length > 1) medio(pgs.join(', '), `${pgs.length} páginas con el mismo título «${t.slice(0, 50)}»`);
  // Peso de los archivos
  const pesadas = archivos.filter(a => /^image\//.test(a.tipo || '') || /\.(jpe?g|png|webp|gif|avif)$/i.test(a.ruta)).filter(a => (a.tam || 0) > 400 * KB);
  if (pesadas.length) medio('', `${pesadas.length} imagen${pesadas.length === 1 ? '' : 'es'} de más de 400 KB (la web cargará lenta en el móvil): ${pesadas.slice(0, 4).map(a => `${a.ruta} (${tamano(a.tam)})`).join(', ')}`);
  const bytes = archivos.reduce((s, a) => s + (a.tam || 0), 0);
  if (bytes > 8 * KB * KB) medio('', `La web pesa ${tamano(bytes)} en total: conviene bajar de 8 MB`);
  if (!rutas.has('favicon.ico') && !archivos.some(a => /icon/i.test(a.ruta))) medio('', 'Sin icono de pestaña (favicon)');
  const nota = Math.max(0, 100 - problemas.reduce((s, p) => s + (p.nivel === 'mal' ? 12 : 4), 0));
  return { paginas: html.length, problemas, bytes, nota };
}

export function seoHTML(r, v) {
  const cls = r.nota >= 90 ? 'bien' : r.nota >= 60 ? 'medio' : 'mal';
  return `<div class="seo-res">
    <div class="seo-cab"><span class="seo-nota ${cls}">${r.nota}</span><div><b>Revisión SEO · versión ${v.n}</b><small>${r.paginas} página${r.paginas === 1 ? '' : 's'} · ${tamano(r.bytes)} · ${r.problemas.length ? `${r.problemas.length} cosa${r.problemas.length === 1 ? '' : 's'} por mejorar` : 'todo correcto'}</small></div></div>
    ${r.problemas.length ? `<ul class="seo-lista">${r.problemas.map(p => `<li class="${p.nivel}">${icono(p.nivel === 'mal' ? 'alert' : 'bulb')}<span>${p.pagina ? `<b>${esc(p.pagina)}</b> · ` : ''}${esc(p.txt)}</span></li>`).join('')}</ul>`
      : `<p class="muted">${icono('check')} Título, descripción, H1, fotos, enlaces y peso están bien.</p>`}
    <p class="muted seo-nota-pie">Para la velocidad real en un móvil, usa <a class="link-btn" href="revisa-tu-web" target="_blank" rel="noopener">Revisa tu web</a> con la dirección publicada. Para que Google la indexe, añade el dominio en Google Search Console y envía el sitemap.</p>
  </div>`;
}
