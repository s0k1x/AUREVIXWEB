/* ==========================================================
   ESTADO DE LA WEB: normal · demostración · mantenimiento
   Lo elige el propietario en Ajustes → Negocio (CONFIG.estadoWeb).
   Nunca afecta al propietario ni a los trabajadores.
   - Demostración: se puede recorrer y probar todo, pero no se guardan
     pedidos, pagos, mensajes ni formularios (lo frena js/store.js).
   - Mantenimiento: pantalla de espera limpia con el robot flotando, una
     voltereta suave de vez en cuando y una sonrisa si lo tocas. Un enlace
     discreto deja entrar al equipo.
   Las webs publicadas de los clientes (aurevixweb.es/<nombre>) no pasan
   por aquí: siguen funcionando siempre.
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { esc, icono, colocarFranja } from './ui.js';
import { mascotaHTML, estadoMascota, rebote } from './mascota.js';

const esEquipo = () => ['owner', 'worker'].includes(store.usuarioActual()?.role);
let capa = null, banner = null;

/** Aplica el estado actual (se llama al cargar, al llegar los ajustes y al entrar o salir de la cuenta) */
export function aplicarEstadoWeb() {
  const estado = esEquipo() ? 'normal' : CONFIG.estadoWeb || 'normal';
  estado === 'mantenimiento' ? pantalla() : quitarPantalla();
  estado === 'demo' ? franja() : (banner?.remove(), banner = null);
}

function franja() {
  if (banner) return;
  banner = document.createElement('div');
  banner.className = 'demo-banner estado-demo';
  banner.innerHTML = `${icono('flask')} <b>Web en demostración</b> · puedes probarlo todo, pero no se guardan pedidos, pagos ni mensajes.`;
  colocarFranja(banner);
}

/* ---------- Pantalla de mantenimiento ----------
   Limpia y tranquila: el robot flota en su sitio, de vez en cuando da una voltereta suave y, si lo tocas,
   te sonríe con un pequeño bote. Un enlace discreto deja entrar al equipo. */
function pantalla() {
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'mant-web';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'mwT');
  capa.innerHTML = `<div class="mw-caja">
      <button type="button" class="mw-masc" aria-label="Saludar al asistente">${mascotaHTML('normal', { cuerpo: true })}</button>
      <span class="mw-etq"><i aria-hidden="true"></i>Mantenimiento</span>
      <h1 id="mwT">Volvemos enseguida</h1>
      <p>${esc(CONFIG.mensajeMant || 'Estamos mejorando la web. Gracias por tu paciencia.')}</p>
      ${CONFIG.email ? `<a class="mw-correo" href="mailto:${esc(CONFIG.email)}">${icono('mail')}<span>${esc(CONFIG.email)}</span></a>` : ''}
      <button type="button" class="link-btn mw-equipo" data-login>Acceso del equipo</button>
    </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('en-mant');
  // Lo de debajo no se puede usar ni con el teclado (los diálogos, como el de entrar, sí)
  [...document.body.children].forEach(e => { if (e !== capa && e.tagName !== 'DIALOG' && !e.inert) { e.inert = true; e.dataset.mantInert = '1'; } });
  const boton = capa.querySelector('.mw-masc'), m = boton.querySelector('.masc');
  const volver = ms => { clearTimeout(boton._vuelve); boton._vuelve = setTimeout(() => estadoMascota(m, 'normal'), ms); };
  boton.addEventListener('click', () => {
    if (m.dataset.estado === 'voltereta') return;
    estadoMascota(m, 'feliz');
    rebote(m, { de: .92, ms: 520 });
    volver(1100);
  });
  // Cada cierto tiempo, una voltereta suave (y alguna vez saluda); nunca mientras le estás tocando
  let turno = 0;
  capa._vida = setInterval(() => {
    if (document.hidden || m.dataset.estado !== 'normal') return;
    estadoMascota(m, ++turno % 3 ? 'voltereta' : 'saluda');
    volver(turno % 3 ? 2250 : 1500);
  }, 7000);
}
function quitarPantalla() {
  if (!capa) return;
  clearInterval(capa._vida);
  capa.remove(); capa = null;
  document.documentElement.classList.remove('en-mant');
  document.querySelectorAll('[data-mant-inert]').forEach(e => { e.inert = false; delete e.dataset.mantInert; });
}
