/* ==========================================================
   Panel de propietario y de trabajadores
   ========================================================== */
import { CONFIG, PLANES } from '../config.js';
import { plantillaPorId } from './plantillas.js';
import { contar } from './efectos.js';
import * as store from './store.js';
import {
  $, $$, esc, euros, fecha, haceCuanto, icono, avatar, toast, abrir, cerrar, arrancar, pedirLogin, waLink, refPedido,
  ESTADOS, PAGOS, METODOS, cargandoHTML, ocupado, campo, estrellas, etiquetas, TAREAS, progreso
} from './ui.js';

await arrancar('panel');

const body = $('#pnBody');
const tabsEl = $('#tabs');
let U = null;
let datos = { pedidos: [], cands: [], usuarios: [], resenas: [] };
let tab = '';
let filtro = { estado: 'todos', q: '', ocultar: false };
const leerVista = () => { try { return localStorage.getItem('tm_vista'); } catch { return null; } };
let vista = leerVista() || (innerWidth >= 1100 ? 'tablero' : 'lista');

const neg = p => p.respuestas?.negocio || p.planNombre;
const trabajadores = () => datos.usuarios.filter(u => u.role === 'worker');
const activo = p => !['entregado', 'cancelado'].includes(p.estado);
const vacio = (em, t, d = '') => `<div class="empty"><div class="em">${em}</div><b>${t}</b><p>${d}</p></div>`;

/* ---------- Arranque según el rol ---------- */
store.alCambiarUsuario(async u => {
  U = u;
  if (!u) return sinSesion();
  if (u.role === 'client') return sinPermiso();
  $('#pnRole').textContent = u.role === 'owner' ? 'Panel de propietario' : 'Panel de trabajador';
  $('#pnHello').textContent = `Hola, ${u.name.split(' ')[0]} 👋`;
  $('#pnRefresh').hidden = false;
  const tabs = u.role === 'owner'
    ? [['resumen', 'Resumen'], ['pedidos', 'Pedidos'], ['candidaturas', 'Candidaturas'], ['resenas', 'Reseñas'], ['equipo', 'Equipo']]
    : [['mios', 'Mis encargos'], ['disponibles', 'Disponibles'], ['historial', 'Historial']];
  const pedida = location.hash.slice(1);
  tab = tabs.some(t => t[0] === pedida) ? pedida : tabs[0][0];
  tabsEl.innerHTML = tabs.map(([id, t]) => `<button role="tab" data-tab="${id}"><span>${t}</span><i class="badge" data-badge="${id}"></i></button>`).join('');
  await cargar();
});

function cabeceraVacia(rol, hola) {
  $('#pnRole').textContent = rol;
  $('#pnHello').textContent = hola;
  $('#pnRefresh').hidden = true;
  tabsEl.innerHTML = '';
}
function sinSesion() {
  cabeceraVacia('Panel', 'Acceso del equipo');
  body.innerHTML = `<div class="card gate"><div class="em">🔐</div><h3>Inicia sesión</h3><p class="muted">Este panel es para el propietario y los trabajadores.</p><button class="btn btn-primary" id="gateLogin"><span>Iniciar sesión</span></button></div>`;
  $('#gateLogin').addEventListener('click', () => pedirLogin('Entra con tu cuenta del equipo.'));
}
function sinPermiso() {
  cabeceraVacia('Panel', 'Zona del equipo');
  body.innerHTML = `<div class="card gate"><div class="em">💼</div><h3>Este panel es para el equipo</h3><p class="muted">Tu cuenta es de cliente. Puedes ver tus pedidos o unirte al equipo.</p>
    <div class="gate-btns"><a class="btn btn-primary" href="index.html#mis-pedidos">Mis pedidos</a><a class="btn btn-ghost" href="trabaja.html">Trabaja con nosotros</a></div></div>`;
}

async function cargar() {
  body.innerHTML = cargandoHTML('Cargando datos…');
  try {
    const owner = U.role === 'owner';
    const [pedidos, usuarios, cands, resenas] = await Promise.all([
      store.todosLosPedidos(),
      store.listarUsuarios().catch(() => []),
      owner ? store.todasLasCandidaturas() : [],
      owner ? store.todasLasResenas() : []
    ]);
    datos = { pedidos, usuarios, cands, resenas };
    pintar();
    // Número en el icono de la app instalada (pedidos nuevos + pagos por verificar)
    const pend = owner ? pedidos.filter(p => p.estado === 'nuevo' || p.pagoEstado === 'verificando').length
      : pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length;
    try { pend ? navigator.setAppBadge?.(pend) : navigator.clearAppBadge?.(); } catch {}
  } catch (e) {
    console.error(e);
    body.innerHTML = `<div class="card gate"><div class="em">⚠️</div><h3>No se pudieron cargar los datos</h3><p class="muted">${esc(e.message)}</p><p class="muted" style="font-size:13px">Si acabas de conectar Firebase, revisa las reglas de Firestore (LEEME.md).</p></div>`;
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
    disponibles: datos.pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length
  };
  $$('[data-badge]').forEach(b => { const v = n[b.dataset.badge]; b.textContent = v || ''; b.hidden = !v; });
  $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
}

function pintar() {
  badges();
  const vistas = { resumen, pedidos: vistaPedidos, candidaturas, resenas, equipo, mios, disponibles, historial };
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
        ${p.pagoEstado === 'verificando' ? '<span class="pill p-pend">💶 Pago por verificar</span>' : ''}
        ${p.urgente ? '<span class="pill p-off">Urgente</span>' : ''}</div>
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
function resumen() {
  const P = datos.pedidos;
  const vivos = P.filter(p => p.estado !== 'cancelado');
  const volumen = vivos.reduce((s, p) => s + (p.total || 0), 0);
  const cobrado = vivos.reduce((s, p) => s + (p.pagoEstado === 'pagado' ? p.total : p.pagoEstado === 'senal' ? p.total * CONFIG.senal / 100 : 0), 0);
  const mensual = vivos.filter(p => p.mensual).reduce((s, p) => s + p.mensual, 0);
  const porPlan = PLANES.map(pl => ({ n: pl.nombre, v: vivos.filter(p => p.plan === pl.id).length })).filter(x => x.v);
  const max = Math.max(1, ...porPlan.map(x => x.v));
  const pub = datos.resenas.filter(r => r.aprobada);
  const media = pub.length ? pub.reduce((s, r) => s + r.estrellas, 0) / pub.length : 0;
  const num = v => (typeof v === 'number' ? `<em class="num" data-count="${v}">${v}</em>` : v);
  const kpi = (t, v, s = '', go = '') => `<div class="kpi" ${go ? `data-go="${go}" role="button" tabindex="0"` : ''}><small>${t}</small><b>${num(v)}</b>${s ? `<span>${s}</span>` : ''}</div>`;

  body.innerHTML = `
    <div class="kpis">
      ${kpi('Pedidos nuevos', P.filter(p => p.estado === 'nuevo').length, 'sin empezar', 'pedidos')}
      ${kpi('Pagos por verificar', P.filter(p => p.pagoEstado === 'verificando').length, 'revisa Bizum / banco', 'pedidos')}
      ${kpi('Cobrado', euros(cobrado), `de ${euros(volumen)} en pedidos`)}
      ${kpi('Mensualidades', euros(mensual) + '<small>/mes</small>', 'mantenimiento')}
      ${kpi('Valoración', pub.length ? media.toFixed(1).replace('.', ',') + ' ★' : '—', `${pub.length} publicadas`, 'resenas')}
      ${kpi('Equipo', trabajadores().length, `${datos.cands.filter(c => c.estado === 'pendiente').length} candidaturas nuevas`, 'equipo')}
    </div>
    <div class="cols">
      <div class="card">
        <div class="card-h"><h3>Últimos pedidos</h3><button class="link-btn" data-go="pedidos">Ver todos</button></div>
        <div class="rows">${P.slice(0, 5).map(p => filaPedido(p)).join('') || vacio('📭', 'Aún no hay pedidos')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Pedidos por tipo de web</h3></div>
        ${porPlan.length ? `<div class="bars">${porPlan.map(x => `<div class="bar"><span>${esc(x.n)}</span><div><i style="width:${(x.v / max) * 100}%"></i></div><b>${x.v}</b></div>`).join('')}</div>` : vacio('📊', 'Sin datos todavía')}
        <div class="card-h" style="margin-top:26px"><h3>Carga del equipo</h3></div>
        ${trabajadores().length ? `<div class="team-load">${trabajadores().map(w => {
          const n = P.filter(p => p.asignado === w.uid && activo(p)).length;
          return `<div class="tl">${avatar(w, 'sm')}<span>${esc(w.name)}</span><b>${n} activo${n === 1 ? '' : 's'}</b></div>`;
        }).join('')}</div>` : '<p class="muted" style="font-size:14px">Aún no hay trabajadores. Acepta candidaturas para formar tu equipo.</p>'}
      </div>
    </div>`;
}

/* ---------- PROPIETARIO: Pedidos ---------- */
const FILTROS = { todos: 'Todos', pago: '💶 Por verificar', ...Object.fromEntries(Object.entries(ESTADOS).map(([k, v]) => [k, v.txt])) };
function pasaFiltro(p, k) {
  if (k === 'todos') return true;
  if (k === 'pago') return p.pagoEstado === 'verificando';
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
    ${vista === 'tablero' ? tablero(lista) : `<div class="rows card flush">${lista.map(p => filaPedido(p)).join('') || vacio('🔍', 'No hay pedidos aquí')}</div>`}`;
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
          <div class="kc-tags">${p.pagoEstado === 'verificando' ? '<span class="pill p-pend">💶 Verificar</span>' : ''}${p.urgente ? '<span class="pill p-off">Urgente</span>' : ''}</div>
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
        await store.actualizarPedido(p.id, { estado: nuevo });
        p.estado = nuevo;
        toast(`${neg(p)} → ${ESTADOS[nuevo].txt}`, 'ok');
        pintar();
      } catch (err) { toast(err.message, 'err'); }
    });
  });
}

/* ---------- Exportar a CSV (se abre en Excel o Google Sheets) ---------- */
function exportarCSV(lista) {
  const cab = ['Referencia', 'Fecha', 'Negocio', 'Cliente', 'Email', 'Teléfono', 'Tipo de web', 'Total', 'Mensual', 'Estado', 'Pago', 'Asignado', 'Progreso'];
  const filas = lista.map(p => [refPedido(p.id), fecha(p.createdAt), neg(p), p.clienteNombre, p.clienteEmail, p.respuestas?.telefono || '',
    p.planNombre, String(p.total).replace('.', ','), p.mensual || 0, ESTADOS[p.estado]?.txt, PAGOS[p.pagoEstado || 'pendiente']?.txt, p.asignadoNombre || '', progreso(p) + ' %']);
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
      <div class="cand-meta">
        <span>✉️ ${esc(c.email)}</span><span>📞 ${esc(c.telefono)}</span>
        ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">🔗 ${esc(c.portfolio)}</a>` : ''}
        <span>🗓 ${haceCuanto(c.createdAt)}</span>
      </div>
      <div class="cand-btns">
        ${c.estado === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-aceptar="${c.id}">${icono('check')}<span>Aceptar</span></button><button class="btn btn-sm btn-ghost" data-rechazar="${c.id}"><span>Rechazar</span></button>` : ''}
        <a class="btn btn-sm btn-ghost" href="${waLink(`¡Hola ${c.nombre.split(' ')[0]}! Te escribimos de ${CONFIG.marca} por tu candidatura 🙂`, '34' + String(c.telefono).replace(/\D/g, '').slice(-9))}" target="_blank" rel="noopener">${icono('wa')}<span>WhatsApp</span></a>
      </div>
    </article>`;
  }).join('')}</div>` : vacio('📭', 'Sin candidaturas', 'Cuando alguien rellene «Trabaja con nosotros» aparecerá aquí.');
}

/* ---------- PROPIETARIO: Reseñas ---------- */
function resenas() {
  const R = datos.resenas;
  body.innerHTML = `
    <p class="muted hint">Las reseñas nuevas no se ven en la web hasta que las apruebes.${CONFIG.trustpilot ? ` · <a class="link-btn" href="${esc(CONFIG.trustpilot)}" target="_blank" rel="noopener">Ver Trustpilot ↗</a>` : ''}</p>
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
      </article>`).join('')}</div>` : vacio('⭐', 'Aún no hay reseñas', 'Los clientes pueden valorar su web cuando se la entregues.')}`;
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
        ${ws.map(u => `<div class="tm">${avatar(u)}<div><b>${esc(u.name)}</b><small>${esc(u.email)} · ${activos(u.uid)} activos · ${hechos(u.uid)} entregados</small></div>
          <button class="btn btn-sm btn-danger" data-quitar="${u.uid}"><span>Quitar</span></button></div>`).join('')}
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
    await accion(e.submitter, () => store.cambiarRol(u.uid, 'worker'), `${u.name} añadido al equipo 🎉`);
  });
}

/* ---------- TRABAJADOR ---------- */
function mios() {
  const L = datos.pedidos.filter(p => p.asignado === U.uid && activo(p));
  body.innerHTML = `
    <div class="kpis small">
      <div class="kpi"><small>Activos</small><b>${L.length}</b></div>
      <div class="kpi"><small>En revisión</small><b>${L.filter(p => p.estado === 'revision').length}</b></div>
      <div class="kpi"><small>Entregados</small><b>${datos.pedidos.filter(p => p.asignado === U.uid && p.estado === 'entregado').length}</b></div>
    </div>
    <div class="rows card flush">${L.map(p => filaPedido(p)).join('') || vacio('☕', 'No tienes encargos activos', 'Mira en «Disponibles» para coger uno.')}</div>`;
}
function disponibles() {
  const L = datos.pedidos.filter(p => !p.asignado && p.estado === 'nuevo');
  body.innerHTML = `<p class="muted hint">Pedidos nuevos sin asignar. Cógelo para que te aparezca en «Mis encargos».</p>
    <div class="rows card flush">${L.map(p => filaPedido(p, { coger: true })).join('') || vacio('🎉', 'No hay pedidos libres', 'Vuelve más tarde.')}</div>`;
}
function historial() {
  const L = datos.pedidos.filter(p => p.asignado === U.uid && !activo(p));
  body.innerHTML = `<div class="rows card flush">${L.map(p => filaPedido(p)).join('') || vacio('📁', 'Aún no has terminado ningún encargo')}</div>`;
}

/* ---------- Acciones (un solo manejador para todo el panel) ---------- */
async function accion(btn, fn, ok) {
  ocupado(btn, true);
  try { await fn(); if (ok) toast(ok); await cargar(); }
  catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
}
const coger = id => store.actualizarPedido(id, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' });

body.addEventListener('click', async e => {
  const t = e.target.closest('[data-coger],[data-aceptar],[data-rechazar],[data-quitar],[data-aprobar],[data-ocultar],[data-borrar-r]');
  if (t) {
    e.stopPropagation();
    const d = t.dataset;
    if (d.coger) return accion(t, () => coger(d.coger), '¡Encargo cogido! Ya está en «Mis encargos»');
    if (d.aceptar) {
      const c = datos.cands.find(x => x.id === d.aceptar);
      return accion(t, async () => { await store.cambiarRol(c.uid, 'worker'); await store.actualizarCandidatura(c.id, { estado: 'aceptada' }); }, `${c.nombre.split(' ')[0]} ya forma parte del equipo 🎉`);
    }
    if (d.rechazar) return accion(t, () => store.actualizarCandidatura(d.rechazar, { estado: 'rechazada' }), 'Candidatura rechazada');
    if (d.quitar) {
      const u = datos.usuarios.find(x => x.uid === d.quitar);
      if (!confirm(`¿Quitar a ${u.name} del equipo? Ya no podrá entrar al panel.`)) return;
      return accion(t, () => store.cambiarRol(u.uid, 'client'), `${u.name} ya no está en el equipo`);
    }
    if (d.aprobar) return accion(t, () => store.actualizarResena(d.aprobar, { aprobada: true }), 'Reseña publicada en la web ⭐');
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

function abrirPedido(id) {
  const p = datos.pedidos.find(x => x.id === id);
  if (!p) return;
  const r = p.respuestas || {};
  const pl = plantillaPorId(p.plantilla);
  const esOwner = U.role === 'owner';
  const puedeEditar = esOwner || p.asignado === U.uid;
  const tel = (r.telefono || '').replace(/\D/g, '');
  const telWa = tel.length === 9 ? '34' + tel : tel;
  const fila = (k, v) => v ? `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
  const prevURL = pl ? `plantilla.html?t=${pl.id}&n=${encodeURIComponent(r.negocio || '')}&c=${encodeURIComponent(r.color || '')}` : '';
  const senal = (p.total || 0) * CONFIG.senal / 100;
  const pago = p.pagoEstado || 'pendiente';

  box.innerHTML = `
    <div class="od-head">
      <div><small>${refPedido(p.id)} · ${fecha(p.createdAt)}</small><h2 id="odTitle">${esc(neg(p))}</h2></div>
      <button class="icon-btn" data-close aria-label="Cerrar">${icono('x')}</button>
    </div>
    <div class="od-body">
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
          ? `💶 El cliente dice que ha pagado ${p.pagoFase === 'resto' ? 'el resto' : 'la señal'} (<b>${euros(p.pagoFase === 'resto' ? p.total - senal : senal)}</b>) por <b>${METODOS[p.pagoMetodo] || p.pagoMetodo}</b> ${p.pagoAviso ? haceCuanto(p.pagoAviso) : ''}. Compruébalo y márcalo como pagado.`
          : p.pagoMetodo ? `Último pago por ${METODOS[p.pagoMetodo] || p.pagoMetodo}.` : `Señal: ${euros(senal)} · Resto: ${euros((p.total || 0) - senal)}`}</p>
      </div>

      <div class="od-tareas">
        <div class="od-tareas-h"><span>Tareas</span><b>${progreso(p)} %</b></div>
        <div class="barra"><i style="--w:${progreso(p)}%"></i></div>
        <div class="tareas">${TAREAS.map(([k, t]) => `
          <label class="tarea ${puedeEditar ? '' : 'off'}"><input type="checkbox" data-tarea="${k}" ${p.tareas?.[k] ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}><span class="ck-mark"></span><span>${t}</span></label>`).join('')}</div>
        <small class="muted">El cliente ve este progreso en «Mis pedidos».</small>
      </div>

      <div class="od-client">
        ${avatar({ name: p.clienteNombre })}
        <div><b>${esc(p.clienteNombre)}</b><small>${esc(p.clienteEmail)}${r.telefono ? ' · ' + esc(r.telefono) : ''}</small></div>
        <div class="od-cbtn">
          ${telWa ? `<a class="icon-btn wa" href="${waLink(`¡Hola ${p.clienteNombre.split(' ')[0]}! Te escribimos de ${CONFIG.marca} por tu web «${neg(p)}» (${refPedido(p.id)}) 🙂`, telWa)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icono('wa')}</a>` : ''}
          <a class="icon-btn" href="mailto:${esc(p.clienteEmail)}?subject=${encodeURIComponent(`Tu web ${neg(p)} ${refPedido(p.id)}`)}" aria-label="Email">${icono('mail')}</a>
        </div>
      </div>

      <h4 class="od-h">Pedido</h4>
      <div class="kvs">
        ${fila('Tipo de web', p.planNombre)}
        <div class="kv"><span>Diseño</span><b>${pl ? `${esc(pl.nombre)} <a class="link-btn" href="${prevURL}" target="_blank" rel="noopener">ver ↗</a>` : 'Desde cero'}</b></div>
        ${fila('Precio base', euros(p.precioBase || 0))}
        ${(p.extras || []).map(x => fila(x.nombre, '+' + euros(x.precio) + (x.mensual ? '/mes' : ''))).join('')}
        ${p.urgente ? fila('Urgente', 'Sí') : ''}
        <div class="kv total"><span>Total</span><b>${euros(p.total || 0)}${p.mensual ? ` + ${euros(p.mensual)}/mes` : ''}</b></div>
        ${fila(`Señal (${CONFIG.senal} %)`, euros(senal))}
      </div>

      <h4 class="od-h">Cuestionario</h4>
      <div class="kvs">
        ${fila('Sector', r.sector)}${fila('Objetivo', r.objetivo)}${fila('Web actual', r.webActual)}${fila('Estilo', r.estilo)}
        ${r.color ? `<div class="kv"><span>Color</span><b><i class="dotc" style="background:${esc(r.color)}"></i>${esc(r.color)}</b></div>` : ''}
        ${fila('Logo', r.logo)}${fila('Textos y fotos', r.contenido)}${fila('Plazo', r.plazo)}
      </div>
      ${r.comentarios ? `<div class="od-note">💬 ${esc(r.comentarios)}</div>` : ''}

      <h4 class="od-h">Notas internas</h4>
      <div class="notes">${(p.notas || []).map(n => `<div class="note"><div><b>${esc(n.autor)}</b><small>${haceCuanto(n.t)}</small></div><p>${esc(n.texto)}</p></div>`).join('') || '<p class="muted" style="font-size:14px">Sin notas todavía.</p>'}</div>
      ${puedeEditar || !p.asignado ? `<form class="note-form" id="odNoteForm" novalidate>${campo({ id: 'odNote', label: 'Nota para el equipo', type: 'textarea' })}<button class="btn btn-sm btn-primary" type="submit"><span>Añadir nota</span></button></form>` : ''}

      ${esOwner ? `<button class="btn btn-sm btn-danger" id="odDel" style="margin-top:28px"><span>Borrar pedido</span></button>` : ''}
    </div>`;
  etiquetas(box);

  const guardar = async (cambios, msg) => {
    try {
      await store.actualizarPedido(p.id, cambios);
      Object.assign(p, cambios);
      if (msg) toast(msg);
      pintar();
      abrirPedido(p.id);
    } catch (err) { toast(err.message, 'err'); }
  };
  $$('[data-tarea]', box).forEach(c => c.addEventListener('change', () => {
    const tareas = { ...(p.tareas || {}), [c.dataset.tarea]: c.checked };
    const todas = TAREAS.every(([k]) => tareas[k]);
    guardar({ tareas }, todas ? '¡Todo listo! Puedes marcarla como entregada 🎉' : 'Tarea actualizada');
  }));
  $('#odEstado', box)?.addEventListener('change', e => guardar({ estado: e.target.value }, `Estado: ${ESTADOS[e.target.value].txt}`));
  $('#odPago', box)?.addEventListener('change', e => guardar({ pagoEstado: e.target.value }, `Pago: ${PAGOS[e.target.value].txt}`));
  $('#odAsig', box)?.addEventListener('change', e => {
    const uid = e.target.value;
    const w = uid === U.uid ? U : datos.usuarios.find(x => x.uid === uid);
    const cambios = { asignado: uid, asignadoNombre: w ? w.name : '' };
    if (uid && p.estado === 'nuevo') cambios.estado = 'en_curso';
    guardar(cambios, uid ? `Asignado a ${w.name}` : 'Sin asignar');
  });
  $('#odCoger', box)?.addEventListener('click', async e => {
    ocupado(e.currentTarget, true);
    await coger(p.id);
    Object.assign(p, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' });
    toast('¡Encargo cogido!');
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
  abrir(dlg);
}
