/* ==========================================================
   APARIENCIA: tema, tamaño de letra, animaciones, contraste y color del asistente
   Se aplica antes de pintar la página con un pequeño script en
   el <head> de cada HTML (ver «tm_apariencia»).
   ========================================================== */
import { prefsPermitidas } from './cookies.js';

const CLAVE = 'tm_apariencia';
export const POR_DEFECTO = { tema: 'oscuro', texto: 'normal', movimiento: 'normal', contraste: false, asistente: 'lima' };
/** Colores del asistente: [nombre, luz (trazo claro), halo (resplandor), logotipo] */
export const COLORES_ASISTENTE = {
  lima: ['Lima', '#d6ff7a', '#5cff22', '#5fbf1f'],
  cian: ['Cian', '#b5f7ff', '#1fd6ff', '#14a9d6'],
  azul: ['Azul', '#bcd2ff', '#3d7bff', '#2f62e0'],
  violeta: ['Violeta', '#e6ccff', '#a855ff', '#8a3fe0'],
  rosa: ['Rosa', '#ffc8e6', '#ff3fa4', '#e0308a'],
  rojo: ['Rojo', '#ffc0bc', '#ff3b30', '#d92b22'],
  naranja: ['Naranja', '#ffd9a8', '#ff8a1f', '#e0700f'],
  oro: ['Oro', '#fff1b0', '#ffc21a', '#e0a40c'],
  blanco: ['Blanco', '#ffffff', '#a9c4ff', '#9aa9c4']
};

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
  // Las luces del asistente (ojos, neones, logotipo y propulsores) en el color elegido
  const [, luz, halo, logo] = COLORES_ASISTENTE[a.asistente] || COLORES_ASISTENTE.lima;
  d.style.setProperty('--m-luz', luz); d.style.setProperty('--m-halo', halo); d.style.setProperty('--m-logo', logo);
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
