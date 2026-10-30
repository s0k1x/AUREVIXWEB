/* ==========================================================
   NEGOCIO: mantenimiento mensual, cambios extra y finanzas
   Lo usan el panel (propietario) y «Mis proyectos» (cliente).
   - Mantenimiento: pedido.mantenimiento = { estado: 'activo'|'pausado'|'baja', desde, proximo,
     cuotas: [{ periodo: 'AAAA-MM', importe, pagado, metodo }], baja, motivoBaja }
     Solo lo cambia el propietario (supabase/migraciones/plataforma-v88.sql). El cliente pide la baja con
     una consulta de soporte de tipo «baja».
   - Cambios extra: pedido.cambiosExtra = [{ id, concepto, detalle, importe, estado: 'propuesto'|
     'aceptado'|'rechazado'|'pagado', propuesto, respondido, acuerdo: { nombre, texto, t }, pagado }]
     El propietario propone; el cliente acepta o rechaza online (queda el acuerdo) y el servidor
     no le deja tocar el concepto ni el importe.
   - Finanzas: ingresos cobrados, gastos (tabla «gastos») y comisiones → beneficio.
   ========================================================== */
import { esc, euros, fecha, icono } from './ui.js';

const DIA = 864e5;
export const periodo = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const nombrePeriodo = per => { const [y, m] = per.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); };
export const masUnMes = t => { const d = new Date(t); const dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.getTime(); };

/* ---------- Mantenimiento ---------- */
/** Lo que se paga cada mes (extras mensuales del pedido) */
export const cuotaMensual = p => Number(p.mensual) || (p.extras || []).filter(x => x.mensual).reduce((s, x) => s + (Number(x.precio) || 0), 0);
export const conceptosMensuales = p => (p.extras || []).filter(x => x.mensual).map(x => x.nombre);
/** Pedidos que tienen (o pueden tener) mantenimiento */
export const conMantenimiento = p => cuotaMensual(p) > 0 && p.estado !== 'cancelado' && (p.mantenimiento || p.estado === 'entregado');
export function estadoMant(p) {
  const m = p.mantenimiento;
  if (!m) return { id: 'sin', txt: 'Sin activar', cls: 'p-pend' };
  if (m.estado === 'baja') return { id: 'baja', txt: 'De baja', cls: 'p-off' };
  if (m.estado === 'pausado') return { id: 'pausado', txt: 'Pausado', cls: 'p-pend' };
  const vencido = m.proximo && Date.now() > m.proximo + 3 * DIA;
  return vencido ? { id: 'vencido', txt: 'Cuota vencida', cls: 'p-off' } : { id: 'activo', txt: 'Activo', cls: 'p-done' };
}
export const activarMant = (p, desde = Date.now()) => ({ estado: 'activo', desde, proximo: masUnMes(desde), cuotas: p.mantenimiento?.cuotas || [] });
/** Registra la cuota del periodo pendiente y adelanta el próximo cobro un mes */
export function registrarCuota(p, metodo = 'transferencia') {
  const m = p.mantenimiento || activarMant(p);
  const per = periodo(m.proximo || Date.now());
  if ((m.cuotas || []).some(c => c.periodo === per)) throw new Error(`La cuota de ${nombrePeriodo(per)} ya está registrada`);
  return { ...m, estado: 'activo', cuotas: [...(m.cuotas || []), { periodo: per, importe: cuotaMensual(p), pagado: Date.now(), metodo }], proximo: masUnMes(m.proximo || Date.now()) };
}
export const cuotasPagadas = (pedidos, desde, hasta) => pedidos.flatMap(p => (p.mantenimiento?.cuotas || []).map(c => ({ ...c, p }))).filter(c => c.pagado >= desde && c.pagado < hasta);

/** Bloque de mantenimiento para «Mis proyectos» del cliente */
export function mantClienteHTML(p, { bajaPedida = false } = {}) {
  if (!conMantenimiento(p)) return '';
  const m = p.mantenimiento, e = estadoMant(p);
  const cuotas = [...(m?.cuotas || [])].reverse();
  return `<section class="mp-mant">
    <div class="mp-mant-h"><span class="pg-ic">${icono('calendar')}</span><div><b>Mantenimiento mensual</b><small>${esc(conceptosMensuales(p).join(' · '))} · ${euros(cuotaMensual(p))}/mes</small></div><span class="pill ${e.cls}">${e.txt}</span></div>
    ${!m ? '<p class="muted">Se activa cuando publicamos tu web. Te avisaremos del primer cobro.</p>' : ''}
    ${m && m.estado === 'activo' ? `<p>Próximo cobro: <b>${fecha(m.proximo)}</b> · ${euros(cuotaMensual(p))}. Paga por Bizum o transferencia con el concepto <b>${esc(p.id.slice(-6).toUpperCase())}-${periodo(m.proximo)}</b>.</p>` : ''}
    ${m && m.estado === 'baja' ? `<p class="muted">Dado de baja el ${fecha(m.baja)}. Tu web sigue publicada; los cambios y copias de seguridad ya no están incluidos.</p>` : ''}
    ${cuotas.length ? `<details class="mp-mant-hist"><summary>Cuotas pagadas (${cuotas.length})</summary><ul>${cuotas.map(c => `<li><span>${esc(nombrePeriodo(c.periodo))}</span><b>${euros(c.importe)}</b><small>${fecha(c.pagado)}</small></li>`).join('')}</ul></details>` : ''}
    ${m && m.estado !== 'baja' ? (bajaPedida ? `<p class="muted">${icono('clock')} Has pedido la baja. Te confirmamos por aquí en menos de 24 h laborables.</p>` : `<button type="button" class="link-btn" data-mant-baja="${p.id}">Darme de baja del mantenimiento</button>`) : ''}
  </section>`;
}

/* ---------- Cambios extra (presupuestos de cambios fuera del plan) ---------- */
export const ESTADO_EXTRA = { propuesto: ['Pendiente de tu respuesta', 'p-pend'], aceptado: ['Aceptado · pendiente de pago', 'p-new'], rechazado: ['Rechazado', 'p-off'], pagado: ['Pagado', 'p-done'] };
export const nuevoExtra = (concepto, detalle, importe) => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), concepto: String(concepto).trim().slice(0, 120), detalle: String(detalle || '').trim().slice(0, 1000),
  importe: Math.round(Number(importe) * 100) / 100, estado: 'propuesto', propuesto: Date.now()
});
/** Texto del acuerdo que acepta el cliente (queda guardado con su nombre y la fecha) */
export const textoAcuerdo = (x, marca) => `Acepto el presupuesto «${x.concepto}» por ${euros(x.importe)} (IVA incluido) para mi proyecto con ${marca}. Se paga por Bizum o transferencia y el trabajo empieza al confirmarse el pago.`;
export function extrasClienteHTML(p, marca) {
  const L = p.cambiosExtra || [];
  if (!L.length) return '';
  return `<section class="mp-extras"><h4>${icono('receipt')} Presupuestos de cambios extra</h4>${L.map(x => {
    const [txt, cls] = ESTADO_EXTRA[x.estado] || ESTADO_EXTRA.propuesto;
    return `<article class="mp-extra">
      <div class="mp-extra-h"><b>${esc(x.concepto)}</b><b class="nw">${euros(x.importe)}</b></div>
      ${x.detalle ? `<p class="muted">${esc(x.detalle)}</p>` : ''}
      <div class="mp-extra-f"><span class="pill ${cls}">${txt}</span>${x.acuerdo ? `<small>Aceptado por ${esc(x.acuerdo.nombre)} el ${fecha(x.acuerdo.t)}</small>` : `<small>Propuesto el ${fecha(x.propuesto)}</small>`}</div>
      ${x.estado === 'propuesto' ? `<p class="mp-extra-acuerdo">${esc(textoAcuerdo(x, marca))}</p>
        <div class="mp-extra-b"><button type="button" class="btn btn-sm btn-primary" data-extra-si="${x.id}" data-p="${p.id}"><span>Acepto el presupuesto</span></button><button type="button" class="btn btn-sm btn-ghost" data-extra-no="${x.id}" data-p="${p.id}"><span>No, gracias</span></button></div>` : ''}
    </article>`;
  }).join('')}</section>`;
}

/* ---------- Estadísticas de la web del cliente ---------- */
/** Resumen de estadisticasWeb(): totales, por día, por dispositivo y por origen */
export function resumirVisitas(filas, dias = 30) {
  const desde = periodoDia(Date.now() - (dias - 1) * DIA);
  const F = filas.filter(f => f.dia >= desde);
  const sum = (tipo, filtro = () => true) => F.filter(f => f.tipo === tipo && filtro(f)).reduce((s, f) => s + (f.visitas || 0), 0);
  const porDia = [];
  for (let i = dias - 1; i >= 0; i--) { const d = periodoDia(Date.now() - i * DIA); porDia.push({ d, v: sum('visita', f => f.dia === d), c: sum('contacto', f => f.dia === d) }); }
  const agrupar = k => Object.entries(F.filter(f => f.tipo === 'visita').reduce((a, f) => { const n = f[k] || 'directo'; a[n] = (a[n] || 0) + f.visitas; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const visitas = sum('visita'), contactos = sum('contacto');
  return { visitas, contactos, conversion: visitas ? Math.round(contactos / visitas * 1000) / 10 : 0, porDia, dispositivos: agrupar('dispositivo'), origenes: agrupar('origen').slice(0, 6) };
}
const periodoDia = t => new Date(t).toISOString().slice(0, 10);
const NOMBRE_DISP = { movil: 'Móvil', tablet: 'Tableta', ordenador: 'Ordenador' };
export function estadisticasHTML(r, dias = 30) {
  const max = Math.max(1, ...r.porDia.map(x => x.v));
  return `<div class="est-web">
    <div class="est-kpis">
      <div><small>Visitas (${dias} días)</small><b>${r.visitas}</b></div>
      <div><small>Contactos</small><b>${r.contactos}</b><span>llamar, WhatsApp o correo</span></div>
      <div><small>Conversión</small><b>${String(r.conversion).replace('.', ',')} %</b><span>visitas que intentan contactar</span></div>
    </div>
    <div class="est-barras" role="img" aria-label="Visitas por día en los últimos ${dias} días: ${r.visitas} en total">${r.porDia.map(x => `<i style="--h:${Math.round(x.v / max * 100)}%" title="${x.d}: ${x.v} visitas${x.c ? `, ${x.c} contactos` : ''}"></i>`).join('')}</div>
    <div class="est-listas">
      <div><small>Dispositivo</small>${r.dispositivos.map(([k, v]) => `<p><span>${NOMBRE_DISP[k] || k}</span><b>${v}</b></p>`).join('') || '<p class="muted">Sin datos aún</p>'}</div>
      <div><small>De dónde vienen</small>${r.origenes.map(([k, v]) => `<p><span>${esc(k === 'directo' ? 'Directo / enlace' : k)}</span><b>${v}</b></p>`).join('') || '<p class="muted">Sin datos aún</p>'}</div>
    </div>
    <p class="muted est-nota">Datos reales de tu web publicada, sin cookies: se cuenta una visita por persona y sesión.</p>
  </div>`;
}
