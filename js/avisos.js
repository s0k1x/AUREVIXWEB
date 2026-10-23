/* ==========================================================
   CAMPANA DE AVISOS
   Avisos de nuevas etapas, pagos, mensajes y respuestas de
   soporte. En Supabase llegan al momento (tiempo real) y, si lo
   activas en Ajustes, también como notificación del navegador.
   ========================================================== */
import * as store from './store.js';
import { icono } from './iconos.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hace = t => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};
const ICONOS = { pedido: 'bag', etapa: 'chart', pago: 'euro', mensaje: 'message', revision: 'eye', cliente: 'user', soporte: 'mail', info: 'bulb' };

let lista = [];
let dejar = () => {};

/** Dónde lleva cada aviso */
export function enlaceAviso(a, u = store.usuarioActual()) {
  const equipo = u && u.role !== 'client';
  if (a.tipo === 'soporte') return equipo ? 'panel.html#soporte' : 'index.html#soporte';
  if (a.pedido) return equipo ? `panel.html#pedido-${a.pedido}` : `index.html#proyecto-${a.pedido}`;
  return equipo ? 'panel.html' : 'index.html#mis-pedidos';
}

function pintarLista() {
  const box = document.getElementById('avList');
  if (!box) return;
  box.innerHTML = lista.length
    ? lista.map(a => `<a class="av ${a.leido ? '' : 'nuevo'}" href="${enlaceAviso(a)}"><span class="av-ic">${icono(ICONOS[a.tipo] || 'bulb')}</span><span class="av-tx"><b>${esc(a.texto)}</b><small>${hace(a.t)}</small></span></a>`).join('')
    : `<div class="av-vacio">${icono('inbox')}<b>No tienes avisos</b><small>Aquí verás los cambios de tus proyectos, pagos y mensajes.</small></div>`;
  const n = lista.filter(a => !a.leido).length;
  const badge = document.getElementById('avBadge');
  if (badge) { badge.textContent = n > 9 ? '9+' : n; badge.hidden = !n; }
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch { /* sin soporte */ }
}

export function campanaHTML() {
  return `<div class="av-wrap">
    <button class="icon-btn av-btn" id="avBtn" aria-label="Avisos" aria-haspopup="true">${icono('bell')}<i class="av-badge" id="avBadge" hidden></i></button>
    <div class="av-menu" id="avMenu" role="menu">
      <div class="av-h"><b>Avisos</b><button class="link-btn" id="avLimpiar" type="button">Borrar todo</button></div>
      <div class="av-list" id="avList"></div>
      <a class="av-pie" href="ajustes.html#notificaciones">${icono('tool')} Ajustes de avisos</a>
    </div>
  </div>`;
}

function notificarNavegador(a) {
  const u = store.usuarioActual();
  if (!u?.datos?.notif?.navegador || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (u.datos.notif[a.tipo] === false) return;
  try {
    const n = new Notification('AurevixWeb', { body: a.texto, icon: 'icons/icon-192.png', tag: a.id });
    n.onclick = () => { focus(); location.href = enlaceAviso(a); };
  } catch { /* algunos móviles solo permiten avisos desde el service worker */ }
}

/** Monta la campana (se llama al pintar la sesión) */
export async function iniciarAvisos() {
  dejar();
  const btn = document.getElementById('avBtn');
  if (!btn) return;
  const menu = document.getElementById('avMenu');
  btn.addEventListener('click', async e => {
    e.stopPropagation();
    const abierto = menu.classList.toggle('open');
    document.querySelector('.user-menu')?.classList.remove('open');
    if (abierto && lista.some(a => !a.leido)) {
      try { await store.marcarAvisosLeidos(); } catch { /* sin conexión */ }
      setTimeout(() => { lista = lista.map(a => ({ ...a, leido: true })); pintarLista(); }, 1500);
    }
  });
  document.getElementById('avLimpiar').addEventListener('click', async e => {
    e.stopPropagation();
    try { await store.borrarAvisos(); lista = []; pintarLista(); } catch { /* sin conexión */ }
  });
  try { lista = await store.misAvisos(); } catch { lista = []; }
  pintarLista();
  dejar = store.escucharAvisos(a => {
    lista = [a, ...lista.filter(x => x.id !== a.id)].slice(0, 50);
    pintarLista();
    btn.classList.remove('ring'); void btn.offsetWidth; btn.classList.add('ring');
    notificarNavegador(a);
    document.dispatchEvent(new CustomEvent('aviso', { detail: a }));
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.av-wrap')) document.getElementById('avMenu')?.classList.remove('open');
});
