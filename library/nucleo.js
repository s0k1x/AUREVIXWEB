/* ==========================================================
   NÚCLEO DE LA LIBRERÍA (compartido por /library y el generador)
   - Lee el índice (library/indice.json) y el código de cada
     componente desde biblioteca-ui/ (sin modificar nada allí).
   - Licencias: permisiva / con atribución / restringida.
   - Vista previa en vivo (documento para <iframe sandbox srcdoc>).
   - Cabecera de autor, licencia y origen para copiar y descargar.
   - Selección compartida con «Crear la web con IA» (localStorage).
   Las rutas se calculan desde este archivo, así que funciona igual
   desde /library/ que desde panel.html.
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
/** Formatos que la IA puede meter en una web de un solo HTML (sin compilar) */
export const ejecutable = c => c.f.every(f => EJECUTABLES.has(f));
export const traducible = c => !ejecutable(c) && c.f.some(f => TRADUCIBLES.has(f) || EJECUTABLES.has(f));
/** Entra en la IA: licencia utilizable y código que se puede usar o traducir.
    Los iconos van aparte (ver «Iconos para la IA»): solo hace falta que su licencia lo permita. */
export const esIcono = x => String((typeof x === 'string' ? x : x?.i ?? x?.id) || '').startsWith('icono/');
export const paraIA = c => (esIcono(c) ? usable(c) : c.c !== 'iconos' && usable(c) && (ejecutable(c) || traducible(c)));

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

/* ---------- Selección para «Crear la web con IA» (compartida por localStorage) ---------- */
const CLAVE_SEL = 'tm_lib_sel';
export const MAX_SELECCION = 80;
const SECCIONES_SEL = () => [...SECCIONES, 'iconos'];
export function leerSeleccion() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE_SEL) || '[]'); return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string') : []; }
  catch { return []; }
}
export function guardarSeleccion(lista) {
  const limpia = [];
  const vistos = new Set();
  for (const x of lista) if (x?.id && !vistos.has(x.id)) { vistos.add(x.id); limpia.push({ id: x.id, seccion: esIcono(x.id) ? 'iconos' : SECCIONES_SEL().includes(x.seccion) ? x.seccion : 'extras', motivo: x.motivo || '', origen: x.origen || 'manual', pedido: x.pedido || '', t: x.t || Date.now() }); }
  // Nunca se recorta en silencio lo que se ha elegido: alternarSeleccion() avisa antes de pasar del máximo
  try { localStorage.setItem(CLAVE_SEL, JSON.stringify(limpia)); } catch { /* sin espacio */ }
  return limpia;
}
export const enSeleccion = id => leerSeleccion().some(x => x.id === id);
export function alternarSeleccion(id, datos = {}) {
  const l = leerSeleccion();
  const i = l.findIndex(x => x.id === id);
  if (i >= 0) l.splice(i, 1);
  else {
    if (l.length >= MAX_SELECCION) throw new Error(`Ya tienes ${MAX_SELECCION} elegidos: quita alguno antes de añadir más.`);
    l.push({ id, ...datos });
  }
  return guardarSeleccion(l);
}

/* ---------- Preselección local para la IA (máx. 400, solo licencias utilizables) ---------- */
export const SECCIONES = ['navbar', 'hero', 'servicios', 'galeria', 'precios', 'testimonios', 'contacto', 'footer', 'extras'];
export const NOMBRE_SECCION = { navbar: 'Menú', hero: 'Portada', servicios: 'Servicios', galeria: 'Galería', precios: 'Precios', testimonios: 'Opiniones', contacto: 'Contacto', footer: 'Pie', extras: 'Extras' };
/* Qué categorías y palabras encajan en cada sección de la web */
const AFINIDAD = {
  navbar: { c: ['navigation'], k: /nav|menu|header|navbar|cabecera/ },
  hero: { c: ['layouts', 'backgrounds', 'text-effects', 'buttons'], k: /hero|banner|cta|landing|portada/ },
  servicios: { c: ['cards', 'layouts'], k: /feature|service|card|bento|grid/ },
  galeria: { c: ['data-display', 'cards', 'layouts'], k: /gallery|galeria|carousel|slider|image|media/ },
  precios: { c: ['cards', 'layouts'], k: /pricing|price|plan|precio/ },
  testimonios: { c: ['cards', 'layouts'], k: /testimonial|review|quote|opinion/ },
  contacto: { c: ['forms', 'inputs', 'buttons'], k: /contact|form|newsletter|input|contacto/ },
  footer: { c: ['layouts', 'navigation'], k: /footer|pie/ },
  extras: { c: ['loaders', 'toggles', 'tooltips', 'feedback', 'animations', 'modals', 'checkboxes', 'radios'], k: /./ }
};
const ESTILOS = {
  moderno: /degradado|cristal|animado|3d|neon/, elegante: /minimalista|sombra/, minimalista: /minimalista/,
  atrevido: /neon|degradado|3d/, clasico: /minimalista|sombra/, oscuro: /oscuro|neon/, juvenil: /animado|degradado/
};
export function preseleccionar(indice, pedido = {}, { max = 400 } = {}) {
  const texto = sinTildes([pedido.negocio?.sector, pedido.negocio?.objetivo, pedido.diseno?.estilo, pedido.comentariosDelCliente, pedido.plan?.nombre, ...(pedido.extras || [])].join(' '));
  const palabras = new Set(texto.split(/[^a-z0-9]+/).filter(w => w.length > 3));
  const estilo = Object.entries(ESTILOS).find(([k]) => texto.includes(k))?.[1];
  const cands = indice.componentes.filter(paraIA);
  const porSeccion = {};
  for (const s of SECCIONES) {
    const af = AFINIDAD[s];
    porSeccion[s] = cands
      .filter(c => af.c.includes(c.c) || af.k.test(c.buscar))
      .map(c => {
        let p = c.w + (af.k.test(c.buscar) && s !== 'extras' ? 30 : 0) + (ejecutable(c) ? 25 : 0) + (tieneVista(c) ? 10 : 0);
        if (estilo && c.k.some(k => estilo.test(k))) p += 15;
        for (const k of c.k) if (palabras.has(k)) p += 8;
        return [p, c];
      })
      .sort((a, z) => z[0] - a[0]);
  }
  // Reparto equilibrado entre secciones hasta llegar al máximo
  const elegidos = new Map();
  const cuota = Math.floor(max / SECCIONES.length);
  for (const s of SECCIONES) for (const [, c] of porSeccion[s].slice(0, cuota)) if (!elegidos.has(c.i)) elegidos.set(c.i, c);
  for (let r = cuota; elegidos.size < max && r < cuota * 6; r += 10) {
    for (const s of SECCIONES) for (const [, c] of porSeccion[s].slice(r, r + 10)) { if (elegidos.size >= max) break; if (!elegidos.has(c.i)) elegidos.set(c.i, c); }
  }
  return [...elegidos.values()].slice(0, max);
}
/** Lo que se envía a la IA de cada candidato (compacto) */
export const fichaIA = (c, categorias) => ({ id: c.i, nombre: c.n, categoria: c.c, etiquetas: c.k.slice(0, 8), resumen: resumen(c, categorias), biblioteca: c.lib.nombre, licencia: c.lib.spdx });

/* Selección sin IA (modo demo o si la IA falla): los mejores de cada sección */
export function seleccionLocal(indice, pedido, { max = 12 } = {}) {
  const cands = preseleccionar(indice, pedido, { max: 400 }).filter(ejecutable);
  const out = [];
  const plan = ['navbar', 'hero', 'servicios', 'precios', 'testimonios', 'contacto', 'footer', 'galeria', 'extras'];
  for (const s of plan) {
    const af = AFINIDAD[s];
    const c = cands.find(x => !out.some(o => o.id === x.i) && (af.k.test(x.buscar) || af.c.includes(x.c)));
    if (c) out.push({ id: c.i, seccion: s, motivo: 'Elegido automáticamente por categoría y estilo (sin IA).', origen: 'local' });
    if (out.length >= max) break;
  }
  return out;
}

/** Tokens aproximados (≈ 4 caracteres por token) */
export const tokens = c => Math.ceil((c.s || 0) / 4) + 60;

/* ---------- Vistas previas pequeñas (generador) ---------- */
const vistas = new Map();
let escuchando = false;
function encajarVista({ ifr, caja }, w, h) {
  const bw = caja.clientWidth, bh = caja.clientHeight;
  const k = Math.max(0.2, Math.min(1, (bw - 12) / w, (bh - 12) / h));
  if (k >= 0.999) { ifr.style.width = ifr.style.height = ifr.style.transform = ''; return; }
  ifr.style.width = `${bw / k}px`; ifr.style.height = `${bh / k}px`; ifr.style.transform = `scale(${k})`;
}
/** Monta la vista previa de un componente en una caja; devuelve una función para quitarla */
export async function montarVista(caja, c, { fondo = '' } = {}) {
  if (!escuchando) {
    escuchando = true;
    addEventListener('message', e => {
      const d = e.data, v = d && typeof d.lbFit === 'string' && vistas.get(d.lbFit);
      if (!v || e.source !== v.ifr.contentWindow) return;
      const w = Number(d.w), h = Number(d.h);
      if (w > 0 && h > 0 && w < 20000 && h < 20000) encajarVista(v, w, h);
    });
  }
  for (const [k, v] of vistas) if (!v.ifr.isConnected) vistas.delete(k);
  if (!tieneVista(c)) { caja.innerHTML = `<span class="lbv-fmt">${c.f.join(' · ').toUpperCase()}</span>`; return () => {}; }
  const id = `v${Math.random().toString(36).slice(2)}`;
  const ifr = document.createElement('iframe');
  ifr.setAttribute('sandbox', 'allow-scripts');
  ifr.setAttribute('tabindex', '-1');
  ifr.title = `Vista previa de ${c.n}`;
  const doc = await docVista(c, { id, fondo: fondo || fondoPreferido(c) });
  ifr.srcdoc = doc;
  vigilarNavegacion(ifr, doc);
  caja.appendChild(ifr);
  vistas.set(id, { ifr, caja });
  return () => { ifr.remove(); vistas.delete(id); };
}

/* ==========================================================
   ICONOS PARA LA IA
   La IA no dibuja ni inventa iconos: recibe una lista corta de
   iconos reales de la colección (id + nombre + para qué sirve) y
   escribe un marcador vacío <svg data-icono="ID"></svg>.
   rellenarIconos() pone después el SVG original (saneado) y quita
   los marcadores con ids que no estaban en la lista.
   ========================================================== */
export const MAX_ICONOS = 24;
export const TOKENS_ICONO = 25; // lo que ocupa cada icono en la petición (id, nombre y uso)
/* Orden de preferencia: un solo estilo para toda la web (Lucide y, si falta, Tabler); marcas en Simple Icons */
const SETS_IA = ['lucide/default', 'tabler-icons/outline', 'heroicons/24-outline', 'feather/default', 'phosphor-icons/regular', 'bootstrap-icons/default', 'ionicons/default', 'tabler-icons/filled', 'eva-icons/outline'];
const setDe = c => `${c.lib.id}/${c.variante}`;
const prefSet = c => { const i = SETS_IA.indexOf(setDe(c)); return i < 0 ? SETS_IA.length + 1 : i; };

/* Palabras en español → nombres de iconos (los nombres de los sets están en inglés) */
const ES_EN = {
  telefono: ['phone'], llamar: ['phone-call', 'phone'], llamada: ['phone-call'], movil: ['smartphone'], correo: ['mail'], email: ['mail'], mail: ['mail'],
  direccion: ['map-pin'], ubicacion: ['map-pin'], donde: ['map-pin'], mapa: ['map'], localizacion: ['map-pin'], horario: ['clock'], hora: ['clock'], horas: ['clock'],
  cita: ['calendar-check'], citas: ['calendar-check'], reserva: ['calendar-check'], reservas: ['calendar-check'], reservar: ['calendar-check'], calendario: ['calendar-days'], fecha: ['calendar-days'],
  menu: ['menu'], cerrar: ['x'], buscar: ['search'], busqueda: ['search'], inicio: ['house'], casa: ['house'], hogar: ['house'], usuario: ['user'], cliente: ['user'], clientes: ['users'], equipo: ['users'],
  estrella: ['star'], valoracion: ['star'], valoraciones: ['star'], opinion: ['quote'], opiniones: ['quote', 'star'], resenas: ['star'], testimonio: ['quote'], testimonios: ['quote'],
  corazon: ['heart'], favorito: ['heart'], comprar: ['shopping-cart'], carrito: ['shopping-cart'], tienda: ['store', 'shopping-bag'], compra: ['shopping-bag'], pago: ['credit-card'], pagos: ['credit-card'], tarjeta: ['credit-card'],
  precio: ['euro'], precios: ['euro'], tarifa: ['euro'], tarifas: ['euro'], oferta: ['percent'], descuento: ['percent'], regalo: ['gift'], envio: ['truck'], envios: ['truck'], entrega: ['truck'], paquete: ['package'],
  mensaje: ['message-circle'], chat: ['message-circle'], enviar: ['send'], contacto: ['mail', 'phone'], contactar: ['send'], formulario: ['send'],
  seguridad: ['shield-check'], seguro: ['shield-check'], garantia: ['badge-check'], calidad: ['award'], premio: ['award'], premios: ['trophy'], experiencia: ['award'], certificado: ['badge-check'],
  rapido: ['zap'], urgente: ['zap'], idea: ['lightbulb'], objetivo: ['target'], crecimiento: ['trending-up'], ventas: ['trending-up'], web: ['globe'], idioma: ['globe'], internacional: ['globe'],
  foto: ['camera'], fotos: ['image'], galeria: ['image'], imagen: ['image'], video: ['video'], musica: ['music'], libro: ['book-open'], blog: ['book-open'], noticias: ['newspaper'],
  restaurante: ['utensils', 'chef-hat'], comida: ['utensils'], cocina: ['chef-hat'], bar: ['wine', 'coffee'], cafe: ['coffee'], cafeteria: ['coffee', 'croissant'], vino: ['wine'], pizza: ['pizza'], pizzeria: ['pizza'],
  pasteleria: ['cake-slice'], tarta: ['cake-slice'], panaderia: ['croissant', 'wheat'], pan: ['wheat'],
  peluqueria: ['scissors', 'sparkles'], barberia: ['scissors'], estetica: ['sparkles', 'flower-2'], belleza: ['sparkles'], spa: ['flower-2', 'bath'], masaje: ['hand-heart'], unas: ['sparkles'],
  dentista: ['shield-check', 'sparkles'], dental: ['shield-check'], clinica: ['stethoscope', 'heart-pulse'], medico: ['stethoscope'], salud: ['heart-pulse'], fisioterapia: ['activity', 'hand-heart'], psicologo: ['brain'], farmacia: ['pill'],
  veterinario: ['paw-print', 'dog'], veterinaria: ['paw-print'], mascotas: ['paw-print'], perro: ['dog'], gato: ['cat'],
  gimnasio: ['dumbbell', 'heart-pulse'], entrenador: ['dumbbell'], deporte: ['dumbbell'], yoga: ['flower', 'sun'], pilates: ['activity'], bicicleta: ['bike'],
  abogado: ['scale', 'briefcase'], abogados: ['scale'], legal: ['scale'], asesoria: ['briefcase', 'file-text'], gestoria: ['file-text', 'calculator'], contable: ['calculator'], seguros: ['shield-check'], banco: ['landmark'],
  inmobiliaria: ['house', 'key'], piso: ['house'], pisos: ['house'], alquiler: ['key'], hotel: ['bed-double', 'hotel'], hostal: ['bed-double'], turismo: ['plane', 'map'], viajes: ['plane'], casa_rural: ['tree-pine'],
  taller: ['wrench', 'car'], mecanico: ['wrench', 'car'], coche: ['car'], coches: ['car'], fontanero: ['wrench', 'droplets'], fontaneria: ['droplets'], electricista: ['zap', 'plug'], reformas: ['hammer', 'paint-roller'],
  construccion: ['hammer', 'hard-hat'], pintor: ['paint-roller'], carpinteria: ['hammer'], limpieza: ['spray-can', 'sparkles'], mudanzas: ['truck', 'package'], transporte: ['truck'], jardineria: ['leaf', 'sprout'],
  fotografia: ['camera', 'image'], fotografo: ['camera'], diseno: ['palette', 'pen-tool'], arte: ['palette'], informatica: ['laptop', 'code'], programacion: ['code'], ordenador: ['laptop'], marketing: ['megaphone', 'trending-up'],
  academia: ['graduation-cap', 'book-open'], formacion: ['graduation-cap'], clases: ['book-open'], cursos: ['graduation-cap'], colegio: ['school'], guarderia: ['baby'], ninos: ['baby'],
  moda: ['shirt', 'shopping-bag'], ropa: ['shirt'], joyeria: ['gem'], boda: ['heart', 'gem'], bodas: ['heart', 'gem'], eventos: ['calendar-days', 'party-popper'], fiesta: ['party-popper'], floristeria: ['flower-2'], flores: ['flower-2'],
  agricultura: ['sprout', 'tractor'], campo: ['tractor'], ecologico: ['leaf'], sostenible: ['recycle'], reciclaje: ['recycle'], accesible: ['accessibility'], accesibilidad: ['accessibility'], parking: ['circle-parking'], aparcamiento: ['circle-parking'],
  wifi: ['wifi'], informacion: ['info'], ayuda: ['circle-question-mark'], preguntas: ['circle-question-mark'], faq: ['circle-question-mark'], ajustes: ['settings'], candado: ['lock'], privacidad: ['lock'],
  // Marcas (Simple Icons, CC0; son marcas registradas: úsalas solo para enlazar a sus perfiles)
  whatsapp: ['whatsapp'], instagram: ['instagram'], facebook: ['facebook'], tiktok: ['tiktok'], youtube: ['youtube'], twitter: ['x'], telegram: ['telegram'], pinterest: ['pinterest'], tripadvisor: ['tripadvisor'], google: ['google']
};
const MARCAS = new Set(['whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'x', 'telegram', 'pinterest', 'tripadvisor', 'google', 'googlemaps', 'spotify', 'airbnb', 'glovo', 'justeat', 'ubereats']);
/* Al revés (para buscar en español en la pestaña «Iconos» de la librería) */
const EN_ES = (() => { const m = {}; for (const [es, l] of Object.entries(ES_EN)) for (const en of l) for (const p of en.split('-')) if (p.length > 2) m[p] = `${m[p] || ''} ${es.replace(/_/g, ' ')}`.trim(); return m; })();
/* Iconos básicos de casi cualquier web (menú móvil, contacto, horario, ventajas y llamadas a la acción) */
const BASICOS = [['menu', 'botón del menú en el móvil'], ['x', 'cerrar el menú o una ventana'], ['phone', 'teléfono'], ['mail', 'email'], ['map-pin', 'dirección'], ['clock', 'horario'], ['check', 'ventajas o lo que incluye'], ['arrow-right', 'botones de llamada a la acción'], ['star', 'valoraciones']];

let mapaIconosP = null;
/** Todos los iconos por id (se piden una vez) */
export function cargarMapaIconos() {
  mapaIconosP ??= cargarIndice().then(ind => cargarIconos(ind)).then(l => new Map(l.map(c => [c.i, c]))).catch(e => { mapaIconosP = null; throw e; });
  return mapaIconosP;
}
/** Componente o icono por id */
export async function buscarElemento(id) {
  if (!esIcono(id)) return (await cargarIndice()).porId.get(id) || null;
  return (await cargarMapaIconos()).get(id) || null;
}
const nombreIcono = c => c.a[0].split('/').pop().replace(/\.svg$/i, '');

/**
 * Busca iconos por palabras (en español o en inglés). Devuelve los mejores,
 * sin repetir el mismo nombre en varios sets (se queda con el set preferido).
 */
export function buscarIconos(lista, consulta, { max = 48, sets = null } = {}) {
  const palabras = sinTildes(consulta).split(/[^a-z0-9]+/).filter(w => w.length > 1);
  if (!palabras.length) return [];
  const terminos = new Map(); // término → peso
  for (const w of palabras) {
    terminos.set(w, Math.max(terminos.get(w) || 0, 1));
    for (const en of ES_EN[w] || []) terminos.set(en, 1.2);
  }
  const puntos = [];
  for (const c of lista) {
    if (sets && !sets.includes(setDe(c))) continue;
    const nombre = nombreIcono(c), partes = nombre.split(/[-_]+/);
    let p = 0;
    for (const [t, peso] of terminos) {
      if (nombre === t) p += 100 * peso;
      else if (partes[0] === t) p += 45 * peso;
      else if (partes.includes(t)) p += 25 * peso;
      else if (t.length > 2 && c.buscar.includes(t)) p += 8 * peso;
    }
    if (!p) continue;
    if (partes.includes('off')) p -= 30;
    p -= partes.length * 2 + prefSet(c);
    puntos.push([p, c]);
  }
  puntos.sort((a, z) => z[0] - a[0]);
  const vistos = new Set(), out = [];
  for (const [, c] of puntos) {
    const n = nombreIcono(c);
    if (vistos.has(n)) continue;
    vistos.add(n); out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/** Elige el icono de un nombre exacto en el primer set preferido que lo tenga (marcas: Simple Icons) */
function iconoExacto(porNombre, nombre) {
  if (MARCAS.has(nombre)) return porNombre.get(`simple-icons/brands/${nombre}`) || null;
  for (const s of SETS_IA) { const c = porNombre.get(`${s}/${nombre}`); if (c) return c; }
  return null;
}
let porNombreP = null;
const porNombre = lista => (porNombreP?.lista === lista ? porNombreP.m : (porNombreP = { lista, m: new Map(lista.map(c => [`${setDe(c)}/${nombreIcono(c)}`, c])) }).m);

/**
 * Iconos automáticos para un pedido: los básicos y los del sector, extras y
 * redes que aparezcan en el pedido. Todos del mismo estilo (Lucide/Tabler).
 * Devuelve [{ c, uso }] sin repetir nombres.
 */
export function iconosAuto(lista, pedido = {}, { max = 16, excluir = [] } = {}) {
  const m = porNombre(lista);
  const texto = sinTildes(JSON.stringify(pedido || {}).slice(0, 30000)).replace(/casa rural/g, 'casa_rural');
  const palabras = new Set(texto.split(/[^a-z0-9_]+/));
  const quitar = new Set(excluir.map(id => id.split('/').pop()));
  const out = [], nombres = new Set();
  const poner = (nombre, uso) => {
    if (out.length >= max || nombres.has(nombre) || quitar.has(nombre)) return;
    const c = iconoExacto(m, nombre);
    if (c) { nombres.add(nombre); out.push({ c, uso }); }
  };
  for (const [n, uso] of BASICOS) poner(n, uso);
  for (const [es, l] of Object.entries(ES_EN)) if (palabras.has(es)) for (const n of l) poner(n, es.replace(/_/g, ' '));
  if (/whats\s?app|wasap/.test(texto)) poner('whatsapp', 'contacto por WhatsApp');
  return out;
}

/** Lo que recibe la IA de cada icono (sin el SVG: lo pone AurevixWeb después) */
export const fichaIcono = (c, uso = '') => ({ id: c.i, nombre: nombreIcono(c), set: `${c.lib.nombre} ${c.variante}`, uso: String(uso).slice(0, 80) });
/** Datos de licencia de un icono para los avisos y el informe */
export const infoIcono = c => ({ id: c.i, nombre: nombreIcono(c), biblioteca: c.lib.nombre, licencia: c.lib.spdx, autor: c.lib.autor, origen: urlOrigen(c), repo: c.lib.repo || c.lib.web || '' });

/* ---------- SVG original y saneado ---------- */
const ESTILO_SEGURO = /^[\w\s:;#.,%()-]*$/;
/**
 * Deja solo el dibujo: sin scripts, estilos globales, comentarios, títulos,
 * ids ni enlaces; colores negros → currentColor (se pinta con el color del texto).
 * Devuelve { attrs, interior } o null si no es un SVG.
 */
export function limpiarSvg(t) {
  let s = String(t || '').replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const m = s.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!m) return null;
  let interior = m[2]
    .replace(/<(script|style|foreignObject|title|desc|metadata|iframe|image|a)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|foreignObject|iframe|image|a)\b[^>]*\/?>/gi, '')
    .replace(/<defs>\s*<\/defs>/gi, '')
    .replace(/<rect\b[^>]*class="cls-1"[^>]*\/>/g, '') // Eva Icons: recuadro transparente
    .replace(/\s(on[a-z]+|id|class|data-[\w-]+|xlink:href|href|xml:space)\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (x, v) => (ESTILO_SEGURO.test(v) && !/url|expression|import/i.test(v) ? ` style="${v}"` : ''))
    .replace(/(fill|stroke)(\s*[:=]\s*"?)(#000000|#000|#231f20|black)\b/gi, '$1$2currentColor')
    .replace(/\s+/g, ' ').trim();
  const attrs = {};
  for (const [, k, v] of m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    if (['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].includes(k) && ESTILO_SEGURO.test(v)) attrs[k] = v;
  }
  if (!attrs.viewBox) attrs.viewBox = `0 0 ${(m[1].match(/width="(\d+)/) || [, 24])[1]} ${(m[1].match(/height="(\d+)/) || [, 24])[1]}`;
  if (!attrs.fill && !attrs.stroke) attrs.fill = 'currentColor';
  return { attrs, interior };
}
const svgCache = new Map();
/** SVG saneado de un icono (se lee del archivo original de la colección) */
export async function svgIcono(c) {
  if (!svgCache.has(c.i)) svgCache.set(c.i, texto(urlArchivo(c)).then(limpiarSvg).catch(e => { svgCache.delete(c.i); throw e; }));
  return svgCache.get(c.i);
}
const ATRS_IA = /^(class|width|height|style|aria-label|aria-hidden|role|focusable|stroke-width)$/i;
const escAttr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/**
 * Cambia cada marcador <svg data-icono="ID">…</svg> (o <i>/<span> con data-icono)
 * por el SVG original. Conserva class, width, height, style y aria-* del marcador.
 * Los ids que no están en «iconos» se quitan (la IA no puede inventarlos).
 * iconos: [{ id, svg: {attrs, interior} }]. Devuelve { html, usados, inventados }.
 */
export function rellenarIconos(html, iconos = []) {
  const mapa = new Map(iconos.filter(x => x.svg).map(x => [x.id, x.svg]));
  const usados = new Set(), inventados = new Set();
  const re = /<(svg|i|span)\b([^>]*?\bdata-icono\s*=\s*"([^"]*)"[^>]*?)(\/>|>([\s\S]*?)<\/\1\s*>)/gi;
  const out = String(html || '').replace(re, (todo, tag, attrsTxt, id) => {
    const svg = mapa.get(id);
    if (!svg) { inventados.add(id); return ''; }
    usados.add(id);
    const de = {};
    for (const [, k, v] of attrsTxt.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) if (ATRS_IA.test(k) && !/url|expression|javascript/i.test(v)) de[k.toLowerCase()] = v;
    const a = { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', ...svg.attrs, ...de };
    if (!a['aria-label'] && !a.role) a['aria-hidden'] = 'true';
    a['data-icono'] = id;
    return `<svg ${Object.entries(a).map(([k, v]) => `${k}="${escAttr(v)}"`).join(' ')}>${svg.interior}</svg>`;
  });
  return { html: out, usados: [...usados], inventados: [...inventados] };
}

/* ---------- Avisos de licencia en la web generada ---------- */
const sinGuiones = s => String(s || '').replace(/-{2,}/g, '—').replace(/>/g, '›');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Comprueba qué componentes conservan su aviso en el HTML y pone al final
 * el comentario «Componentes de terceros» con la lista real (licencia y origen).
 * Devuelve { html, usados, descartados } (ids).
 */
export function avisosTerceros(html, lista = [], { iconos = [] } = {}) {
  const usados = [], descartados = [];
  for (const x of lista) (new RegExp(`Componente de terceros:\\s*${reEsc(x.id)}(\\s|\\|)`).test(html) ? usados : descartados).push(x.id);
  const iconosUsados = iconos.filter(x => html.includes(`data-icono="${x.id}"`));
  html = html.replace(/\n?<!--\s*Componentes de terceros:[\s\S]*?-->\n?/gi, '\n');
  const usadosInfo = lista.filter(x => usados.includes(x.id));
  // Los iconos se agrupan por biblioteca (una línea por set, con los nombres usados)
  const porSet = new Map();
  for (const x of iconosUsados) {
    if (!porSet.has(x.biblioteca)) porSet.set(x.biblioteca, { ...x, nombres: [] });
    porSet.get(x.biblioteca).nombres.push(x.nombre);
  }
  const lineas = [
    ...usadosInfo.map(x => `  - ${sinGuiones(x.nombre)} · ${sinGuiones(x.biblioteca)} · Licencia ${sinGuiones(x.licencia)} · Autor: ${sinGuiones(x.autor)} · Origen: ${sinGuiones(x.origen)}`),
    ...[...porSet.values()].map(x => `  - Iconos de ${sinGuiones(x.biblioteca)} (${x.nombres.length}): ${sinGuiones(x.nombres.join(', '))} · Licencia ${sinGuiones(x.licencia)} · Autor: ${sinGuiones(x.autor)} · Origen: ${sinGuiones(x.repo || x.origen)}`)
  ];
  if (lineas.length) {
    const comentario = `<!-- Componentes de terceros:\n${lineas.join('\n')}\n  Los textos completos de sus licencias están en LICENSES-TERCEROS.txt. -->\n`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${comentario}</body>`) : `${html}\n${comentario}`;
  }
  return { html, usados, descartados, iconosUsados: iconosUsados.map(x => x.id) };
}

/** Texto de LICENSES-TERCEROS.txt con las licencias de las bibliotecas usadas */
export async function licenciasTerceros(lista = []) {
  if (!lista.length) return '';
  const porLib = new Map();
  for (const x of lista) {
    const c = await buscarElemento(x.id).catch(() => null);
    if (!c) continue;
    if (!porLib.has(c.lib.id)) porLib.set(c.lib.id, { lib: c.lib, comps: [] });
    porLib.get(c.lib.id).comps.push({ ...x, c });
  }
  const bloques = await Promise.all([...porLib.values()].map(async ({ lib, comps }) => {
    const textos = await Promise.all(lib.licencias.map(r => traer(new URL(segmentos(r), URL_BIBLIOTECA)).catch(() => '')));
    return [
      '='.repeat(72), `${lib.nombre} · ${lib.spdx} (${CLASES[lib.clase].txt})`, `Autor: ${lib.autor}`, `Repositorio: ${lib.repo}${lib.commit ? ` (commit ${lib.commit})` : ''}`,
      lib.nota ? `Nota: ${lib.nota}` : '', 'Componentes usados en esta web:',
      ...comps.map(x => `  - ${esIcono(x.c) ? `Icono «${x.c.a[0].split('/').pop().replace(/\.svg$/, '')}» (${x.c.variante})` : x.c.n}${x.c.u ? ` (autor: ${x.c.u})` : ''} · ${x.c.o || urlOrigen(x.c)}`), '',
      textos.filter(Boolean).join('\n\n----------\n\n') || 'Consulta la licencia completa en el repositorio indicado.'
    ].filter(l => l !== '').join('\n');
  }));
  return ['LICENCIAS DE TERCEROS', 'Esta web incluye código adaptado de las bibliotecas siguientes. Conserva este archivo y los avisos de copyright del código.', '', ...bloques].join('\n') + '\n';
}
