/* ==========================================================
   Piezas comunes: cabecera, pie, login, componentes, avisos
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { iniciarEfectos } from './efectos.js';
import { icono, pintarIconos } from './iconos.js';
import { aplicarCache, cargarAjustesWeb } from './sitio.js';
import { iniciarCookies } from './cookies.js';
import { aplicarApariencia, guardarApariencia } from './apariencia.js';
import { campanaHTML, iniciarAvisos } from './avisos.js';
import { iniciarDesplegables } from './desplegable.js';

// Direcciones limpias: si alguien entra con «.html» (enlaces antiguos), la barra muestra la dirección bonita
try {
  if (/^https?:$/.test(location.protocol) && /\.html$/.test(location.pathname) && !location.pathname.includes('/library/'))
    history.replaceState(null, '', (location.pathname.replace(/(\/index)?\.html$/, '') || '/') + location.search + location.hash);
} catch {}
export { icono, pintarIconos };

/* ---------- Utilidades ---------- */
export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF_0 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const NF_2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DF = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
export const euros = n => { const r = Math.round(n * 100) / 100; return (n % 1 ? NF_2 : NF_0).format(r) + ' €'; };
export const fecha = t => DF.format(new Date(t));
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
/** Enlace para escribir un correo (único canal de contacto) */
export const mailLink = (asunto = '', cuerpo = '', a = CONFIG.email, cco = '') =>
  `mailto:${a}?subject=${encodeURIComponent(asunto)}${cco ? `&bcc=${encodeURIComponent(cco)}` : ''}${cuerpo ? `&body=${encodeURIComponent(cuerpo)}` : ''}`;
export const fechaCorta = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export const tamano = b => (b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
/** Descarga un texto como archivo */
export function descargar(nombre, contenido, tipo = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo }));
  a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
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
export const METODOS = { bizum: 'Bizum', transferencia: 'Transferencia' };
export const ROLES = { owner: 'Propietario', worker: 'Trabajador', client: 'Cliente' };
/* Tareas de cada web: las marca el equipo y el cliente ve el progreso */
export const TAREAS = [['diseno', 'Diseño'], ['contenido', 'Contenido'], ['desarrollo', 'Desarrollo'], ['revision', 'Revisión'], ['publicacion', 'Publicación']];
export const progreso = p => {
  if (p.estado === 'entregado') return 100;
  const t = p.tareas || {};
  return Math.round(TAREAS.filter(([k]) => t[k]).length / TAREAS.length * 100);
};

/* ---------- Iconos ---------- */

export const SVG_GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const SVG_GITHUB = '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 .4C7.2.4 0 7.6 0 16.4c0 7.1 4.6 13.1 10.9 15.2.8.2 1.1-.3 1.1-.8v-2.7c-4.5 1-5.4-2.2-5.4-2.2-.7-1.8-1.8-2.3-1.8-2.3-1.4-1 .1-1 .1-1 1.6.1 2.4 1.6 2.4 1.6 1.4 2.4 3.7 1.7 4.7 1.3.1-1 .6-1.7 1-2.1-3.6-.4-7.3-1.8-7.3-7.9 0-1.8.6-3.2 1.6-4.3-.2-.4-.7-2 .1-4.2 0 0 1.3-.4 4.4 1.6a15 15 0 0 1 8 0c3-2.1 4.4-1.6 4.4-1.6.9 2.2.3 3.8.2 4.2 1 1.1 1.6 2.5 1.6 4.3 0 6.1-3.7 7.5-7.3 7.9.6.5 1.1 1.5 1.1 3v4.4c0 .4.3.9 1.1.8C27.4 29.5 32 23.5 32 16.4 32 7.6 24.8.4 16 .4z"/></svg>';


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
export const cargandoHTML = (texto = 'Cargando…') => `<div class="loading-box">${spinner()}<span>${esc(texto)}</span><small class="lb-lento">Está tardando un poco más de lo normal…</small></div>`;
/** Línea de datos separados por «·» que nunca deja un punto suelto al final o al principio de una línea */
export const metaHTML = partes => `<span class="meta"><span class="meta-in">${partes.filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}</span></span>`;
/** Aviso de error con botón «Reintentar» (el botón lleva data-reintentar) */
export const errorCargaHTML = (msg, titulo = 'No se ha podido cargar') =>
  `<div class="empty carga-error" role="alert"><div class="em">${icono('alert')}</div><b>${esc(titulo)}</b><p>${esc(msg || 'Algo ha fallado.')}</p><button type="button" class="btn btn-sm btn-primary" data-reintentar>${icono('refresh')}<span>Reintentar</span></button></div>`;
/** Pinta el error en una caja y llama a «volver» al pulsar Reintentar */
export function errorCarga(caja, e, volver, titulo) {
  console.error(e);
  caja.innerHTML = errorCargaHTML(e?.message, titulo);
  caja.querySelector('[data-reintentar]')?.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); volver(); }, { once: true });
}

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
export const aceptarTerminos = (id, texto = 'Acepto los <a href="terminos-y-privacidad" target="_blank">términos y condiciones</a> y la <a href="terminos-y-privacidad#privacidad" target="_blank">política de privacidad</a>') =>
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
    // Las letras van agrupadas por palabras: si la etiqueta no cabe, salta de línea entre palabras (nunca se aplasta)
    let i = 0;
    l.innerHTML = t.split(' ').map(w => `<span class="fc-w">${[...w].map(c => `<span style="transition-delay:${Math.round(i++ * paso)}ms">${esc(c)}</span>`).join('')}</span>`).join('<span class="fc-sp"> </span>');
    l.setAttribute('aria-label', t);
    l.dataset.split = '1';
  });
}
/** Quita el estado de error al escribir */
document.addEventListener('input', e => e.target.closest?.('.fc, .field')?.classList.remove('error'));

/** Tarjeta de marca animada */
// «AurevixWeb» con «Web» en verde, como en el logotipo
export const marcaHTML = () => `<img class="wordmark" src="icons/nombre.png" alt="${esc(CONFIG.marca)}" width="190" height="19">`;
export const tarjetaMarca = (cls = '') => `
  <div class="brand-card ${cls}" tabindex="0" aria-label="${esc(CONFIG.marca)}">
    <div class="border"></div>
    <div class="content">
      <div class="logo">
        <div class="logo1"><img src="icons/logo-a.png" alt=""></div>
        <div class="logo2"><img src="icons/nombre.png" alt="${esc(CONFIG.marca)}"></div>
      </div>
      <span class="logo-bottom-text">${esc(CONFIG.eslogan.split(' ').slice(0, 2).join(' '))}</span>
    </div>
    <span class="bottom-text">Diseño web</span>
  </div>`;


/* ---------- Avisos ---------- */
let toastTimer;
export function toast(texto, tipo = '') {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  const ic = icono({ ok: 'check', err: 'alert' }[tipo] || 'bulb');
  t.innerHTML = `<span class="t-ic">${ic}</span><span>${esc(texto)}</span>`;
  t.className = 'toast';
  void t.offsetWidth;
  t.className = `toast show ${tipo}`;
  clearTimeout(toastTimer);
  // Los errores se quedan más tiempo para que dé tiempo a leerlos
  toastTimer = setTimeout(() => t.classList.remove('show'), tipo === 'err' ? 6500 : 3200);
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
  const ir = ancla => (activa === 'inicio' ? ancla : './' + ancla);
  h.className = 'header';
  h.innerHTML = `
    <div class="wrap">
      <a href="./" class="logo"><img class="logo-img" src="icons/logo-a.png" alt="" width="34" height="34"><span data-marca>${marcaHTML()}</span></a>
      <nav class="nav" id="nav" aria-label="Principal">
        <a href="${ir('#webs')}">Webs y precios</a>
        <a href="${ir('#disenos')}">Diseños</a>
        <a href="library/">Librería</a>
        <a href="${ir('#opiniones')}">Opiniones</a>
        <a href="${ir('#contacto')}">Contacto</a>
        <a href="trabaja-con-nosotros" class="${activa === 'trabaja' ? 'act' : ''}">Trabaja con nosotros</a>
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
  // Safari del iPhone: a veces la cabecera se queda pegada unos píxeles más abajo que el borde
  // de la pantalla y la web se ve por detrás de la hora. Se mide ese hueco y se tapa con el color de la cabecera.
  let hueco = 0;
  const medirHueco = () => {
    if (scrollY < 4) return;
    const t = Math.round(h.getBoundingClientRect().top);
    if (t >= 0 && t < 120 && t !== hueco) { hueco = t; document.documentElement.style.setProperty('--hueco', t + 'px'); }
  };
  const onScroll = () => { h.classList.toggle('scrolled', scrollY > 8); medirHueco(); };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { hueco = -1; medirHueco(); });
  store.alCambiarUsuario(pintarSesion);
  document.title = document.title.replace(/AurevixWeb/g, CONFIG.marca);
  $$('[data-marca]').forEach(el => (el.innerHTML = marcaHTML()));
}

export function pintarPie() {
  const f = $('#footer');
  if (!f) return;
  f.className = 'footer';
  f.innerHTML = `
    <div class="footer-brand bg-bands"><div class="wrap">${tarjetaMarca('in-view')}</div></div>
    <div class="wrap footer-inner">
      <div class="footer-links">
        <a href="./#webs">Precios</a>
        <a href="./#disenos">Diseños</a>
        <a href="library/">Librería</a>
        <a href="./#opiniones">Opiniones</a>
        <a href="trabaja-con-nosotros">Trabaja con nosotros</a>
        <a href="./#contacto">Contacto</a>
        <a href="${mailLink('Consulta desde la web')}">${esc(CONFIG.email)}</a>
        <a href="terminos-y-privacidad">Términos y privacidad</a>
        <a href="terminos-y-privacidad#propiedad">Licencia y derechos</a>
        <a href="#" data-cookies>Cookies</a>
        <a href="ajustes">Ajustes</a>
        ${Object.entries(CONFIG.redes || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener" aria-label="${k}">${icono(k === 'linkedin' ? 'briefcase' : k)}</a>`).join('')}
        <button class="link-btn" data-install hidden>${icono('download')} Instalar app</button>
      </div>
      <p class="copy">© ${new Date().getFullYear()} ${esc(CONFIG.marca)}. Todos los derechos reservados.<small>El diseño, los textos, el código, los logotipos y las imágenes de esta web están protegidos por la Ley de Propiedad Intelectual. Queda prohibida su reproducción, distribución o transformación, total o parcial, sin autorización escrita.</small></p>
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
    ${campanaHTML()}
    <div class="user-wrap">
      <button class="user-btn" id="userBtn" aria-haspopup="true" aria-label="Mi cuenta">
        ${avatar(u)}<span class="ub-txt"><b>${esc(u.name.split(' ')[0])}</b><small>${ROLES[u.role]}</small></span>
        <svg class="ub-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="user-menu" role="menu">
        <div class="um-head">${avatar(u, 'lg')}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small><span class="role-tag r-${u.role}">${ROLES[u.role]}</span></div></div>
        ${panel ? `<a href="panel" role="menuitem">${icono('panel')} ${panel}</a>` : ''}
        <a href="./#mis-pedidos" role="menuitem" data-mis-pedidos>${icono("bag")} Mis proyectos</a>
        <a href="./#soporte" role="menuitem" data-soporte>${icono('help')} Ayuda y soporte</a>
        <a href="ajustes" role="menuitem">${icono('gear')} Ajustes</a>
        ${u.role === 'client' ? `<a href="trabaja-con-nosotros" role="menuitem">${icono('briefcase')} Trabaja con nosotros</a>` : ''}
        <button role="menuitem" data-logout>${icono('logout')} Cerrar sesión</button>
      </div>
    </div>`;
  $('#userBtn').addEventListener('click', e => {
    e.stopPropagation();
    const abierto = $('.user-menu').classList.toggle('open');
    $('#userBtn').classList.toggle('open', abierto);
    $('#header').classList.remove('open');
    $('#avMenu')?.classList.remove('open');
  });
  iniciarAvisos();
  // La apariencia elegida viaja con la cuenta entre dispositivos
  if (u.datos?.apariencia) guardarApariencia(u.datos.apariencia);
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-wrap')) $('.user-menu')?.classList.remove('open');
  if (e.target.closest('[data-login]')) pedirLogin();
  if (e.target.closest('[data-logout]')) {
    store.cerrarSesion().then(() => {
      toast('Has cerrado sesión');
      if (location.pathname.endsWith('panel')) location.href = './';
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
      <div class="lg-marca"><img src="icons/logo-a.png" alt="" width="40" height="40">${marcaHTML()}</div>
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
        <b>${icono('flask')} Modo demo</b>
        <p>La web todavía no está conectada a Supabase, así que el acceso es de prueba. Entra con un rol:</p>
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
    if (u && d.open) { cerrar(d); toast(`Sesión iniciada como ${u.name.split(' ')[0]}`, 'ok'); }
  });
  return d;
}

/** Abre el login y devuelve el usuario (o null si lo cierra) */
export function pedirLogin(subtitulo) {
  const d = $('#loginDlg') || crearLogin();
  $('#lgSub').textContent = subtitulo || 'Para guardar tu pedido y seguir cada etapa de tu web.';
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
  if (document.getElementById('splash0')) return; // la bienvenida ya está en el HTML y se controla sola
  let vista = false;
  try { vista = sessionStorage.getItem('tm_intro') === '1'; sessionStorage.setItem('tm_intro', '1'); } catch { vista = true; }
  if (vista || location.hash || location.search || matchMedia('(prefers-reduced-motion: reduce)').matches) { document.documentElement.classList.remove('intro'); return; }
  const s = document.createElement('div');
  s.className = 'splash';
  // La misma tarjeta del pie: marco que se cierra, eslogan y «Diseño web».
  // El logotipo y el nombre salen juntos desde el principio (no se despliega el nombre después).
  s.innerHTML = tarjetaMarca('splash-card');
  document.body.appendChild(s);
  const imgs = [...s.querySelectorAll('img')];
  Promise.race([Promise.all(imgs.map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {}))), new Promise(r => setTimeout(r, 700))])
    .then(() => {
      s.classList.add('listo');
      setTimeout(() => s.querySelector('.brand-card')?.classList.add('on'), 250);
      setTimeout(fuera, 2300);
    });
  const fuera = () => {
    if (s.classList.contains('out')) return;
    document.documentElement.classList.remove('intro');
    s.classList.add('out'); setTimeout(() => s.remove(), 600);
  };
  setTimeout(fuera, 4000); // por si algo falla
  s.addEventListener('click', fuera);
}

/* Las franjas (aviso, modo demo) van DEBAJO de la cabecera: la cabecera es lo único que toca la zona de la hora del iPhone */
function colocarFranja(b) {
  const h = document.querySelector('header.header, #header, .header');
  if (h && h.parentNode) h.after(b); else document.body.prepend(b);
}

/* Franja de anuncio (la activa el propietario en Ajustes) */
function pintarAnuncio() {
  $('.anuncio')?.remove();
  if (!CONFIG.anuncio?.activo || !CONFIG.anuncio.texto) return;
  let cerrado = '';
  try { cerrado = sessionStorage.getItem('tm_anuncio'); } catch { /* nada */ }
  if (cerrado === CONFIG.anuncio.texto) return;
  const b = document.createElement('div');
  b.className = 'anuncio';
  b.innerHTML = `${icono('megaphone')}<span>${esc(CONFIG.anuncio.texto)}</span><button class="anuncio-x" aria-label="Cerrar aviso">${icono('x')}</button>`;
  b.querySelector('button').addEventListener('click', () => { b.remove(); try { sessionStorage.setItem('tm_anuncio', CONFIG.anuncio.texto); } catch { /* nada */ } });
  colocarFranja(b);
}

/* Fondo oscurecido detrás de los menús de la cabecera (avisos, cuenta, navegación) en el móvil */
function iniciarVelo() {
  const velo = document.createElement('div');
  velo.className = 'menu-velo';
  document.body.appendChild(velo);
  const raiz = document.documentElement;
  const revisar = () => raiz.classList.toggle('menu-abierto', !!document.querySelector('.av-menu.open, .user-menu.open, #header.open'));
  new MutationObserver(revisar).observe(document.getElementById('header') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  velo.addEventListener('click', () => {
    document.querySelectorAll('.av-menu.open, .user-menu.open').forEach(m => m.classList.remove('open'));
    document.getElementById('userBtn')?.classList.remove('open');
    const h = document.getElementById('header');
    if (h?.classList.contains('open')) document.getElementById('menuBtn')?.click();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && raiz.classList.contains('menu-abierto')) velo.click(); });
}

let ultimoFallo = 0;
export async function arrancar(pagina) {
  document.documentElement.classList.add('js');
  // Red de seguridad: si algo falla sin control, se avisa (sin repetir el aviso en bucle)
  addEventListener('unhandledrejection', e => {
    const m = e.reason?.message || '';
    console.error('Error sin controlar:', e.reason);
    if (!m || /abort|load failed|import|fetch dynamically/i.test(m) || Date.now() - ultimoFallo < 8000) return;
    ultimoFallo = Date.now();
    toast(m.length < 140 ? m : 'Algo ha fallado. Inténtalo de nuevo.', 'err');
  });
  aplicarApariencia();
  aplicarCache();
  intro();
  pintarCabecera(pagina);
  pintarPie();
  iniciarEfectos();
  iniciarCookies();
  iniciarDesplegables();
  iniciarVelo();
  console.info('%c© AurevixWeb', 'font:700 14px sans-serif;color:#9fd23a', '— Todos los derechos reservados. Prohibida la copia o reutilización del diseño y del código sin autorización.');
  if (store.modoDemo) {
    const b = document.createElement('div');
    b.className = 'demo-banner';
    b.innerHTML = `${icono('flask')} <b>Modo demo</b> · los datos se guardan solo en este dispositivo. <button class="link-btn" data-login>Probar paneles</button>`;
    colocarFranja(b);
  }
  etiquetas();
  pintarIconos();
  // Las tarjetas de marca se animan al verse en pantalla (en móvil no hay "hover")
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { threshold: .6 });
  const vigilarMarcas = () => $$('.brand-card.in-view').forEach(c => io.observe(c));
  vigilarMarcas();

  try { await store.iniciar(); }
  catch (e) { console.error(e); toast('No se pudo conectar con el servidor', 'err'); }
  // Precios, avisos y formas de pago que ha cambiado el propietario (máx. 2,5 s de espera)
  await Promise.race([cargarAjustesWeb(), new Promise(r => setTimeout(r, 2500))]);
  pintarAnuncio();
  pintarPie();
  vigilarMarcas();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const registrar = () => navigator.serviceWorker.register('sw.js').catch(() => {});
    document.readyState === 'complete' ? registrar() : addEventListener('load', registrar);
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
      if (outcome === 'accepted') toast('App instalada en tu pantalla de inicio', 'ok');
    } else if (ios) toast('Pulsa Compartir y luego «Añadir a pantalla de inicio»');
    else toast('Abre el menú del navegador y elige «Instalar app»');
  });
  if (ios) $$('[data-install]').forEach(b => (b.hidden = false));
}
