/* ==========================================================
   Panel de propietario y de trabajadores
   ========================================================== */
import { CONFIG, PLANES } from '../../config.js';
import { plantillaPorId, activarPlantilla } from '../portada/plantillas.js';
import { ETAPAS, etapaDe, barraEtapas, estadoParaEtapa, entregasCliente, urlVistaPrevia, fechaEntrega, diasRestantes, plazoTexto, plazoClase, conHistorial, lineaTiempo, lineaTiempoHTML, siguientePaso, RECORDATORIOS, fichaTexto } from './proyecto.js';
import { contar } from '../base/efectos.js';
import * as store from '../base/store.js';
import { $, $$, esc, euros, fecha, fechaCorta, haceCuanto, icono, avatar, toast, abrir, cerrar, arrancar, pedirLogin, mailLink, refPedido, ESTADOS, PAGOS, METODOS, cargandoHTML, errorCargaHTML, metaHTML, ocupado, campo, estrellas, etiquetas, TAREAS, progreso, copiar, descargar, tamano, datosLegalesPendientes } from '../base/ui.js';
import { montarHilo, montarArchivos, abrirRecibo, descargarArchivosCliente } from './colabora.js';
import { prefsPermitidas } from '../base/cookies.js';
import { catalogo } from '../asistente/asistente.js';
import { firmaHTML } from './firma.js';
import { conMantenimiento, estadoMant, cuotaMensual, conceptosMensuales, activarMant, registrarCuota, cuotasPagadas, nombrePeriodo, periodo, nuevoExtra, ESTADO_EXTRA, resumirVisitas, estadisticasHTML } from './negocio.js';
import { prepararArchivos, crearVersion, abrirVisor, enlaceVista } from './vistaweb.js';

await arrancar('panel');

const body = $('#pnBody');
const tabsEl = $('#tabs');
let U = null;
let datos = { pedidos: [], cands: [], usuarios: [], resenas: [], tickets: [], videos: [] };
let ccoTP = ''; // dirección privada de invitaciones de Trustpilot (solo propietario)
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
/* ---------- Comisiones con control antifraude ----------
   - Solo cuentan los pagos que confirma el propietario (el servidor no deja al vendedor tocar el pago: supabase/migraciones/v88-plataforma.sql).
   - La comisión espera los 14 días de desistimiento desde que el cliente paga del todo: si cancela, no se ha pagado nada de más.
   - Ventas sospechosas (el cliente es el propio vendedor, comparte su correo o su dominio, o muchas cancelaciones) quedan retenidas
     hasta que el propietario las revisa. */
const ESPERA_COMISION = 14;
const dia = 864e5;
const pagadoEn = p => p.pagadoEn || (p.historial || []).filter(h => /Pago: Pagado/.test(h.texto)).map(h => h.t).pop() || (p.pagoEstado === 'pagado' ? p.createdAt : 0);
const diasParaCobrar = p => Math.max(0, Math.ceil(ESPERA_COMISION - (Date.now() - pagadoEn(p)) / dia));
const dominioDe = e => String(e || '').toLowerCase().split('@')[1] || '';
const GENERICOS = new Set(['gmail.com', 'hotmail.com', 'outlook.com', 'outlook.es', 'yahoo.com', 'yahoo.es', 'icloud.com', 'live.com', 'protonmail.com', 'proton.me', 'hotmail.es', 'msn.com', 'me.com']);
function sospechas(p) {
  if (!p.ref) return [];
  const v = datos.usuarios.find(u => u.uid === p.ref);
  const m = [];
  if (p.uid === p.ref) m.push('el cliente es el propio vendedor');
  if (v?.email && p.clienteEmail && v.email.toLowerCase() === String(p.clienteEmail).toLowerCase()) m.push('mismo correo que el vendedor');
  const d = dominioDe(p.clienteEmail);
  if (v?.email && d && !GENERICOS.has(d) && d === dominioDe(v.email)) m.push('mismo dominio de correo que el vendedor');
  if (v?.name && p.clienteNombre && v.name.trim().toLowerCase() === String(p.clienteNombre).trim().toLowerCase()) m.push('mismo nombre que el vendedor');
  const suyas = ventasDe(p.ref).length + datos.pedidos.filter(x => x.ref === p.ref && x.estado === 'cancelado').length;
  const canceladas = datos.pedidos.filter(x => x.ref === p.ref && x.estado === 'cancelado').length;
  if (suyas >= 4 && canceladas / suyas >= .5) m.push(`el vendedor tiene ${canceladas} de ${suyas} ventas canceladas`);
  return m;
}
const retenida = p => sospechas(p).length > 0 && !p.fraudeRevisado;
const comisionLista = p => p.pagoEstado === 'pagado' && !p.comisionPagada && p.estado !== 'cancelado' && diasParaCobrar(p) === 0 && !retenida(p);
const estadoComision = p => p.comisionPagada ? ['Cobrada', 'p-done']
  : p.estado === 'cancelado' ? ['Venta cancelada', 'p-off']
  : p.pagoEstado !== 'pagado' ? ['Cliente aún no ha pagado', 'p-pend']
  : retenida(p) ? ['En revisión', 'p-pend']
  : diasParaCobrar(p) ? [`Cobrable en ${diasParaCobrar(p)} día${diasParaCobrar(p) === 1 ? '' : 's'}`, 'p-pend']
  : ['Lista para cobrar', 'p-new'];
const porPagar = uid => ventasDe(uid).filter(comisionLista);
/* Recomienda a un amigo: quién recomendó este pedido (por su código AMIGO-…) */
const recomendadoPor = p => /^AMIGO-[0-9A-F]{8}$/.test(p.cupon || '') ? datos.usuarios.find(u => store.codigoAmigo(u.uid) === p.cupon) || { name: 'Un cliente', email: '' } : null;
const premioPendiente = p => !!recomendadoPor(p) && ['senal', 'pagado'].includes(p.pagoEstado) && !p.premioAmigo && p.estado !== 'cancelado';
const nombreDe = uid => datos.usuarios.find(u => u.uid === uid)?.name || 'Vendedor';
const vacio = (ic, t, d = '') => `<div class="empty"><div class="em">${icono(ic)}</div><b>${t}</b><p>${d}</p></div>`;

/* ---------- Arranque según el rol ---------- */
store.alCambiarUsuario(async u => {
  U = u;
  if (!u) return sinSesion();
  if (u.role === 'client') return sinPermiso();
  $('#pnRole').textContent = u.role === 'owner' ? 'Panel de propietario' : 'Panel de trabajador';
  $('#pnHello').innerHTML = `Hola, <span class="nw">${esc(u.name.split(' ')[0])}&nbsp;<span class="saludo">${icono('hand')}</span></span>`;
  $('#pnRefresh').hidden = false;
  // Secciones agrupadas por para qué sirven (en el ordenador, menú lateral; en el móvil, un desplegable)
  const grupos = u.role === 'owner'
    ? [['Día a día', [['resumen', 'Resumen', 'chart'], ['pedidos', 'Pedidos', 'bag'], ['soporte', 'Soporte', 'help'], ['agenda', 'Agenda', 'calendar']]],
       ['Clientes y dinero', [['clientes', 'Clientes', 'users'], ['mantenimiento', 'Mantenimiento', 'refresh'], ['finanzas', 'Finanzas', 'euro']]],
       ['Equipo', [['equipo', 'Equipo', 'award'], ['candidaturas', 'Candidatos', 'briefcase'], ['videos', 'Vídeos', 'video']]],
       ['Web', [['resenas', 'Reseñas', 'star'], ['actividad', 'Actividad', 'history']]]]
    : [['Mi trabajo', [['mios', 'Mis encargos', 'laptop'], ['disponibles', 'Disponibles', 'inbox'], ['agenda', 'Agenda', 'calendar'], ['soporte', 'Soporte', 'help']]],
       ['Mis ingresos', [['ventas', 'Mis ventas', 'euro'], ['videos', 'Mis vídeos', 'video'], ['ranking', 'Ranking', 'trophy']]],
       ['Archivo', [['historial', 'Historial', 'folder']]]];
  const tabs = grupos.flatMap(g => g[1]);
  const pedida = location.hash.slice(1);
  const pedidoHash = pedida.startsWith('pedido-') ? pedida.slice(7) : '';
  tab = tabs.some(t => t[0] === pedida) ? pedida : pedidoHash ? (u.role === 'owner' ? 'pedidos' : 'mios') : tabs[0][0];
  tabsEl.innerHTML = `<button type="button" class="pn-nav-btn" aria-expanded="false" aria-controls="pnNavLista"><span class="pn-nav-act"></span><i class="badge" data-badge="total"></i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    <div class="pn-nav-lista" id="pnNavLista">${grupos.map(([g, items]) => `<div class="pn-grupo"><p class="pn-grupo-t">${g}</p>${items.map(([id, t, ic]) => `<button role="tab" data-tab="${id}">${icono(ic)}<span>${t}</span><i class="badge" data-badge="${id}"></i></button>`).join('')}</div>`).join('')}</div>`;
  const navBtn = $('.pn-nav-btn', tabsEl);
  navBtn.addEventListener('click', () => { const a = tabsEl.classList.toggle('abierto'); navBtn.setAttribute('aria-expanded', String(a)); });
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
// Al volver a la web tras un rato en otra app, se actualizan los datos sin tocar lo que estés escribiendo
let ocultoDesde = 0;
// Otras partes del panel (por ejemplo, el visor de la web) avisan cuando cambia un pedido
document.addEventListener('pedido-cambiado', async e => {
  await cargar(true);
  if (dlg.open && e.detail) abrirPedido(e.detail);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { ocultoDesde = Date.now(); return; }
  if (U && U.role !== 'client' && ocultoDesde && Date.now() - ocultoDesde > 60000 && !dlg.open) cargar(true);
});

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
    <div class="gate-btns"><a class="btn btn-primary" href="./#mis-pedidos">Mis proyectos</a><a class="btn btn-ghost" href="trabaja-con-nosotros">Trabaja con nosotros</a></div></div>`;
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
    // Los vídeos van aparte: si la tabla aún no existe (falta ejecutar el SQL), el panel sigue funcionando
    let videos = [];
    try { videos = owner ? await store.todosLosVideos() : await store.misVideos(); } catch (e) { console.warn('Vídeos no disponibles', e.message); }
    datos = { pedidos, usuarios, cands, resenas, tickets, videos };
    if (owner) { try { ccoTP = (await store.leerAjustes('trustpilot'))?.cco || ''; } catch { ccoTP = ''; } }
    if (silencioso && body.querySelector('input:focus, textarea:focus')) { badges(); return; }
    pintar();
    // Número en el icono de la app instalada (pedidos nuevos + pagos por verificar)
    const pend = owner ? pedidos.filter(p => p.estado === 'nuevo' || p.pagoEstado === 'verificando').length
      : pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length;
    try { pend ? navigator.setAppBadge?.(pend) : navigator.clearAppBadge?.(); } catch {}
  } catch (e) {
    console.error(e);
    if (silencioso && datos) return; // en las recargas automáticas no se borra lo que ya se ve
    body.innerHTML = `<div class="card">${errorCargaHTML(e.message, 'No se pudieron cargar los datos')}</div>`;
    body.querySelector('[data-reintentar]')?.addEventListener('click', () => cargar(), { once: true });
  }
}
$('#pnRefresh').addEventListener('click', async e => { const b = e.currentTarget; ocupado(b, true); await cargar(); ocupado(b, false); toast('Actualizado'); });

tabsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  irTab(b.dataset.tab);
});
function irTab(t) { tab = t; history.replaceState(null, '', '#' + tab); tabsEl.classList.remove('abierto'); $('.pn-nav-btn', tabsEl)?.setAttribute('aria-expanded', 'false'); pintar(); if (matchMedia('(max-width:999px)').matches) tabsEl.scrollIntoView({ block: 'nearest' }); }

function badges() {
  const n = {
    pedidos: datos.pedidos.filter(p => p.estado === 'nuevo' || p.pagoEstado === 'verificando').length,
    candidaturas: datos.cands.filter(c => c.estado === 'pendiente').length,
    resenas: datos.resenas.filter(r => !r.aprobada).length,
    mios: datos.pedidos.filter(p => p.asignado === U.uid && activo(p) && siguientePaso(p)?.quien === 'equipo').length,
    soporte: datos.tickets.filter(t => ['abierto', 'en_curso'].includes(t.estado)).length,
    mantenimiento: U.role === 'owner' ? datos.pedidos.filter(p => conMantenimiento(p) && ['sin', 'vencido'].includes(estadoMant(p).id)).length + datos.tickets.filter(t => t.tipo === 'baja' && t.pedido && t.estado !== 'cerrado').length : 0,
    clientes: 0,
    agenda: datos.pedidos.filter(p => (U.role === 'owner' || p.asignado === U.uid) && (diasRestantes(p) ?? 1) < 0).length,
    ventas: U.role === 'worker' ? porPagar(U.uid).length : 0,
    equipo: U.role === 'owner' ? trabajadores().filter(w => porPagar(w.uid).length).length : 0,
    disponibles: datos.pedidos.filter(p => !p.asignado && p.estado === 'nuevo').length,
    videos: U.role === 'owner' ? datos.videos.filter(v => v.estado === 'pendiente').length : 0
  };
  const visibles = $$('[data-tab]', tabsEl).map(b => b.dataset.tab);
  n.total = visibles.filter(k => k !== tab).reduce((s, k) => s + (n[k] || 0), 0);
  $$('[data-badge]').forEach(b => { const v = n[b.dataset.badge]; b.textContent = v || ''; b.hidden = !v; });
  $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const act = $(`[data-tab="${tab}"]`, tabsEl), sitio = $('.pn-nav-act', tabsEl);
  if (act && sitio) sitio.innerHTML = act.querySelector('svg').outerHTML + `<span>${act.querySelector('span').textContent}</span>`;
}

function pintar() {
  badges();
  const vistas = { resumen, mantenimiento: vistaMantenimiento, finanzas, pedidos: vistaPedidos, candidaturas, resenas, equipo, ventas, mios, disponibles, historial, clientes, soporte, agenda, actividad, ranking, videos: U.role === 'owner' ? videosOwner : misVideos };
  (vistas[tab] || resumen)();
  etiquetas(body);
  contar(body);
}

/* ---------- Fila de pedido ---------- */
function filaPedido(p, { coger = false } = {}) {
  const e = ESTADOS[p.estado] || ESTADOS.nuevo;
  const pl = plantillaPorId(p.plantilla);
  const paso = siguientePaso(p);
  return `
  <article class="row" data-open="${p.id}" tabindex="0" role="button">
    <div class="row-main">
      <div class="row-t"><b>${esc(neg(p))}</b><span class="pill ${e.cls}">${e.txt}</span>
        ${p.pagoEstado === 'verificando' ? '<span class="pill p-pend">Pago por verificar</span>' : ''}
        ${p.urgente ? '<span class="pill p-off">Urgente</span>' : ''}
        ${p.cancelacion && p.estado !== 'cancelado' ? '<span class="pill p-off">Pide cancelar</span>' : ''}
        ${plazoTexto(p) ? `<span class="pill plazo ${plazoClase(p)}">${icono('clock')} ${plazoTexto(p)}</span>` : ''}</div>
      <small>${esc(p.planNombre)} · ${pl ? esc(pl.nombre) : 'A medida'} · ${esc(p.clienteNombre)} · ${haceCuanto(p.createdAt)}</small>
      ${paso ? `<span class="sig-paso ${paso.quien}">${icono(paso.ic)}<span>${esc(paso.txt)}</span></span>` : ''}
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
// Gráfico de meses: importes cortos para que quepan en la columna (2050,50 € → 2,1 k€)
const eurosCorto = n => n >= 1000 ? (n / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' k€' : euros(Math.round(n));
function ultimosMeses(n = 6) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - k), 1);
    return { y: d.getFullYear(), m: d.getMonth(), txt: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '') };
  });
}
/* Widgets del resumen: embudo por etapa y próximas entregas */
function embudoHTML(lista) {
  const act = lista.filter(activo);
  const filas = ETAPAS.filter(e => e.id !== 'publicada').map(e => ({ e, n: act.filter(p => etapaDe(p) === e.id).length }));
  const max = Math.max(1, ...filas.map(f => f.n));
  if (!act.length) return vacio('chart', 'No hay proyectos en marcha');
  return `<div class="embudo">${filas.map(({ e, n }) => `<div class="emb ${n ? '' : 'cero'}"><span>${icono(e.icono)}${esc(e.txt)}</span><div aria-hidden="true"><i style="width:${n ? Math.max(6, (n / max) * 100) : 0}%"></i></div><b>${n}</b></div>`).join('')}</div>`;
}
function entregasHTML(lista, n = 5) {
  const L = lista.filter(p => activo(p) && diasRestantes(p) !== null).sort((a, b) => fechaEntrega(a) - fechaEntrega(b)).slice(0, n);
  if (!L.length) return '<p class="muted" style="font-size:14px">Sin entregas pendientes.</p>';
  return `<div class="entregas">${L.map(p => { const d = diasRestantes(p); return `<button type="button" class="ent ${plazoClase(p)}" data-open="${p.id}">
    <span class="ent-d"><b>${d < 0 ? '−' + -d : d}</b><small>${Math.abs(d) === 1 ? 'día' : 'días'}</small></span>
    <span class="ent-t"><b>${esc(neg(p))}</b><small>${esc(p.planNombre || '')} · ${fechaCorta(fechaEntrega(p))}</small></span>${icono('arrow')}</button>`; }).join('')}</div>`;
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
    ...P.filter(p => p.estado !== 'cancelado' && retenida(p)).slice(0, 5).map(p => ({ ic: 'alert', t: `Revisar venta de ${nombreDe(p.ref)}: ${sospechas(p)[0]}`, id: p.id })),
    ...cancelar.map(p => ({ ic: 'alert', t: `${neg(p)} pide cancelar`, id: p.id })),
    ...P.filter(p => conMantenimiento(p) && estadoMant(p).id === 'vencido').slice(0, 5).map(p => ({ ic: 'euro', t: `${neg(p)}: cuota de mantenimiento vencida`, go: 'mantenimiento' })),
    ...P.filter(p => conMantenimiento(p) && estadoMant(p).id === 'sin').slice(0, 3).map(p => ({ ic: 'refresh', t: `Activar el mantenimiento de ${neg(p)}`, go: 'mantenimiento' })),
    ...P.filter(p => (p.cambiosExtra || []).some(x => x.estado === 'aceptado')).slice(0, 5).map(p => ({ ic: 'receipt', t: `${neg(p)} aceptó un cambio extra: cobrar y empezar`, id: p.id })),
    ...P.filter(p => activo(p) && p.revision?.estado === 'cambios' && (p.revision.comentarios || []).some(c => !c.hecho)).slice(0, 5).map(p => ({ ic: 'pen', t: `${neg(p)}: el cliente pide cambios`, id: p.id })),
    ...tarde.slice(0, 5).map(p => ({ ic: 'clock', t: `${neg(p)}: ${plazoTexto(p).toLowerCase()}`, id: p.id })),
    ...P.filter(p => p.estado === 'nuevo' && !p.asignado).slice(0, 5).map(p => ({ ic: 'inbox', t: `Asignar ${neg(p)}`, id: p.id })),
    // Llamadas reservadas de hoy y mañana (la hora en la del navegador)
    ...datos.tickets.filter(t => t.tipo === 'llamada' && t.estado !== 'cerrado' && t.llamada && Date.parse(t.llamada) > Date.now() - 36e5 && Date.parse(t.llamada) < Date.now() + 2 * 864e5)
      .sort((a, b) => Date.parse(a.llamada) - Date.parse(b.llamada)).map(t => ({ ic: 'phone', t: `Llamar a ${t.nombre} · ${new Date(t.llamada).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}${t.telefono ? ` · ${t.telefono}` : ''}`, go: 'soporte' })),
    ...abiertas.slice(0, 5).map(t => ({ ic: 'help', t: `Responder: ${t.asunto}`, go: 'soporte' })),
    ...P.filter(premioPendiente).slice(0, 5).map(p => ({ ic: 'gift', t: `Premio para ${recomendadoPor(p).name}: recomendó a ${neg(p)}`, id: p.id }))
  ];

  const faltan = datosLegalesPendientes();
  setTimeout(() => import('../base/push.js').then(m => m.montarAvisoPush($('#pnPush'))).catch(() => {}));
  body.innerHTML = `<div id="pnPush"></div>
    ${faltan.length ? `<a class="card aviso-legal" href="ajustes#negocio">
      <span class="aviso-legal-ic">${icono('alert')}</span>
      <span><b>Antes de vender, completa tus datos</b><small>Faltan: ${esc(faltan.join(', '))}. Son obligatorios en el aviso legal, las condiciones y los recibos, y los clientes los necesitan para pagarte. Se cambian en Ajustes → Negocio.</small></span>
      ${icono('arrow')}</a>` : ''}
    <div class="kpis">
      ${kpi('Pedidos nuevos', P.filter(p => p.estado === 'nuevo').length, 'sin empezar', 'pedidos')}
      ${kpi('Cobrado', euros(cobrado), `de ${euros(volumen)} en pedidos`)}
      ${kpi('Pagos por verificar', P.filter(p => p.pagoEstado === 'verificando').length, 'revisa el banco', 'pedidos')}
      ${kpi('Retrasados', tarde.length, 'pasada la fecha de entrega', 'agenda', tarde.length ? 'mal' : '')}
      ${kpi('Consultas sin responder', abiertas.length, 'soporte y contacto', 'soporte', abiertas.length ? 'aviso' : '')}
      ${kpi('Ticket medio', euros(ticketMedio), `${vivos.length} pedido${vivos.length === 1 ? '' : 's'}`)}
      ${kpi('Mensualidades', euros(mensual) + '<small>/mes</small>', 'webs publicadas con mantenimiento')}
      ${kpi('Valoración', pub.length ? media.toFixed(1).replace('.', ',') + ' / 5' : '—', `${pub.length} publicada${pub.length === 1 ? '' : 's'}`, 'resenas')}
      ${kpi('Comisiones por pagar', euros(trabajadores().reduce((s, w) => s + porPagar(w.uid).reduce((a, p) => a + comision(p), 0), 0)), `${trabajadores().length} vendedor${trabajadores().length === 1 ? '' : 'es'}`, 'equipo')}
    </div>
    <div class="cols">
      <div class="card">
        <div class="card-h"><h3>Ingresos por mes</h3><span class="muted leyenda"><i class="lg-a"></i>Vendido <i class="lg-b"></i>Cobrado</span></div>
        <div class="meses" role="list" aria-label="Ingresos de los últimos 6 meses">${meses.map(m => `<div class="mes" role="listitem" aria-label="${m.txt}: ${euros(m.total)} vendido, ${euros(m.cobrado)} cobrado, ${m.n} pedido${m.n === 1 ? '' : 's'}" title="${m.n} pedido${m.n === 1 ? '' : 's'} · ${euros(m.total)} vendido · ${euros(m.cobrado)} cobrado">
          <div class="mes-barras" aria-hidden="true"><i class="a" style="--h:${(m.total / maxMes) * 100}%"></i><i class="b" style="--h:${(m.cobrado / maxMes) * 100}%"></i></div>
          <b>${m.total ? eurosCorto(m.total) : '—'}</b><small>${m.txt}</small></div>`).join('')}</div>
        <div class="card-h" style="margin-top:26px"><h3>Proyectos por etapa</h3><span class="muted" style="font-size:13px">${P.filter(activo).length} en marcha</span></div>
        ${embudoHTML(P)}
        <div class="card-h" style="margin-top:26px"><h3>Últimos pedidos</h3><button class="link-btn" data-go="pedidos">Ver todos</button></div>
        <div class="rows">${P.slice(0, 5).map(p => filaPedido(p)).join('') || vacio('inbox', 'Aún no hay pedidos')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Para hoy</h3><span class="muted" style="font-size:13px">${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}</span></div>
        ${pendientes.length ? `<div class="hoy">${pendientes.slice(0, 10).map(x => `<button type="button" class="hoy-it" ${x.id ? `data-open="${x.id}"` : `data-go="${x.go}"`}>${icono(x.ic)}<span>${esc(x.t)}</span>${icono('arrow')}</button>`).join('')}</div>` : `<p class="muted" style="font-size:14px">${icono('check')} Todo al día.</p>`}
        <div class="card-h" style="margin-top:26px"><h3>Próximas entregas</h3><button class="link-btn" data-go="agenda">Agenda</button></div>
        ${entregasHTML(P)}
        <div class="card-h" style="margin-top:26px"><h3>Pedidos por tipo de web</h3></div>
        ${porPlan.length ? `<div class="bars">${porPlan.map(x => `<div class="bar"><span>${esc(x.n)}</span><div aria-hidden="true"><i style="width:${(x.v / max) * 100}%"></i></div><b>${x.v}</b></div>`).join('')}</div>` : vacio('chart', 'Sin datos todavía')}
        <div class="card-h" style="margin-top:26px"><h3>Carga del equipo</h3></div>
        ${trabajadores().length ? `<div class="team-load">${trabajadores().map(w => {
          const n = P.filter(p => p.asignado === w.uid && activo(p)).length;
          return `<div class="tl">${avatar(w, 'sm')}<span>${esc(w.name)}${w.datos?.disponible === false ? ' <em class="no-disp">no disponible</em>' : ''}</span><b>${n} activo${n === 1 ? '' : 's'}</b></div>`;
        }).join('')}</div>` : '<p class="muted" style="font-size:14px">Aún no hay trabajadores. Acepta candidaturas para formar tu equipo.</p>'}
      </div>
    </div>
    ${adminHTML()}
    <div class="card vis-card" id="pnVisitas" aria-busy="true"><div class="card-h"><h3>Visitas a la web</h3><span class="muted" style="font-size:13px">últimos 30 días</span></div>${cargandoHTML('Cargando visitas…')}</div>`;
  pintarVisitas();
  montarAdmin();
}

/* ---------- PROPIETARIO: facturas para el gestor y copia de seguridad ---------- */
const FASES_FACTURA = { senal: 'Señal', resto: 'Resto (entrega)', total: 'Pago completo' };
const ULTIMA_COPIA = 'tm_ultima_copia';
function adminHTML() {
  if (U.role !== 'owner') return '';
  const hoy = new Date(), anio = hoy.getFullYear(), tri = Math.floor(hoy.getMonth() / 3) + 1;
  // El trimestre anterior es el que suele pedir el gestor (salvo en el primero del año)
  const opciones = [];
  for (let a = anio; a >= anio - 2; a--) for (let t = 4; t >= 1; t--) if (a < anio || t <= tri) opciones.push([`${a}-${t}`, `${t}.º trimestre de ${a}`]);
  for (let a = anio; a >= anio - 2; a--) opciones.push([`${a}-0`, `Todo ${a}`]);
  const porDefecto = tri > 1 ? `${anio}-${tri - 1}` : `${anio - 1}-4`;
  let ultima = 0;
  try { ultima = +localStorage.getItem(ULTIMA_COPIA) || 0; } catch { /* nada */ }
  const dias = ultima ? Math.floor((Date.now() - ultima) / 864e5) : null;
  return `<div class="cols adm-cols">
    <div class="card adm-card">
      <div class="card-h"><h3>Facturas para tu gestor</h3></div>
      <p class="muted">Todas las facturas del periodo en una hoja de cálculo (CSV para Excel o Google Sheets), con base, IVA y total.</p>
      <div class="adm-fila"><label class="fc-select"><span>Periodo</span><select id="admPeriodo">${opciones.map(([v, t]) => `<option value="${v}"${v === porDefecto ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <button type="button" class="btn btn-sm btn-primary" id="admCsv">${icono('download')}<span>Descargar CSV</span></button></div>
      <p class="adm-res" id="admRes" aria-live="polite"></p>
    </div>
    <div class="card adm-card">
      <div class="card-h"><h3>Copia de seguridad</h3>${dias === null ? '<span class="adm-tag mal">Nunca</span>' : dias > 7 ? `<span class="adm-tag mal">Hace ${dias} días</span>` : `<span class="adm-tag">${dias ? `Hace ${dias} día${dias === 1 ? '' : 's'}` : 'Hoy'}</span>`}</div>
      <p class="muted">Pedidos, facturas, clientes, mensajes, reseñas y ajustes en un archivo que guardas tú. Hazla una vez a la semana y guárdala fuera del ordenador (por ejemplo, en Google Drive). No incluye las fotos y archivos subidos.</p>
      <button type="button" class="btn btn-sm btn-ghost" id="admCopia">${icono('download')}<span>Descargar copia de seguridad</span></button>
    </div>
  </div>`;
}
const fechaFactura = f => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(f.datos?.fecha || ''); return m ? new Date(+m[3], m[2] - 1, +m[1]) : new Date(f.created_at); };
function csvFacturas(facturas, anio, tri) {
  const L = facturas.filter(f => { const d = fechaFactura(f); return d.getFullYear() === anio && (!tri || Math.floor(d.getMonth() / 3) + 1 === tri); });
  const num = n => (Math.round((+n || 0) * 100) / 100).toFixed(2).replace('.', ',');
  const c = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const sum = k => L.reduce((t, f) => t + (+f.datos?.[k] || 0), 0);
  const filas = L.map(f => {
    const d = f.datos || {}, cl = d.cliente || {};
    return [f.numero, fechaFactura(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), cl.nombre, cl.nif, [cl.direccion, cl.cp, cl.ciudad].filter(Boolean).join(', '), cl.email,
      (d.lineas || []).map(l => l.concepto).filter(Boolean).join(' + ') || FASES_FACTURA[f.fase] || f.fase, d.pedido, num(d.base), num(d.iva), num(d.cuota), num(d.total), d.metodo].map(c).join(';');
  });
  const cab = ['Número', 'Fecha', 'Cliente', 'NIF', 'Dirección', 'Correo', 'Concepto', 'Pedido', 'Base imponible', 'IVA %', 'Cuota IVA', 'Total', 'Forma de pago'].map(c).join(';');
  const tot = [c('TOTAL'), c(''), c(''), c(''), c(''), c(''), c(`${L.length} factura${L.length === 1 ? '' : 's'}`), c(''), c(num(sum('base'))), c(''), c(num(sum('cuota'))), c(num(sum('total'))), c('')].join(';');
  return { csv: '\ufeff' + [cab, ...filas, tot].join('\r\n'), n: L.length, base: sum('base'), cuota: sum('cuota'), total: sum('total') };
}
function montarAdmin() {
  if (U.role !== 'owner' || !$('#admCsv')) return;
  $('#admCsv').addEventListener('click', async e => {
    const b = e.currentTarget; ocupado(b, true);
    try {
      const [anio, tri] = $('#admPeriodo').value.split('-').map(Number);
      const r = csvFacturas(await store.listarFacturas(), anio, tri);
      if (!r.n) { $('#admRes').textContent = 'No hay facturas en ese periodo.'; return; }
      descargar(`facturas-${anio}${tri ? `-T${tri}` : ''}.csv`, new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
      $('#admRes').innerHTML = `${r.n} factura${r.n === 1 ? '' : 's'} · base ${euros(r.base)} · IVA ${euros(r.cuota)} · <b>total ${euros(r.total)}</b>`;
    } catch (err) { toast(err.message, 'err'); }
    finally { ocupado(b, false); }
  });
  $('#admCopia').addEventListener('click', async e => {
    const b = e.currentTarget; ocupado(b, true);
    try {
      const copia = await store.copiaDeSeguridad();
      const fallos = Object.entries(copia.tablas).filter(([, v]) => v && v.error).map(([k]) => k);
      descargar(`copia-${CONFIG.marca}-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' }));
      try { localStorage.setItem(ULTIMA_COPIA, String(Date.now())); } catch { /* nada */ }
      toast(fallos.length ? `Copia descargada, pero sin: ${fallos.join(', ')}` : 'Copia de seguridad descargada. Guárdala en un sitio seguro.', fallos.length ? 'err' : 'ok');
      cargar(true);
    } catch (err) { toast(err.message, 'err'); }
    finally { ocupado(b, false); }
  });
}

/* ---------- PROPIETARIO: Visitas (contadores propios, sin cookies) ---------- */
const PAGINAS_WEB = {
  inicio: 'Inicio', trabaja: 'Trabaja con nosotros', terminos: 'Términos y privacidad', 'revisa-tu-web': 'Revisa tu web', mantenimiento: 'Mantenimiento', guias: 'Guías',
  'webs-para-barberias': 'Sector: barberías', 'webs-para-centros-de-estetica': 'Sector: estética', 'webs-para-restaurantes': 'Sector: restaurantes', 'tiendas-online': 'Sector: tiendas online',
  'webs-para-gimnasios': 'Sector: gimnasios', 'webs-para-profesionales': 'Sector: profesionales', 'cuanto-cuesta-una-pagina-web': 'Guía: cuánto cuesta',
  'que-necesita-la-web-de-mi-negocio': 'Guía: qué necesita', 'dominio-alojamiento-y-correo': 'Guía: dominio y correo', 'antes-de-lanzar-tu-web': 'Guía: antes de lanzar',
  'seo-local-para-negocios': 'Guía: SEO local', 'como-conseguir-resenas-en-google': 'Guía: reseñas', 'web-o-redes-sociales': 'Guía: web o redes'
};
async function pintarVisitas() {
  const caja = $('#pnVisitas');
  if (!caja) return;
  let filas;
  try { filas = await store.listarVisitas(30); }
  catch { filas = null; }
  if (!caja.isConnected) return;
  caja.removeAttribute('aria-busy');
  const cab = '<div class="card-h"><h3>Visitas a la web</h3><span class="muted" style="font-size:13px">últimos 30 días · sin cookies</span></div>';
  if (!filas) { caja.innerHTML = cab + vacio('chart', 'Aún no se pueden ver las visitas. Ejecuta supabase/migraciones/v65-visitas.sql en Supabase.'); return; }
  // Los pasos del embudo («ev-…») se cuentan aparte de las visitas
  const eventos = filas.filter(f => f.pagina.startsWith('ev-'));
  filas = filas.filter(f => !f.pagina.startsWith('ev-'));
  const cuenta = k => eventos.filter(f => f.pagina === 'ev-' + k).reduce((t, f) => t + f.visitas, 0);
  const pasos = [
    ['Visitas a la portada', filas.filter(f => f.pagina === 'inicio').reduce((t, f) => t + f.visitas, 0)],
    ['Usaron la calculadora', cuenta('calculadora')],
    ['Descargaron el presupuesto', cuenta('presupuesto')],
    ['Empezaron un pedido', cuenta('pedido')],
    ['Hicieron el pedido', cuenta('pedido-hecho')]
  ];
  const tope = Math.max(1, pasos[0][1]);
  const embudo = `<div class="card-h vis-embudo-h"><h3>Embudo de ventas</h3><span class="muted" style="font-size:13px">de quien entra a quien pide</span></div>
    <ol class="vis-embudo">${pasos.map(([t, v], i) => `<li><span>${t}</span><div aria-hidden="true"><i style="width:${Math.max(v ? 2 : 0, (v / tope) * 100)}%"></i></div><b>${v}</b><small>${i && pasos[0][1] ? `${Math.round((v / pasos[0][1]) * 1000) / 10} %` : ''}</small></li>`).join('')}</ol>`;
  const suma = (L, k) => Object.entries(L.reduce((o, f) => ((o[f[k]] = (o[f[k]] || 0) + f.visitas), o), {})).sort((a, b) => b[1] - a[1]);
  const total = filas.reduce((t, f) => t + f.visitas, 0);
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5);
    const clave = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    return { d, n: filas.filter(f => f.dia === clave).reduce((t, f) => t + f.visitas, 0) };
  });
  const max = Math.max(1, ...dias.map(x => x.n));
  const movil = filas.filter(f => f.dispositivo !== 'ordenador').reduce((t, f) => t + f.visitas, 0);
  const origenes = suma(filas, 'origen').map(([k, v]) => [k || 'Directo o buscador sin datos', v]);
  const paginas = suma(filas, 'pagina').map(([k, v]) => [PAGINAS_WEB[k] || k, v]);
  const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const barras = (L, maxL = Math.max(1, ...L.map(x => x[1]))) => L.length ? `<div class="bars">${L.slice(0, 6).map(([k, v]) => `<div class="bar"><span title="${esc(k)}">${esc(k)}</span><div aria-hidden="true"><i style="width:${(v / maxL) * 100}%"></i></div><b>${v}</b></div>`).join('')}</div>` : vacio('chart', 'Sin datos todavía');
  caja.innerHTML = `${cab}
    <div class="kpis k4">
      <div class="kpi"><small>Visitas</small><b>${total}</b><span>en 30 días</span></div>
      <div class="kpi"><small>Hoy</small><b>${dias[29].n}</b><span>${fmt(dias[29].d)}</span></div>
      <div class="kpi"><small>Desde el móvil</small><b>${total ? Math.round((movil / total) * 100) : 0} %</b><span>móvil y tableta</span></div>
      <div class="kpi"><small>En inglés</small><b>${filas.filter(f => f.idioma === 'en').reduce((t, f) => t + f.visitas, 0)}</b><span>visitas</span></div>
    </div>
    <div class="vis-dias" role="list" aria-label="Visitas por día, últimos 30 días">${dias.map(x => `<div class="vis-dia" role="listitem" tabindex="0" aria-label="${fmt(x.d)}: ${x.n} visita${x.n === 1 ? '' : 's'}" data-tip="${fmt(x.d)} · ${x.n}"><i style="--h:${(x.n / max) * 100}%"></i></div>`).join('')}</div>
    <div class="vis-eje" aria-hidden="true"><span>${fmt(dias[0].d)}</span><span>${fmt(dias[29].d)}</span></div>
    <div class="cols vis-cols">
      <div><div class="card-h"><h3>De dónde llegan</h3></div>${barras(origenes)}</div>
      <div><div class="card-h"><h3>Páginas</h3></div>${barras(paginas)}</div>
    </div>
    ${embudo}`;
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
    <div class="opts filters">${Object.entries(FILTROS).map(([k, t]) => { const n = base.filter(p => pasaFiltro(p, k)).length; return `<label class="opt ${!n && k !== 'todos' && filtro.estado !== k ? 'cero' : ''}"><input type="radio" name="flt" value="${k}" ${filtro.estado === k ? 'checked' : ''}><span><i>${t} · ${n}</i></span></label>`; }).join('')}</div>
    ${vista === 'tablero' ? tablero(lista) : `<div class="rows card flush">${lista.map(p => filaPedido(p)).join('') || vacio('search', 'No hay pedidos aquí')}</div>`}`;
  $$('[data-vista]').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.vista;
    if (prefsPermitidas()) try { localStorage.setItem('tm_vista', vista); } catch {}
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
          ${(paso => paso ? `<span class="sig-paso ${paso.quien}">${icono(paso.ic)}<span>${esc(paso.txt)}</span></span>` : '')(siguientePaso(p))}
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
  toast(`${lista.length} pedido${lista.length === 1 ? '' : 's'} exportado${lista.length === 1 ? '' : 's'}`, 'ok');
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

/* ==========================================================
   VÍDEOS DE LOS CREADORES (pago fijo por vídeo)
   ========================================================== */
const VID = () => CONFIG.videos || { precio: 15, bonus: 25, visitas: 10000, maxMes: 12 };
const EST_VID = { pendiente: ['Por revisar', 'p-pend'], aprobado: ['Por cobrar', 'p-new'], pagado: ['Pagado', 'p-done'], rechazado: ['No aprobado', 'p-off'] };
const importeVideo = v => (v.estado === 'aprobado' || v.estado === 'pagado') ? (+v.importe || VID().precio) + (v.bonus ? (+v.importeBonus || VID().bonus) : 0) : 0;
const vidEsteMes = t => { const d = new Date(t), h = new Date(); return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear(); };
const vidMes = (lista, uid) => lista.filter(v => (!uid || v.uid === uid) && vidEsteMes(v.createdAt) && v.estado !== 'rechazado');
const redDe = url => /tiktok/i.test(url) ? 'TikTok' : /instagram/i.test(url) ? 'Instagram' : /youtu/i.test(url) ? 'YouTube' : /facebook|fb\.watch/i.test(url) ? 'Facebook' : 'Otra red';
const enlaceSeguro = url => /^https?:\/\//i.test(url || '') ? url : '';
const filaVideo = (v, owner) => {
  const [txt, cls] = EST_VID[v.estado] || ['—', ''];
  const url = enlaceSeguro(v.url);
  return `<article class="vid card">
    <div class="vid-h">
      <span class="vid-ic">${icono('play')}</span>
      <div class="vid-t"><b>${owner ? esc(v.autor || 'Creador') + ' · ' : ''}${esc(v.red || redDe(v.url))}</b><small>${haceCuanto(v.createdAt)}${v.visitas ? ` · ${(+v.visitas).toLocaleString('es-ES')} visualizaciones` : ''}</small></div>
      <span class="pill ${cls}">${txt}</span>
    </div>
    ${v.nota ? `<p class="vid-nota">${esc(v.nota)}</p>` : ''}
    <div class="vid-f">
      ${url ? `<a class="btn btn-sm btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">${icono('external')}<span>Ver vídeo</span></a>` : ''}
      ${importeVideo(v) ? `<b class="vid-imp">${euros(importeVideo(v))}${v.bonus ? ' <small>con bonus</small>' : ''}</b>` : ''}
      ${owner && v.estado === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-vid="aprobar" data-id="${v.id}">${icono('check')}<span>Aprobar ${euros(VID().precio)}</span></button><button class="btn btn-sm btn-ghost" data-vid="rechazar" data-id="${v.id}"><span>Rechazar</span></button>` : ''}
      ${owner && v.estado === 'aprobado' ? `<button class="btn btn-sm btn-ghost" data-vid="bonus" data-id="${v.id}">${icono('flame')}<span>${v.bonus ? 'Quitar bonus' : `Bonus +${euros(VID().bonus)}`}</span></button><button class="btn btn-sm btn-primary" data-vid="pagar" data-id="${v.id}">${icono('euro')}<span>Marcar pagado</span></button>` : ''}
      ${(owner || v.estado === 'pendiente') ? `<button class="icon-btn sm" data-vid="borrar" data-id="${v.id}" aria-label="Borrar vídeo">${icono('trash')}</button>` : ''}
    </div>
  </article>`;
};

/* Creador: enviar vídeos y ver lo que cobra */
function misVideos() {
  const C = VID(), V = datos.videos;
  const mes = vidMes(V).length;
  const porCobrar = V.filter(v => v.estado === 'aprobado').reduce((a, v) => a + importeVideo(v), 0);
  const cobrado = V.filter(v => v.estado === 'pagado').reduce((a, v) => a + importeVideo(v), 0);
  const enlace = new URL(`./?ref=${encodeURIComponent(U.uid)}`, location.href).href;
  const ideas = [
    ['Antes y después', `Enseña la web antigua (o la ficha de Google) de un negocio y cómo quedaría con un diseño de ${CONFIG.marca}.`],
    ['Web en 30 segundos', 'Graba la pantalla recorriendo uno de nuestros diseños de ejemplo con el nombre de un negocio real de tu zona.'],
    ['¿Cuánto cuesta una web?', `Explica los precios cerrados (desde ${euros(Math.min(...PLANES.map(p => p.precio)))}) y qué incluye cada tipo de web.`],
    ['Errores de una web', '3 fallos que hacen perder clientes (no se ve bien en el móvil, sin botón de contacto, tarda en cargar) y cómo los solucionamos.']
  ];
  body.innerHTML = `
    <div class="card vid-info">
      <span class="vid-big">${icono('video')}</span>
      <div><h3>Cobras ${euros(C.precio)} por cada vídeo aprobado</h3>
      <p class="muted">Y <b>+${euros(C.bonus)}</b> si supera las <b>${C.visitas.toLocaleString('es-ES')} visualizaciones</b> en 14 días. Hasta ${C.maxMes} vídeos pagados al mes. Si alguien compra desde tu enlace, además te llevas el ${PCT} %.</p></div>
    </div>
    <div class="kpis k4">
      <div class="kpi"><small>Este mes</small><b>${mes} / ${C.maxMes}</b><span>vídeos enviados</span></div>
      <div class="kpi"><small>Por revisar</small><b>${V.filter(v => v.estado === 'pendiente').length}</b><span>esperando aprobación</span></div>
      <div class="kpi"><small>Por cobrar</small><b>${euros(porCobrar)}</b><span>vídeos aprobados</span></div>
      <div class="kpi"><small>Ya cobrado</small><b>${euros(cobrado)}</b><span>en total</span></div>
    </div>
    <form class="card vid-form" id="vidForm" novalidate>
      <div class="card-h"><h3>Enviar un vídeo publicado</h3></div>
      ${campo({ id: 'vUrl', name: 'url', label: 'Enlace del vídeo', type: 'url', required: true, attrs: 'inputmode="url" autocapitalize="off" placeholder="https://www.tiktok.com/@tu_usuario/video/…"' })}
      ${campo({ id: 'vVisitas', name: 'visitas', label: 'Visualizaciones ahora (opcional)', type: 'number', attrs: 'min="0" inputmode="numeric"' })}
      ${campo({ id: 'vNota', name: 'nota', label: 'Nota para nosotros (opcional)', type: 'textarea', attrs: 'maxlength="300"' })}
      <p class="muted vid-req">${icono('check')} Vídeo propio de 20 a 60 segundos, publicado en tu cuenta, que nombre a ${CONFIG.marca} y con tu enlace en la bio o en la descripción.</p>
      <button class="btn btn-primary" type="submit" id="vidSend" ${mes >= C.maxMes ? 'disabled' : ''}>${icono('send')}<span>${mes >= C.maxMes ? 'Ya has llegado al máximo de este mes' : 'Enviar para revisar'}</span></button>
    </form>
    <div class="vid-lista">${V.map(v => filaVideo(v, false)).join('') || vacio('video', 'Aún no has enviado vídeos', 'Publica tu primer vídeo y pega aquí el enlace para que lo revisemos.')}</div>
    <div class="card kit">
      <div class="card-h"><h3>Ideas de vídeos que funcionan</h3><span class="muted" style="font-size:13px">Pon tu enlace en la bio</span></div>
      <div class="enlace-box"><code>${esc(enlace)}</code><button class="btn btn-sm btn-primary" data-copy="${esc(enlace)}"><span>Copiar enlace</span></button></div>
      <div class="kit-grid">${ideas.map(([t, txt]) => `<div class="kit-it"><b>${t}</b><p>${esc(txt)}</p></div>`).join('')}</div>
    </div>`;
  etiquetas(body);
  $('#vidForm').addEventListener('submit', async e => {
    e.preventDefault();
    const url = $('#vUrl').value.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) { $('#vUrl').closest('.fc').classList.add('error'); return toast('Pega el enlace completo del vídeo (empieza por https://)', 'err'); }
    if (datos.videos.some(v => v.url === url)) return toast('Ese vídeo ya lo habías enviado', 'err');
    const btn = $('#vidSend'); ocupado(btn, true);
    try {
      const v = await store.enviarVideo({ url, red: redDe(url), visitas: Math.max(0, +$('#vVisitas').value || 0), nota: $('#vNota').value.trim() });
      datos.videos = [v, ...datos.videos];
      toast('Vídeo enviado. Te avisamos cuando lo revisemos.', 'ok');
      misVideos();
    } catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
  });
}

/* Propietario: revisar, aprobar y pagar */
let fVid = 'pendiente';
function videosOwner() {
  const C = VID(), V = datos.videos;
  const lista = fVid === 'todos' ? V : V.filter(v => v.estado === fVid);
  const porPagar = V.filter(v => v.estado === 'aprobado');
  const porCreador = Object.values(porPagar.reduce((m, v) => { (m[v.uid] ||= { uid: v.uid, autor: v.autor, n: 0, total: 0 }); m[v.uid].n++; m[v.uid].total += importeVideo(v); return m; }, {}));
  const pagadoMes = V.filter(v => v.estado === 'pagado' && vidEsteMes(v.pagadoEn || v.createdAt)).reduce((a, v) => a + importeVideo(v), 0);
  body.innerHTML = `
    <div class="kpis k4">
      <div class="kpi"><small>Por revisar</small><b>${V.filter(v => v.estado === 'pendiente').length}</b><span>vídeos nuevos</span></div>
      <div class="kpi"><small>Por pagar</small><b>${euros(porPagar.reduce((a, v) => a + importeVideo(v), 0))}</b><span>${porPagar.length} vídeos aprobados</span></div>
      <div class="kpi"><small>Pagado este mes</small><b>${euros(pagadoMes)}</b><span>en vídeos</span></div>
      <div class="kpi"><small>Tarifa</small><b>${euros(C.precio)}</b><span>+${euros(C.bonus)} si pasa de ${C.visitas.toLocaleString('es-ES')} vis.</span></div>
    </div>
    ${porCreador.length ? `<div class="card vid-pagos"><div class="card-h"><h3>Por pagar a cada creador</h3></div>${porCreador.map(c => `
      <div class="vid-pago"><span>${avatar({ name: c.autor || '?' })}<b>${esc(c.autor || 'Creador')}</b><small>${c.n} vídeo${c.n === 1 ? '' : 's'}</small></span>
      <b>${euros(c.total)}</b><button class="btn btn-sm btn-ghost" data-cobro="${c.uid}">${icono('bank')}<span>Cobro</span></button><button class="btn btn-sm btn-primary" data-vid="pagartodo" data-id="${c.uid}">${icono('euro')}<span>Pagar todo</span></button></div>`).join('')}</div>` : ''}
    <div class="seg vid-seg" role="tablist">${[['pendiente', 'Por revisar'], ['aprobado', 'Por pagar'], ['pagado', 'Pagados'], ['rechazado', 'Rechazados'], ['todos', 'Todos']].map(([k, t]) => `<button type="button" data-fvid="${k}" class="${fVid === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="vid-lista">${lista.map(v => filaVideo(v, true)).join('') || vacio('video', fVid === 'pendiente' ? 'No hay vídeos por revisar' : 'Nada por aquí', 'Los creadores envían sus vídeos desde su panel, en «Mis vídeos».')}</div>`;
}

body.addEventListener('click', async e => {
  const f = e.target.closest('[data-fvid]');
  if (f) { fVid = f.dataset.fvid; return videosOwner(); }
  const b = e.target.closest('[data-vid]');
  if (!b) return;
  const { vid: acc, id } = b.dataset, C = VID();
  const v = datos.videos.find(x => x.id === id);
  const hecho = async (fn, msg) => { ocupado(b, true); try { await fn(); toast(msg, 'ok'); await cargar(true); pintar(); } catch (err) { toast(err.message, 'err'); ocupado(b, false); } };
  if (acc === 'aprobar') {
    if (vidMes(datos.videos, v.uid).filter(x => x.estado === 'aprobado' || x.estado === 'pagado').length >= C.maxMes && !confirm(`${v.autor} ya tiene ${C.maxMes} vídeos aprobados este mes. ¿Aprobar igualmente?`)) return;
    return hecho(() => store.actualizarVideo(id, { estado: 'aprobado', importe: C.precio, aprobadoEn: Date.now() }), `Vídeo aprobado: ${euros(C.precio)} por pagar`);
  }
  if (acc === 'rechazar') return hecho(() => store.actualizarVideo(id, { estado: 'rechazado' }), 'Vídeo rechazado');
  if (acc === 'bonus') return hecho(() => store.actualizarVideo(id, { bonus: !v.bonus, importeBonus: C.bonus }), v.bonus ? 'Bonus quitado' : `Bonus de ${euros(C.bonus)} añadido`);
  if (acc === 'pagar') return hecho(() => store.actualizarVideo(id, { estado: 'pagado', pagadoEn: Date.now() }), 'Vídeo marcado como pagado');
  if (acc === 'pagartodo') {
    const vs = datos.videos.filter(x => x.uid === id && x.estado === 'aprobado');
    const total = vs.reduce((a, x) => a + importeVideo(x), 0);
    if (!confirm(`¿Marcar como pagados ${vs.length} vídeos de ${vs[0]?.autor || 'este creador'} (${euros(total)})?`)) return;
    return hecho(() => Promise.all(vs.map(x => store.actualizarVideo(x.id, { estado: 'pagado', pagadoEn: Date.now() }))), `${euros(total)} marcados como pagados`);
  }
  if (acc === 'borrar') { if (!confirm('¿Borrar este vídeo?')) return; return hecho(() => store.borrarVideo(id), 'Vídeo borrado'); }
});

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
          const generado = v.reduce((a, p) => a + comision(p), 0);
          return `<div class="tm tm-w">
            ${avatar(u)}
            <div class="tm-info">
              <b><span>${esc(u.name)}</span>${u.datos?.disponible === false ? '<em class="no-disp">No disponible</em>' : '<em class="si-disp">Disponible</em>'}</b>
              <small>${esc(u.email)}</small>
              <ul class="tm-stats">
                <li><b>${activos(u.uid)}</b> activos</li><li><b>${hechos(u.uid)}</b> entregados</li><li><b>${v.length}</b> venta${v.length === 1 ? '' : 's'}</li><li><b>${euros(generado)}</b> generados</li>
              </ul>
            </div>
            <div class="tm-acc">
              ${deuda ? `<button class="btn btn-sm btn-primary" data-pagar-com="${u.uid}" title="Marca como pagadas sus comisiones listas">${icono('euro')}<span>Pagar ${euros(deuda)}</span></button>` : ''}
              <button class="btn btn-sm btn-ghost" data-cobro="${u.uid}" title="Ver sus datos de cobro">${icono('bank')}<span>Cobro</span></button>
              <a class="btn btn-sm btn-ghost" href="${mailLink(`${CONFIG.marca}`, '', u.email)}">${icono('mail')}<span>Escribir</span></a>
              <button class="btn btn-sm btn-danger" data-quitar="${u.uid}" aria-label="Quitar a ${esc(u.name)} del equipo">${icono('trash')}<span>Quitar</span></button>
            </div>
          </div>`;
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
  const enlace = new URL(`./?ref=${encodeURIComponent(U.uid)}`, location.href).href;
  const generado = V.reduce((a, p) => a + (p.total || 0), 0);
  const listas = V.filter(comisionLista).reduce((a, p) => a + comision(p), 0);
  const enEspera = V.filter(p => p.pagoEstado === 'pagado' && !p.comisionPagada && p.estado !== 'cancelado' && !comisionLista(p)).reduce((a, p) => a + comision(p), 0);
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
      <div class="kpi"><small>Lista para cobrar</small><b>${euros(listas)}</b><span>pagada y fuera del plazo de desistimiento</span></div>
      <div class="kpi"><small>En espera</small><b>${euros(enEspera)}</b><span>${ESPERA_COMISION} días de desistimiento del cliente</span></div>
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
      const { default: qrcode } = await import('../vendor/qrcode.js');
      const q = qrcode(0, 'M'); q.addData(enlace); q.make();
      const url = q.createDataURL(8, 16);
      box.innerHTML = `<img src="${url}" alt="Código QR de tu enlace" width="220" height="220"><div><b>Tu código QR</b><p class="muted">Imprímelo en tarjetas o enséñalo en el móvil: al escanearlo se abre la web con tu enlace de ventas.</p><a class="btn btn-sm btn-primary" href="${url}" download="qr-${CONFIG.marca.toLowerCase()}.gif">${icono('download')}<span>Descargar</span></a></div>`;
      box.hidden = false;
    } catch { toast('No se ha podido crear el código QR.', 'err'); }
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
let fMios = 'todos';
function mios() {
  const todos = datos.pedidos.filter(p => p.asignado === U.uid && activo(p));
  // Primero lo que te toca a ti; dentro de cada grupo, lo que se entrega antes
  const orden = p => (siguientePaso(p)?.quien === 'equipo' ? 0 : 1);
  todos.sort((a, b) => orden(a) - orden(b) || fechaEntrega(a) - fechaEntrega(b));
  const tuyos = todos.filter(p => siguientePaso(p)?.quien === 'equipo');
  const espera = todos.filter(p => siguientePaso(p)?.quien === 'cliente');
  const L = fMios === 'tuyos' ? tuyos : fMios === 'cliente' ? espera : todos;
  body.innerHTML = `
    <div class="kpis small">
      <div class="kpi ${tuyos.length ? 'aviso' : ''}"><small>Te toca a ti</small><b>${tuyos.length}</b></div>
      <div class="kpi"><small>Esperando al cliente</small><b>${espera.length}</b></div>
      <div class="kpi"><small>Entregados</small><b>${datos.pedidos.filter(p => p.asignado === U.uid && p.estado === 'entregado').length}</b></div>
    </div>
    ${todos.length ? `<div class="card mios-ent"><div class="card-h"><h3>Tus próximas entregas</h3></div>${entregasHTML(todos, 3)}</div>` : ''}
    ${todos.length ? `<div class="opts filters">${[['todos', 'Todos', todos.length], ['tuyos', 'Te toca', tuyos.length], ['cliente', 'Esperando al cliente', espera.length]].map(([k, t, n]) => `<label class="opt ${!n && k !== 'todos' ? 'cero' : ''}"><input type="radio" name="fmios" value="${k}" ${fMios === k ? 'checked' : ''}><span><i>${t} · ${n}</i></span></label>`).join('')}</div>` : ''}
    <div class="rows card flush">${L.map(p => filaPedido(p)).join('') || (todos.length ? vacio('check', 'Nada por aquí', 'Prueba con otro filtro.') : vacio('coffee', 'No tienes encargos activos', 'Mira en «Disponibles» para coger uno.'))}</div>`;
  $$('input[name=fmios]').forEach(r => r.addEventListener('change', () => { fMios = r.value; mios(); }));
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
    toast(`${todos.length} cliente${todos.length === 1 ? '' : 's'} exportado${todos.length === 1 ? '' : 's'}`, 'ok');
  });
}

/* ---------- Soporte y contacto ---------- */
let fSoporte = 'abierto';
const TIPOS_T = { duda: 'Duda', cambio: 'Cambio en su web', incidencia: 'Incidencia', factura: 'Facturación', presupuesto: 'Presupuesto', espera: 'Lista de espera', trabajo: 'Quiere trabajar', contacto: 'Contacto', baja: 'Baja', llamada: 'Llamada', otro: 'Otro' };
const EST_T = { abierto: ['Sin responder', 'p-pend'], en_curso: ['En curso', 'p-new'], respondido: ['Esperando al cliente', 'p-new'], cerrado: ['Resuelto', 'p-done'] };
const PRIO_T = { alta: ['Alta', 'p-off'], normal: ['Normal', ''], baja: ['Baja', 'p-done'] };
/* Prioridad: la que ponga el equipo; si no, según el tipo (incidencias, pagos y bajas primero) */
const prioridad = t => t.prioridad || (['incidencia', 'factura', 'baja', 'llamada'].includes(t.tipo) ? 'alta' : ['espera', 'trabajo', 'contacto'].includes(t.tipo) ? 'baja' : 'normal');
const PESO_P = { alta: 0, normal: 1, baja: 2 };
/* Horas desde el último mensaje del cliente sin respuesta del equipo */
const sinResponder = t => {
  if (t.estado === 'cerrado' || t.estado === 'respondido') return 0;
  const ult = [...(t.respuestas || [])].reverse().find(r => r.rol !== 'client');
  const ultCli = [...(t.respuestas || [])].reverse().find(r => r.rol === 'client');
  const desde = ult && (!ultCli || ult.t > ultCli.t) ? 0 : (ultCli?.t || t.createdAt);
  return desde ? (Date.now() - desde) / 36e5 : 0;
};
let fPrio = 'todas', fMias = false;
function soporte() {
  const T = datos.tickets;
  const L = T.filter(t => (fSoporte === 'todos' || t.estado === fSoporte || (fSoporte === 'abierto' && t.estado === 'en_curso'))
      && (fPrio === 'todas' || prioridad(t) === fPrio) && (!fMias || t.asignado === U.uid))
    .sort((a, b) => (a.estado === 'cerrado') - (b.estado === 'cerrado') || PESO_P[prioridad(a)] - PESO_P[prioridad(b)] || sinResponder(b) - sinResponder(a) || b.createdAt - a.createdAt);
  const equipo = [...trabajadores(), ...datos.usuarios.filter(u => u.role === 'owner')];
  const cuenta = k => k === 'todos' ? T.length : k === 'abierto' ? T.filter(x => ['abierto', 'en_curso'].includes(x.estado)).length : T.filter(x => x.estado === k).length;
  body.innerHTML = `
    <div class="opts filters">${[['abierto', 'Pendientes'], ['respondido', 'Esperando al cliente'], ['cerrado', 'Resueltos'], ['todos', 'Todos']].map(([k, t]) => `<label class="opt"><input type="radio" name="fsop" value="${k}" ${fSoporte === k ? 'checked' : ''}><span><i>${t} · ${cuenta(k)}</i></span></label>`).join('')}</div>
    <div class="tk-filtros">
      <label class="fc-select"><span>Prioridad</span><select id="tkPrio">${[['todas', 'Todas'], ['alta', 'Alta'], ['normal', 'Normal'], ['baja', 'Baja']].map(([k, t]) => `<option value="${k}" ${fPrio === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="switch-inline"><input type="checkbox" id="tkMias" ${fMias ? 'checked' : ''}> Solo las mías</label>
    </div>
    <div class="tks">${L.map(t => {
      const [txt, cls] = EST_T[t.estado] || EST_T.abierto;
      const [ptxt, pcls] = PRIO_T[prioridad(t)];
      const h = sinResponder(t);
      const p = t.pedido ? datos.pedidos.find(x => x.id === t.pedido) : null;
      return `<article class="card tkc ${h > 24 ? 'tk-tarde' : ''}" data-tk="${t.id}">
        <div class="cand-h">${avatar({ name: t.nombre || '?' })}<div><b>${esc(t.asunto)}</b><small>${esc(t.nombre || 'Sin nombre')} · ${esc(t.email || '')} · ${TIPOS_T[t.tipo] || 'Consulta'} · ${haceCuanto(t.createdAt)}</small></div>
          <span class="tk-pills"><span class="pill ${pcls}">${ptxt}</span><span class="pill ${cls}">${txt}</span></span></div>
        ${h > 24 ? `<p class="tk-aviso">${icono('clock')} Sin respuesta desde hace ${h > 48 ? Math.floor(h / 24) + ' días' : Math.floor(h) + ' h'}</p>` : ''}
        <div class="tk-meta">
          ${p ? `<button type="button" class="link-btn tk-ped" data-open="${p.id}">${icono('bag')} ${esc(neg(p))} · ${refPedido(p.id)}</button>` : ''}
          <label class="fc-select sm"><span>Prioridad</span><select data-tk-prio="${t.id}">${Object.entries(PRIO_T).map(([k, [v]]) => `<option value="${k}" ${prioridad(t) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          ${U.role === 'owner'
            ? `<label class="fc-select sm"><span>Asignada a</span><select data-tk-asig="${t.id}"><option value="">Nadie</option>${equipo.map(w => `<option value="${w.uid}" ${t.asignado === w.uid ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></label>`
            : t.asignado ? `<span class="muted tk-asig">${icono('user')} ${esc(t.asignadoNombre || nombreDe(t.asignado))}</span>` : `<button type="button" class="btn btn-sm btn-ghost" data-tk-mia="${t.id}"><span>Me la quedo</span></button>`}
        </div>
        <div class="tk-hilo">
          <div class="tk-m el"><small>${esc(t.nombre || 'Cliente')} · ${fecha(t.createdAt)}</small><p>${esc(t.mensaje)}</p></div>
          ${(t.respuestas || []).map(r => `<div class="tk-m ${r.rol === 'client' ? 'el' : 'yo'}"><small>${esc(r.autor)} · ${haceCuanto(r.t)}</small><p>${esc(r.texto)}</p></div>`).join('')}
        </div>
        ${t.estado !== 'cerrado' ? `<form class="tk-resp" data-resp="${t.id}"><textarea name="texto" rows="3" placeholder="${t.uid ? 'Respuesta (el cliente la verá en su cuenta)…' : 'Nota de respuesta (este contacto no tiene cuenta: contéstale por correo)'}" maxlength="3000"></textarea>
          <div class="tk-resp-b">${store.iaDisponible() ? `<button type="button" class="btn btn-sm btn-ghost" data-tk-ia="${t.id}">${icono('sparkle')}<span>Sugerir respuesta</span></button>` : ''}<button class="btn btn-sm btn-primary">${icono('send')}<span>${t.uid ? 'Responder' : 'Guardar'}</span></button></div></form>` : ''}
        <div class="cand-btns">
          <a class="btn btn-sm btn-ghost" href="${mailLink(`Re: ${t.asunto}`, `Hola ${(t.nombre || '').split(' ')[0]},\n\n`, t.email)}">${icono('mail')}<span>Responder por correo</span></a>
          ${t.estado === 'abierto' ? `<button class="btn btn-sm btn-ghost" data-tk-curso="${t.id}"><span>Marcar en curso</span></button>` : ''}
          ${t.estado !== 'cerrado' ? `<button class="btn btn-sm btn-ghost" data-tk-cerrar="${t.id}">${icono('check')}<span>Marcar resuelto</span></button>` : `<button class="btn btn-sm btn-ghost" data-tk-abrir="${t.id}"><span>Reabrir</span></button>`}
          ${U.role === 'owner' ? `<button class="btn btn-sm btn-danger" data-tk-borrar="${t.id}"><span>Borrar</span></button>` : ''}
        </div>
      </article>`;
    }).join('') || vacio('help', fSoporte === 'abierto' ? 'No hay consultas pendientes' : 'No hay consultas aquí', 'Las consultas del formulario de contacto y de «Ayuda y soporte» aparecen aquí.')}</div>`;
  $$('input[name=fsop]').forEach(r => r.addEventListener('change', () => { fSoporte = r.value; soporte(); }));
  $('#tkPrio')?.addEventListener('change', e => { fPrio = e.target.value; soporte(); });
  $('#tkMias')?.addEventListener('change', e => { fMias = e.target.checked; soporte(); });
  const cambiarT = (id, cambios, msg) => store.actualizarTicket(id, { ...cambios, actualizado: Date.now() }).then(() => { Object.assign(datos.tickets.find(x => x.id === id) || {}, cambios); toast(msg, 'ok'); soporte(); }, err => toast(err.message, 'err'));
  $$('[data-tk-prio]').forEach(sel => sel.addEventListener('change', () => cambiarT(sel.dataset.tkPrio, { prioridad: sel.value }, `Prioridad: ${PRIO_T[sel.value][0]}`)));
  $$('[data-tk-asig]').forEach(sel => sel.addEventListener('change', () => {
    const w = equipo.find(x => x.uid === sel.value);
    cambiarT(sel.dataset.tkAsig, { asignado: sel.value, asignadoNombre: w?.name || '' }, w ? `Asignada a ${w.name}` : 'Sin asignar');
  }));
  $$('[data-tk-mia]').forEach(b => b.addEventListener('click', () => cambiarT(b.dataset.tkMia, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' }, 'Consulta asignada a ti')));
  $$('[data-tk-curso]').forEach(b => b.addEventListener('click', () => cambiarT(b.dataset.tkCurso, { estado: 'en_curso' }, 'Consulta en curso')));
  // Respuesta sugerida por la IA (con el hilo y el catálogo); el equipo la revisa antes de enviarla
  $$('[data-tk-ia]').forEach(b => b.addEventListener('click', async () => {
    const t = datos.tickets.find(x => x.id === b.dataset.tkIa);
    const area = b.closest('form').texto;
    ocupado(b, true);
    try {
      const hilo = [`Consulta de ${t.nombre || 'un cliente'} (${TIPOS_T[t.tipo] || 'consulta'}): «${t.asunto}». ${t.mensaje}`,
        ...(t.respuestas || []).map(r => `${r.rol === 'client' ? 'Cliente' : 'Equipo'}: ${r.texto}`)].join('\n');
      const r = await store.preguntarIA({ modo: 'chat', catalogo: catalogo(), mensajes: [{ rol: 'user', texto: `Eres del equipo de soporte. Redacta la siguiente respuesta del equipo a este cliente: breve, amable, en español, sin inventar datos que no estén en el catálogo ni prometer fechas. Solo el texto de la respuesta.\n\n${hilo}` }] });
      if (!r?.respuesta) throw new Error('La IA no ha respondido. Prueba otra vez.');
      area.value = r.respuesta.trim();
      area.focus();
      toast('Respuesta sugerida: revísala antes de enviarla', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  }));
  $$('[data-resp]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = f.texto.value.trim();
    if (!texto) return;
    const t = datos.tickets.find(x => x.id === f.dataset.resp);
    await accion(f.querySelector('button[type=submit],button:not([type])'), () => store.responderTicket(t, texto), t.uid ? 'Respuesta enviada. El cliente recibe un aviso.' : 'Respuesta guardada');
  }));
}

/* ---------- PROPIETARIO: Mantenimiento mensual (cuotas, renovaciones y bajas) ---------- */
let fMant = 'todos';
function vistaMantenimiento() {
  const L = datos.pedidos.filter(conMantenimiento);
  const bajas = datos.tickets.filter(t => t.tipo === 'baja' && t.pedido && t.estado !== 'cerrado');
  const est = p => estadoMant(p).id;
  const activos = L.filter(p => ['activo', 'vencido'].includes(est(p)));
  const mrr = activos.reduce((s, p) => s + cuotaMensual(p), 0);
  const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
  const cobradoMes = cuotasPagadas(datos.pedidos, ini.getTime(), Date.now() + 1).reduce((s, c) => s + c.importe, 0);
  const V = L.filter(p => fMant === 'todos' || est(p) === fMant || (fMant === 'baja-pedida' && bajas.some(t => t.pedido === p.id)))
    .sort((a, b) => (est(b) === 'vencido') - (est(a) === 'vencido') || (a.mantenimiento?.proximo || 0) - (b.mantenimiento?.proximo || 0));
  body.innerHTML = `
    <div class="kpis">
      <div class="kpi"><small>Ingresos recurrentes</small><b>${euros(mrr)}<small>/mes</small></b><span>${activos.length} cliente${activos.length === 1 ? '' : 's'} activo${activos.length === 1 ? '' : 's'}</span></div>
      <div class="kpi"><small>Cobrado este mes</small><b>${euros(cobradoMes)}</b><span>cuotas registradas</span></div>
      <div class="kpi"><small>Cuotas vencidas</small><b>${L.filter(p => est(p) === 'vencido').length}</b><span>más de 3 días sin pagar</span></div>
      <div class="kpi"><small>Sin activar</small><b>${L.filter(p => est(p) === 'sin').length}</b><span>webs entregadas con cuota</span></div>
    </div>
    <div class="opts filters">${[['todos', 'Todos'], ['vencido', 'Vencidas'], ['sin', 'Sin activar'], ['activo', 'Al día'], ['pausado', 'Pausados'], ['baja', 'De baja'], ['baja-pedida', `Piden la baja · ${bajas.length}`]].map(([k, t]) => `<label class="opt"><input type="radio" name="fmant" value="${k}" ${fMant === k ? 'checked' : ''}><span><i>${t}</i></span></label>`).join('')}</div>
    <div class="card flush rows">${V.map(p => {
      const e = estadoMant(p), m = p.mantenimiento, pide = bajas.find(t => t.pedido === p.id);
      return `<article class="row mant-row">
        <div class="row-main" data-open="${p.id}" role="button" tabindex="0"><div class="row-t"><b>${esc(neg(p))}</b><span class="pill ${e.cls}">${e.txt}</span>${pide ? '<span class="pill p-off">Pide la baja</span>' : ''}</div>
          <small>${esc(p.clienteNombre || '')} · ${esc(conceptosMensuales(p).join(' · '))} · ${euros(cuotaMensual(p))}/mes${m?.proximo && m.estado === 'activo' ? ` · próximo cobro ${fecha(m.proximo)}` : ''}${m?.cuotas?.length ? ` · ${m.cuotas.length} cuota${m.cuotas.length === 1 ? '' : 's'} pagada${m.cuotas.length === 1 ? '' : 's'}` : ''}</small></div>
        <div class="mant-acc">
          ${!m ? `<button class="btn btn-sm btn-primary" data-mant="activar" data-id="${p.id}"><span>Activar</span></button>` : ''}
          ${m && m.estado !== 'baja' ? `<button class="btn btn-sm btn-primary" data-mant="cuota" data-id="${p.id}"><span>Registrar cuota de ${esc(nombrePeriodo(periodo(m.proximo || Date.now())))}</span></button>` : ''}
          ${m?.estado === 'activo' ? `<button class="btn btn-sm btn-ghost" data-mant="pausar" data-id="${p.id}"><span>Pausar</span></button>` : ''}
          ${m?.estado === 'pausado' ? `<button class="btn btn-sm btn-ghost" data-mant="reanudar" data-id="${p.id}"><span>Reanudar</span></button>` : ''}
          ${m && m.estado !== 'baja' ? `<button class="btn btn-sm btn-ghost" data-mant="baja" data-id="${p.id}"><span>Dar de baja</span></button>` : ''}
          ${m?.estado === 'baja' ? `<button class="btn btn-sm btn-ghost" data-mant="reactivar" data-id="${p.id}"><span>Reactivar</span></button>` : ''}
        </div>
      </article>`;
    }).join('') || vacio('refresh', 'No hay mantenimientos aquí', 'Aparecen las webs entregadas que llevan algún extra mensual (mantenimiento, correo…).')}</div>
    <p class="muted hint">${icono('bulb')} Al registrar una cuota se le envía al cliente su factura por correo y el próximo cobro pasa al mes siguiente. Las bajas que piden los clientes llegan también a Soporte.</p>`;
  $$('input[name=fmant]').forEach(r => r.addEventListener('change', () => { fMant = r.value; vistaMantenimiento(); }));
  $$('[data-mant]').forEach(b => b.addEventListener('click', async () => {
    const p = datos.pedidos.find(x => x.id === b.dataset.id), m = p.mantenimiento;
    let cambios, msg, hito;
    try {
      if (b.dataset.mant === 'activar') { cambios = activarMant(p); msg = 'Mantenimiento activado'; hito = `Mantenimiento activado (${euros(cuotaMensual(p))}/mes)`; }
      if (b.dataset.mant === 'cuota') {
        const metodo = prompt('¿Cómo ha pagado? Escribe «bizum» o «transferencia»', p.pagoMetodo || 'transferencia');
        if (metodo === null) return;
        cambios = registrarCuota(p, /biz/i.test(metodo) ? 'bizum' : 'transferencia');
        const c = cambios.cuotas.at(-1); msg = `Cuota de ${nombrePeriodo(c.periodo)} registrada`; hito = `Cuota de mantenimiento de ${nombrePeriodo(c.periodo)} pagada (${euros(c.importe)})`;
      }
      if (b.dataset.mant === 'pausar') { cambios = { ...m, estado: 'pausado' }; msg = hito = 'Mantenimiento pausado'; }
      if (b.dataset.mant === 'reanudar') { cambios = { ...m, estado: 'activo', proximo: Math.max(m.proximo || 0, Date.now()) }; msg = hito = 'Mantenimiento reanudado'; }
      if (b.dataset.mant === 'reactivar') { cambios = { ...activarMant(p), cuotas: m.cuotas || [] }; msg = hito = 'Mantenimiento reactivado'; }
      if (b.dataset.mant === 'baja') {
        const motivo = prompt(`¿Dar de baja el mantenimiento de ${neg(p)}? Escribe el motivo (opcional).`, '');
        if (motivo === null) return;
        cambios = { ...m, estado: 'baja', baja: Date.now(), motivoBaja: motivo.slice(0, 200) }; msg = 'Mantenimiento dado de baja'; hito = `Mantenimiento dado de baja${motivo ? `: ${motivo.slice(0, 200)}` : ''}`;
      }
    } catch (err) { return toast(err.message, 'err'); }
    await accion(b, async () => {
      await store.actualizarPedido(p.id, conHistorial(p, { mantenimiento: cambios }, hito, U.name));
      if (b.dataset.mant === 'baja') for (const t of bajas.filter(t => t.pedido === p.id)) await store.responderTicket(t, 'Hemos tramitado tu baja del mantenimiento. Tu web sigue publicada. Gracias por confiar en nosotros.').then(() => store.actualizarTicket(t.id, { estado: 'cerrado', cerrado: Date.now() })).catch(() => {});
      if (b.dataset.mant === 'cuota') store.enviarCorreoPago(p.id, `cuota-${cambios.cuotas.at(-1).periodo}`).catch(err => toast(`Cuota guardada, pero la factura no se ha enviado: ${err.message}`, 'err'));
    }, msg);
  }));
}

/* ---------- PROPIETARIO: Finanzas (ingresos, gastos, comisiones y beneficio) ---------- */
const CATS_G = { herramientas: 'Herramientas y software', dominios: 'Dominios y alojamiento', publicidad: 'Publicidad', comisiones: 'Comisiones', impuestos: 'Impuestos y tasas', material: 'Material', formacion: 'Formación', otros: 'Otros' };
let fFin = 'mes', gastosCache;
async function finanzas() {
  body.innerHTML = cargandoHTML('Cargando finanzas…');
  try { gastosCache = await store.listarGastos(); } catch (err) { gastosCache = []; toast(err.message, 'err'); }
  pintarFinanzas();
}
function pintarFinanzas() {
  const ahora = new Date();
  const desde = fFin === 'mes' ? new Date(ahora.getFullYear(), ahora.getMonth(), 1) : fFin === 'trimestre' ? new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1) : new Date(ahora.getFullYear(), 0, 1);
  const d0 = desde.getTime(), d1 = Date.now() + 1;
  const P = datos.pedidos.filter(p => p.estado !== 'cancelado');
  // Ingresos cobrados en el periodo: señal / total (por la fecha del historial de pagos), cuotas y cambios extra pagados
  const senal = p => Math.round((p.total || 0) * (CONFIG.senal ?? 50)) / 100;
  const huboSenal = (p, t) => (p.historial || []).some(x => /^Pago: Señal pagada/.test(x.texto) && x.t < t);
  const pagosPedido = P.flatMap(p => (p.historial || []).filter(h => /^Pago: (Pagado|Señal pagada)/.test(h.texto) && h.t >= d0 && h.t < d1)
    .map(h => ({ t: h.t, p, importe: /Señal/.test(h.texto) ? senal(p) : (p.total || 0) - (huboSenal(p, h.t) ? senal(p) : 0), concepto: 'Web' })))
    // Pedidos antiguos sin el pago en el historial: cuenta el total en la fecha de pago
    .concat(P.filter(p => p.pagoEstado === 'pagado' && !(p.historial || []).some(h => /^Pago: /.test(h.texto)) && pagadoEn(p) >= d0 && pagadoEn(p) < d1).map(p => ({ t: pagadoEn(p), p, importe: p.total || 0, concepto: 'Web' })));
  const cuotas = cuotasPagadas(P, d0, d1).map(c => ({ t: c.pagado, p: c.p, importe: c.importe, concepto: 'Mantenimiento' }));
  const extras = P.flatMap(p => (p.cambiosExtra || []).filter(x => x.estado === 'pagado' && x.pagado >= d0 && x.pagado < d1).map(x => ({ t: x.pagado, p, importe: x.importe, concepto: 'Cambio extra' })));
  const ingresos = [...pagosPedido, ...cuotas, ...extras];
  const totalIng = ingresos.reduce((s, x) => s + x.importe, 0);
  const comis = datos.pedidos.filter(p => p.comisionPagada >= d0 && p.comisionPagada < d1).reduce((s, p) => s + comision(p), 0);
  const G = (gastosCache || []).filter(g => { const t = Date.parse(g.fecha); return t >= d0 && t < d1; });
  const totalG = G.reduce((s, g) => s + g.importe, 0);
  const benef = totalIng - totalG - comis;
  const porCat = Object.entries(G.reduce((a, g) => { a[g.categoria] = (a[g.categoria] || 0) + g.importe; return a; }, {})).sort((a, b) => b[1] - a[1]);
  body.innerHTML = `
    <div class="opts filters">${[['mes', 'Este mes'], ['trimestre', 'Este trimestre'], ['anio', 'Este año']].map(([k, t]) => `<label class="opt"><input type="radio" name="ffin" value="${k}" ${fFin === k ? 'checked' : ''}><span><i>${t}</i></span></label>`).join('')}</div>
    <div class="kpis">
      <div class="kpi"><small>Ingresos cobrados</small><b>${euros(totalIng)}</b><span>webs, cuotas y cambios extra</span></div>
      <div class="kpi"><small>Gastos</small><b>${euros(totalG)}</b><span>${G.length} gasto${G.length === 1 ? '' : 's'}</span></div>
      <div class="kpi"><small>Comisiones pagadas</small><b>${euros(comis)}</b><span>a vendedores</span></div>
      <div class="kpi ${benef < 0 ? 'neg' : ''}"><small>Beneficio</small><b>${euros(benef)}</b><span>ingresos − gastos − comisiones</span></div>
    </div>
    <div class="cols">
      <div class="card">
        <div class="card-h"><h3>Gastos</h3>${gastosCache ? '<button class="btn btn-sm btn-primary" id="gNuevo">' + icono('plus') + '<span>Añadir gasto</span></button>' : ''}</div>
        ${gastosCache === null ? `<div class="empty"><div class="em">${icono('lock')}</div><b>Falta activar los gastos</b><p>Ejecuta <code>supabase/migraciones/v88-plataforma.sql</code> en Supabase → SQL Editor una sola vez y recarga.</p></div>`
        : `<form class="g-form card" id="gForm" hidden novalidate>
            <input type="hidden" name="id">
            <div class="g-grid">
              ${campo({ id: 'gConcepto', name: 'concepto', label: 'Concepto', required: true, attrs: 'maxlength="200"' })}
              ${campo({ id: 'gImporte', name: 'importe', label: 'Importe (€, IVA incluido)', type: 'number', required: true, attrs: 'min="0" step="0.01" inputmode="decimal"' })}
              ${campo({ id: 'gFecha', name: 'fecha', label: 'Fecha', type: 'date', required: true, value: new Date().toISOString().slice(0, 10) })}
              <label class="fc-select"><span>Categoría</span><select name="categoria">${Object.entries(CATS_G).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
              ${campo({ id: 'gIva', name: 'iva', label: 'IVA incluido (%)', type: 'number', value: '21', attrs: 'min="0" max="30" step="1" inputmode="numeric"' })}
              <label class="switch-inline"><input type="checkbox" name="recurrente"> Se repite cada mes</label>
            </div>
            ${campo({ id: 'gNota', name: 'nota', label: 'Nota (opcional)', type: 'textarea', attrs: 'maxlength="500" rows="2"' })}
            <div class="cand-btns"><button class="btn btn-sm btn-primary" type="submit"><span>Guardar gasto</span></button><button class="btn btn-sm btn-ghost" type="button" id="gCancelar"><span>Cancelar</span></button></div>
          </form>
          <div class="rows">${G.map(g => `<article class="row g-row"><div class="row-main"><div class="row-t"><b>${esc(g.concepto)}</b>${g.recurrente ? '<span class="pill">Mensual</span>' : ''}</div><small>${fecha(Date.parse(g.fecha))} · ${CATS_G[g.categoria] || g.categoria}${g.iva ? ` · IVA ${g.iva} % (${euros(g.importe - g.importe / (1 + g.iva / 100))})` : ''}${g.nota ? ` · ${esc(g.nota)}` : ''}</small></div>
            <div class="row-side"><b class="row-price">−${euros(g.importe)}</b><button class="icon-btn sm" data-g-edit="${g.id}" aria-label="Editar">${icono('pen')}</button><button class="icon-btn sm" data-g-del="${g.id}" aria-label="Borrar">${icono('trash')}</button></div></article>`).join('') || vacio('receipt', 'Sin gastos en este periodo')}</div>`}
      </div>
      <div class="card">
        <div class="card-h"><h3>Ingresos del periodo</h3><button class="btn btn-sm btn-ghost" id="finCsv">${icono('download')}<span>CSV</span></button></div>
        <div class="rows">${ingresos.sort((a, b) => b.t - a.t).slice(0, 40).map(x => `<article class="row" data-open="${x.p.id}" role="button" tabindex="0"><div class="row-main"><b>${esc(neg(x.p))}</b><small>${x.concepto} · ${fecha(x.t)}</small></div><div class="row-side"><b class="row-price">+${euros(x.importe)}</b></div></article>`).join('') || vacio('euro', 'Sin cobros en este periodo')}</div>
        ${porCat.length ? `<div class="card-h" style="margin-top:22px"><h3>Gastos por categoría</h3></div>${porCat.map(([k, v]) => `<div class="kv"><span>${CATS_G[k] || k}</span><b>${euros(v)}</b></div>`).join('')}` : ''}
      </div>
    </div>`;
  $$('input[name=ffin]').forEach(r => r.addEventListener('change', () => { fFin = r.value; pintarFinanzas(); }));
  const form = $('#gForm');
  const abrirForm = g => { form.hidden = false; form.reset(); form.id.value = g?.id || ''; if (g) { form.concepto.value = g.concepto; form.importe.value = g.importe; form.fecha.value = g.fecha; form.categoria.value = g.categoria; form.iva.value = g.iva; form.recurrente.checked = g.recurrente; form.nota.value = g.nota; } form.concepto.focus(); };
  $('#gNuevo')?.addEventListener('click', () => abrirForm());
  $('#gCancelar')?.addEventListener('click', () => { form.hidden = true; });
  $$('[data-g-edit]').forEach(b => b.addEventListener('click', () => abrirForm(gastosCache.find(g => g.id === b.dataset.gEdit))));
  $$('[data-g-del]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar este gasto?')) return;
    ocupado(b, true);
    try { await store.borrarGasto(b.dataset.gDel); toast('Gasto borrado', 'ok'); await finanzas(); } catch (err) { toast(err.message, 'err'); ocupado(b, false); }
  }));
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form), btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    try {
      await store.guardarGasto({ id: f.get('id') || '', concepto: f.get('concepto'), importe: f.get('importe'), fecha: f.get('fecha'), categoria: f.get('categoria'), iva: f.get('iva'), recurrente: f.get('recurrente') === 'on', nota: f.get('nota') });
      toast('Gasto guardado', 'ok'); await finanzas();
    } catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
  });
  $('#finCsv')?.addEventListener('click', () => {
    const filas = [['Tipo', 'Fecha', 'Concepto', 'Cliente / categoría', 'Importe'],
      ...ingresos.map(x => ['Ingreso', new Date(x.t).toLocaleDateString('es-ES'), x.concepto, neg(x.p), String(x.importe).replace('.', ',')]),
      ...G.map(g => ['Gasto', new Date(g.fecha).toLocaleDateString('es-ES'), g.concepto, CATS_G[g.categoria] || g.categoria, String(-g.importe).replace('.', ',')])];
    descargar(`finanzas-${fFin}-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
  });
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
        alert(`Datos de cobro de ${u?.name || 'vendedor'}\n\nTitular: ${c.cobroTitular || '—'}\nIBAN: ${c.cobroIban || '—'}\nNIF: ${c.nif || '—'}`);
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
  const paso = siguientePaso(p);
  const recordar = paso?.quien === 'cliente' && puedeEditar && RECORDATORIOS[etapaDe(p)];

  box.innerHTML = `
    <div class="od-head">
      <div class="od-head-t">${metaHTML([refPedido(p.id), fecha(p.createdAt)])}<h2 id="odTitle">${esc(neg(p))}</h2>${metaHTML([p.planNombre, pl ? 'Diseño ' + pl.nombre : 'Diseño a medida'])}</div>
      <div class="od-head-r">
        <button class="btn btn-sm btn-ghost od-brief-btn" id="odBrief" title="La IA ordena todo lo del cliente en un prompt y un PDF"><span>Brief con IA</span>${icono('sparkle')}</button>
        <button class="btn btn-sm btn-ghost" id="odFicha" title="Copia en un texto todo lo que ha pedido y enviado el cliente"><span>Copiar ficha</span>${icono('copy')}</button>
        <button class="btn btn-sm btn-ghost" id="odRecibo" title="Resumen imprimible del pedido"><span>Recibo</span>${icono('printer')}</button>
        ${pl ? `<button class="btn btn-sm btn-ghost" id="odExport" title="Descarga el diseño con el nombre y color del cliente"><span>Exportar HTML</span>${icono('download')}</button>` : ''}
        <button class="icon-btn" data-close aria-label="Cerrar">${icono('x')}</button>
      </div>
    </div>
    <div class="od-etapas">
      <div class="od-etapas-h"><span>Etapa del proyecto</span><b>${esc(et.txt)}</b>${puedeEditar ? '<small>Pulsa una etapa para cambiarla. El cliente la ve en «Mis proyectos».</small>' : ''}</div>
      ${barraEtapas(p, { editable: puedeEditar })}
    </div>
    ${p.cancelacion && p.estado !== 'cancelado' ? `<div class="od-alerta">${icono('alert')}<div><b>${p.cancelacion.desistimiento ? 'El cliente ha ejercido su derecho de desistimiento' : 'El cliente pide cancelar el pedido'}</b><small>${new Date(p.cancelacion.t).toLocaleString('es-ES')}${p.cancelacion.motivo ? ' · «' + esc(p.cancelacion.motivo) + '»' : ''}${p.cancelacion.desistimiento ? ` · Confírmaselo por correo y devuélvele lo pagado por transferencia en 14 días como máximo${p.inicioAnticipado ? ' (puedes descontar la parte proporcional del trabajo hecho: pidió empezar antes)' : ''}.` : ''}</small>
        ${p.cancelacion.desistimiento ? `<a class="link-btn" href="${mailLink(`Confirmación de tu desistimiento ${refPedido(p.id)}`, `Hola ${p.clienteNombre.split(' ')[0]},\n\nConfirmamos que hemos recibido tu desistimiento del pedido ${refPedido(p.id)} (${p.planNombre}) el ${new Date(p.cancelacion.t).toLocaleString('es-ES')}. Te devolveremos lo pagado por transferencia en un plazo máximo de 14 días.\n\nUn saludo,\n${CONFIG.marca}`, p.clienteEmail)}">${icono('mail')} Enviar la confirmación por correo</a>` : ''}</div>
      ${esOwner ? `<button class="btn btn-sm btn-danger" id="odCancelSi"><span>Cancelar pedido</span></button><button class="btn btn-sm btn-ghost" id="odCancelNo"><span>Descartar</span></button>` : ''}</div>` : ''}
    <div class="od-body od-cols">
      <section class="od-col">
        <h4 class="od-h">Gestión</h4>
        ${paso ? `<div class="od-paso ${paso.quien}">
          <span class="od-paso-ic">${icono(paso.ic)}</span>
          <div><b>${esc(paso.txt)}</b>
            ${recordar ? `<small>${p.recordado ? `Último recordatorio ${haceCuanto(p.recordado)}` : 'Aún no se le ha recordado'}</small>` : paso.ayuda ? `<small>${esc(paso.ayuda)}</small>` : ''}</div>
          ${recordar ? `<button class="btn btn-sm btn-ghost" id="odRecordar" title="Le escribe un mensaje amable en su proyecto">${icono('bell')}<span>Recordárselo</span></button>` : ''}
        </div>` : ''}
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
            <select id="odPago" ${esOwner ? '' : 'disabled'} ${esOwner ? '' : 'title="Solo el propietario confirma los pagos"'}>${Object.entries(PAGOS).map(([k, v]) => `<option value="${k}" ${pago === k ? 'selected' : ''}>${v.txt}</option>`).join('')}</select></label>
          <p class="od-pay-info">${pago === 'verificando'
            ? `${icono('euro')}<span>El cliente indica que ha pagado ${p.pagoFase === 'resto' ? 'el resto' : 'la señal'} (<b class="nw">${euros(p.pagoFase === 'resto' ? p.total - senal : senal)}</b>) por <b>${METODOS[p.pagoMetodo] || p.pagoMetodo}</b> ${p.pagoAviso ? haceCuanto(p.pagoAviso) : ''}. Compruébalo en tu banco y márcalo como <b>Pagado</b> (o «Señal pagada»).</span>`
            : p.pagoMetodo ? `Último pago por ${METODOS[p.pagoMetodo] || p.pagoMetodo}.` : `Señal: ${euros(senal)} · Resto: ${euros((p.total || 0) - senal)}`}</p>
          ${['senal', 'pagado'].includes(pago) && puedeEditar ? `<div class="od-correo">${(c => c ? `<small>${icono('check')} Factura enviada por correo ${haceCuanto(c)}${p.facturas ? ` · ${esc(Object.values(p.facturas).join(', '))}` : ''}</small>` : '<small>El cliente aún no ha recibido la factura por correo</small>')(Math.max(p.correos?.senal || 0, p.correos?.resto || 0, p.correos?.total || 0))}<button type="button" class="btn btn-sm btn-ghost" id="odCorreo">${icono('mail')}<span>${p.correos ? 'Reenviar factura' : 'Enviar factura'}</span></button></div>` : ''}
        </div>
        ${bloqueWeb(p, puedeEditar)}
        <form class="od-urls" id="odUrls" novalidate>
          ${campo({ id: 'odVista', name: 'urlVista', label: 'Enlace externo de la vista previa (opcional)', type: 'url', value: p.urlVista || '', attrs: puedeEditar ? '' : 'disabled' })}
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
            ${ccoTP && (p.estado === 'entregado' || p.etapa === 'publicada') ? `<a class="icon-btn" href="${mailLink(`¿Qué tal tu nueva web, ${p.clienteNombre.split(' ')[0]}?`, `Hola ${p.clienteNombre.split(' ')[0]},\n\nYa tienes tu web ${neg(p)} publicada. Ha sido un placer trabajar contigo.\n\nSi estás contento con el resultado, me ayudarías mucho dejando tu opinión: recibirás un correo de Trustpilot con un enlace y te lleva un minuto.\n\nGracias,\n${CONFIG.marca}\n`, p.clienteEmail, ccoTP)}" aria-label="Pedir reseña en Trustpilot" title="Pedir reseña en Trustpilot">${icono('star')}</a>` : ''}
            <button class="icon-btn" data-copy="${esc(p.clienteEmail)}" aria-label="Copiar correo">${icono('copy')}</button>
          </div>
        </div>
        <h4 class="od-h">Pedido</h4>
        <div class="kvs">
          ${p.ref ? `<div class="kv"><span>Vendido por</span><b>${esc(nombreDe(p.ref))} · ${PCT} % = ${euros(comision(p))} · ${estadoComision(p)[0].toLowerCase()}</b></div>` : ''}
          ${esOwner && sospechas(p).length ? `<div class="od-alerta ${p.fraudeRevisado ? 'ok' : ''}">${icono('alert')}<span><b>${p.fraudeRevisado ? 'Venta revisada' : 'Comisión retenida para revisar'}</b> ${esc(sospechas(p).join(' · '))}.</span>${p.fraudeRevisado ? '' : '<button type="button" class="btn btn-sm btn-ghost" id="odRevisada"><span>La he revisado: es válida</span></button>'}</div>` : ''}
          ${fila('Tipo de web', p.planNombre)}
          <div class="kv"><span>Empezar</span><b>${p.inicioAnticipado ? 'Ya (lo pidió el cliente)' : p.aceptaTerminos && Date.now() < (p.createdAt || 0) + 14 * 864e5 ? `A partir del ${fecha((p.createdAt || 0) + 14 * 864e5)}` : 'Ya'}</b></div>
          <div class="kv"><span>Diseño</span><b>${pl ? `${esc(pl.nombre)} <a class="link-btn" href="${prevURL}" target="_blank" rel="noopener">ver ${icono('external')}</a>` : 'Desde cero'}</b></div>
          ${fila('Precio base', euros(p.precioBase || 0))}
          ${(p.extras || []).map(x => fila(x.nombre, '+' + euros(x.precio) + (x.mensual ? '/mes' : ''))).join('')}
          ${p.urgente ? fila('Urgente', 'Sí') : ''}
          ${p.descuento ? fila(`Cupón ${p.cupon || ''}`, '−' + euros(p.descuento)) : ''}
          ${recomendadoPor(p) ? `<div class="kv"><span>Recomendado por</span><b>${esc(recomendadoPor(p).name)}${recomendadoPor(p).email ? ` · ${esc(recomendadoPor(p).email)}` : ''} · ${p.premioAmigo ? 'premio dado' : premioPendiente(p) ? `<button type="button" class="link-btn" id="odPremio">Marcar premio dado (${esc(CONFIG.referidos?.premio || 'premio')})</button>` : 'premio cuando pague'}</b></div>` : ''}
          <div class="kv total"><span>Total</span><b>${euros(p.total || 0)}${p.mensual ? ` + ${euros(p.mensual)}/mes` : ''}</b></div>
          ${fila(`Señal (${CONFIG.senal} %)`, euros(senal))}
        </div>
        ${firmaHTML(p.firma, 'Firma del pedido')}
        ${esOwner || (p.cambiosExtra || []).length ? `<h4 class="od-h">Cambios extra</h4>
        <div class="od-extras">
          ${(p.cambiosExtra || []).map(x => `<div class="od-extra"><div><b>${esc(x.concepto)}</b><small>${euros(x.importe)} · <span class="pill ${(ESTADO_EXTRA[x.estado] || [])[1] || ''}">${x.estado === 'propuesto' ? 'Esperando al cliente' : ESTADO_EXTRA[x.estado]?.[0] || x.estado}</span>${x.acuerdo ? ` · aceptado por ${esc(x.acuerdo.nombre)} el ${fecha(x.acuerdo.t)}` : ''}</small>${x.acuerdo?.firma ? firmaHTML({ img: x.acuerdo.firma, nombre: x.acuerdo.nombre, t: x.acuerdo.t }, 'Firma') : ''}</div>
            ${esOwner && x.estado === 'aceptado' ? `<button type="button" class="btn btn-sm btn-primary" data-extra-pagado="${esc(x.id)}"><span>Marcar pagado y enviar factura</span></button>` : ''}
            ${esOwner && x.estado === 'pagado' ? `<button type="button" class="btn btn-sm btn-ghost" data-extra-factura="${esc(x.id)}">${icono('mail')}<span>Reenviar factura</span></button>` : ''}
            ${esOwner && x.estado === 'propuesto' ? `<button type="button" class="icon-btn sm" data-extra-quitar="${esc(x.id)}" aria-label="Retirar presupuesto">${icono('trash')}</button>` : ''}</div>`).join('')}
          ${esOwner ? `<form class="od-extra-form" id="odExtraForm" novalidate>
            ${campo({ id: 'odExConcepto', name: 'concepto', label: 'Qué cambio (p. ej. «Página de reservas»)', required: true, attrs: 'maxlength="120"' })}
            ${campo({ id: 'odExDetalle', name: 'detalle', label: 'Detalle para el cliente (opcional)', type: 'textarea', attrs: 'maxlength="1000" rows="2"' })}
            ${campo({ id: 'odExImporte', name: 'importe', label: 'Precio (€, IVA incluido)', type: 'number', required: true, attrs: 'min="1" max="20000" step="0.01" inputmode="decimal"' })}
            <button class="btn btn-sm btn-ghost" type="submit">${icono('send')}<span>Enviar presupuesto al cliente</span></button>
            <small class="muted">El cliente lo acepta o lo rechaza en «Mis proyectos». Queda guardado el acuerdo con su nombre y la fecha.</small>
          </form>` : ''}
        </div>` : ''}
        ${puedeEditar && (p.publica?.slug || p.urlWeb) ? `<h4 class="od-h">Estadísticas de la web</h4><div id="odEst" class="od-est"><p class="muted">Cargando visitas…</p></div>` : ''}
        ${puedeEditar ? `<h4 class="od-h">Acceso al correo del cliente</h4>
        <div class="od-acceso">
          <p class="muted">Cuando hayas creado su correo (Gmail o con su dominio), pon aquí el usuario y una contraseña temporal: el cliente los ve en su proyecto y se le pide que la cambie.</p>
          <div class="row-2"><input id="odAccUsuario" type="email" autocomplete="off" placeholder="tunegocio@gmail.com" value="${esc(p.accesos?.correo?.usuario || p.dominio?.correo || '')}" aria-label="Usuario del correo"><input id="odAccClave" type="text" autocomplete="off" spellcheck="false" placeholder="Contraseña temporal" value="${esc(p.accesos?.correo?.clave || '')}" aria-label="Contraseña temporal"></div>
          <button type="button" class="btn btn-sm btn-ghost" id="odAccGuardar">${icono('key')}<span>${p.accesos?.correo?.usuario ? 'Actualizar acceso' : 'Dar acceso al cliente'}</span></button>
        </div>` : ''}
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
          <div data-odv="enviado" hidden>${entregasCliente(p, { editable: puedeEditar })}</div>
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

  let ocupadoOd = false;
  const guardar = async (cambios, msg, hito = '') => {
    if (ocupadoOd) return toast('Espera un momento, se está guardando el cambio anterior');
    ocupadoOd = true;
    box.classList.add('od-guardando');
    const y = $('.od-body', box)?.scrollTop || 0;
    let ok = false;
    try {
      if (hito) cambios = conHistorial(p, cambios, hito, U.name);
      await store.actualizarPedido(p.id, cambios);
      Object.assign(p, cambios);
      ok = true;
      if (msg) toast(msg, 'ok');
      pintar();
    } catch (err) {
      toast(`No se ha guardado: ${err.message}`, 'err');
    } finally {
      ocupadoOd = false;
      box.classList.remove('od-guardando');
      // Se vuelve a pintar siempre: si falló, los desplegables vuelven a su valor real
      if (dlg.open) {
        abrirPedido(p.id);
        const b = $('.od-body', box); if (b) b.scrollTop = y;
      }
    }
    return ok;
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
  $('#odPago', box)?.addEventListener('change', async e => {
    const nuevo = e.target.value, antes = pago;
    if (U.role !== 'owner') return toast('Solo el propietario confirma los pagos', 'err');
    if (!(await guardar({ pagoEstado: nuevo, ...(nuevo === 'pagado' ? { pagadoEn: Date.now() } : {}) }, `Pago: ${PAGOS[nuevo].txt}`, `Pago: ${PAGOS[nuevo].txt}`))) return;
    // Pago confirmado: el cliente recibe por correo el resumen del pedido y del pago
    if (nuevo === 'senal') correoPago(p, 'senal');
    else if (nuevo === 'pagado') correoPago(p, antes === 'senal' || p.pagoFase === 'resto' || p.correos?.senal ? 'resto' : 'total');
  });
  $('#odCorreo', box)?.addEventListener('click', e => {
    const ultimo = p.pagoEstado === 'senal' ? 'senal' : p.correos?.senal || p.pagoFase === 'resto' ? 'resto' : 'total';
    correoPago(p, ultimo, { reenviar: true, btn: e.currentTarget });
  });
  $('#odFecha', box)?.addEventListener('change', e => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    guardar({ fechaEntrega: new Date(y, m - 1, d, 18).getTime() }, 'Fecha de entrega actualizada', `Nueva fecha de entrega: ${d}/${m}/${y}`);
  });
  $('#odRecibo', box)?.addEventListener('click', () => abrirRecibo(p, ''));
  $('#odAccGuardar', box)?.addEventListener('click', () => {
    const usuario = $('#odAccUsuario', box).value.trim(), clave = $('#odAccClave', box).value.trim();
    if (!/^\S+@\S+\.\S+$/.test(usuario)) return toast('Escribe el correo completo del cliente', 'err');
    if (clave.length < 8) return toast('La contraseña temporal debe tener al menos 8 caracteres', 'err');
    guardar({ accesos: { ...(p.accesos || {}), correo: { usuario, clave, fecha: Date.now() } } }, 'Acceso guardado: el cliente ya lo ve en su proyecto', `Acceso al correo entregado (${usuario})`);
  });
  // Cambios extra: el propietario propone, el cliente acepta online y aquí se confirma el pago
  const extras = () => (p.cambiosExtra || []).map(x => ({ ...x }));
  $('#odExtraForm', box)?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), imp = Number(String(f.get('importe')).replace(',', '.'));
    if (!String(f.get('concepto')).trim()) return toast('Escribe qué cambio es', 'err');
    if (!(imp >= 1 && imp <= 20000)) return toast('Pon un precio entre 1 y 20 000 €', 'err');
    const x = nuevoExtra(f.get('concepto'), f.get('detalle'), imp);
    guardar({ cambiosExtra: [...extras(), x] }, 'Presupuesto enviado: el cliente lo verá en su proyecto', `Presupuesto de cambio extra: ${x.concepto} (${euros(x.importe)})`)
      .then(ok => ok && store.enviarMensaje(p.id, `Te hemos preparado un presupuesto: «${x.concepto}» por ${euros(x.importe)}. Puedes aceptarlo o rechazarlo en tu proyecto.`).catch(() => {}));
  });
  $$('[data-extra-quitar]', box).forEach(b => b.addEventListener('click', () => {
    if (!confirm('¿Retirar este presupuesto? El cliente dejará de verlo.')) return;
    const x = extras().find(y => y.id === b.dataset.extraQuitar);
    guardar({ cambiosExtra: extras().filter(y => y.id !== x.id) }, 'Presupuesto retirado', `Presupuesto retirado: ${x.concepto}`);
  }));
  $$('[data-extra-pagado]', box).forEach(b => b.addEventListener('click', async () => {
    const L = extras(), x = L.find(y => y.id === b.dataset.extraPagado);
    if (!confirm(`¿Has recibido ${euros(x.importe)} por «${x.concepto}»? Se le enviará la factura al cliente.`)) return;
    x.estado = 'pagado'; x.pagado = Date.now();
    if (await guardar({ cambiosExtra: L }, 'Cambio extra marcado como pagado', `Cambio extra pagado: ${x.concepto} (${euros(x.importe)})`))
      store.enviarCorreoPago(p.id, `extra-${x.id}`).then(() => toast('Factura enviada al cliente', 'ok')).catch(err => toast(`La factura no se ha enviado: ${err.message}`, 'err'));
  }));
  $$('[data-extra-factura]', box).forEach(b => b.addEventListener('click', () => accion(b, () => store.enviarCorreoPago(p.id, `extra-${b.dataset.extraFactura}`, { reenviar: true }), 'Factura reenviada')));
  if ($('#odEst', box)) store.estadisticasWeb(p.id, 30).then(f => { const el = $('#odEst', box); if (el) el.innerHTML = estadisticasHTML(resumirVisitas(f, 30), 30); })
    .catch(err => { const el = $('#odEst', box); if (el) el.innerHTML = `<p class="muted">${esc(err.message)}</p>`; });
  $('#odRevisada', box)?.addEventListener('click', () => guardar({ fraudeRevisado: Date.now() }, 'Venta marcada como revisada', 'Venta revisada: comisión liberada'));
  $('#odPremio', box)?.addEventListener('click', () => guardar({ premioAmigo: Date.now() }, 'Premio marcado como dado', `Premio por recomendación dado a ${recomendadoPor(p)?.name || 'quien recomendó'}`));
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
  $('#odFicha', box)?.addEventListener('click', () => copiar(fichaTexto(p)));
  $('#odBrief', box)?.addEventListener('click', () => abrirBrief(p));
  $('#odRecordar', box)?.addEventListener('click', async e => {
    const b = e.currentTarget;
    if (p.recordado && Date.now() - p.recordado < 864e5 && !confirm('Ya se le recordó hace menos de un día. ¿Enviar otro recordatorio?')) return;
    ocupado(b, true);
    try {
      await store.enviarMensaje(p.id, RECORDATORIOS[etapaDe(p)](p));
      await guardar({ recordado: Date.now() }, 'Recordatorio enviado. El cliente recibe un aviso.', 'Recordatorio enviado al cliente');
    } catch (err) { toast(err.message, 'err'); ocupado(b, false); }
  });
  // Cambios que ha pedido el cliente: el equipo los marca como hechos
  $$('[data-hecho]', box).forEach(c => c.addEventListener('change', () => {
    const rv = p.revision || {};
    const comentarios = (rv.comentarios || []).map((x, i) => (i === +c.dataset.hecho ? { ...x, hecho: c.checked ? Date.now() : 0 } : x));
    const quedan = comentarios.filter(x => !x.hecho).length;
    odPest = 'enviado';
    guardar({ revision: { ...rv, comentarios } }, quedan ? `Quedan ${quedan} cambio${quedan === 1 ? '' : 's'} por hacer` : 'Todos los cambios hechos. Sube la versión nueva y envíasela.');
  }));
  montarWeb(p, puedeEditar, guardar);
  $('#odCoger', box)?.addEventListener('click', async e => {
    const b = e.currentTarget;
    ocupado(b, true);
    try {
      await coger(p.id);
      Object.assign(p, { asignado: U.uid, asignadoNombre: U.name, estado: 'en_curso' });
      toast('Encargo asignado a ti', 'ok');
      pintar(); abrirPedido(p.id);
    } catch (err) { toast(err.message, 'err'); ocupado(b, false); }
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
    catch (err) {
      if (!err.conFacturas) return toast(err.message, 'err');
      if (p.estado === 'cancelado') return toast('Este pedido tiene facturas emitidas: se queda guardado como cancelado (la ley obliga a conservar las facturas).');
      if (confirm('Este pedido tiene facturas emitidas y no se puede borrar: la ley obliga a conservarlas.\n\n¿Lo marcamos como cancelado? Seguirá guardado con sus facturas, pero fuera de los pedidos activos.')) guardar({ estado: 'cancelado' }, 'Pedido cancelado');
    }
  });
  if (!dlg.open) abrir(dlg);
}

/* ==========================================================
   WEB DEL CLIENTE: versiones subidas por el equipo
   Se sube el .zip, la carpeta o el index.html con sus archivos;
   cada subida es una versión nueva que se puede ver, descargar,
   enviar al cliente para que la revise o borrar.
   ========================================================== */
const versionesDe = p => (p.webs || []).slice().sort((a, b) => b.n - a.n);
function bloqueWeb(p, puedeEditar) {
  const vs = versionesDe(p);
  const pendientes = (p.revision?.comentarios || []).filter(c => !c.hecho).length;
  return `<section class="od-web" aria-labelledby="odWebT">
    <div class="od-web-h"><b id="odWebT">Web del cliente</b>${vs.length ? `<small>${vs.length} versi${vs.length === 1 ? 'ón' : 'ones'}</small>` : ''}
      <button type="button" class="link-btn" id="odBajarCli" title="Fotos, logotipo y documentos que ha subido el cliente, en un .zip">${icono('download')} Archivos del cliente</button></div>
    ${p.revision?.estado === 'cambios' && pendientes ? `<p class="od-web-aviso">${icono('alert')}<span>El cliente ha pedido ${pendientes} cambio${pendientes === 1 ? '' : 's'}. Márcalos como hechos en «Del cliente» y sube la versión nueva.</span></p>` : ''}
    ${puedeEditar ? `
    <div class="od-drop" id="odDrop" role="group" aria-label="Subir una versión de la web">
      <span class="od-drop-ic">${icono('upload')}</span>
      <span class="od-drop-t"><b>Subir una versión</b><small>Arrastra aquí el .zip, la carpeta o el index.html con sus archivos</small></span>
      <span class="od-drop-btns">
        <label class="btn btn-sm btn-primary"><input type="file" id="odWebIn" multiple hidden accept=".zip,.html,.htm,.css,.js,.mjs,.json,.svg,.webmanifest,image/*,video/*,audio/*,.woff,.woff2,.ttf,.otf">${icono('file')}<span>Archivos o .zip</span></label>
        <label class="btn btn-sm btn-ghost"><input type="file" id="odWebDir" hidden webkitdirectory directory multiple>${icono('folder')}<span>Carpeta</span></label>
      </span>
    </div>
    <div class="od-prep" id="odPrep" hidden></div>` : ''}
    ${vs.length ? `<ul class="od-vers">${vs.map(v => {
      const cli = p.webCliente === v.id, nCli = vs.find(w => w.id === p.webCliente)?.n || 0;
      return `<li class="${cli ? 'cli' : ''}">
        <button type="button" class="od-ver" data-ver-v="${esc(v.id)}" title="Ver la versión ${v.n}">
          <span class="od-ver-n">v${v.n}</span>
          <span class="od-ver-t"><b>${cli ? 'La ve el cliente' : `Versión ${v.n}`}</b><small>${haceCuanto(v.t)}${v.autor ? ` · ${esc(v.autor)}` : ''} · ${tamano(v.bytes || 0)}${v.paginas?.length > 1 ? ` · ${v.paginas.length} páginas` : ''}</small>${v.nota ? `<small class="od-ver-nota">${esc(v.nota)}</small>` : ''}</span>
          ${icono('eye')}
        </button>
        ${puedeEditar ? `<span class="od-ver-acc">
          ${cli ? '' : v.n < nCli ? `<button type="button" class="btn btn-sm btn-ghost" data-enviar-v="${esc(v.id)}" title="Vuelve a enviar esta versión anterior al cliente: no se borra ninguna">${icono('refresh')}<span>Restaurar</span></button>` : `<button type="button" class="btn btn-sm btn-ghost" data-enviar-v="${esc(v.id)}">${icono('send')}<span>Enviar</span></button>`}
          <button type="button" class="icon-btn sm" data-seo-v="${esc(v.id)}" aria-label="Revisar el SEO de la versión ${v.n}" title="Revisar SEO">${icono('search')}</button>
          <button type="button" class="icon-btn sm" data-borrar-v="${esc(v.id)}" aria-label="Borrar la versión ${v.n}" title="Borrar">${icono('trash')}</button>
        </span>` : ''}
      </li>`;
    }).join('')}</ul><div id="odSeo" aria-live="polite"></div>${puedeEditar ? bloquePublica(p, vs) : p.publica?.slug ? `<p class="od-pub-ok">${icono('globe')} <a href="${esc(urlPublica(p.publica.slug))}" target="_blank" rel="noopener">${esc(urlPublica(p.publica.slug).replace(/^https?:\/\//, ''))}</a></p>` : ''}` : `<p class="od-web-vacio">${puedeEditar ? 'Todavía no hay ninguna versión. Cuando subas la primera, podrás verla en móvil, tableta y ordenador y enviársela al cliente para que la apruebe.' : 'Todavía no hay ninguna versión subida.'}</p>`}
  </section>`;
}

/* Enlace público aurevixweb.es/<nombre> */
const urlPublica = slug => `${CONFIG.dominio ? 'https://' + CONFIG.dominio.replace(/^https?:\/\//, '').replace(/\/$/, '') : location.origin}/${slug}`;
function bloquePublica(p, vs) {
  const pub = p.publica?.slug ? p.publica : null;
  const vPub = pub && vs.find(v => v.id === pub.version);
  const elegida = (pub && vPub) ? vPub.id : (p.webCliente || vs[0].id);
  const opciones = vs.map(v => `<option value="${esc(v.id)}"${v.id === elegida ? ' selected' : ''}>Versión ${v.n}${p.webCliente === v.id ? ' (la ve el cliente)' : ''}</option>`).join('');
  const sugerido = pub?.slug || store.aSlug(p.respuestas?.negocio || neg(p));
  return `<div class="od-pub" id="odPub">
    <div class="od-pub-h">${icono('globe')}<b>Enlace público</b>${pub ? `<span class="pill p-done">Publicada</span>` : ''}</div>
    ${pub ? `<p class="od-pub-link"><a href="${esc(urlPublica(pub.slug))}" target="_blank" rel="noopener">${esc(urlPublica(pub.slug).replace(/^https?:\/\//, ''))}</a>
      <button type="button" class="icon-btn sm" data-copy="${esc(urlPublica(pub.slug))}" aria-label="Copiar enlace">${icono('copy')}</button></p>
      <small class="od-pub-nota">Cualquiera con el enlace ve ${vPub ? `la versión ${vPub.n}` : 'la web'}. El resto de versiones y archivos siguen siendo privados.</small>`
    : `<small class="od-pub-nota">Publica una versión en vuestro dominio para que el cliente la enseñe o la pruebe en cualquier móvil, sin iniciar sesión.</small>`}
    <div class="od-pub-f">
      <label class="od-pub-slug"><span>${esc(urlPublica('').replace(/^https?:\/\//, ''))}</span><input id="odSlug" value="${esc(sugerido)}" maxlength="48" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Nombre del enlace"></label>
      <select id="odPubV" aria-label="Versión que se publica">${opciones}</select>
    </div>
    <div class="od-pub-btns">
      ${pub ? `<button type="button" class="btn btn-sm btn-ghost" id="odDespub">${icono('ban')}<span>Despublicar</span></button>` : ''}
      <button type="button" class="btn btn-sm btn-primary" id="odPublicar">${icono('globe')}<span>${pub ? 'Guardar cambios' : 'Publicar'}</span></button>
    </div>
  </div>`;
}
function montarPublica(p, guardar) {
  const caja = $('#odPub', box);
  if (!caja) return;
  const slug = $('#odSlug', caja);
  slug.addEventListener('input', () => { const l = store.aSlug(slug.value) + (/[-\s]$/.test(slug.value) ? '-' : ''); if (l !== slug.value) slug.value = l; });
  $('#odPublicar', caja).addEventListener('click', async e => {
    const btn = e.currentTarget;
    const nombre = store.aSlug(slug.value), v = (p.webs || []).find(w => w.id === $('#odPubV', caja).value);
    const motivo = store.motivoSlug(nombre);
    if (motivo) return toast(motivo, 'err');
    if (!v) return;
    ocupado(btn, true);
    try {
      const nuevo = !p.publica?.slug || p.publica.slug !== nombre;
      const pub = await store.publicarWeb(p, v, nombre);
      const ok = await guardar({ publica: pub }, `Publicada en ${urlPublica(nombre).replace(/^https?:\/\//, '')}`, `Web publicada en ${urlPublica(nombre)} (versión ${v.n})`);
      if (ok && nuevo) store.enviarMensaje(p.id, `Tu web ya se puede ver en ${urlPublica(nombre)}\n\nPuedes abrir el enlace en cualquier móvil u ordenador y compartirlo.`).catch(() => {});
    } catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
  });
  $('#odDespub', caja)?.addEventListener('click', async e => {
    if (!confirm('¿Quitar la web del enlace público? Dejará de verse en ese enlace.')) return;
    const btn = e.currentTarget;
    ocupado(btn, true);
    try { await store.despublicarWeb(p); await guardar({ publica: null }, 'Enlace público desactivado', 'Web despublicada'); }
    catch (err) { toast(err.message, 'err'); ocupado(btn, false); }
  });
}

/** Enviar una versión al cliente: pasa a «Revisión» y le llega un mensaje con aviso */
async function enviarVersion(p, v, guardar) {
  const cambios = { webCliente: v.id, revision: { ...(p.revision || {}), estado: 'pendiente', t: Date.now() } };
  if (etapaDe(p) !== 'revision') Object.assign(cambios, { etapa: 'revision', estado: estadoParaEtapa('revision', p.estado) });
  const ok = await guardar(cambios, `Versión ${v.n} enviada. El cliente ya puede verla y aprobarla.`, `Versión ${v.n} enviada al cliente`);
  if (!ok) throw new Error('No se ha podido enviar la versión');
  store.enviarMensaje(p.id, `Ya puedes ver la versión ${v.n} de tu web en «Mis proyectos». Recórrela en el móvil y en el ordenador y, desde la misma vista previa, apruébala o dinos qué cambiarías.${v.nota ? `\n\nEn esta versión: ${v.nota}` : ''}`).catch(() => {});
}

function montarWeb(p, puedeEditar, guardar) {
  const zona = $('.od-web', box);
  if (!zona) return;
  const enlace = (v, pag) => enlaceVista(p, v, pag);
  if (puedeEditar) montarPublica(p, guardar);
  zona.addEventListener('click', async e => {
    const ver = e.target.closest('[data-ver-v]');
    if (ver) {
      const v = (p.webs || []).find(w => w.id === ver.dataset.verV);
      return v && abrirVisor({ p, version: v, modo: 'equipo', enlace, alEnviar: puedeEditar ? w => enviarVersion(p, w, guardar) : null });
    }
    const env = e.target.closest('[data-enviar-v]');
    if (env) {
      const v = (p.webs || []).find(w => w.id === env.dataset.enviarV);
      if (!v) return;
      ocupado(env, true);
      try { await enviarVersion(p, v, guardar); } catch (err) { toast(err.message, 'err'); ocupado(env, false); }
      return;
    }
    const seo = e.target.closest('[data-seo-v]');
    if (seo) {
      const v = (p.webs || []).find(w => w.id === seo.dataset.seoV), caja = $('#odSeo', zona);
      if (!v || !caja) return;
      ocupado(seo, true); caja.innerHTML = `<p class="muted">${icono('search')} Revisando la versión ${v.n}…</p>`;
      try { const m = await import('./seo.js'); caja.innerHTML = m.seoHTML(await m.revisarVersion(v), v); caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      catch (err) { caja.innerHTML = ''; toast(err.message, 'err'); }
      ocupado(seo, false);
      return;
    }
    const bo = e.target.closest('[data-borrar-v]');
    if (bo) {
      const v = (p.webs || []).find(w => w.id === bo.dataset.borrarV);
      if (!v || !confirm(`¿Borrar la versión ${v.n}?${p.webCliente === v.id ? ' El cliente dejará de verla.' : ''} No se puede deshacer.`)) return;
      ocupado(bo, true);
      try {
        if (p.publica?.version === v.id) { await store.despublicarWeb(p); await guardar({ publica: null }, '', ''); }
        await store.borrarWeb(v);
        await guardar({ webs: (p.webs || []).filter(w => w.id !== v.id), ...(p.webCliente === v.id ? { webCliente: '' } : {}) }, `Versión ${v.n} borrada`, `Versión ${v.n} borrada`);
      } catch (err) { toast(err.message, 'err'); ocupado(bo, false); }
      return;
    }
    const cli = e.target.closest('#odBajarCli');
    if (cli) descargarArchivosCliente(p, cli);
  });
  if (!puedeEditar) return;

  const drop = $('#odDrop', zona), prep = $('#odPrep', zona);
  let lista = null;
  async function elegir(files) {
    files = [...files];
    if (!files.length) return;
    prep.hidden = false;
    prep.innerHTML = `<p class="od-prep-c">${icono('refresh')} Revisando los archivos…</p>`;
    try { lista = await prepararArchivos(files); }
    catch (err) { lista = null; prep.innerHTML = `<p class="od-prep-err">${icono('alert')}<span>${esc(err.message)}</span></p>`; return; }
    const n = Math.max(0, ...(p.webs || []).map(w => w.n || 0)) + 1;
    prep.innerHTML = `
      <div class="od-prep-r">${icono('check')}<span><b>Versión ${n}</b> · ${esc(lista.entrada)}${lista.paginas.length > 1 ? ` y ${lista.paginas.length - 1} página${lista.paginas.length === 2 ? '' : 's'} más` : ''} · ${lista.archivos.length} archivo${lista.archivos.length === 1 ? '' : 's'} · ${tamano(lista.bytes)}</span></div>
      ${lista.avisos.map(a => `<p class="od-prep-av">${icono('alert')}<span>${esc(a)}</span></p>`).join('')}
      ${campo({ id: 'odNotaV', label: 'Qué cambia en esta versión (opcional, lo ve el cliente)', type: 'textarea', attrs: 'maxlength="500" rows="2"' })}
      <div class="arch-prog" id="odWebProg" hidden><i></i><span></span></div>
      <div class="od-prep-btns">
        <button type="button" class="btn btn-sm btn-ghost" id="odPrepNo">Cancelar</button>
        <button type="button" class="btn btn-sm btn-ghost" id="odPrepSubir">${icono('upload')}<span>Subir</span></button>
        <button type="button" class="btn btn-sm btn-primary" id="odPrepEnviar">${icono('send')}<span>Subir y enviar al cliente</span></button>
      </div>`;
    etiquetas(prep);
    $('#odPrepNo', prep).addEventListener('click', () => { lista = null; prep.hidden = true; prep.innerHTML = ''; });
    $('#odPrepSubir', prep).addEventListener('click', e => subir(e.currentTarget, false));
    $('#odPrepEnviar', prep).addEventListener('click', e => subir(e.currentTarget, true));
  }
  async function subir(btn, enviar) {
    if (!lista) return;
    const prog = $('#odWebProg', prep);
    $$('.od-prep-btns .btn', prep).forEach(b => (b.disabled = true));
    ocupado(btn, true);
    prog.hidden = false;
    try {
      const v = await crearVersion(p, lista, {
        nota: $('#odNotaV', prep)?.value,
        alProgreso: (hecho, total, ruta) => { $('i', prog).style.width = `${Math.round(hecho / total * 100)}%`; $('span', prog).textContent = `Subiendo ${tamano(hecho)} de ${tamano(total)} · ${ruta}`; }
      });
      const webs = [...(p.webs || []), v];
      const ok = await guardar({ webs }, enviar ? '' : `Versión ${v.n} subida. Ábrela para revisarla antes de enviarla.`, `Versión ${v.n} subida`);
      if (!ok) { await store.borrarWeb(v).catch(() => {}); return; }
      if (enviar) await enviarVersion(p, v, guardar);
    } catch (err) {
      toast(err.message, 'err');
      $$('.od-prep-btns .btn', prep).forEach(b => (b.disabled = false));
      ocupado(btn, false);
      prog.hidden = true;
    }
  }
  $('#odWebIn', zona).addEventListener('change', e => { elegir(e.target.files); e.target.value = ''; });
  $('#odWebDir', zona).addEventListener('change', e => { elegir(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || !drop.contains(e.relatedTarget)) drop.classList.remove('over'); }));
  drop.addEventListener('drop', async e => elegir(await archivosSoltados(e.dataTransfer)));
}

/* Al soltar una carpeta, el navegador solo da la carpeta: se recorre para sacar sus archivos con su ruta */
async function archivosSoltados(dt) {
  const entradas = [...(dt.items || [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entradas.length || entradas.every(x => x.isFile)) return [...dt.files];
  const salida = [];
  const leer = (entrada, ruta) => new Promise(ok => {
    if (entrada.isFile) return entrada.file(f => { const x = new File([f], f.name, { type: f.type }); Object.defineProperty(x, 'webkitRelativePath', { value: ruta + f.name }); salida.push(x); ok(); }, () => ok());
    const lector = entrada.createReader(), hijos = [];
    const tanda = () => lector.readEntries(async L => {
      if (!L.length) { for (const h of hijos) await leer(h, ruta + entrada.name + '/'); return ok(); }
      hijos.push(...L); tanda();
    }, () => ok());
    tanda();
  });
  for (const x of entradas) await leer(x, '');
  return salida;
}

/* ==========================================================
   EXPORTAR EL DISEÑO COMO UN ÚNICO ARCHIVO .HTML
   Se pinta el diseño con el nombre y color del cliente en un
   marco oculto, se copia tal cual y se le añade el código que
   hace funcionar menú, carrito, reservas y animaciones.
   ========================================================== */
/* ---------- Recibo por correo al confirmar un pago ---------- */
async function correoPago(p, fase, { reenviar = false, btn = null } = {}) {
  ocupado(btn, true);
  try {
    const r = await store.enviarCorreoPago(p.id, fase, { reenviar });
    if (r?.demo) toast('Modo demo: con Brevo conectado, el cliente recibiría ahora la factura en PDF por correo', 'ok');
    else if (r?.enviado) {
      const correos = { ...(p.correos || {}), [fase]: Date.now() };
      const facturas = r.factura ? { ...(p.facturas || {}), [fase]: r.factura } : p.facturas;
      await store.actualizarPedido(p.id, { correos, ...(facturas ? { facturas } : {}) });
      p.correos = correos; if (facturas) p.facturas = facturas;
      toast(r.factura ? `Factura ${r.factura} enviada a ${r.para}` : `Recibo enviado por correo a ${r.para}`, 'ok');
      if ($('#orderDlg')?.open) abrirPedido(p.id);
    }
  } catch (err) {
    toast(`El pago está guardado, pero el correo no se ha enviado: ${err.message}`, 'err');
  } finally { ocupado(btn, false); }
}

/* ---------- Brief con IA: prompt + PDF con todo lo del cliente ---------- */
async function abrirBrief(p) {
  let dlg = $('#briefDlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg brief-dlg';
    dlg.id = 'briefDlg';
    dlg.setAttribute('aria-labelledby', 'briefT');
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = `<div class="dlg-box brief-box">
    <div class="brief-head">
      <div><h2 id="briefT">${esc(neg(p))}</h2><p class="brief-sub">${icono('sparkle')} Prompt y PDF con todo lo del cliente</p></div>
      <button class="icon-btn" data-close aria-label="Cerrar">${icono('x')}</button>
    </div>
    <div class="brief-cuerpo" aria-live="polite">
      <div class="brief-carga"><span class="brief-orbe" aria-hidden="true"></span><p id="briefEstado">Reuniendo lo que ha enviado el cliente…</p></div>
    </div></div>`;
  abrir(dlg);
  const estado = t => { const e = $('#briefEstado', dlg); if (e) e.textContent = t; };
  try {
    const m = await import('./brief.js');
    const archivos = await store.listarArchivos(p.id).catch(() => []);
    const b = m.datosBrief(p, archivos);
    estado(store.iaDisponible() ? 'La IA está escribiendo el prompt…' : 'Preparando el prompt…');
    const prompt = await m.promptIA(b);
    if (!dlg.open) return;
    const nDatos = b.secciones.reduce((s, x) => s + x.filas.length, 0);
    $('.brief-cuerpo', dlg).innerHTML = `
      <div class="brief-resumen">
        <span><b>${b.secciones.length}</b> secciones</span><span><b>${nDatos}</b> datos</span><span><b>${archivos.length}</b> archivos</span>
        <span class="brief-origen ${prompt.ia ? 'ia' : ''}">${prompt.ia ? 'Escrito por la IA' : 'Automático, sin IA'}</span>
      </div>
      <label class="brief-label" for="briefTxt">Prompt para crear la web</label>
      <textarea id="briefTxt" class="brief-txt" spellcheck="false">${esc(prompt.texto)}</textarea>
      <p class="brief-nota">Puedes retocarlo aquí: el PDF lleva el texto tal y como lo dejes.</p>
      <div class="brief-acc">
        <button class="btn btn-ghost" id="briefCopiar" type="button">${icono('copy')}<span>Copiar prompt</span></button>
        <button class="btn btn-primary" id="briefPdf" type="button">${icono('download')}<span>Descargar PDF</span></button>
      </div>`;
    $('#briefCopiar', dlg).addEventListener('click', () => copiar($('#briefTxt', dlg).value));
    $('#briefPdf', dlg).addEventListener('click', async e => {
      const btn = e.currentTarget, span = $('span', btn), antes = span.textContent;
      ocupado(btn, true);
      try {
        const nombre = await m.pdfBrief(p, b, { ...prompt, texto: $('#briefTxt', dlg).value }, archivos, { alProgreso: t => { span.textContent = t; } });
        toast(`PDF descargado: ${nombre}`);
      } catch (err) { toast(err.message || 'No se ha podido crear el PDF', 'err'); }
      span.textContent = antes;
      ocupado(btn, false);
    });
  } catch (err) {
    $('.brief-cuerpo', dlg).innerHTML = `<p class="brief-error">${esc(err.message || 'No se ha podido preparar el brief')}</p>`;
  }
}

async function exportarHTML(p, btn) {
  const r = p.respuestas || {};
  ocupado(btn, true);
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:800px;opacity:0;pointer-events:none';
  f.src = `diseno?t=${encodeURIComponent(p.plantilla)}&n=${encodeURIComponent(r.negocio || '')}&c=${encodeURIComponent(r.color || '')}&x=1`;
  document.body.appendChild(f);
  try {
    await new Promise((ok, mal) => { f.onload = ok; setTimeout(() => mal(new Error('El diseño ha tardado demasiado en cargar')), 15000); });
    const doc = f.contentDocument;
    for (let i = 0; i < 40 && !doc.querySelector('#site nav'); i++) await new Promise(ok => setTimeout(ok, 100));
    const copia = doc.documentElement.cloneNode(true);
    // Las fuentes van dentro del archivo: así la web del cliente no depende de AurevixWeb ni de Google Fonts
    const lf = copia.querySelector('link[data-fuentes]');
    if (lf) {
      try {
        let css = await (await fetch(lf.href)).text();
        const base = new URL('.', lf.href);
        for (const [m, ruta] of [...css.matchAll(/url\(([^)]+\.woff2)\)/g)]) {
          const b = await (await fetch(new URL(ruta, base))).blob();
          const dataUrl = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
          css = css.replace(m, `url(${dataUrl})`);
        }
        const st = doc.createElement('style'); st.textContent = css; lf.replaceWith(st);
      } catch { /* sin fuentes propias: se verá con las del sistema */ }
    }
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
