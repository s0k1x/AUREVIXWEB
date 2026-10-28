/* ==========================================================
   WEB DEL CLIENTE: subir versiones y verlas
   - El equipo sube la web: un .html suelto, varios archivos, una
     carpeta entera o un .zip. Cada subida es una versión nueva.
   - El visor la enseña aislada (iframe sandbox: su código no puede
     leer la sesión ni los datos de AurevixWeb) en móvil, tableta y
     ordenador, con sus páginas, estilos, scripts, fotos y fuentes.
   - El cliente ve la versión que le enviamos y, desde el mismo
     visor, la aprueba o pide cambios.
   ========================================================== */
import * as store from './store.js';
import { $, $$, esc, icono, toast, abrir, cerrar, ocupado, fecha, haceCuanto, tamano, refPedido, spinner } from './ui.js';
import { conSinZoom } from './sinzoom.js';
import { crearZip } from './zip.js';

/* ---------- Límites ---------- */
export const MAX_ARCHIVO = 25 * 1024 * 1024; // el mismo que el de la carpeta de archivos
const MAX_TOTAL = 80 * 1024 * 1024;
const MAX_ARCHIVOS = 400;

const TIPOS = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', ogg: 'audio/ogg',
  txt: 'text/plain', xml: 'application/xml', webmanifest: 'application/manifest+json', pdf: 'application/pdf'
};
const ext = r => (r.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
const tipoDe = r => TIPOS[ext(r)] || 'application/octet-stream';
const esHTML = r => /\.html?$/i.test(r);
const ES_TEXTO = new Set(['html', 'htm', 'css', 'js', 'mjs', 'json', 'svg', 'txt', 'xml', 'webmanifest']);
const nuevoIdVersion = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* ---------- Rutas ---------- */
const dir = r => r.includes('/') ? r.slice(0, r.lastIndexOf('/') + 1) : '';
function normal(r) {
  const out = [];
  for (const s of r.split('/')) {
    if (!s || s === '.') continue;
    if (s === '..') out.pop(); else out.push(s);
  }
  return out.join('/');
}
/** Ruta dentro de la web a la que apunta «ref» desde la carpeta «desde» (o null si es externa) */
function resolver(ref, desde) {
  ref = String(ref || '').trim();
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const limpia = ref.split(/[?#]/)[0];
  if (!limpia) return null;
  let r;
  try { r = decodeURIComponent(limpia); } catch { r = limpia; }
  return normal(r.startsWith('/') ? r : desde + r);
}

/* ==========================================================
   PREPARAR LOS ARCHIVOS QUE SE SUBEN
   ========================================================== */
/** Lee un .zip (guardado o comprimido) con las herramientas del navegador */
async function leerZip(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error(`«${file.name}» no es un .zip válido`);
  const n = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  if (p === 0xffffffff) throw new Error(`«${file.name}» es un .zip demasiado grande (ZIP64). Comprímelo de nuevo en partes más pequeñas.`);
  const dec = new TextDecoder(), dec437 = new TextDecoder('latin1');
  const salida = [];
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error(`«${file.name}» está dañado`);
    const flags = dv.getUint16(p + 8, true), metodo = dv.getUint16(p + 10, true);
    const comp = dv.getUint32(p + 20, true), largo = dv.getUint16(p + 28, true), extra = dv.getUint16(p + 30, true), coment = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = (flags & 0x800 ? dec : dec437).decode(buf.subarray(p + 46, p + 46 + largo));
    p += 46 + largo + extra + coment;
    if (nombre.endsWith('/')) continue;
    if (flags & 1) throw new Error(`«${file.name}» tiene contraseña. Súbelo sin contraseña.`);
    const ini = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const datos = buf.subarray(ini, ini + comp);
    let blob;
    if (metodo === 0) blob = new Blob([datos]);
    else if (metodo === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede abrir .zip. Sube la carpeta o los archivos sueltos.');
      blob = await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    } else throw new Error(`«${nombre}» usa una compresión que no se puede abrir aquí. Comprímelo con la opción normal.`);
    salida.push({ ruta: nombre, blob });
  }
  return salida;
}

const IGNORAR = /(^|\/)(__MACOSX|\.git|node_modules)(\/|$)|(^|\/)\.[^/]*$|(^|\/)(Thumbs\.db|desktop\.ini)$/i;

/**
 * Convierte lo que el trabajador ha elegido (archivos, carpeta o .zip) en la lista de la versión.
 * Devuelve { archivos: [{ ruta, blob, tipo }], entrada, paginas, bytes, avisos }
 */
export async function prepararArchivos(files) {
  let lista = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) lista.push(...await leerZip(f));
    else lista.push({ ruta: f.webkitRelativePath || f.name, blob: f });
  }
  lista = lista.map(a => ({ ...a, ruta: normal(a.ruta.replace(/\\/g, '/')) })).filter(a => a.ruta && !IGNORAR.test(a.ruta));
  // Si todo va dentro de una misma carpeta (lo normal en un .zip o al subir una carpeta), se quita esa carpeta
  while (lista.length && lista.every(a => a.ruta.includes('/')) && new Set(lista.map(a => a.ruta.split('/')[0])).size === 1) {
    lista = lista.map(a => ({ ...a, ruta: a.ruta.slice(a.ruta.indexOf('/') + 1) }));
  }
  const vistos = new Map();
  lista.forEach(a => vistos.set(a.ruta, a)); // si se repite una ruta, gana la última
  lista = [...vistos.values()];
  const paginas = lista.map(a => a.ruta).filter(esHTML).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  if (!paginas.length) throw new Error('No hay ninguna página .html. Sube el index.html de la web (o la carpeta o el .zip que lo contiene).');
  if (lista.length > MAX_ARCHIVOS) throw new Error(`La web tiene ${lista.length} archivos y el máximo es ${MAX_ARCHIVOS}. Quita lo que no se use (por ejemplo, fotos repetidas o carpetas de pruebas).`);
  const grande = lista.find(a => a.blob.size > MAX_ARCHIVO);
  if (grande) throw new Error(`«${grande.ruta}» ocupa ${tamano(grande.blob.size)} y el máximo por archivo es 25 MB. Comprime esa foto o vídeo.`);
  const bytes = lista.reduce((s, a) => s + a.blob.size, 0);
  if (bytes > MAX_TOTAL) throw new Error(`La web ocupa ${tamano(bytes)} y el máximo es 80 MB. Comprime las fotos y los vídeos.`);
  const entrada = paginas.find(r => /^index\.html?$/i.test(r)) || paginas[0];
  const avisos = [];
  const pesadas = lista.filter(a => /^image\//.test(tipoDe(a.ruta)) && a.blob.size > 1.5 * 1024 * 1024);
  if (pesadas.length) avisos.push(`${pesadas.length} foto${pesadas.length === 1 ? ' pesa' : 's pesan'} más de 1,5 MB: la web irá lenta en el móvil.`);
  // Lo que sale de un .zip no trae tipo: se le pone el suyo (si no, las fotos SVG o las fuentes no se ven)
  return { archivos: lista.map(a => { const tipo = tipoDe(a.ruta); return { ruta: a.ruta, blob: a.blob.type === tipo ? a.blob : new Blob([a.blob], { type: tipo }), tipo }; }), entrada, paginas, bytes, avisos };
}

/** Sube una versión nueva y devuelve su ficha (la guarda el panel en el pedido) */
export async function crearVersion(p, preparada, { nota = '', alProgreso } = {}) {
  const u = store.usuarioActual();
  const id = nuevoIdVersion();
  const archivos = await store.subirWeb(p.id, id, preparada.archivos, { alProgreso });
  const n = Math.max(0, ...(p.webs || []).map(w => w.n || 0)) + 1;
  return {
    id, n, t: Date.now(), autor: u?.name || '', nota: String(nota || '').trim().slice(0, 500),
    entrada: preparada.entrada, paginas: preparada.paginas.slice(0, 60), bytes: preparada.bytes,
    archivos: archivos.sort((a, b) => a.ruta.localeCompare(b.ruta))
  };
}

/** Descarga la versión en un .zip, tal y como se subió */
export async function descargarVersion(p, v, btn) {
  ocupado(btn, true);
  try {
    const archivos = [];
    for (const a of v.archivos) archivos.push({ nombre: a.ruta, datos: await (await store.archivoWeb(a)).arrayBuffer() });
    const nombre = `${(p.respuestas?.negocio || 'web').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'web'}-v${v.n}.zip`;
    const url = URL.createObjectURL(new Blob([crearZip(archivos)], { type: 'application/zip' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) { toast(e.message, 'err'); }
  ocupado(btn, false);
}

/* ==========================================================
   MONTAR UNA PÁGINA PARA EL VISOR
   Las hojas de estilo y los scripts de la web se meten dentro de la
   página; las fotos, vídeos y fuentes se piden con un enlace temporal.
   ========================================================== */
const RE_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const RE_IMPORT = /@import\s+(?:url\(\s*)?(['"])([^'"]+)\1\s*\)?\s*([^;]*);/gi;

function fuenteDe(v) {
  const mapa = new Map(v.archivos.map(a => [a.ruta, a]));
  const textos = new Map();
  let enlaces = null;
  return {
    mapa,
    async texto(ruta) {
      if (!textos.has(ruta)) textos.set(ruta, store.archivoWeb(mapa.get(ruta)).then(b => b.text()));
      return textos.get(ruta);
    },
    async url(ruta) {
      // Los enlaces de todos los archivos que no son texto se piden juntos, una sola vez
      if (!enlaces) enlaces = store.enlacesWeb(v.archivos.filter(a => !ES_TEXTO.has(ext(a.ruta)) || ext(a.ruta) === 'svg'));
      const a = mapa.get(ruta);
      return a ? (await enlaces).get(a.clave) || '' : '';
    }
  };
}

async function cssProcesado(fuente, css, desde, faltan, nivel = 0) {
  // @import de hojas de la propia web: se meten dentro (hasta 3 niveles)
  const imports = [];
  css = css.replace(RE_IMPORT, (m, _q, ref, media) => {
    const r = resolver(ref, desde);
    if (!r || nivel > 2) return m;
    if (!fuente.mapa.has(r)) { faltan.add(r); return ''; }
    const marca = `/*aw-import-${imports.length}*/`;
    imports.push({ r, media: media.trim(), marca });
    return marca;
  });
  for (const im of imports) {
    const dentro = await cssProcesado(fuente, await fuente.texto(im.r), dir(im.r), faltan, nivel + 1);
    css = css.replace(im.marca, im.media ? `@media ${im.media}{${dentro}}` : dentro);
  }
  // Cada url() de la web va a su enlace temporal; las que no están en la versión se anulan
  // (si no, el navegador las buscaría en AurevixWeb)
  const refs = [...css.matchAll(RE_URL)].map(m => m[2]).map(ref => [ref, resolver(ref, desde)]).filter(([, r]) => r !== null);
  const urls = new Map(await Promise.all(refs.map(async ([ref, r]) => {
    if (!fuente.mapa.has(r)) { faltan.add(r); return [ref, 'data:,']; }
    return [ref, (await fuente.url(r)) || 'data:,'];
  })));
  return css.replace(RE_URL, (m, q, ref) => urls.has(ref) ? `url("${urls.get(ref)}")` : m);
}

const ATRIBUTOS = [
  ['img', 'src'], ['source', 'src'], ['video', 'src'], ['video', 'poster'], ['audio', 'src'], ['track', 'src'], ['input', 'src'],
  ['embed', 'src'], ['object', 'data'], ['iframe', 'src'], ['image', 'href'], ['use', 'href'], ['image', 'xlink:href'], ['use', 'xlink:href']
];
const ESCRIPT_NAVEGAR = hash => `<script>(function(){
var H=${JSON.stringify(hash || '')};
function ir(id){var t=id&&document.getElementById(id);if(t){t.scrollIntoView({behavior:'smooth',block:'start'});return true}return false}
if(H)addEventListener('load',function(){ir(H)});
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;
  var p=a.getAttribute('data-aw-ir'),h=a.getAttribute('href')||'';
  if(p!==null){e.preventDefault();parent.postMessage({aw:'ir',ruta:p,hash:a.getAttribute('data-aw-hash')||''},'*');return}
  if(a.hasAttribute('data-aw-falta')){e.preventDefault();parent.postMessage({aw:'aviso',tipo:'enlace'},'*');return}
  if(h.charAt(0)==='#'){e.preventDefault();var id=h.slice(1);try{id=decodeURIComponent(id)}catch(x){}if(!ir(id))scrollTo({top:0,behavior:'smooth'});return}
  if(/^https?:/i.test(h)){a.target='_blank';a.rel='noopener';return}
  e.preventDefault();parent.postMessage({aw:'aviso',tipo:/^(mailto|tel|sms|whatsapp):/i.test(h)?'contacto':'enlace'},'*');
},true);
document.addEventListener('submit',function(e){e.preventDefault();parent.postMessage({aw:'aviso',tipo:'form'},'*')},true);
})();<\/script>`;

/**
 * HTML listo para el iframe de una página de la versión.
 * Devuelve { html, faltan }: faltan son las rutas a las que apunta la página y no se han subido.
 * Importante: una página srcdoc resuelve las rutas relativas contra AurevixWeb, así que todo lo que
 * no está en la versión se quita en lugar de dejarlo apuntando a nuestros propios archivos.
 */
export async function documento(v, ruta, hash = '', fuente = fuenteDe(v)) {
  const html = await fuente.texto(ruta);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const desde = dir(ruta);
  const tareas = [];
  const faltan = new Set();
  // Hojas de estilo propias → dentro de la página
  for (const l of $$('link[rel~="stylesheet" i][href]', doc)) {
    const r = resolver(l.getAttribute('href'), desde);
    if (r === null) continue;
    if (!fuente.mapa.has(r)) { faltan.add(r); l.remove(); continue; }
    tareas.push((async () => {
      const s = doc.createElement('style');
      if (l.media) s.media = l.media;
      s.textContent = await cssProcesado(fuente, await fuente.texto(r), dir(r), faltan);
      l.replaceWith(s);
    })());
  }
  for (const s of $$('style', doc)) tareas.push((async () => { s.textContent = await cssProcesado(fuente, s.textContent, desde, faltan); })());
  for (const el of $$('[style*="url("]', doc)) tareas.push((async () => { el.setAttribute('style', await cssProcesado(fuente, el.getAttribute('style'), desde, faltan)); })());
  // Scripts propios → dentro de la página
  for (const s of $$('script[src]', doc)) {
    const r = resolver(s.getAttribute('src'), desde);
    if (r === null) continue;
    if (!fuente.mapa.has(r)) { faltan.add(r); s.remove(); continue; }
    tareas.push((async () => {
      const n = doc.createElement('script');
      [...s.attributes].forEach(at => at.name !== 'src' && at.name !== 'integrity' && n.setAttribute(at.name, at.value));
      n.textContent = (await fuente.texto(r)).replace(/<\/script/gi, '<\\/script');
      s.replaceWith(n);
    })());
  }
  // Fotos, vídeos, iconos y demás archivos → enlace temporal
  const cambiar = async (el, at) => {
    const r = resolver(el.getAttribute(at), desde);
    if (r === null) return;
    const u = fuente.mapa.has(r) ? await fuente.url(r) : '';
    if (u) el.setAttribute(at, u);
    else { if (!fuente.mapa.has(r)) faltan.add(r); el.removeAttribute(at); }
  };
  for (const [tag, at] of ATRIBUTOS) for (const el of doc.getElementsByTagName(tag)) if (el.hasAttribute(at)) tareas.push(cambiar(el, at));
  for (const el of $$('link[href]:not([rel~="stylesheet" i])', doc)) tareas.push(cambiar(el, 'href'));
  for (const el of $$('[srcset]', doc)) {
    tareas.push((async () => {
      const partes = await Promise.all(el.getAttribute('srcset').split(',').map(async trozo => {
        const [ref, ...resto] = trozo.trim().split(/\s+/);
        const r = resolver(ref, desde);
        if (r === null) return trozo.trim();
        const u = fuente.mapa.has(r) ? await fuente.url(r) : '';
        if (!u) { if (!fuente.mapa.has(r)) faltan.add(r); return ''; }
        return [u, ...resto].join(' ');
      }));
      el.setAttribute('srcset', partes.filter(Boolean).join(', '));
    })());
  }
  // Enlaces a otras páginas de la web: los abre el visor
  for (const a of $$('a[href]', doc)) {
    const h = a.getAttribute('href');
    const r = resolver(h, desde);
    if (r === null) continue;
    const pag = fuente.mapa.has(r) && esHTML(r) ? r : fuente.mapa.has(r + '/index.html') ? r + '/index.html' : fuente.mapa.has(r + '.html') ? r + '.html' : (r === '' ? v.entrada : null);
    if (pag) { a.setAttribute('data-aw-ir', pag); const hs = h.split('#')[1]; if (hs) a.setAttribute('data-aw-hash', hs); }
    else if (fuente.mapa.has(r)) { const u = await fuente.url(r); if (u) { a.setAttribute('href', u); a.setAttribute('target', '_blank'); } }
    else { faltan.add(r); a.setAttribute('href', '#'); a.setAttribute('data-aw-falta', ''); }
  }
  await Promise.all(tareas);
  $$('base', doc).forEach(b => b.remove());
  $$('meta[http-equiv="refresh" i]', doc).forEach(m => m.remove());
  if (!$('meta[name="viewport" i]', doc)) doc.head.insertAdjacentHTML('afterbegin', '<meta name="viewport" content="width=device-width,initial-scale=1">');
  doc.body.insertAdjacentHTML('beforeend', ESCRIPT_NAVEGAR(hash));
  return { html: conSinZoom('<!doctype html>\n' + doc.documentElement.outerHTML), faltan: [...faltan].filter(Boolean).sort() };
}

/* ==========================================================
   VISOR (diálogo a pantalla completa o dentro de una página)
   ========================================================== */
const DISPOSITIVOS = [
  { id: 'movil', txt: 'Móvil', ic: 'smartphone', w: 390, h: 844 },
  { id: 'tableta', txt: 'Tableta', ic: 'tablet', w: 820, h: 1180 },
  { id: 'ordenador', txt: 'Ordenador', ic: 'monitor', w: 1440, h: 900 }
];
const leerDispositivo = () => { try { return localStorage.getItem('tm_visor_disp'); } catch { return null; } };
const AVISOS = {
  form: 'Los formularios no se envían en la vista previa: en la web publicada sí funcionarán.',
  contacto: 'En la web publicada este botón abrirá el teléfono, el correo o WhatsApp.',
  enlace: 'Ese enlace lleva a una página que no está en esta versión.'
};

/**
 * Monta el visor en «raiz».
 * opciones: { p, version, modo: 'equipo' | 'cliente', pagina, alAprobar(v), alCambios(v, texto, pagina), alEnviar(v), alCerrar, enlace }
 */
export function montarVisor(raiz, opciones) {
  const { p, modo = 'cliente' } = opciones;
  let v = opciones.version;
  let pagina = opciones.pagina && v.archivos.some(a => a.ruta === opciones.pagina) ? opciones.pagina : v.entrada;
  let disp = leerDispositivo() || (innerWidth < 700 ? 'movil' : 'ordenador');
  let fuente = fuenteDe(v);
  let cargas = 0, esperada = 0;
  const versiones = (p.webs || []).slice().sort((a, b) => b.n - a.n);
  const puedeResponder = modo === 'cliente' && p.webCliente === v.id && (p.etapa || 'recibido') === 'revision';

  raiz.innerHTML = `
    <div class="vw" data-disp="${disp}">
      <header class="vw-h">
        <div class="vw-t">
          <b>${esc(p.respuestas?.negocio || p.planNombre || 'Tu web')}</b>
          <small id="vwSub"></small>
        </div>
        <div class="vw-ctrl">
          <div class="vw-disp" role="group" aria-label="Tamaño de pantalla">${DISPOSITIVOS.map(d => `<button type="button" data-disp="${d.id}" aria-pressed="${d.id === disp}" title="${d.txt}">${icono(d.ic)}<span>${d.txt}</span></button>`).join('')}</div>
          <label class="vw-sel" ${v.paginas?.length > 1 ? '' : 'hidden'}><span class="sr">Página</span>${icono('file')}<select id="vwPag" aria-label="Página"></select></label>
          ${modo === 'equipo' && versiones.length > 1 ? `<label class="vw-sel"><span class="sr">Versión</span>${icono('layers')}<select id="vwVer" aria-label="Versión">${versiones.map(w => `<option value="${esc(w.id)}" ${w.id === v.id ? 'selected' : ''}>Versión ${w.n}${p.webCliente === w.id ? ' · la ve el cliente' : ''}</option>`).join('')}</select></label>` : ''}
          <button type="button" class="icon-btn" id="vwRecargar" aria-label="Volver a cargar" title="Volver a cargar">${icono('refresh')}</button>
          ${opciones.enlace ? `<a class="icon-btn" href="${esc(opciones.enlace(v, pagina))}" target="_blank" rel="noopener" id="vwPestana" aria-label="Abrir en otra pestaña" title="Abrir en otra pestaña">${icono('external')}</a>` : ''}
          ${opciones.alCerrar ? `<button type="button" class="icon-btn" id="vwCerrar" aria-label="Cerrar">${icono('x')}</button>` : ''}
        </div>
      </header>
      <div class="vw-stage" id="vwStage">
        <div class="vw-marco"><iframe id="vwIfr" title="Vista previa de la web" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"></iframe></div>
        <div class="vw-carga" id="vwCarga" role="status">${spinner()}<span>Preparando la vista previa…</span></div>
      </div>
      <footer class="vw-f" id="vwPie"></footer>
    </div>`;

  const ifr = $('#vwIfr', raiz), stage = $('#vwStage', raiz), carga = $('#vwCarga', raiz), pie = $('#vwPie', raiz);

  function sub() {
    $('#vwSub', raiz).textContent = [`Versión ${v.n}`, haceCuanto(v.t), v.paginas?.length > 1 ? `${v.paginas.length} páginas` : '', refPedido(p.id)].filter(Boolean).join(' · ');
    const sel = $('#vwPag', raiz);
    sel.innerHTML = (v.paginas || [v.entrada]).map(r => `<option value="${esc(r)}" ${r === pagina ? 'selected' : ''}>${esc(r.replace(/\.html?$/i, '').replace(/(^|\/)index$/i, '$1Inicio') || 'Inicio')}</option>`).join('');
    sel.closest('.vw-sel').hidden = !(v.paginas?.length > 1);
    const pest = $('#vwPestana', raiz);
    if (pest) pest.href = opciones.enlace(v, pagina);
  }

  /* El iframe se dibuja al tamaño real del dispositivo y se encoge para caber */
  function encajar() {
    const d = DISPOSITIVOS.find(x => x.id === disp);
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const margen = W < 560 ? 0 : 24;
    let w = d.w, h = d.h;
    if (disp === 'ordenador' && W - margen * 2 >= 1100) w = W - margen * 2; // en pantallas grandes, el ancho real
    if (disp === 'movil' && W < 560) w = W; // en el móvil, el ancho real del móvil
    const escala = Math.min(1, (W - margen * 2) / w);
    h = disp === 'movil' && W < 560 ? H : Math.min(h, (H - margen * 2) / escala);
    if (disp === 'ordenador') h = (H - margen * 2) / escala;
    ifr.style.width = `${w}px`;
    ifr.style.height = `${h}px`;
    ifr.parentElement.style.width = `${w * escala}px`;
    ifr.parentElement.style.height = `${h * escala}px`;
    ifr.style.transform = escala < 1 ? `scale(${escala})` : '';
    raiz.querySelector('.vw').dataset.disp = disp;
    raiz.querySelector('.vw').classList.toggle('vw-escala', escala < 1);
  }
  const ro = new ResizeObserver(encajar);
  ro.observe(stage);

  async function pintar(hash = '') {
    carga.hidden = false;
    carga.classList.remove('mal');
    carga.innerHTML = `${spinner()}<span>Preparando la vista previa…</span>`;
    try {
      const { html, faltan } = await documento(v, pagina, hash, fuente);
      esperada = ++cargas;
      ifr.srcdoc = html;
      avisoFaltan(faltan);
    } catch (e) {
      carga.classList.add('mal');
      carga.innerHTML = `${icono('alert')}<span>${esc(e.message || 'No se ha podido abrir la web')}</span><button type="button" class="btn btn-sm btn-ghost" data-vw-reintentar>${icono('refresh')}<span>Reintentar</span></button>`;
    }
    sub();
  }
  // Si un script de la web intenta cambiar de página, se vuelve a la página actual
  let ultimaCarga = 0;
  ifr.addEventListener('load', () => {
    if (!ifr.srcdoc) return;
    if (esperada) { esperada = 0; ultimaCarga = Date.now(); carga.hidden = true; return; }
    if (Date.now() - ultimaCarga < 1500) return;
    ultimaCarga = Date.now();
    toast(AVISOS.enlace);
    pintar();
  });
  carga.addEventListener('click', e => { if (e.target.closest('[data-vw-reintentar]')) { fuente = fuenteDe(v); pintar(); } });

  const alMensaje = e => {
    if (e.source !== ifr.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.aw === 'ir' && typeof e.data.ruta === 'string' && fuente.mapa.has(e.data.ruta)) { pagina = e.data.ruta; pintar(String(e.data.hash || '')); }
    if (e.data.aw === 'aviso') toast(AVISOS[e.data.tipo] || AVISOS.enlace);
  };
  addEventListener('message', alMensaje);

  $$('[data-disp]', raiz).forEach(b => b.addEventListener('click', () => {
    disp = b.dataset.disp;
    try { localStorage.setItem('tm_visor_disp', disp); } catch { /* sin guardar */ }
    $$('[data-disp]', raiz).forEach(x => x.setAttribute('aria-pressed', x === b));
    encajar();
  }));
  $('#vwPag', raiz).addEventListener('change', e => { pagina = e.target.value; pintar(); });
  $('#vwVer', raiz)?.addEventListener('change', e => {
    v = versiones.find(w => w.id === e.target.value) || v;
    pagina = v.entrada; fuente = fuenteDe(v);
    pintarPie(); pintar();
  });
  $('#vwRecargar', raiz).addEventListener('click', () => { fuente = fuenteDe(v); pintar(); });
  $('#vwCerrar', raiz)?.addEventListener('click', () => opciones.alCerrar());

  /* Al equipo se le avisa de los archivos a los que apunta la página y no se han subido */
  function avisoFaltan(faltan) {
    $('.vw-faltan', raiz)?.remove();
    if (modo !== 'equipo' || !faltan.length) return;
    const el = document.createElement('p');
    el.className = 'vw-faltan';
    el.innerHTML = `${icono('alert')}<span>Esta página apunta a ${faltan.length} archivo${faltan.length === 1 ? '' : 's'} que no ${faltan.length === 1 ? 'está' : 'están'} en la versión: <b>${faltan.slice(0, 4).map(esc).join(', ')}${faltan.length > 4 ? '…' : ''}</b>. Súbelos en una versión nueva.</span>`;
    pie.prepend(el);
  }

  /* ---------- Pie: lo que puede hacer cada uno ---------- */
  function pintarPie() {
    if (modo === 'equipo') {
      const enviada = p.webCliente === v.id;
      pie.innerHTML = `
        <p class="vw-nota">${v.nota ? `${icono('message')}<span>${esc(v.nota)}</span>` : `${icono('layers')}<span>Subida por ${esc(v.autor || 'el equipo')} el ${fecha(v.t)} · ${tamano(v.bytes || 0)} · ${v.archivos.length} archivo${v.archivos.length === 1 ? '' : 's'}</span>`}</p>
        <div class="vw-btns">
          <button type="button" class="btn btn-sm btn-ghost" id="vwZip">${icono('download')}<span>Descargar .zip</span></button>
          ${opciones.alEnviar ? `<button type="button" class="btn btn-sm ${enviada ? 'btn-ghost' : 'btn-primary'}" id="vwEnviar" ${enviada ? 'disabled' : ''}>${icono(enviada ? 'check' : 'send')}<span>${enviada ? 'El cliente ya la ve' : 'Enviar al cliente'}</span></button>` : ''}
        </div>`;
      $('#vwZip', pie).addEventListener('click', e => descargarVersion(p, v, e.currentTarget));
      $('#vwEnviar', pie)?.addEventListener('click', async e => {
        const b = e.currentTarget; ocupado(b, true);
        try { await opciones.alEnviar(v); p.webCliente = v.id; pintarPie(); } catch (err) { toast(err.message, 'err'); ocupado(b, false); }
      });
      return;
    }
    if (!puedeResponder) {
      const rv = p.revision || {};
      pie.innerHTML = `<p class="vw-nota">${icono(rv.estado === 'aprobada' ? 'check' : 'eye')}<span>${rv.estado === 'aprobada' ? 'Aprobaste esta versión. ¡Gracias!' : 'Esta es la versión que estamos preparando para ti.'}</span></p>`;
      return;
    }
    pie.innerHTML = `
      <p class="vw-nota">${icono('eye')}<span>Recórrela con calma en el móvil y en el ordenador. ¿Te gusta?</span></p>
      <div class="vw-btns">
        <button type="button" class="btn btn-sm btn-ghost" id="vwCambios">${icono('pen')}<span>Pedir cambios</span></button>
        <button type="button" class="btn btn-sm btn-primary" id="vwAprobar">${icono('check')}<span>Aprobar la web</span></button>
      </div>
      <form class="vw-form" id="vwForm" hidden novalidate>
        <label for="vwTexto">¿Qué quieres cambiar?</label>
        <textarea id="vwTexto" rows="3" maxlength="3000" placeholder="Por ejemplo: en la portada, pon el teléfono más grande y cambia la foto del equipo."></textarea>
        <small class="muted" id="vwDonde"></small>
        <div class="vw-btns"><button type="button" class="btn btn-sm btn-ghost" id="vwNo">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">${icono('send')}<span>Enviar cambios</span></button></div>
      </form>`;
    const form = $('#vwForm', pie);
    $('#vwCambios', pie).addEventListener('click', () => {
      form.hidden = false;
      $('#vwDonde', pie).textContent = `Se enviará junto a la página que estás viendo: ${pagina.replace(/\.html?$/i, '').replace(/(^|\/)index$/i, '$1Inicio') || 'Inicio'}.`;
      $('#vwTexto', pie).focus();
    });
    $('#vwNo', pie).addEventListener('click', () => (form.hidden = true));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const texto = $('#vwTexto', pie).value.trim();
      if (texto.length < 3) return toast('Escribe qué cambios quieres', 'err');
      const b = e.submitter; ocupado(b, true);
      try { await opciones.alCambios(v, texto, pagina); } catch (err) { if (err.message) toast(err.message, 'err'); ocupado(b, false); }
    });
    $('#vwAprobar', pie).addEventListener('click', async e => {
      if (!confirm('¿Apruebas esta versión de tu web? Después solo quedará el pago final para publicarla.')) return;
      const b = e.currentTarget; ocupado(b, true);
      try { await opciones.alAprobar(v); } catch (err) { if (err.message) toast(err.message, 'err'); ocupado(b, false); }
    });
  }

  pintarPie();
  sub();
  encajar();
  pintar();
  return () => { ro.disconnect(); removeEventListener('message', alMensaje); ifr.srcdoc = ''; };
}

/* Diálogo a pantalla completa con el visor */
let dlgVisor, quitar = () => {};
export function abrirVisor(opciones) {
  if (!dlgVisor) {
    dlgVisor = document.createElement('dialog');
    dlgVisor.className = 'dlg dlg-visor';
    dlgVisor.dataset.backdrop = 'no';
    dlgVisor.setAttribute('aria-label', 'Vista previa de la web');
    document.body.appendChild(dlgVisor);
    dlgVisor.addEventListener('close', () => { quitar(); quitar = () => {}; dlgVisor.innerHTML = ''; });
  }
  quitar();
  abrir(dlgVisor);
  quitar = montarVisor(dlgVisor, { ...opciones, alCerrar: () => cerrar(dlgVisor) });
  return () => cerrar(dlgVisor);
}
export const cerrarVisor = () => cerrar(dlgVisor);

/** Enlace a la vista previa en su propia página (se puede abrir en otra pestaña o guardar) */
export const enlaceVista = (p, v, pagina = '') => `vista-previa?p=${encodeURIComponent(p.id)}&v=${encodeURIComponent(v.id)}${pagina && pagina !== v.entrada ? `&pag=${encodeURIComponent(pagina)}` : ''}`;

/** La versión que ve el cliente (o null) */
export const versionCliente = p => (p.webs || []).find(w => w.id === p.webCliente) || null;
