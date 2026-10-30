/* ==========================================================
   ESTADO DE LA WEB: normal · demostración · mantenimiento
   Lo elige el propietario en Ajustes → Negocio (CONFIG.estadoWeb).
   Nunca afecta al propietario ni a los trabajadores.
   - Demostración: se puede recorrer y probar todo, pero no se guardan
     pedidos, pagos, mensajes ni formularios (lo frena js/store.js).
   - Mantenimiento: pantalla de espera a pantalla completa con el robot
     dando volteretas; se puede jugar con él (tocarlo, seguirlo con la
     mirada). Un enlace discreto deja entrar al equipo.
   Las webs publicadas de los clientes (aurevixweb.es/<nombre>) no pasan
   por aquí: siguen funcionando siempre.
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { esc, icono, colocarFranja } from './ui.js';
import { mascotaHTML, estadoMascota, rebote } from './mascota.js';

const esEquipo = () => ['owner', 'worker'].includes(store.usuarioActual()?.role);
let capa = null, banner = null, jugar = 0;

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

/* ---------- Pantalla de mantenimiento ---------- */
function pantalla() {
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'mant-web';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'mwT');
  capa.innerHTML = `<div class="mw-caja">
      <button type="button" class="mw-masc" aria-label="Jugar con el robot">${mascotaHTML('voltereta', { cuerpo: true })}<span class="mw-chispas" aria-hidden="true"></span></button>
      <h1 id="mwT">Estamos mejorando la web</h1>
      <p>${esc(CONFIG.mensajeMant || 'Volvemos enseguida con novedades. Gracias por tu paciencia.')}</p>
      <small class="mw-pista">${icono('hand')} Tócalo, le encanta</small>
      ${CONFIG.email ? `<a class="mw-correo" href="mailto:${esc(CONFIG.email)}">${icono('mail')} ${esc(CONFIG.email)}</a>` : ''}
      <button type="button" class="link-btn mw-equipo" data-login>Acceso del equipo</button>
    </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('en-mant');
  // Lo de debajo no se puede usar ni con el teclado (los diálogos, como el de entrar, sí)
  [...document.body.children].forEach(e => { if (e !== capa && e.tagName !== 'DIALOG' && !e.inert) { e.inert = true; e.dataset.mantInert = '1'; } });
  const boton = capa.querySelector('.mw-masc'), m = boton.querySelector('.masc');
  // Jugar: al tocarlo se asombra, da un bote y suelta chispas de colores; luego vuelve a sus volteretas
  boton.addEventListener('click', () => {
    jugar++;
    clearTimeout(boton._vuelve);
    estadoMascota(m, jugar % 3 === 0 ? 'feliz' : 'asombro');
    rebote(m, { de: .82, ms: 600 });
    chispas(capa.querySelector('.mw-chispas'));
    boton._vuelve = setTimeout(() => estadoMascota(m, 'voltereta'), 1500);
  });
  // De vez en cuando saluda entre voltereta y voltereta
  capa._saluda = setInterval(() => {
    if (document.hidden || m.dataset.estado !== 'voltereta') return;
    estadoMascota(m, 'saluda');
    setTimeout(() => { if (m.dataset.estado === 'saluda') estadoMascota(m, 'voltereta'); }, 1600);
  }, 9000);
}
function quitarPantalla() {
  if (!capa) return;
  clearInterval(capa._saluda);
  capa.remove(); capa = null;
  document.documentElement.classList.remove('en-mant');
  document.querySelectorAll('[data-mant-inert]').forEach(e => { e.inert = false; delete e.dataset.mantInert; });
}
const COLORES = ['#ff3b5c', '#ff9a1f', '#ffd21a', '#4cff2a', '#1fb8ff', '#9a4dff'];
function chispas(caja) {
  if (!caja || typeof caja.animate !== 'function') return;
  for (let i = 0; i < 14; i++) {
    const c = document.createElement('i'), a = (i / 14) * Math.PI * 2 + Math.random() * .3, r = 80 + Math.random() * 60;
    c.style.cssText = `--c:${COLORES[i % COLORES.length]}`;
    caja.append(c);
    c.animate([{ opacity: 0, transform: 'translate(0,0) scale(.4)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: `translate(${(Math.cos(a) * r).toFixed(1)}px,${(Math.sin(a) * r).toFixed(1)}px) scale(1)` }],
      { duration: 800 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.catch(() => {}).then(() => c.remove());
  }
}
