/* ==========================================================
   Piezas comunes: cabecera, pie, login, componentes, avisos
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { iniciarEfectos } from './efectos.js';

/* ---------- Utilidades ---------- */
export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const euros = n => (Math.round(n * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
export const fecha = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
export const haceCuanto = t => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};
export const iniciales = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
export const waLink = (texto = '', numero = CONFIG.whatsapp) =>
  `https://wa.me/${String(numero).replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
export const refPedido = id => '#' + String(id).slice(-6).toUpperCase();

export const ESTADOS = {
  nuevo: { txt: 'Nuevo', cls: 'p-new' },
  en_curso: { txt: 'En curso', cls: 'p-work' },
  revision: { txt: 'En revisión', cls: 'p-rev' },
  entregado: { txt: 'Entregado', cls: 'p-done' },
  cancelado: { txt: 'Cancelado', cls: 'p-off' }
};
export const PAGOS = {
  pendiente: { txt: 'Sin pagar', cls: 'p-off' },
  verificando: { txt: 'Pago por verificar', cls: 'p-pend' },
  senal: { txt: 'Señal pagada', cls: 'p-work' },
  pagado: { txt: 'Pagado', cls: 'p-done' }
};
export const METODOS = { bizum: 'Bizum', transferencia: 'Transferencia', stripe: 'Tarjeta / online', paypal: 'PayPal' };
export const ROLES = { owner: 'Propietario', worker: 'Trabajador', client: 'Cliente' };
/* Tareas de cada web: las marca el equipo y el cliente ve el progreso */
export const TAREAS = [['diseno', 'Diseño'], ['contenido', 'Contenido'], ['desarrollo', 'Desarrollo'], ['revision', 'Revisión'], ['publicacion', 'Publicación']];
export const progreso = p => {
  if (p.estado === 'entregado') return 100;
  const t = p.tareas || {};
  return Math.round(TAREAS.filter(([k]) => t[k]).length / TAREAS.length * 100);
};

/* ---------- Iconos ---------- */
const ICONOS = {
  landing: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/>',
  portfolio: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  negocio: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
  reservas: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h3"/>',
  tienda: '<path d="M6 6h15l-2 9H8L6 6zM6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
  medida: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  bank: '<path d="M3 10h18L12 4 3 10zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-6a3 3 0 0 0 0 6h6V9z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>'
};
const SVG_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';
export const SVG_GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const SVG_GITHUB = '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 .4C7.2.4 0 7.6 0 16.4c0 7.1 4.6 13.1 10.9 15.2.8.2 1.1-.3 1.1-.8v-2.7c-4.5 1-5.4-2.2-5.4-2.2-.7-1.8-1.8-2.3-1.8-2.3-1.4-1 .1-1 .1-1 1.6.1 2.4 1.6 2.4 1.6 1.4 2.4 3.7 1.7 4.7 1.3.1-1 .6-1.7 1-2.1-3.6-.4-7.3-1.8-7.3-7.9 0-1.8.6-3.2 1.6-4.3-.2-.4-.7-2 .1-4.2 0 0 1.3-.4 4.4 1.6a15 15 0 0 1 8 0c3-2.1 4.4-1.6 4.4-1.6.9 2.2.3 3.8.2 4.2 1 1.1 1.6 2.5 1.6 4.3 0 6.1-3.7 7.5-7.3 7.9.6.5 1.1 1.5 1.1 3v4.4c0 .4.3.9 1.1.8C27.4 29.5 32 23.5 32 16.4 32 7.6 24.8.4 16 .4z"/></svg>';

export const icono = (n, cls = '') =>
  n === 'wa' ? SVG_WA.replace('<svg', `<svg class="${cls}"`)
    : `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;

export const avatar = (u, cls = '') =>
  u.photo
    ? `<img class="avatar ${cls}" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="avatar ${cls}">${esc(iniciales(u.name))}</span>`;

/* ==========================================================
   COMPONENTES (generan el HTML del kit de componentes.css)
   ========================================================== */

/** Cargando de puntos */
export const spinner = (cls = '') =>
  `<div class="dot-spinner ${cls}" role="status" aria-label="Cargando">${'<div class="dot-spinner__dot"></div>'.repeat(8)}</div>`;
export const cargandoHTML = (texto = 'Cargando…') => `<div class="loading-box">${spinner()}<span>${esc(texto)}</span></div>`;

/** Pone un botón en modo "cargando" */
export function ocupado(btn, si) {
  if (!btn) return;
  btn.disabled = si;
  btn.classList.toggle('loading', si);
  btn.querySelector(':scope > .dot-spinner')?.remove();
  if (si) btn.insertAdjacentHTML('beforeend', spinner('sm'));
}

/** Campo con etiqueta animada */
export function campo({ id, name = id, label, type = 'text', required = false, hint = '', value = '', attrs = '' }) {
  const control = type === 'textarea'
    ? `<textarea id="${id}" name="${name}" placeholder=" " ${required ? 'required' : ''} ${attrs}>${esc(value)}</textarea>`
    : `<input id="${id}" name="${name}" type="${type}" placeholder=" " value="${esc(value)}" ${required ? 'required' : ''} ${attrs}>`;
  return `<div class="fc">${control}<label for="${id}">${esc(label)}</label>${hint ? `<small class="fc-hint">${esc(hint)}</small>` : ''}</div>`;
}

/** Desplegable a juego */
export const desplegable = ({ id, name = id, label, opciones, valor = '' }) =>
  `<label class="fc-select"><span>${esc(label)}</span><select id="${id}" name="${name}">${opciones.map(o => `<option ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;

/** Grupo de opciones tipo tecla */
export const opciones = (name, valores, marcado = valores[0], tipo = 'radio') =>
  `<div class="opts">${valores.map(v => `<label class="opt"><input type="${tipo}" name="${name}" value="${esc(v)}" ${(Array.isArray(marcado) ? marcado.includes(v) : v === marcado) ? 'checked' : ''}><span><i>${esc(v)}</i></span></label>`).join('')}</div>`;

/** Interruptor */
export const interruptor = ({ id, name = id, titulo, texto = '', checked = false }) =>
  `<label class="switch-row" for="${id}"><span><b>${esc(titulo)}</b>${texto ? `<small>${esc(texto)}</small>` : ''}</span>
    <span class="switch"><input type="checkbox" id="${id}" name="${name}" ${checked ? 'checked' : ''}><span class="slider"></span></span></label>`;

/** Aceptar términos */
export const aceptarTerminos = (id, texto = 'Acepto los <a href="terminos.html" target="_blank">términos y condiciones</a> y la <a href="terminos.html#privacidad" target="_blank">política de privacidad</a>') =>
  `<label class="gl-checkbox" id="${id}Wrap">
    <input class="gl-checkbox__input" type="checkbox" id="${id}" name="${id}">
    <span class="gl-checkbox__box"><svg class="gl-checkbox__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
    <span class="gl-checkbox__label">${texto}</span>
  </label>`;

/** Comprueba que se aceptaron los términos; si no, sacude la casilla */
export function terminosAceptados(id) {
  const c = document.getElementById(id);
  if (c?.checked) return true;
  const w = document.getElementById(id + 'Wrap');
  w?.classList.remove('shake'); void w?.offsetWidth; w?.classList.add('shake');
  toast('Tienes que aceptar los términos y condiciones', 'err');
  return false;
}

/** Estrellas de solo lectura */
export const estrellas = v => `<span class="stars" style="--v:${Number(v) || 0}" role="img" aria-label="${v} de 5 estrellas"></span>`;

/** Selector de estrellas */
export const selectorEstrellas = (name = 'rate') =>
  `<div class="rating" role="radiogroup" aria-label="Puntuación">${[5, 4, 3, 2, 1].map(n =>
    `<input value="${n}" name="${name}" id="${name}${n}" type="radio"><label for="${name}${n}" title="${n} estrella${n > 1 ? 's' : ''}"></label>`).join('')}</div>`;

/** Separa las letras de las etiquetas animadas */
export function etiquetas(raiz = document) {
  $$('.fc label:not([data-split])', raiz).forEach(l => {
    const t = l.textContent;
    const paso = Math.min(40, 600 / Math.max(t.length, 1));
    l.innerHTML = [...t].map((c, i) => `<span style="transition-delay:${Math.round(i * paso)}ms">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    l.setAttribute('aria-label', t);
    l.dataset.split = '1';
  });
}
/** Quita el estado de error al escribir */
document.addEventListener('input', e => e.target.closest?.('.fc, .field')?.classList.remove('error'));

/** Tarjeta de marca animada */
export const tarjetaMarca = (cls = '') => `
  <div class="brand-card ${cls}" tabindex="0" aria-label="${esc(CONFIG.marca)}">
    <div class="border"></div>
    <div class="content">
      <div class="logo">
        <div class="logo1">${icono('medida')}</div>
        <div class="logo2">${esc(CONFIG.marca)}</div>
        <span class="trail"></span>
      </div>
      <span class="logo-bottom-text">${esc(CONFIG.eslogan.split(' ').slice(0, 2).join(' '))}</span>
    </div>
    <span class="bottom-text">Diseño web</span>
  </div>`;

function prepararMarcas(raiz = document) {
  $$('.brand-card', raiz).forEach(c => {
    const l2 = $('.logo2', c);
    if (l2) c.style.setProperty('--w', Math.min(46 + l2.scrollWidth + 4, c.clientWidth - 60) + 'px');
  });
}

/* ---------- Avisos ---------- */
let toastTimer;
export function toast(texto, tipo = '') {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  const ic = { ok: '✓', err: '!' }[tipo] || 'i';
  t.innerHTML = `<span class="t-ic">${ic}</span><span>${esc(texto)}</span>`;
  t.className = 'toast';
  void t.offsetWidth;
  t.className = `toast show ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

export async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado', 'ok'); }
  catch { toast('No se pudo copiar, mantenlo pulsado para copiarlo'); }
}

/* ---------- Diálogos ---------- */
export function abrir(dlg) {
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('no-scroll');
  etiquetas(dlg);
}
export function cerrar(dlg) { if (dlg?.open) dlg.close(); }
document.addEventListener('close', e => {
  if (e.target.tagName === 'DIALOG' && !$$('dialog[open]').length) document.documentElement.classList.remove('no-scroll');
}, true);
document.addEventListener('click', e => {
  if (e.target.tagName === 'DIALOG' && e.target.dataset.backdrop !== 'no') cerrar(e.target);
  const c = e.target.closest('[data-close]');
  if (c) cerrar(c.closest('dialog'));
  const cp = e.target.closest('[data-copy]');
  if (cp) copiar(cp.dataset.copy);
});

/* ==========================================================
   CABECERA Y PIE
   ========================================================== */
export function pintarCabecera(activa = '') {
  const h = $('#header');
  const ir = ancla => (activa === 'inicio' ? ancla : 'index.html' + ancla);
  h.className = 'header';
  h.innerHTML = `
    <div class="wrap">
      <a href="index.html" class="logo"><span class="logo-mark">${icono('medida')}</span><span data-marca>${esc(CONFIG.marca)}</span></a>
      <nav class="nav" id="nav" aria-label="Principal">
        <a href="${ir('#webs')}">Webs y precios</a>
        <a href="${ir('#disenos')}">Diseños</a>
        <a href="${ir('#opiniones')}">Opiniones</a>
        <a href="trabaja.html" class="${activa === 'trabaja' ? 'act' : ''}">Trabaja con nosotros</a>
      </nav>
      <div class="head-right">
        <div id="authSlot" class="auth-slot"></div>
        <button class="menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </div>`;
  const menuBtn = $('#menuBtn');
  const cerrarMenu = () => { h.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const a = h.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(a));
    $('.user-menu')?.classList.remove('open');
  });
  $$('#nav a').forEach(a => a.addEventListener('click', cerrarMenu));
  const onScroll = () => h.classList.toggle('scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  store.alCambiarUsuario(pintarSesion);
  document.title = document.title.replace(/TuMarca/g, CONFIG.marca);
  $$('[data-marca]').forEach(el => (el.textContent = CONFIG.marca));
}

export function pintarPie() {
  const f = $('#footer');
  if (!f) return;
  f.className = 'footer';
  f.innerHTML = `
    <div class="footer-brand bg-bands"><div class="wrap">${tarjetaMarca('in-view')}</div></div>
    <div class="wrap footer-inner">
      <div class="footer-links">
        <a href="index.html#webs">Precios</a>
        <a href="index.html#disenos">Diseños</a>
        <a href="index.html#opiniones">Opiniones</a>
        <a href="trabaja.html">Trabaja con nosotros</a>
        <a href="terminos.html">Términos y privacidad</a>
        <a href="${waLink('¡Hola! Vengo de vuestra web 🙂')}" target="_blank" rel="noopener">WhatsApp</a>
        <button class="link-btn" data-install hidden>📲 Instalar app</button>
      </div>
      <p>© ${new Date().getFullYear()} ${esc(CONFIG.marca)}</p>
    </div>`;
}

function pintarSesion(u) {
  const slot = $('#authSlot');
  if (!slot) return;
  if (!u) {
    slot.innerHTML = `<button class="btn btn-sm btn-ghost" data-login>${icono('user')}<span>Entrar</span></button>`;
    return;
  }
  const panel = u.role === 'owner' ? 'Panel de propietario' : u.role === 'worker' ? 'Panel de trabajador' : '';
  slot.innerHTML = `
    <div class="user-wrap">
      <button class="user-btn" id="userBtn" aria-haspopup="true" aria-label="Mi cuenta">${avatar(u)}</button>
      <div class="user-menu" role="menu">
        <div class="um-head">${avatar(u, 'lg')}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small><span class="role-tag r-${u.role}">${ROLES[u.role]}</span></div></div>
        ${panel ? `<a href="panel.html" role="menuitem">${icono('panel')} ${panel}</a>` : ''}
        <a href="index.html#mis-pedidos" role="menuitem" data-mis-pedidos>${icono('bag')} Mis pedidos</a>
        <a href="trabaja.html" role="menuitem">${icono('briefcase')} Trabaja con nosotros</a>
        <button role="menuitem" data-logout>${icono('logout')} Cerrar sesión</button>
      </div>
    </div>`;
  $('#userBtn').addEventListener('click', e => {
    e.stopPropagation();
    $('.user-menu').classList.toggle('open');
    $('#header').classList.remove('open');
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-wrap')) $('.user-menu')?.classList.remove('open');
  if (e.target.closest('[data-login]')) pedirLogin();
  if (e.target.closest('[data-logout]')) {
    store.cerrarSesion().then(() => {
      toast('Has cerrado sesión');
      if (location.pathname.endsWith('panel.html')) location.href = 'index.html';
    });
  }
});

/* ==========================================================
   LOGIN  (diseño basado en Uiverse · Yaya12085)
   ========================================================== */
let loginResolver = null;

function crearLogin() {
  const d = document.createElement('dialog');
  d.id = 'loginDlg';
  d.className = 'dlg dlg-sm';
  d.innerHTML = `
    <div class="dlg-box form-container">
      <button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button>
      <span class="logo-mark big">${icono('medida')}</span>
      <p class="title" id="lgTitle">Iniciar sesión</p>
      <p class="subtitle" id="lgSub">Para guardar tu pedido y seguir su estado.</p>
      <form class="form" id="lgForm" novalidate>
        <div id="lgNameWrap" hidden>${campo({ id: 'lgName', label: 'Nombre', attrs: 'autocomplete="name"' })}</div>
        ${campo({ id: 'lgEmail', label: 'Email', type: 'email', required: true, attrs: 'autocomplete="email" inputmode="email"' })}
        ${campo({ id: 'lgPass', label: 'Contraseña', type: 'password', required: true, attrs: 'autocomplete="current-password" minlength="6"' })}
        <div class="forgot"><button type="button" class="link-btn" id="lgForgot">¿Has olvidado la contraseña?</button></div>
        <div id="lgTermsWrap" hidden>${aceptarTerminos('lgTerms')}</div>
        <p class="form-err" id="lgErr" role="alert"></p>
        <button class="btn btn-primary w100 sign" id="lgSubmit" type="submit"><span>Entrar</span></button>
      </form>
      <div class="social-message"><div class="line"></div><p class="message">o entra con</p><div class="line"></div></div>
      <div class="social-icons">
        <button class="social" id="lgGoogle" type="button" aria-label="Entrar con Google">${SVG_GOOGLE}<span>Google</span></button>
        ${CONFIG.loginGithub ? `<button class="social" id="lgGithub" type="button" aria-label="Entrar con GitHub">${SVG_GITHUB}<span>GitHub</span></button>` : ''}
      </div>
      <p class="signup"><span id="lgSwitchTxt">¿No tienes cuenta?</span> <button class="link-btn" id="lgSwitch" type="button">Regístrate</button></p>
      ${store.modoDemo ? `
      <div class="demo-box">
        <b>🧪 Modo demo</b>
        <p>Firebase aún no está conectado, así que el acceso es de prueba. Entra con un rol:</p>
        <div class="demo-btns">
          <button class="btn btn-sm btn-ghost" data-demo="client">Cliente</button>
          <button class="btn btn-sm btn-ghost" data-demo="worker">Trabajador</button>
          <button class="btn btn-sm btn-ghost" data-demo="owner">Dueño</button>
        </div>
      </div>` : ''}
    </div>`;
  document.body.appendChild(d);
  etiquetas(d);

  let registro = false;
  const error = m => ($('#lgErr').textContent = m);
  const setModo = r => {
    registro = r;
    $('#lgNameWrap').hidden = !r;
    $('#lgTermsWrap').hidden = !r;
    $('.forgot', d).hidden = r;
    $('#lgTitle').textContent = r ? 'Crear cuenta' : 'Iniciar sesión';
    $('#lgSubmit span').textContent = r ? 'Crear cuenta' : 'Entrar';
    $('#lgSwitchTxt').textContent = r ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
    $('#lgSwitch').textContent = r ? 'Inicia sesión' : 'Regístrate';
    $('#lgPass').autocomplete = r ? 'new-password' : 'current-password';
    error('');
  };
  $('#lgSwitch').addEventListener('click', () => setModo(!registro));

  const social = fn => async e => {
    const b = e.currentTarget;
    ocupado(b, true); error('');
    try { await fn(); } catch (err) { error(err.message); }
    ocupado(b, false);
  };
  $('#lgGoogle').addEventListener('click', social(store.entrarConGoogle));
  $('#lgGithub')?.addEventListener('click', social(store.entrarConGithub));

  $('#lgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#lgName').value.trim(), email = $('#lgEmail').value.trim(), pass = $('#lgPass').value;
    const marcar = (id, mal) => $('#' + id).closest('.fc').classList.toggle('error', mal);
    if (registro && !nombre) { marcar('lgName', true); return error('Escribe tu nombre'); }
    if (!/^\S+@\S+\.\S+$/.test(email)) { marcar('lgEmail', true); return error('Escribe un email válido'); }
    if (!store.modoDemo && pass.length < 6) { marcar('lgPass', true); return error('La contraseña debe tener al menos 6 caracteres'); }
    if (registro && !terminosAceptados('lgTerms')) return;
    ocupado($('#lgSubmit'), true); error('');
    try {
      if (registro) await store.registrarConEmail(nombre, email, pass);
      else await store.entrarConEmail(email, pass);
    } catch (err) { error(err.message); }
    ocupado($('#lgSubmit'), false);
  });

  $('#lgForgot').addEventListener('click', async () => {
    const email = $('#lgEmail').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return error('Escribe tu email arriba y vuelve a pulsar');
    try { await store.recuperarPass(email); toast('Te hemos enviado un email para cambiar la contraseña'); }
    catch (err) { error(err.message); }
  });

  $$('[data-demo]', d).forEach(b => b.addEventListener('click', () => store.entrarDemo(b.dataset.demo)));

  d.addEventListener('close', () => {
    if (loginResolver) { loginResolver(store.usuarioActual()); loginResolver = null; }
  });
  store.alCambiarUsuario(u => {
    if (u && d.open) { cerrar(d); toast(`¡Hola, ${u.name.split(' ')[0]}!`, 'ok'); }
  });
  return d;
}

/** Abre el login y devuelve el usuario (o null si lo cierra) */
export function pedirLogin(subtitulo) {
  const d = $('#loginDlg') || crearLogin();
  $('#lgSub').textContent = subtitulo || 'Para guardar tu pedido y seguir su estado.';
  $('#lgErr').textContent = '';
  abrir(d);
  return new Promise(r => (loginResolver = r));
}

/** Devuelve el usuario si ya hay sesión; si no, pide login */
export async function conSesion(subtitulo) {
  await store.cuandoListo;
  return store.usuarioActual() || pedirLogin(subtitulo);
}

/* ==========================================================
   ARRANQUE COMÚN
   ========================================================== */
function intro() {
  let vista = false;
  try { vista = sessionStorage.getItem('tm_intro') === '1'; sessionStorage.setItem('tm_intro', '1'); } catch { vista = true; }
  if (vista || location.hash || location.search || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const s = document.createElement('div');
  s.className = 'splash';
  s.innerHTML = tarjetaMarca();
  document.body.appendChild(s);
  prepararMarcas(s);
  requestAnimationFrame(() => setTimeout(() => $('.brand-card', s).classList.add('on'), 80));
  const fuera = () => { s.classList.add('out'); setTimeout(() => s.remove(), 600); };
  setTimeout(fuera, 1350);
  s.addEventListener('click', fuera);
}

export async function arrancar(pagina) {
  document.documentElement.classList.add('js');
  intro();
  pintarCabecera(pagina);
  pintarPie();
  iniciarEfectos({ waLink: waLink('¡Hola! Tengo una duda sobre una web 🙂') });
  if (store.modoDemo) {
    const b = document.createElement('div');
    b.className = 'demo-banner';
    b.innerHTML = `🧪 <b>Modo demo</b> · los datos se guardan solo en este dispositivo. <button class="link-btn" data-login>Probar paneles</button>`;
    document.body.prepend(b);
  }
  etiquetas();
  // Las tarjetas de marca se animan al verse en pantalla (en móvil no hay "hover")
  prepararMarcas();
  addEventListener('resize', () => prepararMarcas());
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { threshold: .6 });
  $$('.brand-card.in-view').forEach(c => io.observe(c));

  try { await store.iniciar(); }
  catch (e) { console.error(e); toast('No se pudo conectar con el servidor', 'err'); }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  instalarPWA();
}

/* ---------- Instalar como app ---------- */
function instalarPWA() {
  let ev = null;
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    ev = e;
    $$('[data-install]').forEach(b => (b.hidden = false));
  });
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-install]')) return;
    if (ev) {
      ev.prompt();
      const { outcome } = await ev.userChoice;
      ev = null;
      if (outcome === 'accepted') toast('¡Instalada! 🎉');
    } else if (ios) toast('Pulsa Compartir ⬆︎ y «Añadir a pantalla de inicio»');
    else toast('Abre el menú del navegador y elige «Instalar app»');
  });
  if (ios) $$('[data-install]').forEach(b => (b.hidden = false));
}
