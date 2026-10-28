/* ==========================================================
   NÚCLEO DE LA LIBRERÍA (/library)
   - Lee el índice (library/indice.json) y el código de cada
     componente desde biblioteca-ui/ (sin modificar nada allí).
   - Licencias: permisiva / con atribución / restringida.
   - Vista previa en vivo (documento para <iframe sandbox srcdoc>).
   - Cabecera de autor, licencia y origen para copiar y descargar.
   Las rutas se calculan desde este archivo, así que funciona igual
   desde /library/ que desde cualquier otra página.
   ========================================================== */

export const URL_LIBRERIA = new URL('./', import.meta.url);
export const URL_BIBLIOTECA = new URL('../biblioteca-ui/', import.meta.url);

/* Versiones fijas de las herramientas que necesitan algunas vistas previas */
const CDN_TAILWIND = 'https://cdn.tailwindcss.com/3.4.16';
const CDN_ALPINE = 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js';

export const CLASES = {
  permisiva: { txt: 'Permisiva', corto: 'Libre', desc: 'Se puede usar en webs de clientes conservando el aviso de copyright.' },
  atribucion: { txt: 'Con atribución', corto: 'Atribución', desc: 'Se puede usar en webs de clientes solo si se conserva la atribución y su licencia.' },
  restringida: { txt: 'Restringida', corto: 'Solo consulta', desc: 'No se puede usar en webs de clientes ni por la IA: solo para consultar.' }
};
export const FORMATOS = ['html', 'css', 'js', 'jsx', 'tsx', 'svg'];
const EJECUTABLES = new Set(['html', 'css', 'js', 'svg']);
const TRADUCIBLES = new Set(['jsx', 'tsx', 'scss', 'ts', 'md', 'styl', 'pug']);
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const normalizar = sinTildes;

/* ---------- Carga con límite de tiempo ---------- */
async function traer(url, { tipo = 'text', ms = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`No se ha podido leer ${String(url).split('/').pop()} (${r.status})`);
    return tipo === 'json' ? await r.json() : await r.text();
  } catch (e) {
    throw e?.name === 'AbortError' ? new Error('La conexión va lenta y no ha respondido. Pulsa «Reintentar».') : e;
  } finally { clearTimeout(t); }
}

/* Misma clasificación que scripts/generar-indice.mjs */
const PERMISIVAS = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0']);
export function clasificar(spdx) {
  if (!spdx || spdx === 'desconocida') return 'restringida';
  if (/^(L?A?GPL|CC-BY-(NC|SA)|CC-BY-NC)/i.test(spdx) || /Hippocratic|LicenseRef-(Personal|Comercial)/i.test(spdx)) return 'restringida';
  if (/^CC-BY/i.test(spdx) || /LicenseRef-.*(Fair-Use|Atribucion)/i.test(spdx)) return 'atribucion';
  return spdx.split(/\s+AND\s+/).every(p => PERMISIVAS.has(p)) ? 'permisiva' : 'restringida';
}

/* ---------- Componentes añadidos a mano (library/extra.json + library/extra/) ----------
   Se pueden añadir desde la app de GitHub, sin ordenador (ver LEEME, sección v31). */
const EXT = { html: 'html', htm: 'html', css: 'css', js: 'js', mjs: 'js', jsx: 'jsx', tsx: 'tsx', ts: 'ts', svg: 'svg', scss: 'scss', md: 'md' };
const rutaSegura = a => typeof a === 'string' && /^[\w\-./]+$/.test(a) && !a.split('/').some(x => x === '..' || x === '.' || x === '');
async function añadirExtra(d) {
  let lista;
  try { lista = await traer(new URL('extra.json', URL_LIBRERIA), { tipo: 'json', ms: 8000 }); } catch { return; }
  if (!Array.isArray(lista)) return;
  const cats = new Set(d.categorias.map(x => x.id));
  for (const e of lista.slice(0, 1000)) {
    const archivos = (Array.isArray(e?.archivos) ? e.archivos : [e?.archivo]).filter(rutaSegura).slice(0, 10);
    if (!archivos.length || !e.nombre) continue;
    const spdx = String(e.licencia || 'desconocida').trim().slice(0, 60);
    const idLib = `extra-${spdx.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    let b = d.bibliotecas.findIndex(x => x.id === idLib);
    if (b < 0) {
      d.bibliotecas.push({ id: idLib, nombre: `Añadidos a mano (${spdx})`, repo: '', commit: '', fecha: '', web: '', spdx, clase: clasificar(spdx), autor: 'Ver cada componente', nota: 'Añadido a mano en library/extra.json.', licencias: [], n: 0, extra: true });
      b = d.bibliotecas.length - 1;
    }
    const f = [...new Set(archivos.map(a => EXT[(a.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()] || 'otro'))];
    const cat = cats.has(e.categoria) ? e.categoria : 'otros';
    const vista = ['html', 'tw', 'twa', 'svg', 'code'].includes(e.vista) ? e.vista : f.includes('html') ? 'html' : f.includes('svg') && f.length === 1 ? 'svg' : 'code';
    d.componentes.push({
      i: `extra/${archivos[0].replace(/\.[^./]+$/, '')}`, n: String(e.nombre).slice(0, 80), c: cat, b, a: archivos, f, p: vista,
      k: (Array.isArray(e.etiquetas) ? e.etiquetas : []).map(x => sinTildes(x)).slice(0, 12), s: Number(e.tamano) || 3000, v: 1, w: 60,
      ...(e.autor ? { u: String(e.autor).slice(0, 80) } : {}), ...(/^https?:\/\//i.test(String(e.origen || '')) ? { o: String(e.origen).slice(0, 300) } : {})
    });
    d.bibliotecas[b].n++;
    const c = d.categorias.find(x => x.id === cat);
    if (c) c.n++;
  }
}

let indiceP = null, iconosP = null;
/** Índice de componentes (se pide una sola vez) */
export function cargarIndice() {
  if (!indiceP) {
    indiceP = traer(new URL('indice.json', URL_LIBRERIA), { tipo: 'json', ms: 25000 }).then(async d => {
      await añadirExtra(d);
      d.componentes.forEach((c, i) => {
        c.pos = i;
        c.lib = d.bibliotecas[c.b];
        c.buscar = sinTildes([c.n, c.k.join(' '), c.lib.nombre, c.u || '', c.c, (d.categorias.find(x => x.id === c.c) || {}).nombre || '', (d.categorias.find(x => x.id === c.c) || {}).sin || '', c.f.join(' ')].join(' '));
      });
      d.porId = new Map(d.componentes.map(c => [c.i, c]));
      return d;
    }).catch(e => { indiceP = null; throw e; });
  }
  return indiceP;
}
/** Iconos (solo se piden al abrir la pestaña «Iconos») */
export function cargarIconos(indice) {
  if (!iconosP) {
    iconosP = traer(new URL('iconos.json', URL_LIBRERIA), { tipo: 'json', ms: 25000 }).then(d => {
      const lista = [];
      d.sets.forEach((s, si) => s.nombres.forEach(n => lista.push({
        i: `icono/${indice.bibliotecas[s.b].id}/${s.variante}/${n}`, n: n.replace(/[-_]+/g, ' '), c: 'iconos', b: s.b,
        lib: indice.bibliotecas[s.b], a: [`${s.carpeta.replace(/^_sources\/[^/]+\//, '')}/${n}.svg`], f: ['svg'], p: 'icono',
        k: [s.variante], s: 0, v: 1, w: 0, set: si, variante: s.variante,
        buscar: sinTildes(`${n} ${s.variante} ${indice.bibliotecas[s.b].nombre} icono ${n.split(/[-_]+/).map(p => EN_ES[p] || '').join(' ')}`)
      })));
      return lista;
    }).catch(e => { iconosP = null; throw e; });
  }
  return iconosP;
}

/* ---------- Licencias ---------- */
export const claseDe = c => c.lib?.clase || 'restringida';
/** Se puede usar en webs de clientes (permisiva o con atribución) */
export const usable = c => claseDe(c) !== 'restringida';
/** Formatos que se ejecutan sin compilar */
export const ejecutable = c => c.f.every(f => EJECUTABLES.has(f));
export const traducible = c => !ejecutable(c) && c.f.some(f => TRADUCIBLES.has(f) || EJECUTABLES.has(f));

const segmentos = r => r.split('/').map(encodeURIComponent).join('/');
/** Carpeta de un componente: biblioteca-ui/_sources/<biblioteca>/ o, si es añadido a mano, library/extra/ */
const carpeta = (c, dir = '') => (c.lib.extra ? new URL(`extra/${segmentos(dir)}`, URL_LIBRERIA) : new URL(`_sources/${c.lib.id}/${segmentos(dir)}`, URL_BIBLIOTECA)).href;
export const urlArchivo = (c, ruta = c.a[0]) => (c.lib.extra ? new URL(`extra/${segmentos(ruta)}`, URL_LIBRERIA) : new URL(`_sources/${c.lib.id}/${segmentos(ruta)}`, URL_BIBLIOTECA)).href;
/** URL de origen (repositorio con el commit exacto que se descargó) */
export function urlOrigen(c, ruta = c.a[0]) {
  if (c.lib.extra) return c.o || urlArchivo(c, ruta);
  if (!c.lib.repo) return c.lib.web || '';
  return `${c.lib.repo}/blob/${c.lib.commit || 'main'}/${segmentos(ruta)}`;
}
export const autorDe = c => (c.u ? `${c.u}${c.lib.id === 'uiverse-galaxy' ? ' (Uiverse.io)' : ''}` : c.lib.autor);
export const urlsLicencia = c => c.lib.licencias.map(r => new URL(segmentos(r), URL_BIBLIOTECA).href);

/** Resumen corto (lo que ve la IA para elegir) */
export function resumen(c, categorias = []) {
  const cat = categorias.find(x => x.id === c.c)?.nombre || c.c;
  const rasgos = c.k.filter(x => ['animado', 'degradado', 'cristal', 'neon', '3d', 'sombra', 'minimalista', 'oscuro'].includes(x));
  return `${cat}: ${c.n}${rasgos.length ? ` (${rasgos.join(', ')})` : ''} · ${c.f.join('+').toUpperCase()} · ${c.lib.nombre}${c.u ? ` · ${c.u}` : ''}`.slice(0, 200);
}

/** Cabecera con autor, licencia y origen, en el formato de comentario de cada lenguaje */
export function cabecera(c, tipo = 'html', ruta = c.a[0]) {
  const lineas = [
    `Componente: ${c.n}`,
    `Biblioteca: ${c.lib.nombre}${c.lib.web ? ` (${c.lib.web})` : ''}`,
    `Autor: ${autorDe(c)}`,
    `Licencia: ${c.lib.spdx} · ${CLASES[claseDe(c)].txt}${c.lib.nota ? ` · ${c.lib.nota}` : ''}`,
    `Origen: ${c.o || urlOrigen(c, ruta)}`,
    ...(c.o ? [`Código: ${urlOrigen(c, ruta)}`] : []),
    'Conserva este aviso y la licencia de la biblioteca al reutilizarlo.'
  ];
  if (tipo === 'html' || tipo === 'svg' || tipo === 'md') return `<!--\n  ${lineas.map(l => l.replace(/--/g, '—')).join('\n  ')}\n-->\n`;
  return `/*!\n * ${lineas.map(l => l.replace(/\*\//g, '* /')).join('\n * ')}\n */\n`;
}

/* ---------- Código de cada componente ---------- */
const cacheTexto = new Map();
async function texto(url) {
  if (cacheTexto.has(url)) return cacheTexto.get(url);
  const p = traer(url).catch(e => { cacheTexto.delete(url); throw e; });
  cacheTexto.set(url, p);
  if (cacheTexto.size > 300) cacheTexto.delete(cacheTexto.keys().next().value);
  return p;
}
const tipoDe = ruta => {
  const e = (ruta.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  return { htm: 'html', mjs: 'js', less: 'css', mdx: 'md' }[e] || e || 'txt';
};
/** Ejemplo n.º x dentro de un .md de Flowbite */
function fragmentoFlowbite(md, x) {
  const re = /\{\{<\s*example\b[\s\S]*?>\}\}\n?([\s\S]*?)\{\{<\s*\/example\s*>\}\}/g;
  let m, n = 0;
  while ((m = re.exec(md))) { if (n++ === x) return m[1].trim(); }
  return '';
}

/**
 * Pestañas de código: [{ nombre, tipo, codigo, ruta }]
 * Uiverse se separa en HTML y CSS como en uiverse.io.
 */
export async function leerCodigo(c) {
  if (c.p === 'icono') return [{ nombre: c.a[0].split('/').pop(), tipo: 'svg', codigo: await texto(urlArchivo(c)), ruta: c.a[0] }];
  if (c.x != null) {
    const md = await texto(urlArchivo(c));
    return [{ nombre: 'HTML', tipo: 'html', codigo: fragmentoFlowbite(md, c.x), ruta: c.a[0] }];
  }
  const archivos = await Promise.all(c.a.map(async ruta => ({ ruta, nombre: ruta.split('/').pop(), tipo: tipoDe(ruta), codigo: await texto(urlArchivo(c, ruta)) })));
  if (c.lib.id === 'uiverse-galaxy' && archivos[0]) {
    const h = archivos[0].codigo;
    const estilos = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1].trim()).join('\n\n');
    const html = h.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    return estilos ? [{ nombre: 'HTML', tipo: 'html', codigo: html, ruta: c.a[0] }, { nombre: 'CSS', tipo: 'css', codigo: estilos, ruta: c.a[0] }]
      : [{ nombre: 'HTML', tipo: 'html', codigo: html, ruta: c.a[0] }];
  }
  if (c.h) archivos.push({ nombre: 'HTML', tipo: 'html', codigo: c.h, ruta: c.a[0], marcado: true });
  return archivos;
}

/* ---------- Vista previa en vivo ---------- */
export const tieneVista = c => !['code'].includes(c.p);
/** Fondo recomendado para cada biblioteca (algunos loaders son blancos o grises) */
export const fondoPreferido = c => ({ 'svg-loaders': 'oscuro', 'css-loaders': 'oscuro', spinkit: 'claro', hyperui: 'claro', 'meraki-ui': 'claro', pines: 'claro' }[c.lib.id] || '');

const RESET = 'html,body{margin:0;background:transparent}body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}';
/* Mide lo que ocupa el componente y se lo dice a la página (para encajarlo en la tarjeta) */
const medir = id => `<script>(function(){var ID=${JSON.stringify(id)};function s(){try{var b=document.body;if(!b)return;var r={l:1e9,t:1e9,r:-1e9,b:-1e9},n=0;for(var i=0;i<b.children.length;i++){var e=b.children[i];if(/^(SCRIPT|STYLE|LINK|META|TEMPLATE)$/.test(e.tagName))continue;var q=e.getBoundingClientRect();if(!q.width&&!q.height)continue;n++;r.l=Math.min(r.l,q.left);r.t=Math.min(r.t,q.top);r.r=Math.max(r.r,q.right);r.b=Math.max(r.b,q.bottom)}var d=document.documentElement;parent.postMessage({lbFit:ID,w:Math.ceil(n?r.r-Math.min(0,r.l):d.scrollWidth),h:Math.ceil(n?r.b-Math.min(0,r.t):d.scrollHeight)},'*')}catch(e){}}addEventListener('load',function(){s();setTimeout(s,300);setTimeout(s,1200)});try{new ResizeObserver(s).observe(document.documentElement)}catch(e){}})();</script>`;

/* Los componentes son de muestra: sus enlaces y formularios no navegan (un <a href="/"> abriría la web
   entera dentro de la tarjeta). Los enlaces «#id» solo desplazan. El resto (hover, animaciones, JS) funciona igual. */
const SIN_NAVEGAR = `<script>(function(){function no(e){var a=e.target&&e.target.closest&&e.target.closest('a,area');if(!a||!(a.hasAttribute('href')||a.hasAttribute('xlink:href')))return;e.preventDefault();var h=a.getAttribute('href')||a.getAttribute('xlink:href')||'';if(h.charAt(0)==='#'&&h.length>1){try{var t=document.getElementById(decodeURIComponent(h.slice(1)));if(t)t.scrollIntoView({block:'nearest'})}catch(x){}}}addEventListener('click',no,true);addEventListener('auxclick',no,true);addEventListener('submit',function(e){e.preventDefault()},true)})();</script>`;

/**
 * Si aun así la vista previa navega (por ejemplo, un script que cambia location),
 * se vuelve a poner el componente; si insiste, se muestra un aviso en su lugar.
 */
export function vigilarNavegacion(ifr, doc) {
  let cargas = 0, vueltas = 0, parado = false;
  ifr.addEventListener('load', () => {
    if (parado || ++cargas === 1) return;
    cargas = 0;
    if (vueltas++ < 2) { ifr.srcdoc = `${doc}<!--${vueltas}-->`; return; }
    parado = true;
    ifr.srcdoc = '<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:grid;place-items:center;font:13px system-ui;color:#8a887f;text-align:center;padding:12px;box-sizing:border-box">Este componente intenta abrir otra página. Mira su código.</body>';
  });
}

/**
 * Documento HTML para <iframe sandbox="allow-scripts" srcdoc>.
 * El iframe no tiene el mismo origen que la web: el código del componente
 * no puede leer la sesión, las cookies ni el localStorage de AurevixWeb.
 */
export async function docVista(c, { id = c.i, fondo = '' } = {}) {
  const dir = c.a[0].includes('/') ? c.a[0].slice(0, c.a[0].lastIndexOf('/') + 1) : '';
  const base = `<base href="${carpeta(c, dir)}">`;
  const bg = fondo === 'claro' ? 'body{background:#f4f4f1;color:#16161b}' : fondo === 'oscuro' ? 'body{background:#16161b;color:#f3f1ea}' : '';
  const cab = extra => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${base}<style>${RESET}${bg}</style>${SIN_NAVEGAR}${extra || ''}</head><body>`;
  const fin = `${medir(id)}</body></html>`;
  const html1 = async () => texto(urlArchivo(c, c.a.find(a => /\.html?$/i.test(a)) || c.a[0]));
  switch (c.p) {
    case 'icono':
    case 'svg':
      return `${cab()}<img src="${urlArchivo(c)}" alt="" style="width:${c.p === 'icono' ? 48 : 72}px;height:auto;${c.p === 'icono' ? (fondo === 'claro' ? '' : 'filter:invert(1)') : ''}">${fin}`;
    case 'html': return `${cab()}${await html1()}${fin}`;
    case 'tw': return `${cab(`<script src="${CDN_TAILWIND}"></script>`)}${await html1()}${fin}`;
    case 'twa': return `${cab(`<script src="${CDN_TAILWIND}"></script><script defer src="${CDN_ALPINE}"></script>`)}${await html1()}${fin}`;
    case 'css': {
      const css = (await Promise.all(c.a.filter(a => /\.css$/i.test(a)).map(a => texto(urlArchivo(c, a))))).join('\n');
      return `${cab(`<style>${css}</style>`)}${c.h || ''}${fin}`;
    }
    case 'anim': {
      const extra = await Promise.all(['source/_vars.css', 'source/_base.css'].map(a => texto(urlArchivo(c, a)).catch(() => '')));
      return `${cab(`<style>${extra.join('\n')}\n${await texto(urlArchivo(c))}</style>`)}${c.h || ''}${fin}`;
    }
    case 'hyperui':
    case 'doc': {
      let d = await html1();
      if (c.p === 'hyperui') {
        d = d.replace(/href="\/component\.css"/g, `href="${new URL('_sources/hyperui/public/component.css', URL_BIBLIOTECA).href}"`)
          .replace(/src="\/component\.js"/g, `src="${new URL('_sources/hyperui/public/component.js', URL_BIBLIOTECA).href}"`);
      }
      const extra = `${base}<style>html,body{background:transparent}${bg}</style>${SIN_NAVEGAR}`;
      d = /<head[^>]*>/i.test(d) ? d.replace(/<head([^>]*)>/i, `<head$1>${extra}`) : extra + d;
      return /<\/body>/i.test(d) ? d.replace(/<\/body>/i, `${medir(id)}</body>`) : d + medir(id);
    }
    default: return '';
  }
}
