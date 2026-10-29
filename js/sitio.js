/* ==========================================================
   AJUSTES DE LA WEB
   El propietario cambia precios, plazos, formas de pago, avisos…
   desde «Ajustes → Negocio». Se guardan en Supabase (tabla
   «ajustes», clave «web») y se aplican al cargar cada página.
   Se guarda una copia en el navegador para aplicarlos al instante.
   ========================================================== */
import { CONFIG, PLANES, EXTRAS } from '../config.js';
import * as store from './store.js';

const CACHE = 'tm_ajustes_web';
const clonar = o => JSON.parse(JSON.stringify(o));

// Valores originales de config.js (para «restablecer»)
export const ORIGINAL = {
  config: clonar(CONFIG),
  planes: clonar(PLANES),
  extras: clonar(EXTRAS)
};

/** Ajustes actuales en el formato que se guarda */
export function ajustesActuales() {
  return {
    aviso: CONFIG.aviso, anuncio: { ...CONFIG.anuncio }, aceptarPedidos: CONFIG.aceptarPedidos, mensajeCerrado: CONFIG.mensajeCerrado,
    horario: CONFIG.horario, respuesta: CONFIG.respuesta, email: CONFIG.email,
    senal: CONFIG.senal, comision: CONFIG.comision, urgente: CONFIG.urgente,
    pagos: { ...CONFIG.pagos }, legal: { ...CONFIG.legal }, trustpilot: CONFIG.trustpilot, bienvenida: { ...CONFIG.bienvenida }, videos: { ...CONFIG.videos }, redes: { ...CONFIG.redes },
    asistente: { activo: CONFIG.asistente.activo, saludo: CONFIG.asistente.saludo }, temporada: CONFIG.temporada || '',
    planes: Object.fromEntries(PLANES.map(p => [p.id, { precio: p.precio, entrega: p.entrega, dias: p.dias, activo: p.activo !== false, popular: !!p.popular }])),
    extras: Object.fromEntries(EXTRAS.map(x => [x.id, { precio: x.precio, activo: x.activo !== false }]))
  };
}

function aplicar(a) {
  if (!a || typeof a !== 'object') return;
  const num = (v, def) => (Number.isFinite(+v) && v !== '' && v !== null ? +v : def);
  const txt = (v, def) => (typeof v === 'string' ? v : def);
  CONFIG.aviso = txt(a.aviso, CONFIG.aviso);
  // Los objetos se actualizan «en su sitio» (Object.assign): así los módulos que ya los tenían leídos ven los datos nuevos
  if (a.anuncio) Object.assign(CONFIG.anuncio, { activo: !!a.anuncio.activo, texto: txt(a.anuncio.texto, '') });
  if (typeof a.aceptarPedidos === 'boolean') CONFIG.aceptarPedidos = a.aceptarPedidos;
  CONFIG.mensajeCerrado = txt(a.mensajeCerrado, CONFIG.mensajeCerrado);
  CONFIG.horario = txt(a.horario, CONFIG.horario);
  CONFIG.respuesta = txt(a.respuesta, CONFIG.respuesta);
  if (a.email && /\S+@\S+/.test(a.email)) CONFIG.email = a.email;
  CONFIG.senal = Math.min(100, Math.max(0, num(a.senal, CONFIG.senal)));
  CONFIG.comision = Math.min(100, Math.max(0, num(a.comision, CONFIG.comision)));
  CONFIG.urgente = Math.min(2, Math.max(0, num(a.urgente, CONFIG.urgente)));
  if (a.pagos) Object.assign(CONFIG.pagos, Object.fromEntries(['bizum', 'iban', 'titular'].filter(k => typeof a.pagos[k] === 'string').map(k => [k, a.pagos[k].trim()])));
  if (a.legal) Object.assign(CONFIG.legal, Object.fromEntries(['titular', 'nif', 'domicilio', 'email', 'actividad'].filter(k => typeof a.legal[k] === 'string' && a.legal[k].trim()).map(k => [k, a.legal[k].trim()])));
  CONFIG.trustpilot = txt(a.trustpilot, CONFIG.trustpilot);
  if (a.bienvenida) Object.assign(CONFIG.bienvenida, { activo: !!a.bienvenida.activo, codigo: txt(a.bienvenida.codigo, '').toUpperCase() || CONFIG.bienvenida.codigo, pct: Math.min(100, Math.max(1, num(a.bienvenida.pct, CONFIG.bienvenida.pct))) });
  if (a.videos) Object.assign(CONFIG.videos, { precio: Math.max(0, num(a.videos.precio, CONFIG.videos.precio)), bonus: Math.max(0, num(a.videos.bonus, CONFIG.videos.bonus)), visitas: Math.max(0, num(a.videos.visitas, CONFIG.videos.visitas)), maxMes: Math.max(1, num(a.videos.maxMes, CONFIG.videos.maxMes)) });
  if (a.redes) Object.assign(CONFIG.redes, a.redes);
  if (typeof a.temporada === 'string') CONFIG.temporada = a.temporada;
  if (a.asistente) Object.assign(CONFIG.asistente, { activo: a.asistente.activo !== false, saludo: txt(a.asistente.saludo, CONFIG.asistente.saludo) || CONFIG.asistente.saludo });
  PLANES.forEach(p => {
    const o = a.planes?.[p.id];
    if (!o) return;
    p.precio = num(o.precio, p.precio);
    p.entrega = txt(o.entrega, p.entrega) || p.entrega;
    p.dias = num(o.dias, p.dias);
    p.activo = o.activo !== false;
    if (typeof o.popular === 'boolean') p.popular = o.popular;
  });
  EXTRAS.forEach(x => {
    const o = a.extras?.[x.id];
    if (!o) return;
    x.precio = num(o.precio, x.precio);
    x.activo = o.activo !== false;
  });
}

/** Aplica la copia guardada (al instante) */
export function aplicarCache() {
  try { aplicar(JSON.parse(localStorage.getItem(CACHE) || 'null')); } catch { /* sin almacenamiento */ }
}

/** Descarga los ajustes de Supabase, los aplica y guarda la copia */
export async function cargarAjustesWeb() {
  try {
    const a = await store.leerAjustes('web');
    if (a) {
      aplicar(a);
      try { localStorage.setItem(CACHE, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
    }
    return a;
  } catch (e) {
    console.warn('No se pudieron leer los ajustes de la web', e);
    return null;
  }
}

/** Guarda los ajustes (solo propietario) */
export async function guardarAjustesWeb(a) {
  await store.guardarAjustes('web', a);
  aplicar(a);
  try { localStorage.setItem(CACHE, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
}

export const planesActivos = () => PLANES.filter(p => p.activo !== false);
export const extrasActivos = () => EXTRAS.filter(x => x.activo !== false);
