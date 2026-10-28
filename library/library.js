/* ==========================================================
   LIBRERÍA DE COMPONENTES (https://aurevixweb.es/library)
   Galería al estilo de uiverse.io con la identidad de AurevixWeb.
   - Índice compacto (library/indice.json); el código de cada componente
     se carga solo al montar su vista previa o al abrirlo.
   - Vistas previas en vivo en <iframe sandbox="allow-scripts" srcdoc>,
     perezosas y desmontadas al salir de pantalla si hay más de 40.
   - Filtros, orden y componente abierto en el hash de la URL.
   - Cada componente muestra su biblioteca, licencia, autor y origen;
     «Copiar» y «Descargar» añaden esa cabecera.
   © AurevixWeb. Los componentes son de terceros (ver su licencia).
   ========================================================== */
import { icono } from '../js/iconos.js';
import { conSinZoom } from '../js/sinzoom.js';
import { guardarApariencia } from '../js/apariencia.js';
import { prefsPermitidas } from '../js/cookies.js';
import { iniciarDesplegables } from '../js/desplegable.js';
import { crearZip } from '../js/zip.js';
import * as N from './nucleo.js';

/* ---------- Utilidades ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('es-ES');
const LOTE = 24, MAX_MONTADOS = 40;
const movimientoReducido = () => document.documentElement.dataset.movimiento === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Iconos de las pestañas (24×24, trazo) */
const IC = {
  todos: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  buttons: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/>',
  cards: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 11h16M8 15h6"/>',
  forms: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  inputs: '<rect x="3" y="7" width="18" height="10" rx="3"/><path d="M8 10v4"/>',
  toggles: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
  checkboxes: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
  radios: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  loaders: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  tooltips: '<path d="M4 5h16v10H13l-4 4v-4H4z"/>',
  navigation: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  backgrounds: '<circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>',
  layouts: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  feedback: '<path d="M6 9a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0"/>',
  modals: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M17 7h.01"/>',
  'data-display': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  animations: '<path d="M3 12c3-6 6-6 9 0s6 6 9 0"/>',
  'text-effects': '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  otros: '<path d="m12 3 3 6h-6zM5 14h6v6H5z"/><circle cx="17" cy="17" r="3"/>',
  iconos: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  favoritos: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'
};
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const CORAZON = svg(IC.favoritos);
const FMT = { html: 'HTML', css: 'CSS', js: 'JS', jsx: 'JSX', tsx: 'TSX', svg: 'SVG', otros: 'Otros (SCSS, TS, MD…)' };
const ORDENES = { rec: 'Recomendados', nuevos: 'Más nuevos', az: 'A–Z' };

/* ---------- Estado (todo se refleja en el hash de la URL) ---------- */
const E = {
  indice: null, iconos: null, cargandoIconos: false,
  q: '', cat: 'todos', libs: new Set(), fmts: new Set(), lics: new Set(), uso: null, orden: 'rec', id: '',
  lista: [], mostrados: 0, equipo: false, usuario: null
};

function leerHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  E.q = h.get('q') || '';
  E.cat = h.get('cat') || 'todos';
  E.libs = new Set((h.get('lib') || '').split(',').filter(Boolean));
  E.fmts = new Set((h.get('fmt') || '').split(',').filter(Boolean));
  E.lics = new Set((h.get('lic') || '').split(',').filter(x => N.CLASES[x]));
  E.uso = h.has('uso') ? h.get('uso') === '1' : null;
  E.orden = ORDENES[h.get('orden')] ? h.get('orden') : 'rec';
  E.id = h.get('id') || '';
}
function escribirHash() {
  const h = new URLSearchParams();
  if (E.q) h.set('q', E.q);
  if (E.cat !== 'todos') h.set('cat', E.cat);
  if (E.libs.size) h.set('lib', [...E.libs].join(','));
  if (E.fmts.size) h.set('fmt', [...E.fmts].join(','));
  if (E.lics.size) h.set('lic', [...E.lics].join(','));
  if (E.uso !== null && E.uso !== E.equipo) h.set('uso', E.uso ? '1' : '0');
  if (E.orden !== 'rec') h.set('orden', E.orden);
  if (E.id) h.set('id', E.id);
  const nuevo = h.toString();
  if (nuevo !== location.hash.slice(1)) history.replaceState(null, '', nuevo ? `#${nuevo}` : location.pathname + location.search);
}
const usoActivo = () => (E.uso === null ? E.equipo : E.uso);

/* ---------- Favoritos (localStorage) ---------- */
const CLAVE_FAV = 'tm_lib_fav';
let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem(CLAVE_FAV) || '[]')); } catch { /* sin almacenamiento */ }
let avisoFav = false;
function alternarFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  if (prefsPermitidas()) { try { localStorage.setItem(CLAVE_FAV, JSON.stringify([...favs])); } catch { /* sin espacio */ } }
  else if (!avisoFav) { avisoFav = true; toast('Tus favoritos se guardarán cuando aceptes las preferencias en «Cookies».'); }
  return favs.has(id);
}

/* ---------- Avisos ---------- */
let tToast;
function toast(texto, tipo = '') {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span class="t-ic">${icono(tipo === 'err' ? 'alert' : 'check')}</span><span>${esc(texto)}</span>`;
  t.className = 'toast'; void t.offsetWidth; t.className = `toast show ${tipo}`;
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('show'), tipo === 'err' ? 6000 : 2800);
}

/* ==========================================================
   FILTRAR Y ORDENAR
   ========================================================== */
const coincideTexto = (c, palabras) => palabras.every(p => c.buscar.includes(p));
function base(cat = E.cat) {
  if (cat === 'iconos') return E.iconos || [];
  if (cat === 'favoritos') return [...E.indice.componentes, ...(E.iconos || [])].filter(c => favs.has(c.i));
  return E.indice.componentes;
}
/** Todos los filtros salvo la categoría (para los contadores de las pestañas) */
function pasaFiltros(c, palabras) {
  if (palabras.length && !coincideTexto(c, palabras)) return false;
  if (E.libs.size && !E.libs.has(c.lib.id)) return false;
  if (E.fmts.size && !c.f.some(f => E.fmts.has(f) || (E.fmts.has('otros') && !FMT[f]))) return false;
  if (E.lics.size && !E.lics.has(N.claseDe(c))) return false;
  if (usoActivo() && !N.usable(c)) return false;
  return true;
}
const palabrasDe = q => N.normalizar(q).split(/\s+/).filter(Boolean);
function calcular() {
  const palabras = palabrasDe(E.q);
  let l = base().filter(c => (E.cat === 'todos' || E.cat === 'iconos' || E.cat === 'favoritos' || c.c === E.cat) && pasaFiltros(c, palabras));
  if (E.orden === 'az') l.sort((a, z) => a.n.localeCompare(z.n, 'es', { sensitivity: 'base' }));
  else if (E.orden === 'nuevos') l.sort((a, z) => (z.lib.fecha || '').localeCompare(a.lib.fecha || '') || (z.pos ?? 0) - (a.pos ?? 0));
  else l.sort((a, z) => z.w - a.w || (a.pos ?? 0) - (z.pos ?? 0));
  E.lista = l;
}
function contadores() {
  const palabras = palabrasDe(E.q);
  const n = { todos: 0, iconos: 0, favoritos: 0 };
  for (const c of E.indice.componentes) {
    if (!pasaFiltros(c, palabras)) continue;
    n.todos++; n[c.c] = (n[c.c] || 0) + 1;
    if (favs.has(c.i)) n.favoritos++;
  }
  if (E.iconos) {
    for (const c of E.iconos) if (pasaFiltros(c, palabras)) { n.iconos++; if (favs.has(c.i)) n.favoritos++; }
  } else {
    // Aún sin cargar: el total de los sets de iconos (bibliotecas sin componentes)
    const conComp = new Set(E.indice.componentes.map(c => c.b));
    n.iconos = E.indice.bibliotecas.reduce((s, b, i) => s + (conComp.has(i) || (E.libs.size && !E.libs.has(b.id)) ? 0 : b.n), 0);
  }
  return n;
}

/* ==========================================================
   PINTAR
   ========================================================== */
function pintarCategorias() {
  const n = contadores();
  const cats = [['todos', 'Todos'], ...E.indice.categorias.filter(c => c.n).map(c => [c.id, c.nombre]), ['iconos', 'Iconos'], ['favoritos', 'Mis favoritos']];
  $('#lbCats').innerHTML = cats.map(([id, nombre]) => `
    <button type="button" class="lb-cat ${id === 'favoritos' ? 'fav' : ''}" data-cat="${id}" aria-pressed="${E.cat === id}">
      ${svg(IC[id] || IC.otros)}<span>${esc(nombre)}</span><small>${num(n[id] || 0)}</small>
    </button>`).join('');
  const act = $(`.lb-cat[data-cat="${CSS.escape(E.cat)}"]`);
  act?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

function pintarFiltros() {
  const libsBase = E.cat === 'iconos'
    ? [...new Set((E.iconos || []).map(c => c.b))].map(b => E.indice.bibliotecas[b])
    : E.indice.bibliotecas.filter(b => E.indice.componentes.some(c => c.lib === b));
  const nLib = E.libs.size, nFmt = E.fmts.size, nLic = E.lics.size;
  $('#lbFiltros').innerHTML = `
    <div class="lb-f">
      <button type="button" class="lb-fb ${nLib ? 'on' : ''}" data-pop="lib" aria-expanded="false" aria-haspopup="true">${icono('folder')}<span>Biblioteca</span>${nLib ? `<i>${nLib}</i>` : ''}${icono('down')}</button>
      <div class="lb-pop" data-pop-c="lib" role="dialog" aria-label="Filtrar por biblioteca">
        <input type="search" placeholder="Buscar entre ${libsBase.length} bibliotecas" aria-label="Buscar biblioteca" data-buscalib>
        <div class="lb-pop-l">${libsBase.sort((a, z) => a.nombre.localeCompare(z.nombre, 'es')).map(b => `
          <label class="lb-op" data-lib-n="${esc(N.normalizar(b.nombre))}"><input type="checkbox" value="${esc(b.id)}" data-f="lib" ${E.libs.has(b.id) ? 'checked' : ''}>
            <span>${esc(b.nombre)}<em>${esc(b.spdx)} · ${N.CLASES[b.clase].txt}</em></span><small>${num(b.n)}</small></label>`).join('')}</div>
        <div class="lb-pop-p"><button type="button" class="btn btn-sm btn-ghost" data-limpiar="lib">Quitar</button><button type="button" class="btn btn-sm btn-primary" data-cerrar-pop>Listo</button></div>
      </div>
    </div>
    <div class="lb-f">
      <button type="button" class="lb-fb ${nFmt ? 'on' : ''}" data-pop="fmt" aria-expanded="false" aria-haspopup="true">${icono('file')}<span>Formato</span>${nFmt ? `<i>${nFmt}</i>` : ''}${icono('down')}</button>
      <div class="lb-pop" data-pop-c="fmt" role="dialog" aria-label="Filtrar por formato">
        <div class="lb-pop-l">${Object.entries(FMT).map(([k, t]) => `<label class="lb-op"><input type="checkbox" value="${k}" data-f="fmt" ${E.fmts.has(k) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        <div class="lb-pop-p"><button type="button" class="btn btn-sm btn-ghost" data-limpiar="fmt">Quitar</button><button type="button" class="btn btn-sm btn-primary" data-cerrar-pop>Listo</button></div>
      </div>
    </div>
    <div class="lb-f">
      <button type="button" class="lb-fb ${nLic ? 'on' : ''}" data-pop="lic" aria-expanded="false" aria-haspopup="true">${icono('shield')}<span>Licencia</span>${nLic ? `<i>${nLic}</i>` : ''}${icono('down')}</button>
      <div class="lb-pop" data-pop-c="lic" role="dialog" aria-label="Filtrar por licencia">
        <div class="lb-pop-l">${Object.entries(N.CLASES).map(([k, v]) => `<label class="lb-op"><input type="checkbox" value="${k}" data-f="lic" ${E.lics.has(k) ? 'checked' : ''}><span><span class="lb-lic ${k}">${v.txt}</span><em>${v.desc}</em></span></label>`).join('')}</div>
        <div class="lb-pop-p"><button type="button" class="btn btn-sm btn-ghost" data-limpiar="lic">Quitar</button><button type="button" class="btn btn-sm btn-primary" data-cerrar-pop>Listo</button></div>
      </div>
    </div>
    <label class="lb-sw" title="Solo licencias que se pueden usar en webs de clientes (permisivas y con atribución)">
      <input type="checkbox" id="lbUso" ${usoActivo() ? 'checked' : ''}><span class="lb-sw-t"></span><span>Usable en webs de clientes</span>
    </label>
    <label class="lb-orden"><span>Ordenar</span>
      <select id="lbOrden" aria-label="Ordenar">${Object.entries(ORDENES).map(([k, t]) => `<option value="${k}" ${E.orden === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </label>
    <p class="lb-cuenta" id="lbCuenta"></p>`;
  iniciarDesplegables();
}

function pintarChips() {
  const chips = [];
  if (E.q) chips.push(['q', '', `«${E.q}»`]);
  for (const id of E.libs) chips.push(['lib', id, E.indice.bibliotecas.find(b => b.id === id)?.nombre || id]);
  for (const f of E.fmts) chips.push(['fmt', f, FMT[f] || f]);
  for (const l of E.lics) chips.push(['lic', l, N.CLASES[l].txt]);
  if (usoActivo()) chips.push(['uso', '', 'Usable en webs de clientes']);
  $('#lbChips').innerHTML = chips.length ? chips.map(([k, v, t]) => `<span class="lb-chip">${esc(t)}<button type="button" data-chip="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(t)}">${icono('x')}</button></span>`).join('')
    + (chips.length > 1 ? `<button type="button" class="lb-chip-x" data-chip="todo">Quitar todos</button>` : '') : '';
}

function pintarTitulo() {
  const cat = E.cat === 'todos' ? 'Todos los componentes' : E.cat === 'iconos' ? 'Iconos' : E.cat === 'favoritos' ? 'Mis favoritos'
    : (E.indice.categorias.find(c => c.id === E.cat)?.nombre || 'Componentes');
  $('#lbTitulo').textContent = cat;
  const total = E.lista.length;
  const libsN = new Set(E.lista.map(c => c.b)).size;
  $('#lbSub').textContent = `${num(total)} ${total === 1 ? 'resultado' : 'resultados'} de ${libsN} ${libsN === 1 ? 'biblioteca' : 'bibliotecas'}. Código de terceros: cada uno con su licencia y su origen.`;
  const cuenta = $('#lbCuenta');
  if (cuenta) cuenta.textContent = `${num(total)} resultados`;
  $('#lbVivo').textContent = `${num(total)} resultados`;
}

/* Todo de una vez (al cambiar cualquier filtro) */
async function actualizar({ hash = true } = {}) {
  if (E.cat === 'iconos' || (E.cat === 'favoritos' && [...favs].some(f => f.startsWith('icono/')))) {
    if (!E.iconos) return cargarIconos();
  }
  calcular();
  pintarCategorias();
  pintarFiltros();
  pintarChips();
  pintarTitulo();
  reiniciarGrid();
  if (hash) escribirHash();
}

/* ==========================================================
   CUADRÍCULA: lotes de 24, scroll infinito, previews perezosas
   ========================================================== */
const montados = new Set();
const visibles = new Set();
const marcos = new Map(); // id del iframe → { ifr, caja }
let ioPrev, ioMas, sec = 0;

function esqueletos(n = 8) {
  return Array.from({ length: n }, () => `<div class="lb-card esq" aria-hidden="true"><div class="lb-prev"><div class="lb-sk"></div></div><div class="lb-pie"><span class="lb-nombre"><span class="lb-sk-l" style="width:60%"></span><span class="lb-sk-l" style="width:40%;height:9px;margin-top:6px"></span></span></div></div>`).join('');
}

function tarjeta(c, i) {
  const clase = N.claseDe(c);
  const fondo = N.fondoPreferido(c);
  return `<article class="lb-card" role="listitem" data-n="${i}">
    <div class="lb-prev" ${fondo ? `data-fondo="${fondo}"` : ''}>${c.p === 'icono'
      ? `<span class="lb-ico" style="--u:url('${esc(N.urlArchivo(c))}')"></span>`
      : '<div class="lb-sk"></div>'}${c.p === 'code' ? `<span class="lb-fmt">${esc(c.f.join(' · '))}</span>` : ''}</div>
    <div class="lb-pie">
      <button type="button" class="lb-nombre" data-abrir="${i}" aria-label="Ver ${esc(c.n)} de ${esc(c.lib.nombre)}">
        <b>${esc(c.n)}</b><small><span>${esc(c.lib.nombre)}${c.u ? ` · ${esc(c.u)}` : ''}</span><span class="lb-lic ${clase}" title="${esc(c.lib.spdx)} · ${N.CLASES[clase].txt}">${esc(c.lib.spdx.replace(/ AND .*/, '+'))}</span></small>
      </button>
      <button type="button" class="lb-fav" data-fav="${i}" aria-pressed="${favs.has(c.i)}" aria-label="${favs.has(c.i) ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${CORAZON}</button>
      <button type="button" class="lb-cod" data-abrir="${i}" aria-label="Ver el código de ${esc(c.n)}"><span aria-hidden="true">&lt;/&gt;</span><span>Código</span></button>
    </div>
  </article>`;
}

function reiniciarGrid() {
  const g = $('#lbGrid');
  sec++;
  montados.forEach(el => desmontar(el));
  montados.clear(); visibles.clear(); marcos.clear();
  E.mostrados = 0;
  g.classList.toggle('iconos', E.cat === 'iconos');
  g.setAttribute('aria-busy', 'false');
  if (!E.lista.length) {
    const hayFiltros = E.q || E.libs.size || E.fmts.size || E.lics.size || usoActivo();
    g.innerHTML = `<div class="lb-estado">${E.cat === 'favoritos' ? CORAZON : icono('search')}
      <b>${E.cat === 'favoritos' && !favs.size ? 'Todavía no tienes favoritos' : 'No hay componentes con estos filtros'}</b>
      <p>${E.cat === 'favoritos' && !favs.size ? 'Pulsa el corazón de cualquier tarjeta para guardarla aquí.' : 'Prueba con otra palabra, otra categoría o quita algún filtro.'}</p>
      ${hayFiltros ? `<button type="button" class="btn btn-sm btn-primary" data-chip="todo">${icono('x')}<span>Quitar filtros</span></button>` : ''}</div>`;
    return;
  }
  g.innerHTML = '';
  masTarjetas();
  window.scrollTo({ top: Math.min(scrollY, Math.max(0, $('#lbMain').offsetTop - 10)), behavior: 'instant' });
}

function masTarjetas() {
  const g = $('#lbGrid');
  if (!E.indice || E.cargandoIconos || E.mostrados >= E.lista.length) return;
  const desde = E.mostrados, hasta = Math.min(E.lista.length, desde + LOTE);
  g.insertAdjacentHTML('beforeend', E.lista.slice(desde, hasta).map((c, k) => tarjeta(c, desde + k)).join(''));
  E.mostrados = hasta;
  $$('.lb-card[data-n]:not([data-obs])', g).forEach(card => {
    card.dataset.obs = '1';
    const c = E.lista[+card.dataset.n];
    if (c && c.p !== 'icono') ioPrev.observe($('.lb-prev', card));
  });
  if (E.mostrados >= E.lista.length && E.lista.length > LOTE) g.insertAdjacentHTML('beforeend', `<p class="lb-fin">Has llegado al final · ${num(E.lista.length)} resultados</p>`);
}

/* Monta la vista previa (o la tarjeta de código) de una tarjeta visible */
async function montar(caja) {
  const card = caja.closest('.lb-card');
  const c = card && E.lista[+card.dataset.n];
  if (!c || montados.has(caja)) return;
  montados.add(caja);
  const mio = sec;
  try {
    if (c.p === 'code') {
      const tabs = await N.leerCodigo(c);
      if (mio !== sec || !montados.has(caja)) return;
      const t = tabs[0]?.codigo || '';
      caja.querySelector('.lb-sk')?.remove();
      caja.insertAdjacentHTML('afterbegin', `<pre class="lb-codigo-mini" aria-hidden="true">${resaltar(t.split('\n').slice(0, 22).join('\n').slice(0, 1800), tabs[0]?.tipo)}</pre>`);
      return;
    }
    const id = `p${sec}-${card.dataset.n}`;
    const doc = await N.docVista(c, { id, fondo: caja.dataset.fondo || '' });
    if (mio !== sec || !montados.has(caja)) return;
    const ifr = document.createElement('iframe');
    ifr.title = `Vista previa de ${c.n}`;
    ifr.setAttribute('sandbox', 'allow-scripts');
    ifr.setAttribute('loading', 'lazy');
    ifr.setAttribute('tabindex', '-1');
    ifr.srcdoc = conSinZoom(doc);
    N.vigilarNavegacion(ifr, doc);
    ifr.addEventListener('load', () => caja.querySelector('.lb-sk')?.remove(), { once: true });
    caja.appendChild(ifr);
    marcos.set(id, { ifr, caja });
  } catch (e) {
    montados.delete(caja);
    caja.querySelector('.lb-sk')?.remove();
    caja.insertAdjacentHTML('afterbegin', `<div class="lb-estado" style="position:absolute;inset:0;border:0;padding:12px;font-size:13px">${icono('alert')}<span>No se ha podido cargar</span></div>`);
  }
}
function desmontar(caja) {
  montados.delete(caja);
  const ifr = $('iframe', caja);
  if (ifr) { for (const [k, v] of marcos) if (v.ifr === ifr) marcos.delete(k); ifr.remove(); }
  $('.lb-codigo-mini', caja)?.remove();
  if (!$('.lb-sk', caja) && !$('.lb-ico', caja)) caja.insertAdjacentHTML('afterbegin', '<div class="lb-sk"></div>');
}

function iniciarObservadores() {
  ioPrev = new IntersectionObserver(es => {
    for (const e of es) {
      if (e.isIntersecting) { visibles.add(e.target); montar(e.target); }
      else {
        visibles.delete(e.target);
        if (montados.size > MAX_MONTADOS) desmontar(e.target);
      }
    }
    // Si aún hay demasiadas, se quitan las que no se ven
    if (montados.size > MAX_MONTADOS) for (const m of [...montados]) { if (!visibles.has(m)) desmontar(m); if (montados.size <= MAX_MONTADOS) break; }
  }, { rootMargin: '250px 0px' });
  ioMas = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) masTarjetas(); }, { rootMargin: '900px 0px' });
  ioMas.observe($('#lbMas'));
}

/* El componente dice cuánto ocupa (desde su iframe) y se encaja en la caja */
addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d.lbFit !== 'string') return;
  const m = marcos.get(d.lbFit);
  if (!m || e.source !== m.ifr.contentWindow) return;
  const w = Number(d.w), h = Number(d.h);
  if (!(w > 0 && h > 0 && w < 20000 && h < 20000)) return;
  encajar(m, w, h);
});
function encajar({ ifr, caja }, w, h) {
  const bw = caja.clientWidth, bh = caja.clientHeight, margen = 24;
  const k = Math.max(0.25, Math.min(1, (bw - margen) / w, (bh - margen) / h));
  if (k >= 0.999) { ifr.style.width = ''; ifr.style.height = ''; ifr.style.transform = ''; return; }
  ifr.style.width = `${bw / k}px`;
  ifr.style.height = `${bh / k}px`;
  ifr.style.transform = `scale(${k})`;
}

/* ==========================================================
   RESALTADO DE CÓDIGO (ligero, sin librerías)
   ========================================================== */
const KW = /\b(import|export|from|default|const|let|var|function|return|if|else|for|while|switch|case|break|new|class|extends|async|await|try|catch|finally|throw|typeof|interface|type|enum|as|in|of|null|undefined|true|false|this)\b/;
function resaltar(codigo, tipo = 'txt') {
  const s = String(codigo || '');
  if (s.length > 160000) return esc(s);
  if (tipo === 'html' || tipo === 'svg' || tipo === 'md' || tipo === 'vue') return resaltarHTML(s);
  if (['css', 'scss', 'styl', 'less'].includes(tipo)) return resaltarCSS(s);
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'mjs'].includes(tipo)) return resaltarJS(s);
  return esc(s);
}
const span = (cls, t) => `<span class="${cls}">${esc(t)}</span>`;
function resaltarHTML(s) {
  let out = '', i = 0;
  const re = /<!--[\s\S]*?-->|<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<\/?[a-zA-Z][^>]*>/g;
  let m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(i, m.index));
    const t = m[0];
    if (t.startsWith('<!--')) out += span('hl-c', t);
    else if (/^<(style|script)\b/i.test(t)) {
      const abre = t.match(/^<[^>]*>/)[0], cierra = t.match(/<\/[^>]*>$/)[0];
      out += etiqueta(abre) + (/^<style/i.test(t) ? resaltarCSS(t.slice(abre.length, -cierra.length)) : resaltarJS(t.slice(abre.length, -cierra.length))) + etiqueta(cierra);
    } else out += etiqueta(t);
    i = m.index + t.length;
  }
  return out + esc(s.slice(i));
}
function etiqueta(t) {
  return t.replace(/^(<\/?)([\w:-]+)|([\w:@.#-]+)(=)|("[^"]*"|'[^']*')|(\/?>)$/g, (x, a, b, c, d, e, f) =>
    a ? esc(a) + span('hl-t', b) : c ? span('hl-a', c) + esc(d) : e ? span('hl-s', e) : f ? esc(f) : esc(x));
}
function resaltarCSS(s) {
  return s.replace(/(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b|-?\b\d*\.?\d+(?:px|rem|em|%|s|ms|deg|vh|vw|fr|x)?\b)|([\w-]+)(?=\s*:(?![^{]*\{))|([^"'/@#\d\w-]+|[\s\S])/g,
    (x, c, st, at, n, p) => c ? span('hl-c', c) : st ? span('hl-s', st) : at ? span('hl-k', at) : n ? span('hl-n', n) : p ? span('hl-p', p) : esc(x));
}
function resaltarJS(s) {
  return s.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(<\/?[A-Za-z][\w.]*)|\b(\d+\.?\d*)\b|([A-Za-z_$][\w$]*)|([\s\S])/g,
    (x, c, st, tag, n, w) => c ? span('hl-c', c) : st ? span('hl-s', st) : tag ? esc(tag[0] === '<' && tag[1] === '/' ? '</' : '<') + span('hl-t', tag.replace(/^<\/?/, '')) : n ? span('hl-n', n) : w ? (KW.test(w) && w.length > 1 && new RegExp(`^${KW.source}$`).test(w) ? span('hl-k', w) : esc(w)) : esc(x));
}

/* ==========================================================
   PANEL DEL COMPONENTE
   ========================================================== */
let dlg, actual = -1, pestana = 0, tabsActuales = [], fondoPanel = '';
function crearPanel() {
  dlg = document.createElement('dialog');
  dlg.className = 'lb-dlg';
  dlg.setAttribute('aria-labelledby', 'lbPTit');
  document.body.appendChild(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('no-scroll');
    for (const [k, v] of marcos) if (v.caja.closest('dialog')) marcos.delete(k);
    dlg.innerHTML = '';
    E.id = ''; escribirHash();
    const volver = $(`[data-abrir="${actual}"]`);
    volver?.focus({ preventScroll: true });
  });
  // ← y → recorren los componentes (también si el foco se ha perdido al cambiar de componente)
  document.addEventListener('keydown', e => {
    if (!dlg.open || !$('#lbPTit', dlg) || e.target.closest?.('input, textarea, select, .lb-tabs')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); irA(actual - 1); }
  });
}

async function abrirPanel(i) {
  const c = E.lista[i];
  if (!c) return;
  if (!dlg) crearPanel();
  const foco = document.activeElement?.closest?.('[data-ir]')?.dataset.ir;
  actual = i; pestana = 0;
  fondoPanel = N.fondoPreferido(c) || 'puntos';
  E.id = c.i; escribirHash();
  const clase = N.claseDe(c);
  dlg.innerHTML = `<div class="lb-caja" role="document">
    <header class="lb-cab-p">
      <div>
        <h2 id="lbPTit">${esc(c.n)}</h2>
        <p><span>${esc(c.lib.nombre)}</span>${c.u ? `<span>por <b>${esc(c.u)}</b></span>` : ''}<span class="lb-lic ${clase}">${esc(c.lib.spdx)}</span><span>${esc(c.f.join(' · ').toUpperCase())}</span></p>
      </div>
      <div class="lb-nav">
        <button type="button" class="lb-ic-btn" data-ir="-1" aria-label="Anterior" ${i <= 0 ? 'disabled' : ''}>${svg('<path d="m15 6-6 6 6 6"/>')}</button>
        <button type="button" class="lb-ic-btn" data-ir="1" aria-label="Siguiente" ${i >= E.lista.length - 1 ? 'disabled' : ''}>${svg('<path d="m9 6 6 6-6 6"/>')}</button>
        <button type="button" class="lb-ic-btn" data-cerrar aria-label="Cerrar">${icono('x')}</button>
      </div>
    </header>
    <section class="lb-vista" aria-label="Vista previa">
      <div class="lb-prev" data-fondo="${fondoPanel}" id="lbPPrev"><div class="lb-sk"></div></div>
      <div class="lb-vista-b">
        <div class="lb-seg" role="group" aria-label="Fondo de la vista previa">
          ${[['claro', 'Claro'], ['oscuro', 'Oscuro'], ['puntos', 'Puntos']].map(([k, t]) => `<button type="button" data-fondo-p="${k}" aria-pressed="${fondoPanel === k}">${t}</button>`).join('')}
        </div>
        ${N.tieneVista(c) ? `<button type="button" class="btn btn-sm btn-ghost" id="lbGrande">${icono('external')}<span>Pantalla completa</span></button>` : ''}
        <button type="button" class="lb-fav" data-fav-p aria-pressed="${favs.has(c.i)}" aria-label="Favorito">${CORAZON}</button>
      </div>
    </section>
    <section class="lb-cod-p" aria-label="Código">
      <div class="lb-tabs" role="tablist" id="lbTabs"></div>
      <pre class="lb-pre" id="lbPre" tabindex="0"><code>Cargando el código…</code></pre>
      <div class="lb-acciones">
        <button type="button" class="btn btn-sm btn-primary" id="lbCopiar">${icono('copy')}<span>Copiar</span></button>
        <button type="button" class="btn btn-sm btn-ghost" id="lbBajar">${icono('download')}<span>Descargar</span></button>
      </div>
      <div class="lb-aviso ${clase}">${icono('shield')}<div>
        <b>${N.CLASES[clase].txt} · ${esc(c.lib.spdx)}</b> — ${esc(N.CLASES[clase].desc)}${c.lib.nota ? ` ${esc(c.lib.nota)}` : ''}<br>
        Autor: ${esc(N.autorDe(c))} · Origen: <a href="${esc(c.o || N.urlOrigen(c))}" target="_blank" rel="noopener">${esc((c.o || N.urlOrigen(c)).replace(/^https?:\/\//, ''))}</a>
        ${c.lib.licencias[0] ? ` · <a href="${esc(N.urlsLicencia(c)[0])}" target="_blank" rel="noopener">Ver licencia</a>` : ''}
        ${!N.tieneVista(c) ? '<br>Este formato necesita compilarse (React, TypeScript, SCSS…): aquí solo se muestra el código.' : ''}
      </div></div>
    </section>
  </div>`;
  if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add('no-scroll'); }
  // El foco se queda en el mismo botón (Anterior/Siguiente) o va a «Cerrar»
  ($(`[data-ir="${foco}"]:not([disabled])`, dlg) || $('[data-cerrar]', dlg)).focus({ preventScroll: true });
  $('[data-cerrar]', dlg).addEventListener('click', () => dlg.close());
  $$('[data-ir]', dlg).forEach(b => b.addEventListener('click', () => irA(actual + Number(b.dataset.ir))));
  $$('[data-fondo-p]', dlg).forEach(b => b.addEventListener('click', () => { fondoPanel = b.dataset.fondoP; $$('[data-fondo-p]', dlg).forEach(x => x.setAttribute('aria-pressed', x === b)); vistaPanel(c); }));
  $('[data-fav-p]', dlg).addEventListener('click', e => { const b = e.currentTarget; const si = alternarFav(c.i); b.setAttribute('aria-pressed', si); b.classList.remove('late'); void b.offsetWidth; b.classList.add('late'); sincronizarFav(c.i); });
  $('#lbGrande', dlg)?.addEventListener('click', () => pantallaCompleta(c));
  $('#lbCopiar', dlg).addEventListener('click', () => copiarCodigo(c));
  $('#lbBajar', dlg).addEventListener('click', e => descargarComponente(c, e.currentTarget));
  vistaPanel(c);
  try {
    tabsActuales = await N.leerCodigo(c);
    if (E.lista[actual] !== c) return;
    $('#lbTabs', dlg).innerHTML = tabsActuales.map((t, k) => `<button type="button" role="tab" aria-selected="${k === 0}" data-tab="${k}">${esc(t.nombre)}</button>`).join('');
    $$('[data-tab]', dlg).forEach(b => b.addEventListener('click', () => { pestana = +b.dataset.tab; $$('[data-tab]', dlg).forEach(x => x.setAttribute('aria-selected', x === b)); pintarCodigo(); }));
    pintarCodigo();
  } catch (e) {
    $('#lbPre', dlg).innerHTML = `<code>No se ha podido cargar el código: ${esc(e.message)}</code>`;
    $('#lbTabs', dlg).innerHTML = `<button type="button" class="btn btn-sm btn-ghost" id="lbReint">${icono('refresh')}<span>Reintentar</span></button>`;
    $('#lbReint', dlg).addEventListener('click', () => abrirPanel(actual));
  }
}
function pintarCodigo() {
  const t = tabsActuales[pestana];
  if (!t) return;
  $('#lbPre', dlg).innerHTML = `<code>${resaltar(N.cabecera(E.lista[actual], t.tipo, t.ruta) + t.codigo, t.tipo)}</code>`;
  $('#lbPre', dlg).scrollTop = 0;
}
async function vistaPanel(c) {
  const caja = $('#lbPPrev', dlg);
  if (!caja) return;
  caja.dataset.fondo = fondoPanel;
  for (const [k, v] of marcos) if (v.caja === caja) marcos.delete(k);
  caja.innerHTML = '<div class="lb-sk"></div>';
  if (!N.tieneVista(c)) {
    caja.innerHTML = `<div class="lb-estado" style="position:absolute;inset:16px;border:0">${icono('file')}<b>Sin vista previa</b><p>${esc(c.f.join(', ').toUpperCase())}: hay que compilarlo. Tienes el código a la derecha.</p></div>`;
    return;
  }
  try {
    const id = `panel-${Date.now()}`;
    const ifr = document.createElement('iframe');
    ifr.title = `Vista previa de ${c.n}`;
    ifr.setAttribute('sandbox', 'allow-scripts');
    const doc = await N.docVista(c, { id, fondo: fondoPanel === 'puntos' ? '' : fondoPanel });
    ifr.srcdoc = conSinZoom(doc);
    N.vigilarNavegacion(ifr, doc);
    ifr.addEventListener('load', () => $('.lb-sk', caja)?.remove(), { once: true });
    caja.appendChild(ifr);
    marcos.set(id, { ifr, caja });
  } catch (e) {
    caja.innerHTML = `<div class="lb-estado" style="position:absolute;inset:16px;border:0">${icono('alert')}<b>No se ha podido cargar</b><button type="button" class="btn btn-sm btn-primary" id="lbReintV">${icono('refresh')}<span>Reintentar</span></button></div>`;
    $('#lbReintV', caja).addEventListener('click', () => vistaPanel(c));
  }
}
function irA(i) {
  if (i < 0 || i >= E.lista.length) return;
  while (E.mostrados <= i) masTarjetas();
  abrirPanel(i);
}
/* Abre la vista previa a pantalla completa en otra pestaña, siempre dentro de un iframe aislado */
async function pantallaCompleta(c) {
  const w = open('', '_blank');
  if (!w) return toast('Permite las ventanas emergentes para abrirla', 'err');
  try {
    const doc = await N.docVista(c, { id: 'grande', fondo: fondoPanel === 'puntos' ? '' : fondoPanel });
    const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(c.n)} · ${esc(c.lib.nombre)}</title>
      <style>html,body{margin:0;height:100%;background:${fondoPanel === 'oscuro' ? '#141418' : fondoPanel === 'claro' ? '#f1f0eb' : '#1d1d24'};font:14px system-ui}iframe{border:0;width:100%;height:calc(100% - 40px);display:block;color-scheme:normal}p{margin:0;height:40px;display:flex;align-items:center;padding:0 14px;color:#a19f96;background:#0c0c0e}</style></head>
      <body><p>${esc(c.n)} · ${esc(c.lib.nombre)} · ${esc(c.lib.spdx)} · ${esc(N.autorDe(c))}</p><iframe sandbox="allow-scripts" title="${esc(c.n)}" srcdoc="${esc(doc)}"></iframe></body></html>`;
    w.location.href = URL.createObjectURL(new Blob([pagina], { type: 'text/html' }));
  } catch (e) { w.close(); toast('No se ha podido abrir', 'err'); }
}

/* ---------- Copiar y descargar (siempre con la cabecera de licencia) ---------- */
async function copiarCodigo(c) {
  const t = tabsActuales[pestana];
  if (!t) return;
  try { await navigator.clipboard.writeText(N.cabecera(c, t.tipo, t.ruta) + t.codigo); toast('Copiado con su aviso de licencia'); }
  catch { toast('No se pudo copiar: mantén pulsado el código para seleccionarlo', 'err'); }
}
const slug = s => N.normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'componente';
async function descargarComponente(c, btn) {
  btn.disabled = true;
  try {
    const tabs = tabsActuales.length ? tabsActuales : await N.leerCodigo(c);
    const carpeta = `${slug(c.lib.nombre)}-${slug(c.n)}`;
    const archivos = tabs.map(t => {
      const nombre = c.lib.id === 'uiverse-galaxy' || t.marcado || c.x != null ? (t.tipo === 'css' ? 'style.css' : 'index.html') : t.nombre;
      return { nombre: `${carpeta}/${nombre}`, datos: N.cabecera(c, t.tipo, t.ruta) + t.codigo };
    });
    const licencias = await Promise.all(N.urlsLicencia(c).map(u => fetch(u).then(r => (r.ok ? r.text() : '')).catch(() => '')));
    archivos.push({ nombre: `${carpeta}/LICENSE-${c.lib.id}.txt`, datos: `${c.lib.nombre} · ${c.lib.spdx}\n${c.lib.repo}\n\n${licencias.filter(Boolean).join('\n\n----------\n\n') || 'Consulta la licencia en el repositorio de origen.'}` });
    archivos.push({ nombre: `${carpeta}/LEEME.txt`, datos: [
      `${c.n} · ${c.lib.nombre}`, `Autor: ${N.autorDe(c)}`, `Licencia: ${c.lib.spdx} (${N.CLASES[N.claseDe(c)].txt})`, N.CLASES[N.claseDe(c)].desc,
      c.lib.nota, `Origen: ${c.o || N.urlOrigen(c)}`, `Código original: ${N.urlOrigen(c)}`, '',
      'Este componente es de terceros. Conserva los avisos de copyright y la licencia incluida al reutilizarlo.',
      'Descargado desde la librería privada de AurevixWeb.'
    ].filter(x => x !== '').join('\n') });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(crearZip(archivos));
    a.download = `${carpeta}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Descargado con su licencia');
  } catch (e) { toast('No se ha podido descargar', 'err'); }
  btn.disabled = false;
}

function sincronizarFav(id) {
  $$('.lb-card').forEach(card => {
    const c = E.lista[+card.dataset.n];
    if (c?.i === id) { const b = $('.lb-fav', card); b.setAttribute('aria-pressed', favs.has(id)); b.setAttribute('aria-label', favs.has(id) ? 'Quitar de favoritos' : 'Añadir a favoritos'); }
  });
  pintarCategorias();
}

/* ==========================================================
   EVENTOS
   ========================================================== */
let tBusca;
function eventos() {
  $('#lbQ').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => { E.q = e.target.value.trim(); actualizar(); }, 140); });
  $('#lbBusca').addEventListener('submit', e => { e.preventDefault(); clearTimeout(tBusca); E.q = $('#lbQ').value.trim(); actualizar(); $('#lbQ').blur(); });
  addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !dlg?.open) { e.preventDefault(); $('#lbQ').focus(); $('#lbQ').select(); }
    if (e.key === 'Escape') cerrarPops();
  });
  $('#lbCats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    E.cat = b.dataset.cat;
    if (E.cat !== 'iconos' && E.cat !== 'favoritos') E.libs = new Set([...E.libs].filter(id => E.indice.componentes.some(c => c.lib.id === id)));
    actualizar();
  });
  document.addEventListener('click', e => {
    const pop = e.target.closest('[data-pop]');
    if (pop) {
      const c = $(`[data-pop-c="${pop.dataset.pop}"]`);
      const abrir = !c.classList.contains('open');
      cerrarPops();
      if (abrir) { c.classList.add('open'); pop.setAttribute('aria-expanded', 'true'); $('input[type=search]', c)?.focus({ preventScroll: true }); }
      return;
    }
    if (e.target.closest('[data-cerrar-pop]')) { cerrarPops(); return; }
    const lim = e.target.closest('[data-limpiar]');
    if (lim) { E[{ lib: 'libs', fmt: 'fmts', lic: 'lics' }[lim.dataset.limpiar]] = new Set(); cerrarPops(); actualizar(); return; }
    if (!e.target.closest('.lb-pop')) cerrarPops();
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const k = chip.dataset.chip, v = chip.dataset.v;
      if (k === 'todo') { E.q = ''; $('#lbQ').value = ''; E.libs.clear(); E.fmts.clear(); E.lics.clear(); E.uso = false; }
      else if (k === 'q') { E.q = ''; $('#lbQ').value = ''; }
      else if (k === 'uso') E.uso = false;
      else E[{ lib: 'libs', fmt: 'fmts', lic: 'lics' }[k]].delete(v);
      actualizar();
      return;
    }
    const ab = e.target.closest('[data-abrir]');
    if (ab) { abrirPanel(+ab.dataset.abrir); return; }
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const c = E.lista[+fav.dataset.fav];
      const si = alternarFav(c.i);
      fav.setAttribute('aria-pressed', si);
      fav.setAttribute('aria-label', si ? 'Quitar de favoritos' : 'Añadir a favoritos');
      if (!movimientoReducido()) { fav.classList.remove('late'); void fav.offsetWidth; fav.classList.add('late'); }
      pintarCategorias();
      if (E.cat === 'favoritos' && !si) actualizar();
      return;
    }
    // En el móvil no hay «hover»: al tocar una tarjeta se resalta
    const card = e.target.closest('.lb-card');
    $$('.lb-card.toque').forEach(x => x !== card && x.classList.remove('toque'));
    card?.classList.add('toque');
  });
  document.addEventListener('change', e => {
    const f = e.target.closest('[data-f]');
    if (f) {
      const set = E[{ lib: 'libs', fmt: 'fmts', lic: 'lics' }[f.dataset.f]];
      f.checked ? set.add(f.value) : set.delete(f.value);
      const abierto = f.closest('.lb-pop')?.dataset.popC;
      actualizar().then(() => { if (abierto) { const c = $(`[data-pop-c="${abierto}"]`); c?.classList.add('open'); $(`[data-pop="${abierto}"]`)?.setAttribute('aria-expanded', 'true'); } });
      return;
    }
    if (e.target.id === 'lbUso') { E.uso = e.target.checked; actualizar(); }
    if (e.target.id === 'lbOrden') { E.orden = e.target.value; actualizar(); }
  });
  document.addEventListener('input', e => {
    if (!e.target.matches('[data-buscalib]')) return;
    const q = N.normalizar(e.target.value);
    $$('[data-lib-n]', e.target.closest('.lb-pop')).forEach(l => { l.hidden = q && !l.dataset.libN.includes(q); });
  });
  addEventListener('hashchange', () => {
    const antes = E.id;
    leerHash();
    $('#lbQ').value = E.q;
    actualizar({ hash: false }).then(() => abrirDesdeHash(antes));
  });
  $('#lbTema').addEventListener('click', () => {
    const claro = document.documentElement.dataset.tema === 'claro';
    guardarApariencia({ tema: claro ? 'oscuro' : 'claro' });
    pintarTema();
  });
  // La barra superior es fija en el móvil: se reserva su alto
  const top = $('#lbTop');
  const medir = () => document.body.style.setProperty('--lb-top', `${top.offsetHeight}px`);
  new ResizeObserver(medir).observe(top);
  medir();
}
function cerrarPops() {
  $$('.lb-pop.open').forEach(p => p.classList.remove('open'));
  $$('[data-pop][aria-expanded=true]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}
function pintarTema() {
  const claro = document.documentElement.dataset.tema === 'claro';
  $('#lbTema').innerHTML = icono(claro ? 'moon' : 'sun');
  $('#lbTema').setAttribute('aria-label', claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
}
function abrirDesdeHash(antes = '') {
  if (!E.id) { if (dlg?.open && antes) dlg.close(); return; }
  if (dlg?.open && E.lista[actual]?.i === E.id) return;
  let i = E.lista.findIndex(c => c.i === E.id);
  if (i < 0) {
    const c = E.indice.porId.get(E.id) || E.iconos?.find(x => x.i === E.id);
    if (!c) return;
    E.lista = [c, ...E.lista]; i = 0; reiniciarGrid();
  }
  irA(i);
}

/* ---------- Pie (el mismo de la web, con rutas desde /library/) ---------- */
function pintarPie() {
  const f = $('#footer');
  f.innerHTML = `
    <div class="footer-brand bg-bands"><div class="wrap">
      <div class="brand-card in-view" tabindex="0" aria-label="AurevixWeb"><div class="border"></div><div class="content"><div class="logo"><div class="logo1"><img src="../icons/logo-a.png" alt=""></div><div class="logo2"><img src="../icons/nombre.png" alt="AurevixWeb"></div></div><span class="logo-bottom-text">Webs profesionales</span></div><span class="bottom-text">Diseño web</span></div>
    </div></div>
    <div class="wrap footer-inner">
      <div class="footer-links">
        <a href="../#webs">Precios</a><a href="../#disenos">Diseños</a><a href="./">Librería</a>
        <a href="../trabaja-con-nosotros">Trabaja con nosotros</a><a href="../#contacto">Contacto</a>
        <a href="../biblioteca-ui/LICENSE-TERCEROS.md">Licencias de terceros</a><a href="../terminos-y-privacidad">Términos y privacidad</a>
      </div>
      <p class="copy">© ${new Date().getFullYear()} AurevixWeb. El diseño y el código de esta página son de AurevixWeb.<small>Los componentes de la librería son de sus autores y se rigen por la licencia original de cada biblioteca, que se muestra en cada uno. Colección privada de consulta: no se indexa en buscadores.</small></p>
    </div>`;
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { threshold: .6 });
  $$('.brand-card.in-view', f).forEach(c => io.observe(c));
}

/* ==========================================================
   ARRANQUE
   ========================================================== */
async function cargarIconos() {
  if (E.cargandoIconos) return;
  E.cargandoIconos = true;
  $('#lbGrid').innerHTML = esqueletos(12);
  try { E.iconos = await N.cargarIconos(E.indice); }
  catch (e) { errorGrid(e, cargarIconos); E.cargandoIconos = false; return; }
  E.cargandoIconos = false;
  actualizar();
}
function errorGrid(e, reintentar) {
  console.error(e);
  $('#lbGrid').setAttribute('aria-busy', 'false');
  $('#lbGrid').innerHTML = `<div class="lb-estado" role="alert">${icono('alert')}<b>No se ha podido cargar la librería</b><p>${esc(e.message || 'Algo ha fallado.')}</p><button type="button" class="btn btn-sm btn-primary" id="lbReintentar">${icono('refresh')}<span>Reintentar</span></button></div>`;
  $('#lbReintentar').addEventListener('click', reintentar, { once: true });
}

async function cargar() {
  $('#lbGrid').innerHTML = esqueletos(12);
  $('#lbGrid').setAttribute('aria-busy', 'true');
  try { E.indice = await N.cargarIndice(); }
  catch (e) { return errorGrid(e, cargar); }
  await actualizar({ hash: false });
  abrirDesdeHash();
}

/* Saber si quien mira es del equipo (para el filtro «Usable en webs de clientes» por defecto) */
async function sesion() {
  try {
    const store = await import('../js/store.js');
    await Promise.race([store.iniciar(), new Promise((_, no) => setTimeout(() => no(new Error('lento')), 12000))]);
    const u = store.usuarioActual();
    E.usuario = u;
    const eq = !!u && (u.role === 'owner' || u.role === 'worker');
    if (eq !== E.equipo) { E.equipo = eq; if (E.indice) actualizar({ hash: false }); }
    store.alCambiarUsuario?.(nu => { const x = !!nu && (nu.role === 'owner' || nu.role === 'worker'); if (x !== E.equipo) { E.equipo = x; if (E.indice) actualizar({ hash: false }); } });
  } catch (e) { console.warn('Sin sesión en la librería:', e?.message || e); }
}

leerHash();
$('#lbQ').value = E.q;
pintarTema();
pintarPie();
iniciarObservadores();
eventos();
cargar();
sesion();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {});
