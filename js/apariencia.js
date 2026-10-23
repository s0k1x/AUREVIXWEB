/* ==========================================================
   APARIENCIA: tema, tamaño de letra, animaciones y contraste
   Se aplica antes de pintar la página con un pequeño script en
   el <head> de cada HTML (ver «tm_apariencia»).
   ========================================================== */
import { prefsPermitidas } from './cookies.js';

const CLAVE = 'tm_apariencia';
export const POR_DEFECTO = { tema: 'oscuro', texto: 'normal', movimiento: 'normal', contraste: false };

export function leerApariencia() {
  try { return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; }
  catch { return { ...POR_DEFECTO }; }
}

export function aplicarApariencia(a = leerApariencia()) {
  const d = document.documentElement;
  const claro = a.tema === 'claro' || (a.tema === 'sistema' && matchMedia('(prefers-color-scheme: light)').matches);
  if (claro) d.dataset.tema = 'claro'; else delete d.dataset.tema;
  if (a.texto && a.texto !== 'normal') d.dataset.texto = a.texto; else delete d.dataset.texto;
  if (a.movimiento === 'reducido') d.dataset.movimiento = 'reducido'; else delete d.dataset.movimiento;
  if (a.contraste) d.dataset.contraste = 'alto'; else delete d.dataset.contraste;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', claro ? '#f6f5f0' : '#0c0c0e');
}

export function guardarApariencia(cambios) {
  const a = { ...leerApariencia(), ...cambios };
  if (prefsPermitidas()) {
    try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
  }
  aplicarApariencia(a);
  return a;
}

export const movimientoReducido = () =>
  document.documentElement.dataset.movimiento === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Si el tema es «sistema», cambia solo cuando cambia el del móvil
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (leerApariencia().tema === 'sistema') aplicarApariencia();
});
