/* ==========================================================
   VERIFICACIÓN ANTI-ROBOTS (Cloudflare Turnstile)
   - Primera visita (y cada 30 días): una pantalla centrada comprueba
     que eres una persona. Casi siempre pasa sola en un segundo.
   - Algo inusual (muchos códigos de acceso seguidos, varios formularios
     en poco tiempo, códigos fallidos, navegación a ritmo de robot):
     se vuelve a pedir antes de dejar seguir.
   - Al pedir el código para entrar, el token va también a Supabase,
     que lo comprueba si tienes activado el captcha en Authentication.
   El token se comprueba en el servidor (función «verificar», con la
   clave secreta TURNSTILE_SECRET); la web solo tiene la clave pública.
   Se activa en Ajustes → Negocio → «Verificación anti-robots».
   Los buscadores no la ven (si no, Google no podría leer la web).
   ========================================================== */
import { CONFIG } from '../config.js';

const PASE = 'tm_humano';               // necesaria (seguridad): cuándo se verificó este navegador
const DURA = 30 * 864e5;
const RASTRO = 'tm_rastro';             // contadores de esta sesión (sessionStorage)
const LIMITES = { codigo: [3, 10], codigoMal: [3, 10], contacto: [2, 10], pedido: [3, 30], pagina: [25, 2] }; // [veces, minutos]

const esRobotBueno = () => /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent);
export const verificacionActiva = () => !!(CONFIG.turnstile?.activo && CONFIG.turnstile?.siteKey) && !esRobotBueno();

/* ---------- El widget de Cloudflare ---------- */
let script = null;
function cargarScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return (script ||= new Promise((ok, no) => {
    window.__turnstileListo = () => ok(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__turnstileListo';
    s.async = true;
    s.onerror = () => { script = null; no(new Error('No se ha podido cargar la verificación. Revisa tu conexión.')); };
    document.head.append(s);
  }));
}

/** Muestra la verificación en el centro de la pantalla y devuelve el token */
export async function pedirToken(motivo = 'Es solo un momento: comprobamos que eres una persona y no un robot.') {
  const ts = await cargarScript();
  return new Promise((resolver, rechazar) => {
    const capa = document.createElement('div');
    capa.className = 'verif';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-labelledby', 'verifT');
    capa.innerHTML = `<div class="verif-caja">
      <img src="icons/logo-a.png" alt="" width="44" height="44">
      <h2 id="verifT">Comprobando que eres una persona</h2>
      <p>${motivo}</p>
      <div class="verif-widget"></div>
      <small>Protegido por Cloudflare. Sin publicidad ni seguimiento.</small>
    </div>`;
    document.documentElement.append(capa);
    document.documentElement.classList.add('no-scroll');
    requestAnimationFrame(() => capa.classList.add('on'));
    const cerrar = () => { capa.classList.remove('on'); document.documentElement.classList.remove('no-scroll'); setTimeout(() => capa.remove(), 250); };
    try {
      ts.render(capa.querySelector('.verif-widget'), {
        sitekey: CONFIG.turnstile.siteKey,
        language: document.documentElement.lang === 'en' ? 'en' : 'es',
        theme: document.documentElement.dataset.tema === 'claro' ? 'light' : 'dark',
        callback: t => { cerrar(); resolver(t); },
        'error-callback': () => { cerrar(); rechazar(new Error('No se ha podido completar la verificación. Recarga la página e inténtalo de nuevo.')); },
        'expired-callback': () => {}
      });
    } catch (e) { cerrar(); rechazar(e); }
  });
}

/** Comprueba el token en el servidor (función «verificar» de Supabase) */
export async function comprobarEnServidor(token) {
  const r = await fetch(`${CONFIG.supabase.url}/functions/v1/verificar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return !!j.ok;
}

const leerPase = () => { try { return +localStorage.getItem(PASE) || 0; } catch { return 0; } };
const guardarPase = () => { try { localStorage.setItem(PASE, String(Date.now())); } catch { /* sin almacenamiento */ } };

/** Pide la verificación completa (reto + servidor) y deja pasar si sale bien */
async function verificarAhora(motivo) {
  for (let intento = 0; intento < 3; intento++) {
    const token = await pedirToken(motivo);
    if (await comprobarEnServidor(token)) { guardarPase(); return true; }
    motivo = 'No ha salido bien. Vuelve a intentarlo.';
  }
  throw new Error('No hemos podido comprobar que eres una persona. Recarga la página e inténtalo de nuevo.');
}

/* ---------- Detección de algo inusual ---------- */
function anotar(accion) {
  let r = {};
  try { r = JSON.parse(sessionStorage.getItem(RASTRO) || '{}'); } catch { /* nada */ }
  const [veces, min] = LIMITES[accion] || [5, 10];
  const ahora = Date.now();
  const lista = (r[accion] || []).filter(t => ahora - t < min * 6e4);
  lista.push(ahora);
  r[accion] = lista;
  try { sessionStorage.setItem(RASTRO, JSON.stringify(r)); } catch { /* nada */ }
  return lista.length > veces;
}

/** Al cargar una página pública: primera visita, pase caducado o navegación a ritmo de robot */
export async function puertaDeEntrada() {
  if (!verificacionActiva()) return;
  const rapido = anotar('pagina');
  if (!rapido && Date.now() - leerPase() < DURA) return;
  try { await verificarAhora(rapido ? 'Estás navegando muy rápido. Comprobamos que eres una persona antes de seguir.' : undefined); }
  catch (e) { console.warn(e); } // si Cloudflare no carga, no se bloquea la web: lo importante se comprueba al entrar y al enviar
}

/** Antes de una acción sensible: si hay algo inusual, se pide verificación (si falla, lanza un error) */
export async function siEsInusual(accion) {
  if (!verificacionActiva()) return;
  if (anotar(accion)) await verificarAhora('Hemos notado muchos intentos seguidos. Comprobamos que eres una persona antes de seguir.');
}
/** Tras un fallo (por ejemplo, un código mal escrito): si se repite mucho, se pide verificación */
export async function trasFallo(accion) {
  if (verificacionActiva() && anotar(accion)) await verificarAhora('Ha habido varios intentos fallidos. Comprobamos que eres una persona antes de seguir.');
}
/** Token para Supabase al pedir el código de acceso (solo si está activado «también al entrar») */
export const tokenParaEntrar = () => verificacionActiva() && CONFIG.turnstile.login ? pedirToken('Antes de enviarte el código, comprobamos que eres una persona.') : Promise.resolve('');
