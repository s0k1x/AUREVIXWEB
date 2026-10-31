/* ==========================================================
   NOTIFICACIONES PUSH (como las de WhatsApp)
   El navegador da una suscripción para este dispositivo; se guarda en
   Supabase (tabla push_subs) y la función «notificar» manda ahí cada
   aviso de la campana, aunque la web esté cerrada.
   - Android, ordenador: Chrome, Edge, Firefox y Safari en Mac.
   - iPhone y iPad: solo con la web instalada en la pantalla de inicio
     (Compartir → «Añadir a pantalla de inicio»), iOS 16.4 o superior.
   La clave pública la da la propia función (GET /functions/v1/notificar).
   ========================================================== */
import { CONFIG } from '../../config.js';
import * as store from './store.js';
import { icono, toast } from './ui.js';

export const soportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const esIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let clave = '';
async function clavePublica() {
  if (clave) return clave;
  const r = await fetch(`${CONFIG.supabase.url}/functions/v1/notificar`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.publica) throw new Error('No se han podido activar las notificaciones. Inténtalo de nuevo.');
  return (clave = j.publica);
}
const aBytes = b64 => {
  const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};
const nombreDispositivo = () => {
  const ua = navigator.userAgent;
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${so} · ${nav}`;
};

/** 'activas' | 'apagadas' | 'bloqueadas' | 'instalar' (iPhone sin instalar) | 'no' (no se puede) */
export async function estadoPush() {
  if (!soportaPush()) return esIOS() && !instalada() ? 'instalar' : 'no';
  if (store.modoDemo) return 'no';
  if (Notification.permission === 'denied') return 'bloqueadas';
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) && Notification.permission === 'granted' ? 'activas' : 'apagadas';
  } catch { return 'apagadas'; }
}

/** Pide permiso y suscribe este dispositivo. Se llama siempre tras pulsar un botón. */
export async function activarPush() {
  if (!soportaPush()) throw new Error(esIOS() ? 'En iPhone, primero añade la web a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y ábrela desde ahí.' : 'Este navegador no admite notificaciones.');
  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error(permiso === 'denied' ? 'Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para esta web.' : 'No has dado permiso para las notificaciones.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(await clavePublica()) });
  const j = sub.toJSON();
  await store.guardarSuscripcionPush({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nombreDispositivo() });
  return true;
}

/** Da de baja este dispositivo (al apagarlas o al cerrar sesión) */
export async function desactivarPush() {
  if (!soportaPush()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await store.borrarSuscripcionPush(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  } catch { /* nada */ }
}

/* ---------- Aviso para activarlas («Mis proyectos» y panel) ---------- */
const OCULTO = 'tm_push_ahora_no';
/** Pinta en «el» una tarjeta para activar las notificaciones, si hace falta */
export async function montarAvisoPush(el) {
  if (!el) return;
  let oculto = false;
  try { oculto = sessionStorage.getItem(OCULTO) === '1'; } catch { /* nada */ }
  const estado = await estadoPush();
  // Solo si se pueden activar y no las ha apagado a propósito en Ajustes
  if (oculto || !['apagadas', 'instalar'].includes(estado) || store.usuarioActual()?.datos?.notif?.push === false) { el.innerHTML = ''; return; }
  el.innerHTML = `<section class="push-aviso" aria-label="Notificaciones">${icono('bell')}<div>
      <b>Entérate al momento, como en WhatsApp</b>
      <p>${estado === 'instalar' ? 'En iPhone: pulsa Compartir → «Añadir a pantalla de inicio», abre la web desde ese icono y activa las notificaciones.' : 'Te avisamos en este dispositivo cuando tu proyecto avance, tengas un mensaje o haya que revisar algo, aunque tengas la web cerrada.'}</p>
      <div class="push-btns">${estado === 'apagadas' ? `<button type="button" class="btn btn-sm btn-primary" data-push-si>${icono('bell')}<span>Activar notificaciones</span></button>` : ''}<button type="button" class="btn btn-sm btn-ghost" data-push-no>Ahora no</button></div>
    </div></section>`;
  el.querySelector('[data-push-si]')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try {
      await activarPush();
      await store.guardarPerfil({ datos: { notif: { ...(store.usuarioActual()?.datos?.notif || {}), push: true, correo: false, navegador: false } } });
      toast('Notificaciones activadas en este dispositivo', 'ok');
      el.innerHTML = '';
    } catch (err) { toast(err.message, 'err'); e.currentTarget.disabled = false; }
  });
  el.querySelector('[data-push-no]').addEventListener('click', () => { try { sessionStorage.setItem(OCULTO, '1'); } catch { /* nada */ } el.innerHTML = ''; });
}
