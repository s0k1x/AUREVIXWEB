/* ==========================================================
   BORRADORES EN TODA LA WEB
   Lo que alguien escribe en cualquier campo (contacto, chat, mensajes,
   brief, revisa tu web, trabaja con nosotros…) se guarda en su navegador
   mientras escribe. Si cierra la pestaña, recarga o se le va la conexión,
   al volver lo encuentra tal cual.
   - Solo en este navegador (localStorage), nunca se envía a ningún sitio.
   - No se guardan contraseñas, códigos, tarjetas ni archivos.
   - Se borra al enviar el formulario, al vaciar el campo o a los 30 días.
   - Si rechazas las preferencias en el aviso de cookies, no se guarda nada.
   El cuestionario de pedido (#wizForm) ya tiene su propio borrador.
   ========================================================== */
import { prefsPermitidas } from './cookies.js';

const PREFIJO = 'tm_bor:';
const CADUCA = 30 * 864e5;
const TIPOS = new Set(['text', 'email', 'tel', 'url', 'number', '']);
const FUERA = '#wizForm, [data-sin-borrador], .otp-campo';

function apto(el) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (el.disabled || el.readOnly || el.closest(FUERA)) return false;
  if (el instanceof HTMLInputElement && !TIPOS.has(el.getAttribute('type') || '')) return false;
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  return !/one-time-code|password|cc-/.test(ac);
}

/* Clave estable: página + formulario/diálogo + nombre o id (o posición si no hay) */
function clave(el) {
  const caja = el.form || el.closest('dialog, form, [id]');
  const zona = caja?.id || caja?.getAttribute?.('aria-label') || caja?.className?.split?.(' ')[0] || '';
  let nombre = el.name || el.id;
  if (!nombre) {
    const hermanos = [...(caja || document).querySelectorAll('input, textarea')].filter(apto);
    nombre = '#' + hermanos.indexOf(el);
  }
  return PREFIJO + location.pathname.replace(/\.html$/, '').replace(/\/$/, '/index') + '|' + zona + '|' + nombre;
}

const leer = k => { try { const d = JSON.parse(localStorage.getItem(k) || 'null'); return d && Date.now() - d.t < CADUCA ? d.v : null; } catch { return null; } };
const quitar = k => { try { localStorage.removeItem(k); } catch { /* nada */ } };

const temporizadores = new Map();
function guardar(el) {
  const k = clave(el);
  clearTimeout(temporizadores.get(k));
  temporizadores.set(k, setTimeout(() => {
    temporizadores.delete(k);
    if (!prefsPermitidas()) return;
    const v = el.value;
    if (!v.trim()) return quitar(k);
    try { localStorage.setItem(k, JSON.stringify({ v: v.slice(0, 20000), t: Date.now() })); } catch { /* lleno o bloqueado */ }
  }, 250));
}

/* Rellena el campo con lo guardado (solo si está vacío, para no pisar nada) */
function restaurar(el) {
  if (!apto(el) || el.value || el.dataset.borrador) return;
  el.dataset.borrador = '1';
  const v = leer(clave(el));
  if (v == null) return;
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function restaurarEn(raiz) {
  if (raiz.matches?.('input, textarea')) restaurar(raiz);
  raiz.querySelectorAll?.('input, textarea').forEach(restaurar);
}

/** Borra los borradores de un formulario (p. ej. después de enviarlo bien) */
export function borrarBorradores(raiz) {
  raiz?.querySelectorAll?.('input, textarea').forEach(el => { if (apto(el)) { clearTimeout(temporizadores.get(clave(el))); quitar(clave(el)); } });
}

/** Borra todos los borradores (al rechazar las preferencias) */
export function borrarTodosLosBorradores() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIJO)).forEach(quitar); } catch { /* nada */ }
}

let iniciado = false;
export function iniciarBorradores() {
  if (iniciado) return;
  iniciado = true;
  // Limpieza de los caducados
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIJO)).forEach(k => leer(k) == null && quitar(k)); } catch { /* nada */ }

  document.addEventListener('input', e => { if (e.isTrusted && apto(e.target)) guardar(e.target); }, true);
  document.addEventListener('reset', e => borrarBorradores(e.target), true);
  // Al enviar (formulario, botón o Enter): si poco después el campo se ha vaciado o ya no
  // está, se envió bien → fuera el borrador. Si sigue con texto (falló la red, faltaba algo),
  // se queda guardado.
  // (Cerrar un diálogo sin enviar no borra nada: al volver a abrirlo sigue ahí.)
  const revisar = (raiz, enviado) => {
    const campos = [...(raiz || document).querySelectorAll('input, textarea')].filter(el => apto(el) && el.value.trim()).map(el => [el, clave(el)]);
    [1200, 3500].forEach(ms => setTimeout(() => campos.forEach(([el, k]) => {
      if (el.isConnected ? !el.value.trim() : enviado) quitar(k);
    }), ms));
  };
  document.addEventListener('submit', e => revisar(e.target, true), true);
  document.addEventListener('click', e => { const b = e.target.closest?.('button'); if (b) revisar(b.closest('form, dialog, [id]')); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement && apto(e.target)) revisar(e.target.closest('form, dialog, [id]')); }, true);
  // Al salir: lo que quedó vacío no se guarda
  addEventListener('pagehide', () => document.querySelectorAll('input, textarea').forEach(el => { if (apto(el) && el.dataset.borrador && !el.value.trim()) quitar(clave(el)); }));
  document.addEventListener('cookies', e => { if (!e.detail?.preferencias) borrarTodosLosBorradores(); });

  restaurarEn(document);
  // Diálogos y paneles que se pintan después (chat, contacto, mensajes del panel…)
  new MutationObserver(lista => {
    for (const m of lista) for (const n of m.addedNodes) if (n.nodeType === 1) restaurarEn(n);
  }).observe(document.body, { childList: true, subtree: true });
}
