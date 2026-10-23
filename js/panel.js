/* ==========================================================
   Panel de propietario y de trabajadores
   ========================================================== */
import { CONFIG, PLANES } from '../config.js';
import { plantillaPorId, activarPlantilla } from './plantillas.js';
import { ETAPAS, etapaDe, barraEtapas, estadoParaEtapa, entregasCliente, urlVistaPrevia, fechaEntrega, diasRestantes, plazoTexto, plazoClase, conHistorial, lineaTiempo, lineaTiempoHTML } from './proyecto.js';
import { contar } from './efectos.js';
import * as store from './store.js';
import {
  $, $$, esc, euros, fecha, fechaCorta, haceCuanto, icono, avatar, toast, abrir, cerrar, arrancar, pedirLogin, mailLink, refPedido,
  ESTADOS, PAGOS, METODOS, cargandoHTML, ocupado, campo, estrellas, etiquetas, TAREAS, progreso, copiar, descargar
} from './ui.js';
import { montarHilo, montarArchivos, abrirRecibo } from './colabora.js';

await arrancar('panel');

const body = $('#pnBody');
const tabsEl = $('#tabs');
let U = null;
let datos = { pedidos: [], cands: [], usuarios: [], resenas: [], tickets: [] };
let tab = '';
let filtro = { estado: 'todos', q: '', ocultar: false };
const leerVista = () => { try { return localStorage.getItem('tm_vista'); } catch { return null; } };
let vista = leerVista() || (innerWidth >= 1100 ? 'tablero' : 'lista');

const neg = p => p.respuestas?.negocio || p.planNombre;
const trabajadores = () => datos.usuarios.filter(u => u.role === 'worker');
const activo = p => !['entregado', 'cancelado'].includes(p.estado);
const PCT = CONFIG.comision ?? 30;
const comision = p => Math.round((p.total || 0) * PCT) / 100;
const ventasDe = uid => datos.pedidos.filter(p => p.ref === uid && p.estado !== 'cancelado');
const estadoComision = p => p.comisionPagada ? ['Cobrada', 'p-done'] : p.pagoEstado === 'pagado' ? ['Lista para cobrar', 'p-new'] : ['Cliente aún no ha pagado', 'p-pend'];
const porPagar = uid => ventasDe(uid).filter(p => p.pagoEstado === 'pagado' && !p.comisionPagada);
const nombreDe = uid => datos.usuarios.find(u => u.uid === uid)?.name || 'Vendedor';
const vacio = (ic, t, d = '') => `<div class="empty"><div class="em">${icono(ic)}</div><b>${t}</b><p>${d}</p></div>`;

/* ---------- Arranque según el rol ---------- */
store.alCambiarUsuario(async u => {
  U = u;
  if (!u) return sinSesion();
  if (u.role === 'client') return sinPermiso();
  $('#pnRole').textContent = u.role === 'owner' ? 'Panel de propietario' : 'Panel de trabajador';
  $('#pnHello').innerHTML = `Hola, ${esc(u.name.split(' ')[0])} <span class="saludo">${icono('hand')}</span>`;
  $('#pnRefresh').hidden = false;
  const tabs = u.role === 'owner'
    ? [['resumen', 'Resumen', 'chart'], ['pedidos', 'Pedidos', 'bag'], ['clientes', 'Clientes', 'users'], ['soporte', 'Soporte', 'help'], ['agenda', 'Agenda', 'calendar'], ['actividad', 'Actividad', 'history'], ['candidaturas', 'Candidaturas', 'briefcase'], ['resenas', 'Reseñas', 'star'], ['equipo', 'Equipo', 'award']]
    : [['mios', 'Mis encargos', 'laptop'], ['agenda', 'Agenda', 'calendar'], ['disponibles', 'Disponibles', 'inbox'], ['soporte', 'Soporte', 'help'], ['ventas', 'Mis ventas', 'euro'], ['ranking', 'Ranking', 'trophy'], ['historial', 'Historial', 'folder']];
  const pedida = location.hash.slice(1);
  const pedidoHash = pedida.startsWith('pedido-') ? pedida.slice(7) : '';
  tab = tabs.some(t => t[0] === pedida) ? pedida : pedidoHash ? (u.role === 'owner' ? 'pedidos' : 'mios') : tabs[0][0];
  tabsEl.innerHTML = tabs.map(([id, t, ic]) => `<button role="tab" data-tab="${id}">${icono(ic)}<span>${t}</span><i class="badge" data-badge="${id}"></i></button>`).join('');
  $('#pnAjustes').hidden = false;
  await cargar();
  if (pedidoHash) abrirPedido(pedidoHash);
});
// Al pulsar un aviso de la campana estando ya en el panel
addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (h.startsWith('pedido-')) { cargar().then(() => abrirPedido(h.slice(7))); }
  else if ($(`[data-tab="${h}"]`)) irTab(h);
});
document.addEventListener('aviso', () => { if (!dlg.open) cargar(true); });

function cabeceraVacia(rol, hola) {
  $('#pnRole').textContent = rol;
  $('#pnHello').textContent = hola;
  $('#pnRefresh').hidden = true;
  tabsEl.innerHTML = '';
}
function sinSesion() {
  cabeceraVacia('Panel', 'Acceso del equipo');
  body.innerHTML = `<div class="card gate"><div class="em">${icono('lock')}</div><h3>Inicia sesión</h3><p class="muted">Este panel es para el propietario y los trabajadores.</p><button class="btn btn-primary" id="gateLogin"><span>Iniciar sesión</span></button></div>`;
  $('#gateLogin').addEventListener('click', () => pedirLogin('Entra con tu cuenta del equipo.'));
}
function sinPermiso() {
  cabeceraVacia('Panel', 'Zona del equipo');
  body.innerHTML = `<div class="card gate"><div class="em">${icono('briefcase')}</div><h3>Este panel es para el equipo</h3><p class="muted">Tu cuenta es de cliente. Puedes ver tus pedidos o unirte al equipo.</p>
    <div class="gate-btns"><a class="btn btn-primary" href="index.html#mis-pedidos">Mis proyectos</a><a class="btn btn-ghost" href="trabaja.html">Trabaja con nosotros</a></div></div>`;
}

async function cargar(silencioso = false) {
  if (!silencioso) body.innerHTML = cargandoHTML('Cargando datos…');
  try {
    const owner = U.role === 'owner';
    const [pedidos, usuarios, cands, resenas, tickets] = await Promise.all([
      store.todosLosPedidos(),
      store.listarUsuarios().catch(() => []),
      owner ? store.todasLasCandidaturas() : [],
      owner ? store.todasLasResenas() : [],
      store.todosLosTickets().catch(() => [])
    ]);
    datos = { pedidos, usuarios, cands, resenas, tickets };
    if (silencioso && body.querySelector('input:focus, textarea:focus')) { badges(); return; }
    pintar();
    // Número en el icono de la app instalada (pedidos nuevos + pagos por verificar)
    const pend = owner ? pedidos.filter(p => p.estado === 'nuevo' || p.pagoEstado === 'verificando').length
      : pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length;
    try { pend ? navigator.setAppBadge?.(pend) : navigator.clearAppBadge?.(); } catch {}
  } catch (e) {
    console.error(e);
    body.innerHTML = `<div class="card gate"><div class="em">${icono('alert')}</div><h3>No se pudieron cargar los datos</h3><p class="muted">${esc(e.message)}</p><p class="muted" style="font-size:13px">Si acabas de conectar Supabase, comprueba que has ejecutado el archivo supabase/esquema.sql (LEEME.md).</p></div>`;
  }
}
$('#pnRefresh').addEventListener('click', async e => { const b = e.currentTarget; ocupado(b, true); await cargar(); ocupado(b, false); toast('Actualizado'); });

tabsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  irTab(b.dataset.tab);
});
function irTab(t) { tab = t; history.replaceState(null, '', '#' + tab); pintar(); }

function badges() {
  const n = {
    pedidos: datos.pedidos.filter(p => p.estado === 'nuevo' || p.pagoEstado === 'verificando').length,
    candidaturas: datos.cands.filter(c => c.estado === 'pendiente').length,
    resenas: datos.resenas.filter(r => !r.aprobada).length,
    mios: datos.pedidos.filter(p => p.asignado === U.uid && activo(p)).length,
    soporte: datos.tickets.filter(t => t.estado === 'abierto').length,
    clientes: 0,
    agenda: datos.pedidos.filter(p => (U.role === 'owner' || p.asignado === U.uid) && (diasRestantes(p) ?? 1) < 0).length,
    ventas: U.role === 'worker' ? porPagar(U.uid).length : 0,
    equipo: U.role === 'owner' ? trabajadores().filter(w => porPagar(w.uid).length).length : 0,
    disponibles: datos.pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length
  };
  $$('[data-badge]').forEach(b => { const v = n[b.dataset.badge]; b.textContent = v || ''; b.hidden = !v; });
  $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
}

function pintar() {
  badges();
  const vistas = { resumen, pedidos: vistaPedidos, candidaturas, resenas, equipo, ventas, mios, disponibles, historial, clientes, soporte, agenda, actividad, ranking };
  (vistas[tab] || resumen)();
  etiquetas(body);
  contar(body);
}

/* ---------- Fila de pedido ---------- */
function filaPedido(p, { coger = false } = {}) {
  const e = ESTADOS[p.estado] || ESTADOS.nuevo;
  const pl = plantillaPorId(p.plantilla);
  return `
  <article class="row" data-open="${p.id}" tabindex="0" role="button">
    <div class="row-main">
      <div class="row-t"><b>${esc(neg(p))}</b><span class="pill ${e.cls}">${e.txt}</span>
        ${p.pagoEstado === 'verificando' ? '<span class="pill p-pend">Pago por verificar</span>' : ''}
        ${p.urgente ? '<span class="pill p-off">Urgente</span>' : ''}
        ${p.cancelacion && p.estado !== 'cancelado' ? '<span class="pill p-off">Pide cancelar</span>' : ''}
        ${plazoTexto(p) ? `<span class="pill plazo ${plazoClase(p)}">${icono('clock')} ${plazoTexto(p)}</span>` : ''}</div>
      <small>${esc(p.planNombre)} · ${pl ? esc(pl.nombre) : 'A medida'} · ${esc(p.clienteNombre)} · ${haceCuanto(p.createdAt)}</small>
      ${p.estado !== 'cancelado' ? `<div class="row-prog" title="Progreso ${progreso(p)} %"><i style="--w:${progreso(p)}%"></i></div>` : ''}
    </div>
    <div class="row-side">
      <b class="row-price">${euros(p.total)}</b>
      ${coger
        ? `<button class="btn btn-sm btn-primary" data-coger="${p.id}"><span>Coger</span></button>`
        : p.asignadoNombre ? `<span class="who" title="${esc(p.asignadoNombre)}">${avatar({ name: p.asignadoNombre }, 'sm')}</span>` : '<span class="who none" title="Sin asignar">—</span>'}
    </div>
  </article>`;
}

/* ---------- PROPIETARIO: Resumen ---------- */
const cobradoDe = p => (p.pagoEstado === 'pagado' ? p.total || 0 : p.pagoEstado === 'senal' ? (p.total || 0) * CONFIG.senal / 100 : 0);
function ultimosMeses(n = 6) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - k), 1);
    return { y: d.getFullYear(), m: d.getMonth(), txt: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '') };
  });
}
function resumen() {
  const P = datos.pedidos;
  const vivos = P.filter(p => p.estado !== 'cancelado');
  const volumen = vivos.reduce((s, p) => s + (p.total || 0), 0);
  const cobrado = vivos.reduce((s, p) => s + cobradoDe(p), 0);
  const mensual = vivos.filter(p => p.mensual && p.estado === 'entregado').reduce((s, p) => s + p.mensual, 0);
  const porPlan = PLANES.map(pl => ({ n: pl.nombre, v: vivos.filter(p => p.plan === pl.id).length })).filter(x => x.v);
  const max = Math.max(1, ...porPlan.map(x => x.v));
  const pub = datos.resenas.filter(r => r.aprobada);
  const media = pub.length ? pub.reduce((s, r) => s + r.estrellas, 0) / pub.length : 0;
  const tarde = P.filter(p => (diasRestantes(p) ?? 1) < 0);
  const abiertas = datos.tickets.filter(t => t.estado === 'abierto');
  const cancelar = P.filter(p => p.cancelacion && p.estado !== 'cancelado');
  const ticketMedio = vivos.length ? volumen / vivos.length : 0;
  const num = v => (typeof v === 'number' ? `<em class="num" data-count="${v}">${v}</em>` : v);
  const kpi = (t, v, s = '', go = '', cls = '') => `<div class="kpi ${cls}" ${go ? `data-go="${go}" role="button" tabindex="0"` : ''}><small>${t}</small><b>${num(v)}</b>${s ? `<span>${s}</span>` : ''}</div>`;
  // Ingresos de los últimos 6 meses (pedidos creados ese mes)
  const meses = ultimosMeses(6).map(m => {
    const L = vivos.filter(p => { const d = new Date(p.createdAt); return d.getFullYear() === m.y && d.getMonth() === m.m; });
    return { ...m, total: L.reduce((s, p) => s + (p.total || 0), 0), cobrado: L.reduce((s, p) => s + cobradoDe(p), 0), n: L.length };
  });
  const maxMes = Math.max(1, ...meses.map(m => m.total));
  const pendientes = [
    ...P.filter(p => p.pagoEstado === 'verificando').map(p => ({ ic: 'euro', t: `Verificar pago de ${neg(p)}`, id: p.id })),
    ...cancelar.map(p => ({ ic: 'alert', t: `${neg(p)} pide cancelar`, id: p.id })),
    ...tarde.slice(0, 5).map(p => ({ ic: 'clock', t: `${neg(p)}: ${plazoTexto(p).toLowerCase()}`, id: p.id })),
    ...P.filter(p => p.estado === 'nuevo' && !p.asignado).slice(0, 5).map(p => ({ ic: 'inbox', t: `Asignar ${neg(p)}`, id: p.id })),
    ...abiertas.slice(0, 5).map(t => ({ ic: 'help', t: `Responder: ${t.asunto}`, go: 'soporte' }))
  ];

  body.innerHTML = `
    <div class="kpis">
      ${kpi('Pedidos nuevos', P.filter(p => p.estado === 'nuevo').length, 'sin empezar', 'pedidos')}
      ${kpi('Cobrado', euros(cobrado), `de ${euros(volumen)} en pedidos`)}
      ${kpi('Pagos por verificar', P.filter(p => p.pagoEstado === 'verificando').length, 'revisa Bizum / banco', 'pedidos')}
      ${kpi('Retrasados', tarde.length, 'pasada la fecha de entrega', 'agenda', tarde.length ? 'mal' : '')}
      ${kpi('Consultas sin responder', abiertas.length, 'soporte y contacto', 'soporte', abiertas.length ? 'aviso' : '')}
      ${kpi('Ticket medio', euros(ticketMedio), `${vivos.length} pedidos`)}
      ${kpi('Mensualidades', euros(mensual) + '<small>/mes</small>', 'webs publicadas con mantenimiento')}
      ${kpi('Valoración', pub.length ? media.toFixed(1).replace('.', ',') + ' / 5' : '—', `${pub.length} publicadas`, 'resenas')}
      ${kpi('Comisiones por pagar', euros(trabajadores().reduce((s, w) => s + porPagar(w.uid).reduce((a, p) => a + comision(p), 0), 0)), `${trabajadores().length} vendedores`, 'equipo')}
    </div>
    <div class="cols">
      <div class="card">
        <div class="card-h"><h3>Ingresos por mes</h3><span class="muted leyenda"><i class="lg-a"></i>Vendido <i class="lg-b"></i>Cobrado</span></div>
        <div class="meses">${meses.map(m => `<div class="mes" title="${m.n} pedidos · ${euros(m.total)} vendido · ${euros(m.cobrado)} cobrado">
          <div class="mes-barras"><i class="a" style="--h:${(m.total / maxMes) * 100}%"></i><i class="b" style="--h:${(m.cobrado / maxMes) * 100}%"></i></div>
          <b>${m.total ? euros(m.total) : '—'}</b><small>${m.txt}</small></div>`).join('')}</div>
        <div class="card-h" style="margin-top:26px"><h3>Últimos pedidos</h3><button class="link-btn" data-go="pedidos">Ver todos</button></div>
        <div class="rows">${P.slice(0, 5).map(p => filaPedido(p)).join('') || vacio('inbox', 'Aún no hay pedidos')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Para hoy</h3><span class="muted" style="font-size:13px">${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}</span></div>
        ${pendientes.length ? `<div class="hoy">${pendientes.slice(0, 10).map(x => `<button type="button" class="hoy-it" ${x.id ? `data-open="${x.id}"` : `data-go="${x.go}"`}>${icono(x.ic)}<span>${esc(x.t)}</span>${icono('arrow')}</button>`).join('')}</div>` : `<p class="muted" style="font-size:14px">${icono('check')} Todo al día.</p>`}
        <div class="card-h" style="margin-top:26px"><h3>Pedidos por tipo de web</h3></div>
        ${porPlan.length ? `<div class="bars">${porPlan.map(x => `<div class="bar"><span>${esc(x.n)}</span><div><i style="width:${(x.v / max) * 100}%"></i></div><b>${x.v}</b></div>`).join('')}</div>` : vacio('chart', 'Sin datos todavía')}
        <div class="card-h" style="margin-top:26px"><h3>Carga del equipo</h3></div>
        ${trabajadores().length ? `<div class="team-load">${trabajadores().map(w => {
          const n = P.filter(p => p.asignado === w.uid && activo(p)).length;
          return `<div class="tl">${avatar(w, 'sm')}<span>${esc(w.name)}${w.datos?.disponible === false ? ' <em class="no-disp">no disponible</em>' : ''}</span><b>${n} activo${n === 1 ? '' : 's'}</b></div>`;
        }).join('')}</div>` : '<p class="muted" style="font-size:14px">Aún no hay trabajadores. Acepta candidaturas para formar tu equipo.</p>'}
      </div>
    </div>`;
}

/* ---------- PROPIETARIO: Pedidos ---------- */
const FILTROS = { todos: 'Todos', pago: 'Pago por verificar', tarde: 'Retrasados', cancelar: 'Piden cancelar', sinasignar: 'Sin asignar', ...Object.fromEntries(Object.entries(ESTADOS).map(([k, v]) => [k, v.txt])) };
function pasaFiltro(p, k) {
  if (k === 'todos') return true;
  if (k === 'pago') return p.pagoEstado === 'verificando';
  if (k === 'tarde') return (diasRestantes(p) ?? 1) < 0;
  if (k === 'cancelar') return !!p.cancelacion && p.estado !== 'cancelado';
  if (k === 'sinasignar') return !p.asignado && activo(p);
  return p.estado === k;
}
function vistaPedidos() {
  const base = filtro.ocultar ? datos.pedidos.filter(activo) : datos.pedidos;
  const lista = base.filter(p => pasaFiltro(p, filtro.estado) &&
    (!filtro.q || `${neg(p)} ${p.clienteNombre} ${p.clienteEmail} ${p.planNombre} ${p.id}`.toLowerCase().includes(filtro.q.toLowerCase())));
  body.innerHTML = `
    <div class="toolbar">
      <div class="search-group">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon"><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"/></svg>
        <input id="q" class="input" type="search" placeholder="Buscar cliente, negocio o ref…" value="${esc(filtro.q)}" aria-label="Buscar pedidos">
      </div>
      <div class="tool-r">
        <label class="switch-inline"><span class="switch"><input type="checkbox" id="ocultar" ${filtro.ocultar ? 'checked' : ''}><span class="slider"></span></span> Ocultar terminados</label>
        <div class="seg vista-seg" role="group" aria-label="Vista">
          <button type="button" data-vista="lista" class="${vista === 'lista' ? 'on' : ''}" aria-label="Lista"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></button>
          <button type="button" data-vista="tablero" class="${vista === 'tablero' ? 'on' : ''}" aria-label="Tablero"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/></svg></button>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" id="csv" title="Descargar en Excel (CSV)">${icono('copy')}<span>Exportar</span></button>
      </div>
    </div>
    <div class="opts filters">${Object.entries(FILTROS).map(([k, t]) => `<label class="opt"><input type="radio" name="flt" value="${k}" ${filtro.estado === k ? 'checked' : ''}><span><i>${t} · ${base.filter(p => pasaFiltro(p, k)).length}</i></span></label>`).join('')}</div>
    ${vista === 'tablero' ? tablero(lista) : `<div class="rows card flush">${lista.map(p => filaPedido(p)).join('') || vacio('search', 'No hay pedidos aquí')}</div>`}`;
  $$('[data-vista]').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.vista;
    try { localStorage.setItem('tm_vista', vista); } catch {}
    vistaPedidos();
  }));
  $('#csv').addEventListener('click', () => exportarCSV(lista));
  if (vista === 'tablero') arrastrar();
  $$('input[name=flt]').forEach(r => r.addEventListener('change', () => { filtro.estado = r.value; vistaPedidos(); }));
  $('#ocultar').addEventListener('change', e => { filtro.ocultar = e.target.checked; vistaPedidos(); });
  const q = $('#q');
  q.addEventListener('input', () => {
    filtro.q = q.value;
    const pos = q.selectionStart;
    vistaPedidos();
    const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos);
  });
}

/* ---------- Tablero (arrastra las tarjetas entre columnas en el ordenador) ---------- */
const COLS = ['nuevo', 'en_curso', 'revision', 'entregado'];
function tablero(lista) {
  return `<div class="board">${COLS.map(k => {
    const L = lista.filter(p => p.estado === k);
    return `<div class="col" data-col="${k}">
      <div class="col-h"><span class="pill ${ESTADOS[k].cls}">${ESTADOS[k].txt}</span><b>${L.length}</b></div>
      <div class="col-body">${L.map(p => `
        <article class="kcard" draggable="true" data-open="${p.id}" data-id="${p.id}" tabindex="0">
          <div class="kc-t"><b>${esc(neg(p))}</b><span>${euros(p.total)}</span></div>
          <small>${esc(p.planNombre)} · ${esc(p.clienteNombre)}</small>
          <div class="kc-tags">${p.pagoEstado === 'verificando' ? '<span class="pill p-pend">Verificar pago</span>' : ''}${p.urgente ? '<span class="pill p-off">Urgente</span>' : ''}</div>
          <div class="kc-f"><div class="row-prog"><i style="--w:${progreso(p)}%"></i></div>${p.asignadoNombre ? avatar({ name: p.asignadoNombre }, 'sm') : '<span class="who none">—</span>'}</div>
        </article>`).join('') || '<p class="col-empty">Suelta aquí</p>'}</div>
    </div>`;
  }).join('')}</div>`;
}
function arrastrar() {
  let id = null;
  $$('.kcard').forEach(c => {
    c.addEventListener('dragstart', e => { id = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
    c.addEventListener('dragend', () => { c.classList.remove('drag'); $$('.col').forEach(x => x.classList.remove('over')); });
  });
  $$('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('over');
      const p = datos.pedidos.find(x => x.id === id);
      const nuevo = col.dataset.col;
      if (!p || p.estado === nuevo) return;
      if (U.role !== 'owner' && p.asignado !== U.uid) return toast('Solo puedes mover tus encargos', 'err');
      try {
        await store.actualizarPedido(p.id, { estado: nuevo, ...(nuevo === 'entregado' ? { etapa: 'publicada' } : {}) });
        p.estado = nuevo;
        if (nuevo === 'entregado') p.etapa = 'publicada';
        toast(`${neg(p)} → ${ESTADOS[nuevo].txt}`, 'ok');
        pintar();
      } catch (err) { toast(err.message, 'err'); }
    });
  });
}

/* ---------- Exportar a CSV (se abre en Excel o Google Sheets) ---------- */
function exportarCSV(lista) {
  const cab = ['Referencia', 'Fecha', 'Negocio', 'Cliente', 'Email', 'Teléfono', 'Tipo de web', 'Total', 'Descuento', 'Mensual', 'Estado', 'Etapa', 'Pago', 'Asignado', 'Entrega prevista', 'Progreso', 'Vendedor'];
  const filas = lista.map(p => [refPedido(p.id), fecha(p.createdAt), neg(p), p.clienteNombre, p.clienteEmail, p.respuestas?.telefono || '',
    p.planNombre, String(p.total).replace('.', ','), String(p.descuento || 0).replace('.', ','), p.mensual || 0, ESTADOS[p.estado]?.txt, ETAPAS.find(e => e.id === etapaDe(p))?.txt || '', PAGOS[p.pagoEstado || 'pendiente']?.txt, p.asignadoNombre || '', fecha(fechaEntrega(p)), progreso(p) + ' %', p.ref ? nombreDe(p.ref) : '']);
  const csv = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`${lista.length} pedidos exportados`, 'ok');
}

/* Atajo: pulsa «/» para buscar */
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.target.closest('input, textarea, select') && $('#q')) { e.preventDefault(); $('#q').focus(); }
});

/* ---------- PROPIETARIO: Candidaturas ---------- */
function candidaturas() {
  const C = datos.cands;
  body.innerHTML = C.length ? `<div class="cands">${C.map(c => {
    const est = { pendiente: ['Pendiente', 'p-pend'], aceptada: ['Aceptada', 'p-done'], rechazada: ['Rechazada', 'p-off'] }[c.estado] || ['—', ''];
    const link = c.portfolio ? (c.portfolio.startsWith('http') ? c.portfolio : 'https://' + c.portfolio) : '';
    return `
    <article class="card cand">
      <div class="cand-h">${avatar({ name: c.nombre })}<div><b>${esc(c.nombre)}</b><small>${esc(c.puesto)} · ${esc(c.experiencia)}</small></div><span class="pill ${est[1]}">${est[0]}</span></div>
      <p class="cand-msg">“${esc(c.mensaje)}”</p>
      ${c.habilidades?.length ? `<div class="chips-mini">${c.habilidades.map(h => `<span>${esc(h)}</span>`).join('')}</div>` : ''}
      <div class="cand-meta">
        <span>${icono('mail')} ${esc(c.email)}</span><span>${icono('call')} ${esc(c.telefono)}</span>
        ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${icono('link')} ${esc(c.portfolio)}</a>` : ''}
        <span>${icono('calendar')} ${haceCuanto(c.createdAt)}</span>
      </div>
      <div class="cand-btns">
        ${c.estado === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-aceptar="${c.id}">${icono('check')}<span>Aceptar</span></button><button class="btn btn-sm btn-ghost" data-rechazar="${c.id}"><span>Rechazar</span></button>` : ''}
        <a class="btn btn-sm btn-ghost" href="${mailLink(`Tu candidatura en ${CONFIG.marca}`, `Hola ${c.nombre.split(' ')[0]},\n\nTe escribimos de ${CONFIG.marca} por tu candidatura.\n\n`, c.email)}">${icono('mail')}<span>Escribir</span></a>
      </div>
    </article>`;
  }).join('')}</div>` : vacio('inbox', 'Sin candidaturas', 'Cuando alguien rellene «Trabaja con nosotros» aparecerá aquí.');
}

/* ---------- PROPIETARIO: Reseñas ---------- */
function resenas() {
  const R = datos.resenas;
  body.innerHTML = `
    <p class="muted hint">Las reseñas nuevas no se ven en la web hasta que las apruebes.${CONFIG.trustpilot ? ` · <a class="link-btn" href="${esc(CONFIG.trustpilot)}" target="_blank" rel="noopener">Ver Trustpilot ${icono('external')}</a>` : ''}</p>
    ${R.length ? `<div class="cands">${R.map(r => `
      <article class="card cand">
        <div class="cand-h">${avatar({ name: r.nombre })}<div><b>${esc(r.nombre)}</b><small>${esc(r.plan || '')} · ${haceCuanto(r.createdAt)}</small></div>
          <span class="pill ${r.aprobada ? 'p-done' : 'p-pend'}">${r.aprobada ? 'Publicada' : 'Pendiente'}</span></div>
        <div style="margin-top:12px">${estrellas(r.estrellas)}</div>
        <p class="cand-msg">“${esc(r.texto)}”</p>
        <div class="cand-btns">
          ${r.aprobada
            ? `<button class="btn btn-sm btn-ghost" data-ocultar="${r.id}"><span>Ocultar</span></button>`
            : `<button class="btn btn-sm btn-primary" data-aprobar="${r.id}">${icono('check')}<span>Publicar</span></button>`}
          <button class="btn btn-sm btn-danger" data-borrar-r="${r.id}"><span>Borrar</span></button>
        </div>
      </article>`).join('')}</div>` : vacio('star', 'Aún no hay reseñas', 'Los clientes pueden valorar su web cuando se la entregues.')}`;
}

/* ---------- PROPIETARIO: Equipo ---------- */
function equipo() {
  const owners = datos.usuarios.filter(u => u.role === 'owner');
  const ws = trabajadores();
  const activos = uid => datos.pedidos.filter(p => p.asignado === uid && activo(p)).length;
  const hechos = uid => datos.pedidos.filter(p => p.asignado === uid && p.estado === 'entregado').length;
  body.innerHTML = `
    <div class="card">
      <div class="card-h"><h3>Equipo</h3><span class="muted" style="font-size:14px">${ws.length} trabajador${ws.length === 1 ? '' : 'es'}</span></div>
      <div class="team">
        ${owners.map(u => `<div class="tm">${avatar(u)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div><span class="role-tag r-owner">Propietario</span></div>`).join('')}
        ${ws.map(u => {
          const v = ventasDe(u.uid), pp = porPagar(u.uid), deuda = pp.reduce((a, p) => a + comision(p), 0);
          return `<div class="tm">${avatar(u)}<div><b>${esc(u.name)} ${u.datos?.disponible === false ? '<em class="no-disp">no disponible</em>' : '<em class="si-disp">disponible</em>'}</b><small>${esc(u.email)} · ${v.length} venta${v.length === 1 ? '' : 's'} · ${activos(u.uid)} encargos activos · ${hechos(u.uid)} entregados</small></div>
          ${deuda ? `<button class="btn btn-sm btn-primary" data-pagar-com="${u.uid}" title="Marca como pagadas sus comisiones listas"><span>Pagar ${euros(deuda)}</span></button>` : `<span class="role-tag">${euros(v.reduce((a, p) => a + comision(p), 0))} generados</span>`}
          <button class="btn btn-sm btn-ghost" data-cobro="${u.uid}" title="Ver sus datos de cobro">${icono('bank')}<span>Cobro</span></button>
          <a class="icon-btn" href="${mailLink(`${CONFIG.marca}`, '', u.email)}" aria-label="Escribir">${icono('mail')}</a>
          <button class="btn btn-sm btn-danger" data-quitar="${u.uid}"><span>Quitar</span></button></div>`;
        }).join('')}
        ${ws.length ? '' : '<p class="muted" style="padding:14px 0;font-size:14.5px">Aún no hay trabajadores.</p>'}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Añadir trabajador</h3></div>
      <p class="muted" style="font-size:14px">La persona tiene que haber iniciado sesión en la web al menos una vez.</p>
      <form class="add-w" id="addW" novalidate>${campo({ id: 'addEmail', label: 'Email del trabajador', type: 'email', required: true })}<button class="btn btn-primary" type="submit"><span>Añadir</span></button></form>
    </div>`;
  $('#addW').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#addEmail').value.trim().toLowerCase();
    const u = datos.usuarios.find(x => (x.email || '').toLowerCase() === email);
    if (!u) { $('#addEmail').closest('.fc').classList.add('error'); return toast('No hay ninguna cuenta con ese email todavía', 'err'); }
    if (u.role !== 'client') return toast('Esa persona ya está en el equipo');
    await accion(e.submitter, () => store.cambiarRol(u.uid, 'worker'), `${u.name} añadido al equipo`);
  });
}

/* ---------- TRABAJADOR: Mis ventas (enlace propio + comisiones) ---------- */
function ventas() {
  const V = ventasDe(U.uid);
  const enlace = new URL(`index.html?ref=${encodeURIComponent(U.uid)}`, location.href).href;
  const generado = V.reduce((a, p) => a + (p.total || 0), 0);
  const listas = V.filter(p => p.pagoEstado === 'pagado' && !p.comisionPagada).reduce((a, p) => a + comision(p), 0);
  const cobradas = V.filter(p => p.comisionPagada).reduce((a, p) => a + comision(p), 0);
  const pendientes = V.filter(p => p.pagoEstado !== 'pagado').reduce((a, p) => a + comision(p), 0);
  const msg = `¡Hola! Hago páginas web para negocios con ${CONFIG.marca}. Mira los diseños y pide la tuya aquí 👉 ${enlace}`;
  body.innerHTML = `
    <div class="enlace card">
      <div><span class="eyebrow">Tu enlace de ventas</span><p>Compártelo: cada pedido que entre por aquí es tuyo y te llevas el <b>${PCT} %</b>.</p></div>
      <div class="enlace-box"><code>${esc(enlace)}</code>
        <button class="btn btn-sm btn-primary" data-copy="${esc(enlace)}"><span>Copiar</span></button>
        <button class="btn btn-sm btn-ghost" id="compartir">${icono('share')}<span>Compartir</span></button>
        <button class="btn btn-sm btn-ghost" id="verQR">${icono('qr')}<span>Código QR</span></button></div>
    </div>
    <div class="qr-box card" id="qrBox" hidden></div>
    ${objetivoHTML(V)}
    <div class="kpis">
      <div class="kpi"><small>Ventas</small><b><em class="num" data-count="${V.length}">${V.length}</em></b><span>pedidos con tu enlace</span></div>
      <div class="kpi"><small>Has generado</small><b>${euros(generado)}</b><span>en webs vendidas</span></div>
      <div class="kpi"><small>Lista para cobrar</small><b>${euros(listas)}</b><span>el cliente ya ha pagado</span></div>
      <div class="kpi"><small>Pendiente</small><b>${euros(pendientes)}</b><span>esperando el pago del cliente</span></div>
      <div class="kpi"><small>Ya cobrado</small><b>${euros(cobradas)}</b><span>pagado por nosotros</span></div>
      <div class="kpi"><small>Tu comisión</small><b>${PCT} %</b><span>de cada web</span></div>
    </div>
    <div class="card flush rows">${V.map(p => {
      const [txt, cls] = estadoComision(p);
      return `<article class="row" data-open="${p.id}" tabindex="0" role="button">
        <div class="row-main"><div class="row-t"><b>${esc(neg(p))}</b><span class="pill ${cls}">${txt}</span></div>
          <small>${esc(p.planNombre)} · ${euros(p.total)} · ${haceCuanto(p.createdAt)}</small></div>
        <div class="row-side"><b class="row-price com">+${euros(comision(p))}</b></div>
      </article>`;
    }).join('') || vacio('link', 'Aún no tienes ventas', 'Comparte tu enlace en redes o en persona para conseguir la primera.')}</div>
    <div class="card kit">
      <div class="card-h"><h3>Kit de ventas</h3><span class="muted" style="font-size:13px">Textos listos para copiar</span></div>
      <div class="kit-grid">${plantillasVenta(enlace).map(([t, txt]) => `<div class="kit-it"><b>${t}</b><p>${esc(txt)}</p><button class="btn btn-sm btn-ghost" data-copy="${esc(txt)}">${icono('copy')}<span>Copiar</span></button></div>`).join('')}</div>
    </div>`;
  $('#compartir').addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: CONFIG.marca, text: msg, url: enlace }); } catch { /* cancelado */ } }
    else copiar(msg);
  });
  $('#verQR').addEventListener('click', async e => {
    const box = $('#qrBox');
    if (!box.hidden) { box.hidden = true; return; }
    ocupado(e.currentTarget, true);
    try {
      const { default: qrcode } = await import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm');
      const q = qrcode(0, 'M'); q.addData(enlace); q.make();
      const url = q.createDataURL(8, 16);
      box.innerHTML = `<img src="${url}" alt="Código QR de tu enlace" width="220" height="220"><div><b>Tu código QR</b><p class="muted">Imprímelo en tarjetas o enséñalo en el móvil: al escanearlo se abre la web con tu enlace de ventas.</p><a class="btn btn-sm btn-primary" href="${url}" download="qr-${CONFIG.marca.toLowerCase()}.gif">${icono('download')}<span>Descargar</span></a></div>`;
      box.hidden = false;
    } catch { toast('No se ha podido crear el código QR. Comprueba la conexión.', 'err'); }
    ocupado(e.currentTarget, false);
  });
  $('#objForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const v = Math.max(0, Math.round(+$('#objIn').value || 0));
    try { U = await store.guardarPerfil({ datos: { objetivo: v } }); toast('Objetivo guardado', 'ok'); ventas(); }
    catch (err) { toast(err.message, 'err'); }
  });
}

const delMes = (p, d = new Date()) => { const c = new Date(p.createdAt); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear(); };
function objetivoHTML(V) {
  const obj = +(U.datos?.objetivo || 0);
  const mes = V.filter(p => delMes(p));
  const com = mes.reduce((a, p) => a + comision(p), 0);
  const pct = obj ? Math.min(100, Math.round(com / obj * 100)) : 0;
  return `<div class="card objetivo">
    <div class="obj-tx"><span class="eyebrow">Objetivo del mes</span>
      <b>${euros(com)} <small>de ${obj ? euros(obj) : '—'} en comisiones</small></b>
      <div class="barra"><i style="--w:${pct}%"></i></div>
      <small class="muted">${mes.length} venta${mes.length === 1 ? '' : 's'} este mes${obj ? ` · ${pct} % del objetivo` : ''}</small></div>
    <form class="obj-form" id="objForm"><label><span>Mi objetivo (€)</span><input id="objIn" type="number" min="0" step="10" value="${obj || ''}" placeholder="300"></label><button class="btn btn-sm btn-ghost">Guardar</button></form>
  </div>`;
}
const plantillasVenta = enlace => [
  ['Mensaje corto', `Hola, trabajo con ${CONFIG.marca}: hacemos páginas web para negocios a precio cerrado, desde ${euros(Math.min(...PLANES.map(p => p.precio)))}. Mira los diseños y pide la tuya aquí: ${enlace}`],
  ['Para Instagram o TikTok', `¿Tu negocio aún no tiene web? Diseñamos la tuya en 1–4 semanas, adaptada al móvil y a precio cerrado. Elige el diseño y sigue el avance desde tu cuenta 👉 ${enlace}`],
  ['Correo a un negocio', `Hola,

He visto vuestro negocio y creo que una web propia os ayudaría a conseguir más clientes. En ${CONFIG.marca} diseñamos webs profesionales a precio cerrado y con entrega de una semana a un mes.

Podéis ver diseños y precios aquí: ${enlace}

Un saludo.`],
  ['Si te preguntan el precio', `Depende del tipo de web: ${PLANES.slice(0, 4).map(p => `${p.nombre.toLowerCase()} desde ${euros(p.precio)}`).join(', ')}. Se paga el ${CONFIG.senal} % al empezar y el resto cuando la web está lista. Todo aquí: ${enlace}`]
];

/* ---------- TRABAJADOR ---------- */
function mios() {
  const L = datos.pedidos.filter(p => p.asignado === U.uid && activo(p)).sort((a, b) => fechaEntrega(a) - fechaEntrega(b));
  body.innerHTML = `
    <div class="kpis small">
      <div class="kpi"><small>Activos</small><b>${L.length}</b></div>
      <div class="kpi"><small>En revisión</small><b>${L.filter(p => p.estado === 'revision').length}</b></div>
      <div class="kpi"><small>Entregados</small><b>${datos.pedidos.filter(p => p.asignado === U.uid && p.estado === 'entregado').length}</b></div>
    </div>
    <div class="rows card flush">${L.map(p => filaPedido(p)).join('') || vacio('coffee', 'No tienes encargos activos', 'Mira en «Disponibles» para coger uno.')}</div>`;
}
function disponibles() {
  const L = datos.pedidos.filter(p => !p.asignado && p.estado === 'nuevo');
  body.innerHTML = `<p class="muted hint">Pedidos nuevos sin asignar. Cógelo para que te aparezca en «Mis encargos».</p>
    <div class="rows card flush">${L.map(p => filaPedido(p, { coger: true })).join('') || vacio('party', 'No hay pedidos libres', 'Vuelve más tarde.')}</div>`;
}
function historial() {
  const L = datos.pedidos.filter(p => p.asignado === U.uid && !activo(p));
  body.innerHTML = `<div class="rows card flush">${L.map(p => filaPedido(p)).join('') || vacio('folder', 'Aún no has terminado ningún encargo')}</div>`;
}

/* ---------- Clientes ---------- */
let qClientes = '';
function clientes() {
  const mapa = new Map();
  datos.pedidos.forEach(p => {
    const c = mapa.get(p.uid) || { uid: p.uid, nombre: p.clienteNombre, email: p.clienteEmail, tel: '', pedidos: [], total: 0, pagado: 0 };
    c.pedidos.push(p);
    if (p.estado !== 'cancelado') { c.total += p.total || 0; c.pagado += cobradoDe(p); }
    c.tel ||= p.respuestas?.telefono || '';
    mapa.set(p.uid, c);
  });
  const todos = [...mapa.values()].sort((a, b) => b.total - a.total);
  const L = todos.filter(c => !qClientes || `${c.nombre} ${c.email} ${c.pedidos.map(neg).join(' ')}`.toLowerCase().includes(qClientes.toLowerCase()));
  const recurrentes = todos.filter(c => c.pedidos.length > 1).length;
  body.innerHTML = `
    <div class="kpis small">
      <div class="kpi"><small>Clientes</small><b>${todos.length}</b><span>con al menos un pedido</span></div>
      <div class="kpi"><small>Repiten</small><b>${recurrentes}</b><span>más de un proyecto</span></div>
      <div class="kpi"><small>Pendiente de cobro</small><b>${euros(todos.reduce((s, c) => s + c.total - c.pagado, 0))}</b><span>entre todos</span></div>
    </div>
    <div class="toolbar"><div class="search-group">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon"><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"/></svg>
      <input id="qc" class="input" type="search" placeholder="Buscar cliente o negocio…" value="${esc(qClientes)}" aria-label="Buscar clientes"></div>
      <button type="button" class="btn btn-sm btn-ghost" id="csvCli">${icono('download')}<span>Exportar</span></button></div>
    <div class="clis">${L.map(c => `
      <details class="card cli">
        <summary>${avatar({ name: c.nombre })}<div><b>${esc(c.nombre)}</b><small>${esc(c.email)}${c.tel ? ' · ' + esc(c.tel) : ''}</small></div>
          <div class="cli-n"><b>${euros(c.total)}</b><small>${c.pedidos.length} proyecto${c.pedidos.length === 1 ? '' : 's'}${c.total - c.pagado > 0 ? ` · ${euros(c.total - c.pagado)} pendiente` : ''}</small></div></summary>
        <div class="rows">${c.pedidos.map(p => filaPedido(p)).join('')}</div>
        <div class="cli-btns"><a class="btn btn-sm btn-ghost" href="${mailLink(`${CONFIG.marca}`, `Hola ${c.nombre.split(' ')[0]},\n\n`, c.email)}">${icono('mail')}<span>Escribir</span></a>
          <button class="btn btn-sm btn-ghost" data-copy="${esc(c.email)}">${icono('copy')}<span>Copiar correo</span></button></div>
      </details>`).join('') || vacio('users', 'No hay clientes', qClientes ? 'Prueba con otra búsqueda.' : 'Cuando entre el primer pedido aparecerá aquí.')}</div>`;
  const q = $('#qc');
  q.addEventListener('input', () => { qClientes = q.value; const pos = q.selectionStart; clientes(); const n = $('#qc'); n.focus(); n.setSelectionRange(pos, pos); });
  $('#csvCli').addEventListener('click', () => {
    const filas = [['Nombre', 'Email', 'Teléfono', 'Proyectos', 'Total', 'Cobrado'], ...todos.map(c => [c.nombre, c.email, c.tel, c.pedidos.length, String(c.total).replace('.', ','), String(c.pagado).replace('.', ',')])];
    descargar(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + filas.map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    toast(`${todos.length} clientes exportados`, 'ok');
  });
}

/* ---------- Soporte y contacto ---------- */
let fSoporte = 'abierto';
const TIPOS_T = { duda: 'Duda', cambio: 'Cambio en su web', incidencia: 'Incidencia', factura: 'Facturación', presupuesto: 'Presupuesto', espera: 'Lista de espera', trabajo: 'Quiere trabajar', contacto: 'Contacto', otro: 'Otro' };
const EST_T = { abierto: ['Sin responder', 'p-pend'], respondido: ['Respondido', 'p-new'], cerrado: ['Resuelto', 'p-done'] };
function soporte() {
  const T = datos.tickets;
  const L = T.filter(t => fSoporte === 'todos' || t.estado === fSoporte);
  body.innerHTML = `
    <div class="opts filters">${[['abierto', 'Sin responder'], ['respondido', 'Respondidos'], ['cerrado', 'Resueltos'], ['todos', 'Todos']].map(([k, t]) => `<label class="opt"><input type="radio" name="fsop" value="${k}" ${fSoporte === k ? 'checked' : ''}><span><i>${t} · ${k === 'todos' ? T.length : T.filter(x => x.estado === k).length}</i></span></label>`).join('')}</div>
    <div class="tks">${L.map(t => {
      const [txt, cls] = EST_T[t.estado] || EST_T.abierto;
      const p = t.pedido ? datos.pedidos.find(x => x.id === t.pedido) : null;
      return `<article class="card tkc" data-tk="${t.id}">
        <div class="cand-h">${avatar({ name: t.nombre || '?' })}<div><b>${esc(t.asunto)}</b><small>${esc(t.nombre || 'Sin nombre')} · ${esc(t.email || '')} · ${TIPOS_T[t.tipo] || 'Consulta'} · ${haceCuanto(t.createdAt)}</small></div><span class="pill ${cls}">${txt}</span></div>
        ${p ? `<button type="button" class="link-btn tk-ped" data-open="${p.id}">${icono('bag')} ${esc(neg(p))} · ${refPedido(p.id)}</button>` : ''}
        <div class="tk-hilo">
          <div class="tk-m el"><small>${esc(t.nombre || 'Cliente')} · ${fecha(t.createdAt)}</small><p>${esc(t.mensaje)}</p></div>
          ${(t.respuestas || []).map(r => `<div class="tk-m ${r.rol === 'client' ? 'el' : 'yo'}"><small>${esc(r.autor)} · ${haceCuanto(r.t)}</small><p>${esc(r.texto)}</p></div>`).join('')}
        </div>
        ${t.estado !== 'cerrado' ? `<form class="tk-resp" data-resp="${t.id}"><textarea name="texto" rows="2" placeholder="${t.uid ? 'Respuesta (el cliente la verá en su cuenta)…' : 'Nota de respuesta (este contacto no tiene cuenta: contéstale por correo)'}" maxlength="3000"></textarea><button class="btn btn-sm btn-primary">${icono('send')}<span>${t.uid ? 'Responder' : 'Guardar'}</span></button></form>` : ''}
        <div class="cand-btns">
          <a class="btn btn-sm btn-ghost" href="${mailLink(`Re: ${t.asunto}`, `Hola ${(t.nombre || '').split(' ')[0]},\n\n`, t.email)}">${icono('mail')}<span>Responder por correo</span></a>
          ${t.estado !== 'cerrado' ? `<button class="btn btn-sm btn-ghost" data-tk-cerrar="${t.id}">${icono('check')}<span>Marcar resuelto</span></button>` : `<button class="btn btn-sm btn-ghost" data-tk-abrir="${t.id}"><span>Reabrir</span></button>`}
          ${U.role === 'owner' ? `<button class="btn btn-sm btn-danger" data-tk-borrar="${t.id}"><span>Borrar</span></button>` : ''}
        </div>
      </article>`;
    }).join('') || vacio('help', fSoporte === 'abierto' ? 'No hay consultas sin responder' : 'No hay consultas aquí', 'Las consultas del formulario de contacto y de «Ayuda y soporte» aparecen aquí.')}</div>`;
  $$('input[name=fsop]').forEach(r => r.addEventListener('change', () => { fSoporte = r.value; soporte(); }));
  $$('[data-resp]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = f.texto.value.trim();
    if (!texto) return;
    const t = datos.tickets.find(x => x.id === f.dataset.resp);
    await accion(f.querySelector('button'), () => store.responderTicket(t, texto), t.uid ? 'Respuesta enviada. El cliente recibe un aviso.' : 'Respuesta guardada');
  }));
}

/* ---------- Agenda de entregas ---------- */
function agenda() {
  const base = datos.pedidos.filter(p => activo(p) && (U.role === 'owner' || p.asignado === U.uid));
  const L = base.map(p => ({ p, d: diasRestantes(p) })).filter(x => x.d !== null).sort((a, b) => a.d - b.d);
  const grupos = [
    ['Retrasados', L.filter(x => x.d < 0), 'tarde'],
    ['Esta semana', L.filter(x => x.d >= 0 && x.d <= 7), 'pronto'],
    ['Próximas dos semanas', L.filter(x => x.d > 7 && x.d <= 21), ''],
    ['Más adelante', L.filter(x => x.d > 21), '']
  ];
  body.innerHTML = `<p class="muted hint">${icono('calendar')} Fecha prevista de entrega de cada proyecto activo${U.role === 'owner' ? '' : ' que tienes asignado'}. Se calcula con el plazo del plan; puedes cambiarla en la ficha del pedido.</p>
    <div class="agenda">${grupos.map(([t, G, cls]) => `
      <section class="ag-g ${cls}"><h3>${t} <span>${G.length}</span></h3>
        ${G.length ? G.map(({ p, d }) => `<button type="button" class="ag-it" data-open="${p.id}">
          <span class="ag-f"><b>${new Date(fechaEntrega(p)).getDate()}</b><small>${new Date(fechaEntrega(p)).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</small></span>
          <span class="ag-tx"><b>${esc(neg(p))}</b><small>${esc(p.planNombre)} · ${esc(ETAPAS.find(e => e.id === etapaDe(p))?.txt || '')}${p.asignadoNombre ? ' · ' + esc(p.asignadoNombre) : ' · sin asignar'}</small></span>
          <span class="pill plazo ${plazoClase(p)}">${plazoTexto(p)}</span></button>`).join('') : '<p class="ag-vacio">Nada por aquí.</p>'}
      </section>`).join('')}</div>`;
}

/* ---------- Actividad reciente ---------- */
function actividad() {
  const L = [
    ...datos.pedidos.flatMap(p => lineaTiempo(p).map(h => ({ ...h, id: p.id, quien: neg(p) }))),
    ...datos.tickets.map(t => ({ t: t.createdAt, texto: `Consulta: ${t.asunto}`, autor: t.nombre, go: 'soporte' })),
    ...datos.cands.map(c => ({ t: c.createdAt, texto: `Candidatura de ${c.nombre}`, autor: c.puesto, go: 'candidaturas' })),
    ...datos.resenas.map(r => ({ t: r.createdAt, texto: `Reseña de ${r.estrellas} estrellas`, autor: r.nombre, go: 'resenas' }))
  ].filter(x => x.t).sort((a, b) => b.t - a.t).slice(0, 80);
  body.innerHTML = `<div class="card"><ol class="tl-list act">${L.map(h => `<li ${h.id ? `data-open="${h.id}"` : `data-go="${h.go}"`} role="button" tabindex="0"><span class="tl-dot"></span><div><b>${esc(h.texto)}${h.quien ? ` <em>· ${esc(h.quien)}</em>` : ''}</b><small>${haceCuanto(h.t)}${h.autor ? ' · ' + esc(h.autor) : ''}</small></div></li>`).join('') || '<li>Sin actividad todavía.</li>'}</ol></div>`;
}

/* ---------- Ranking de vendedores ---------- */
function ranking() {
  const vendedores = [...trabajadores(), ...datos.usuarios.filter(u => u.role === 'owner')];
  const fila = (u, L) => ({ u, n: L.length, total: L.reduce((a, p) => a + (p.total || 0), 0) });
  const mes = vendedores.map(u => fila(u, ventasDe(u.uid).filter(p => delMes(p)))).sort((a, b) => b.total - a.total || b.n - a.n);
  const siempre = vendedores.map(u => fila(u, ventasDe(u.uid))).sort((a, b) => b.total - a.total || b.n - a.n);
  const tabla = (T, t) => `<div class="card"><div class="card-h"><h3>${t}</h3></div><ol class="rank">${T.filter(x => x.n).map((x, i) => `<li class="${x.u.uid === U.uid ? 'yo' : ''}"><span class="rk-n">${i < 3 ? icono(i === 0 ? 'trophy' : 'award') : i + 1}</span>${avatar(x.u, 'sm')}<span class="rk-t"><b>${esc(x.u.name)}${x.u.uid === U.uid ? ' (tú)' : ''}</b><small>${x.n} venta${x.n === 1 ? '' : 's'}</small></span><b>${euros(x.total)}</b></li>`).join('') || '<li class="rk-vacio">Aún no hay ventas.</li>'}</ol></div>`;
  body.innerHTML = `<div class="cols">${tabla(mes, `Este mes · ${new Date().toLocaleDateString('es-ES', { month: 'long' })}`)}${tabla(siempre, 'Desde el principio')}</div>`;
}

/* ---------- Acciones (un solo manejador para todo el panel) ---------- */
async function accion(btn, fn, ok) {
  ocupado(btn, true);
  try { await fn(); if (ok) toast(ok); await cargar(); }
  catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
}
const coger = id => store.actualizarPedido(id, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' });

body.addEventListener('click', async e => {
  const t = e.target.closest('[data-coger],[data-aceptar],[data-rechazar],[data-quitar],[data-aprobar],[data-ocultar],[data-borrar-r],[data-pagar-com],[data-cobro],[data-tk-cerrar],[data-tk-abrir],[data-tk-borrar]');
  if (t) {
    e.stopPropagation();
    const d = t.dataset;
    if (d.tkCerrar) return accion(t, () => store.actualizarTicket(d.tkCerrar, { estado: 'cerrado', cerrado: Date.now() }), 'Consulta marcada como resuelta');
    if (d.tkAbrir) return accion(t, () => store.actualizarTicket(d.tkAbrir, { estado: 'abierto' }), 'Consulta reabierta');
    if (d.tkBorrar) { if (!confirm('¿Borrar esta consulta?')) return; return accion(t, () => store.borrarTicket(d.tkBorrar), 'Consulta borrada'); }
    if (d.cobro) {
      ocupado(t, true);
      try {
        const c = await store.leerPrivado(d.cobro);
        const u = datos.usuarios.find(x => x.uid === d.cobro);
        alert(`Datos de cobro de ${u?.name || 'vendedor'}\n\nTitular: ${c.cobroTitular || '—'}\nIBAN: ${c.cobroIban || '—'}\nBizum: ${c.cobroBizum || '—'}\nNIF: ${c.nif || '—'}`);
      } catch (err) { toast(err.message, 'err'); }
      return ocupado(t, false);
    }
    if (d.coger) return accion(t, () => coger(d.coger), 'Encargo asignado. Lo tienes en «Mis encargos».');
    if (d.aceptar) {
      const c = datos.cands.find(x => x.id === d.aceptar);
      return accion(t, async () => { await store.cambiarRol(c.uid, 'worker'); await store.actualizarCandidatura(c.id, { estado: 'aceptada' }); }, `${c.nombre.split(' ')[0]} ya forma parte del equipo`);
    }
    if (d.rechazar) return accion(t, () => store.actualizarCandidatura(d.rechazar, { estado: 'rechazada' }), 'Candidatura rechazada');
    if (d.quitar) {
      const u = datos.usuarios.find(x => x.uid === d.quitar);
      if (!confirm(`¿Quitar a ${u.name} del equipo? Ya no podrá entrar al panel.`)) return;
      return accion(t, () => store.cambiarRol(u.uid, 'client'), `${u.name} ya no está en el equipo`);
    }
    if (d.pagarCom) {
      const pp = porPagar(d.pagarCom);
      const total = pp.reduce((a, p) => a + comision(p), 0);
      if (!confirm(`¿Has pagado ${euros(total)} de comisiones a ${nombreDe(d.pagarCom)}? Se marcarán como cobradas.`)) return;
      return accion(t, () => Promise.all(pp.map(p => store.actualizarPedido(p.id, { comisionPagada: Date.now() }))), 'Comisiones marcadas como pagadas');
    }
    if (d.aprobar) return accion(t, () => store.actualizarResena(d.aprobar, { aprobada: true }), 'Reseña publicada en la web');
    if (d.ocultar) return accion(t, () => store.actualizarResena(d.ocultar, { aprobada: false }), 'Reseña ocultada');
    if (d.borrarR) {
      if (!confirm('¿Borrar esta reseña?')) return;
      return accion(t, () => store.borrarResena(d.borrarR), 'Reseña borrada');
    }
  }
  if (e.target.closest('a,button.btn,input,label')) return;
  const g = e.target.closest('[data-go]');
  if (g) return irTab(g.dataset.go);
  const o = e.target.closest('[data-open]');
  if (o) abrirPedido(o.dataset.open);
});
body.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const o = e.target.closest('[data-open]');
  if (o) return abrirPedido(o.dataset.open);
  const g = e.target.closest('[data-go]');
  if (g) irTab(g.dataset.go);
});

/* ==========================================================
   DETALLE DE PEDIDO
   ========================================================== */
const dlg = $('#orderDlg');
const box = $('#orderBox');
let odPest = 'mensajes';
let odDesmontar = () => {};
dlg.addEventListener('close', () => { odDesmontar(); odDesmontar = () => {}; if (location.hash.startsWith('#pedido-')) history.replaceState(null, '', '#' + tab); });
const OD_PEST = [['mensajes', 'Mensajes', 'message'], ['archivos', 'Archivos', 'folder'], ['enviado', 'Del cliente', 'inbox'], ['historial', 'Historial', 'history'], ['notas', 'Notas', 'pen']];
const aFechaInput = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function abrirPedido(id) {
  const p = datos.pedidos.find(x => x.id === id);
  if (!p) return;
  const r = p.respuestas || {};
  const pl = plantillaPorId(p.plantilla);
  const esOwner = U.role === 'owner';
  const puedeEditar = esOwner || p.asignado === U.uid;
  const fila = (k, v) => v ? `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
  const prevURL = urlVistaPrevia({ ...p, urlVista: '' });
  const senal = (p.total || 0) * CONFIG.senal / 100;
  const pago = p.pagoEstado || 'pendiente';
  const et = ETAPAS.find(e => e.id === etapaDe(p));

  box.innerHTML = `
    <div class="od-head">
      <div><small>${refPedido(p.id)} · ${fecha(p.createdAt)} · ${esc(p.planNombre)}</small><h2 id="odTitle">${esc(neg(p))}</h2></div>
      <div class="od-head-r">
        <button class="btn btn-sm btn-ghost" id="odRecibo" title="Resumen imprimible del pedido"><span>Recibo</span>${icono('printer')}</button>
        ${pl ? `<button class="btn btn-sm btn-ghost" id="odExport" title="Descarga el diseño con el nombre y color del cliente"><span>Exportar HTML</span>${icono('download')}</button>` : ''}
        <button class="icon-btn" data-close aria-label="Cerrar">${icono('x')}</button>
      </div>
    </div>
    <div class="od-etapas">
      <div class="od-etapas-h"><span>Etapa del proyecto</span><b>${esc(et.txt)}</b>${puedeEditar ? '<small>Pulsa una etapa para cambiarla. El cliente la ve en «Mis proyectos».</small>' : ''}</div>
      ${barraEtapas(p, { editable: puedeEditar })}
    </div>
    ${p.cancelacion && p.estado !== 'cancelado' ? `<div class="od-alerta">${icono('alert')}<div><b>El cliente pide cancelar el pedido</b><small>${haceCuanto(p.cancelacion.t)}${p.cancelacion.motivo ? ' · «' + esc(p.cancelacion.motivo) + '»' : ''}</small></div>
      ${esOwner ? `<button class="btn btn-sm btn-danger" id="odCancelSi"><span>Cancelar pedido</span></button><button class="btn btn-sm btn-ghost" id="odCancelNo"><span>Descartar</span></button>` : ''}</div>` : ''}
    <div class="od-body od-cols">
      <section class="od-col">
        <h4 class="od-h">Gestión</h4>
        <div class="od-fecha">
          <label><span>Entrega prevista</span><input type="date" id="odFecha" value="${aFechaInput(fechaEntrega(p))}" ${puedeEditar ? '' : 'disabled'}></label>
          ${plazoTexto(p) ? `<span class="pill plazo ${plazoClase(p)}">${icono('clock')} ${plazoTexto(p)}</span>` : ''}
        </div>
        <div class="od-actions">
          <label class="fc-select"><span>Estado</span>
            <select id="odEstado" ${puedeEditar ? '' : 'disabled'}>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${v.txt}</option>`).join('')}</select></label>
          ${esOwner
            ? `<label class="fc-select"><span>Asignado a</span><select id="odAsig"><option value="">Sin asignar</option>${trabajadores().map(w => `<option value="${w.uid}" ${p.asignado === w.uid ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}<option value="${U.uid}" ${p.asignado === U.uid ? 'selected' : ''}>Yo (${esc(U.name)})</option></select></label>`
            : p.asignado ? `<label class="fc-select"><span>Asignado a</span><select disabled><option>${esc(p.asignadoNombre)}</option></select></label>` : `<button class="btn btn-primary" id="odCoger"><span>Coger encargo</span></button>`}
        </div>
        <div class="od-pay ${pago === 'verificando' ? 'alert' : ''}">
          <label class="fc-select"><span>Pago</span>
            <select id="odPago" ${puedeEditar ? '' : 'disabled'}>${Object.entries(PAGOS).map(([k, v]) => `<option value="${k}" ${pago === k ? 'selected' : ''}>${v.txt}</option>`).join('')}</select></label>
          <p>${pago === 'verificando'
            ? `${icono('euro')} El cliente indica que ha pagado ${p.pagoFase === 'resto' ? 'el resto' : 'la señal'} (<b>${euros(p.pagoFase === 'resto' ? p.total - senal : senal)}</b>) por <b>${METODOS[p.pagoMetodo] || p.pagoMetodo}</b> ${p.pagoAviso ? haceCuanto(p.pagoAviso) : ''}. Compruébalo y márcalo como pagado.`
            : p.pagoMetodo ? `Último pago por ${METODOS[p.pagoMetodo] || p.pagoMetodo}.` : `Señal: ${euros(senal)} · Resto: ${euros((p.total || 0) - senal)}`}</p>
        </div>
        <form class="od-urls" id="odUrls" novalidate>
          ${campo({ id: 'odVista', name: 'urlVista', label: 'Enlace de la vista previa para el cliente', type: 'url', value: p.urlVista || '', attrs: puedeEditar ? '' : 'disabled' })}
          ${campo({ id: 'odWeb', name: 'urlWeb', label: 'Dirección de la web publicada', type: 'url', value: p.urlWeb || '', attrs: puedeEditar ? '' : 'disabled' })}
          ${puedeEditar ? `<button class="btn btn-sm btn-ghost" type="submit"><span>Guardar enlaces</span></button>` : ''}
        </form>
        <div class="od-tareas">
          <div class="od-tareas-h"><span>Tareas internas</span><b>${progreso(p)} %</b></div>
          <div class="barra"><i style="--w:${progreso(p)}%"></i></div>
          <div class="tareas">${TAREAS.map(([k, t]) => `
            <label class="tarea ${puedeEditar ? '' : 'off'}"><input type="checkbox" data-tarea="${k}" ${p.tareas?.[k] ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}><span class="ck-mark"></span><span>${t}</span></label>`).join('')}</div>
        </div>
        ${esOwner ? `<button class="btn btn-sm btn-danger" id="odDel"><span>Borrar pedido</span></button>` : ''}
      </section>

      <section class="od-col">
        <h4 class="od-h">Cliente</h4>
        <div class="od-client">
          ${avatar({ name: p.clienteNombre })}
          <div><b>${esc(p.clienteNombre)}</b><small>${esc(p.clienteEmail)}${r.telefono ? ' · ' + esc(r.telefono) : ''}</small></div>
          <div class="od-cbtn">
            <a class="icon-btn" href="${mailLink(`Tu web ${neg(p)} ${refPedido(p.id)}`, `Hola ${p.clienteNombre.split(' ')[0]},\n\n`, p.clienteEmail)}" aria-label="Escribir correo">${icono('mail')}</a>
            <button class="icon-btn" data-copy="${esc(p.clienteEmail)}" aria-label="Copiar correo">${icono('copy')}</button>
          </div>
        </div>
        <h4 class="od-h">Pedido</h4>
        <div class="kvs">
          ${p.ref ? `<div class="kv"><span>Vendido por</span><b>${esc(nombreDe(p.ref))} · ${PCT} % = ${euros(comision(p))} ${p.comisionPagada ? '(pagada)' : ''}</b></div>` : ''}
          ${fila('Tipo de web', p.planNombre)}
          <div class="kv"><span>Diseño</span><b>${pl ? `${esc(pl.nombre)} <a class="link-btn" href="${prevURL}" target="_blank" rel="noopener">ver ${icono('external')}</a>` : 'Desde cero'}</b></div>
          ${fila('Precio base', euros(p.precioBase || 0))}
          ${(p.extras || []).map(x => fila(x.nombre, '+' + euros(x.precio) + (x.mensual ? '/mes' : ''))).join('')}
          ${p.urgente ? fila('Urgente', 'Sí') : ''}
          ${p.descuento ? fila(`Cupón ${p.cupon || ''}`, '−' + euros(p.descuento)) : ''}
          <div class="kv total"><span>Total</span><b>${euros(p.total || 0)}${p.mensual ? ` + ${euros(p.mensual)}/mes` : ''}</b></div>
          ${fila(`Señal (${CONFIG.senal} %)`, euros(senal))}
        </div>
        <h4 class="od-h">Cuestionario</h4>
        <div class="kvs">
          ${fila('Sector', r.sector)}${fila('Objetivo', r.objetivo)}${fila('Web actual', r.webActual)}${fila('Estilo', r.estilo)}
          ${r.color ? `<div class="kv"><span>Color</span><b><i class="dotc" style="background:${esc(r.color)}"></i>${esc(r.color)}</b></div>` : ''}
          ${fila('Logotipo', r.logo)}${fila('Textos y fotos', r.contenido)}${fila('Plazo', r.plazo)}
        </div>
        ${r.comentarios ? `<div class="od-note">${icono('message')} ${esc(r.comentarios)}</div>` : ''}
      </section>

      <section class="od-col od-col-tabs">
        <nav class="mp-tabs od-tabs" role="tablist">${OD_PEST.map(([k, t, ic]) => `<button type="button" role="tab" data-odp="${k}" class="${odPest === k ? 'on' : ''}">${icono(ic)}<span>${t}</span></button>`).join('')}</nav>
        <div class="od-pest" id="odPest">
          <div data-odv="enviado" hidden>${entregasCliente(p)}</div>
          <div data-odv="historial" hidden>${lineaTiempoHTML(p)}</div>
          <div data-odv="notas" hidden>
            <p class="muted" style="font-size:13px;margin:6px 0 10px">Solo las ve el equipo.</p>
            <div class="notes">${(p.notas || []).map(n => `<div class="note"><div><b>${esc(n.autor)}</b><small>${haceCuanto(n.t)}</small></div><p>${esc(n.texto)}</p></div>`).join('') || '<p class="muted" style="font-size:14px">Sin notas todavía.</p>'}</div>
            ${puedeEditar || !p.asignado ? `<form class="note-form" id="odNoteForm" novalidate>${campo({ id: 'odNote', label: 'Nota para el equipo', type: 'textarea' })}<button class="btn btn-sm btn-primary" type="submit"><span>Añadir nota</span></button></form>` : ''}
          </div>
          <div data-odv="mensajes" hidden></div>
          <div data-odv="archivos" hidden></div>
        </div>
      </section>
    </div>`;
  etiquetas(box);
  odDesmontar(); odDesmontar = () => {};
  const verPest = k => {
    odPest = k;
    $$('[data-odp]', box).forEach(b => b.classList.toggle('on', b.dataset.odp === k));
    $$('[data-odv]', box).forEach(v => (v.hidden = v.dataset.odv !== k));
    const v = $(`[data-odv="${k}"]`, box);
    if (k === 'mensajes' && !v.dataset.ok) { v.dataset.ok = 1; odDesmontar = montarHilo(v, p, { equipo: true }); }
    if (k === 'archivos' && !v.dataset.ok) { v.dataset.ok = 1; montarArchivos(v, p, { equipo: true }); }
  };
  $$('[data-odp]', box).forEach(b => b.addEventListener('click', () => verPest(b.dataset.odp)));
  verPest(odPest);
  history.replaceState(null, '', '#pedido-' + p.id);

  const guardar = async (cambios, msg, hito = '') => {
    try {
      if (hito) cambios = conHistorial(p, cambios, hito, U.name);
      await store.actualizarPedido(p.id, cambios);
      Object.assign(p, cambios);
      if (msg) toast(msg);
      pintar();
      const y = $('.od-body', box)?.scrollTop || 0;
      abrirPedido(p.id);
      const b = $('.od-body', box); if (b) b.scrollTop = y;
    } catch (err) { toast(err.message, 'err'); }
  };
  $$('[data-etapa]', box).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.etapa;
    if (id === etapaDe(p)) return;
    const e = ETAPAS.find(x => x.id === id);
    guardar({ etapa: id, estado: estadoParaEtapa(id, p.estado) }, `Etapa: ${e.txt}. El cliente recibe un aviso.`, `Etapa: ${e.txt}`);
  }));
  $$('[data-tarea]', box).forEach(c => c.addEventListener('change', () => {
    const tareas = { ...(p.tareas || {}), [c.dataset.tarea]: c.checked };
    const todas = TAREAS.every(([k]) => tareas[k]);
    guardar({ tareas }, todas ? 'Todas las tareas hechas. Ya puedes pasarla a «Publicada».' : 'Tarea actualizada');
  }));
  $('#odEstado', box)?.addEventListener('change', e => guardar({ estado: e.target.value, ...(e.target.value === 'entregado' ? { etapa: 'publicada' } : {}) }, `Estado: ${ESTADOS[e.target.value].txt}`, `Estado: ${ESTADOS[e.target.value].txt}`));
  $('#odPago', box)?.addEventListener('change', e => guardar({ pagoEstado: e.target.value }, `Pago: ${PAGOS[e.target.value].txt}`, `Pago: ${PAGOS[e.target.value].txt}`));
  $('#odFecha', box)?.addEventListener('change', e => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    guardar({ fechaEntrega: new Date(y, m - 1, d, 18).getTime() }, 'Fecha de entrega actualizada', `Nueva fecha de entrega: ${d}/${m}/${y}`);
  });
  $('#odRecibo', box)?.addEventListener('click', () => abrirRecibo(p, ''));
  $('#odCancelSi', box)?.addEventListener('click', () => {
    if (!confirm('¿Cancelar este pedido? El cliente lo verá como cancelado.')) return;
    guardar({ estado: 'cancelado', cancelacion: { ...p.cancelacion, aceptada: Date.now() } }, 'Pedido cancelado', 'Pedido cancelado a petición del cliente');
  });
  $('#odCancelNo', box)?.addEventListener('click', () => guardar({ cancelacion: null }, 'Solicitud descartada', 'Solicitud de cancelación descartada'));
  $('#odAsig', box)?.addEventListener('change', e => {
    const uid = e.target.value;
    const w = uid === U.uid ? U : datos.usuarios.find(x => x.uid === uid);
    const cambios = { asignado: uid, asignadoNombre: w ? w.name : '' };
    if (uid && p.estado === 'nuevo') cambios.estado = 'en_curso';
    guardar(cambios, uid ? `Asignado a ${w.name}` : 'Sin asignar', uid ? `Asignado a ${w.name}` : 'Sin asignar');
  });
  $('#odUrls', box)?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const limpio = v => { v = String(v || '').trim(); return v && !/^https?:\/\//.test(v) ? 'https://' + v : v; };
    guardar({ urlVista: limpio(f.get('urlVista')), urlWeb: limpio(f.get('urlWeb')) }, 'Enlaces guardados', 'Enlaces actualizados');
  });
  $('#odExport', box)?.addEventListener('click', e => exportarHTML(p, e.currentTarget));
  $('#odCoger', box)?.addEventListener('click', async e => {
    ocupado(e.currentTarget, true);
    await coger(p.id);
    Object.assign(p, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' });
    toast('Encargo asignado a ti');
    pintar(); abrirPedido(p.id);
  });
  $('#odNoteForm', box)?.addEventListener('submit', e => {
    e.preventDefault();
    const texto = $('#odNote', box).value.trim();
    if (!texto) return;
    guardar({ notas: [...(p.notas || []), { autor: U.name, texto, t: Date.now() }] }, 'Nota añadida');
  });
  $('#odDel', box)?.addEventListener('click', async () => {
    if (!confirm('¿Borrar este pedido para siempre?')) return;
    try { await store.borrarPedido(p.id); cerrar(dlg); toast('Pedido borrado'); await cargar(); }
    catch (err) { toast(err.message, 'err'); }
  });
  if (!dlg.open) abrir(dlg);
}

/* ==========================================================
   EXPORTAR EL DISEÑO COMO UN ÚNICO ARCHIVO .HTML
   Se pinta el diseño con el nombre y color del cliente en un
   marco oculto, se copia tal cual y se le añade el código que
   hace funcionar menú, carrito, reservas y animaciones.
   ========================================================== */
async function exportarHTML(p, btn) {
  const r = p.respuestas || {};
  ocupado(btn, true);
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:800px;opacity:0;pointer-events:none';
  f.src = `plantilla.html?t=${encodeURIComponent(p.plantilla)}&n=${encodeURIComponent(r.negocio || '')}&c=${encodeURIComponent(r.color || '')}&x=1`;
  document.body.appendChild(f);
  try {
    await new Promise((ok, mal) => { f.onload = ok; setTimeout(() => mal(new Error('El diseño ha tardado demasiado en cargar')), 15000); });
    const doc = f.contentDocument;
    for (let i = 0; i < 40 && !doc.querySelector('#site nav'); i++) await new Promise(ok => setTimeout(ok, 100));
    const copia = doc.documentElement.cloneNode(true);
    copia.querySelectorAll('script, .ribbon').forEach(x => x.remove());
    copia.querySelector('meta[name=robots]')?.remove();
    copia.querySelectorAll('img').forEach(img => img.classList.remove('ok'));
    copia.classList.remove('mini', 'anim', 'sin-anim');
    const s = doc.createElement('script');
    s.textContent = `(${activarPlantilla.toString()})(${JSON.stringify({ check: icono('check'), plus: icono('plus') })});`;
    copia.querySelector('body').appendChild(s);
    const html = '<!doctype html>\n' + copia.outerHTML;
    const nombre = (r.negocio || pl_nombre(p)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'web';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `${nombre}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('HTML descargado. Ábrelo en el navegador para comprobarlo.');
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    f.remove();
    ocupado(btn, false);
  }
}
const pl_nombre = p => plantillaPorId(p.plantilla)?.nombre || 'web';
