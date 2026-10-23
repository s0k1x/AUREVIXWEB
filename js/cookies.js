/* ==========================================================
   AVISO DE COOKIES Y ALMACENAMIENTO
   La web no usa cookies de publicidad ni de seguimiento.
   - Necesarias: sesión, seguridad y tu elección de cookies (siempre activas)
   - Preferencias: tema, tamaño de letra, borradores del cuestionario, vista del panel
   - Estadísticas: no se usan. Si algún día se añaden, se activarán solo con tu permiso.
   ========================================================== */
const CLAVE = 'tm_cookies';
const VERSION = 1;

export function consentimiento() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return c && c.v === VERSION ? c : null;
  } catch { return null; }
}
/** ¿Se pueden guardar preferencias en este navegador? */
export const prefsPermitidas = () => consentimiento()?.preferencias !== false;

function guardar(preferencias, estadisticas = false) {
  const c = { v: VERSION, necesarias: true, preferencias, estadisticas, t: Date.now() };
  try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
  if (!preferencias) {
    // Se borran las preferencias que ya estuvieran guardadas
    try { ['tm_apariencia', 'tm_borrador', 'tm_vista', 'tm_ajustes_web'].forEach(k => localStorage.removeItem(k)); } catch { /* nada */ }
  }
  document.dispatchEvent(new CustomEvent('cookies', { detail: c }));
  return c;
}

const ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01M16 15.5v.01M12 12v.01M11 17v.01M7 14v.01"/></svg>';

let nodo = null;
function pintar(configurar = false) {
  nodo?.remove();
  const c = consentimiento();
  nodo = document.createElement('div');
  nodo.className = 'cookies' + (configurar ? ' cfg' : '');
  nodo.setAttribute('role', 'dialog');
  nodo.setAttribute('aria-label', 'Aviso de cookies');
  nodo.innerHTML = `
    <div class="ck-top"><span class="ck-ic">${ICONO}</span>
      <div><b>Cookies y privacidad</b>
      <p>Solo usamos el almacenamiento imprescindible para que la web funcione (sesión y seguridad) y, si lo aceptas, para recordar tus preferencias. No usamos cookies de publicidad ni de seguimiento. <a href="terminos.html#cookies">Más información</a></p></div></div>
    <div class="ck-cfg">
      <label class="ck-row"><span><b>Necesarias</b><small>Inicio de sesión, seguridad y tu elección sobre cookies. Siempre activas.</small></span><input type="checkbox" checked disabled></label>
      <label class="ck-row"><span><b>Preferencias</b><small>Tema, tamaño de letra, borradores del cuestionario y vista del panel.</small></span><input type="checkbox" id="ckPref" ${c?.preferencias === false ? '' : 'checked'}></label>
      <label class="ck-row off"><span><b>Estadísticas</b><small>No usamos herramientas de estadísticas ni de terceros.</small></span><input type="checkbox" disabled></label>
    </div>
    <div class="ck-btns">
      <button type="button" class="btn btn-sm btn-ghost" data-ck="nec">Solo necesarias</button>
      <button type="button" class="btn btn-sm btn-ghost" data-ck="cfg">${configurar ? 'Guardar selección' : 'Configurar'}</button>
      <button type="button" class="btn btn-sm btn-primary" data-ck="all">Aceptar</button>
    </div>`;
  document.body.appendChild(nodo);
  requestAnimationFrame(() => nodo.classList.add('on'));
  nodo.addEventListener('click', e => {
    const b = e.target.closest('[data-ck]');
    if (!b) return;
    const k = b.dataset.ck;
    if (k === 'cfg' && !nodo.classList.contains('cfg')) { nodo.classList.add('cfg'); b.textContent = 'Guardar selección'; return; }
    if (k === 'all') guardar(true);
    else if (k === 'nec') guardar(false);
    else guardar(!!nodo.querySelector('#ckPref')?.checked);
    cerrar();
  });
}
function cerrar() {
  if (!nodo) return;
  const n = nodo; nodo = null;
  n.classList.remove('on');
  setTimeout(() => n.remove(), 400);
}

/** Abre el panel de cookies (desde el pie o desde Ajustes) */
export const abrirCookies = () => pintar(true);

export function iniciarCookies() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-cookies]')) { e.preventDefault(); abrirCookies(); }
  });
  if (!consentimiento()) setTimeout(() => pintar(false), 900);
}
