/* ==========================================================
   «WEBS PENSADAS PARA TU SECTOR» CON PERSONAS (portada)
   Cada sector es una tarjeta con una persona de ejemplo (imagen generada con IA, sin fondo) que enseña en su
   móvil el diseño de partida de ese sector. La web de su pantalla es el diseño real, encajado con una
   transformación 2D y un recorte (js/portada/escena-datos.js dice dónde está su pantalla).
   Sin JavaScript queda la fila de enlaces del HTML. Las webs se cargan al acercarse a la tarjeta.
   ========================================================== */
import { ESCENA } from './escena-datos.js';
import { plantillaPorId } from './plantillas.js';
import { icono } from '../base/iconos.js';

const PW = 390, PH = 844; // tamaño lógico de la web del móvil
const SECTORES = { 'webs-para-barberias': 'filo', 'webs-para-centros-de-estetica': 'calma', 'webs-para-restaurantes': 'brasa', 'tiendas-online': 'kiosko', 'webs-para-gimnasios': 'pulso', 'webs-para-profesionales': 'lienzo' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function iniciarPersonas() {
  const nav = document.querySelector('.dz-sectores');
  if (!nav || window.self !== window.top) return;
  const enlaces = [...nav.querySelectorAll('a.pg-otro')].map(a => ({ href: a.getAttribute('href'), texto: a.firstChild?.textContent?.trim() || a.textContent.trim() })).filter(e => SECTORES[e.href]);
  if (enlaces.length < 3) return;
  const titulo = nav.querySelector('b')?.textContent || '';
  nav.className = 'dz-personas anim'; // anim: las tarjetas entran escalonadas al verlas (sin JavaScript se ven ya)
  nav.innerHTML = `<b>${esc(titulo)}</b><ul>${enlaces.map((e, n) => {
    const id = SECTORES[e.href], d = ESCENA.personas[id], p = plantillaPorId(id);
    if (!d) return '';
    return `<li><a class="pc" href="${esc(e.href)}" style="--ac:${p.c.accent};--i:${n}" data-id="${id}">
      <span class="pc-txt"><b>${esc(e.texto)}</b><small>${esc(p.nombre)} · ${esc(p.sector.split('·')[0].trim())}</small></span>
      <span class="pc-fig" style="aspect-ratio:${d.ancho}/${d.alto}"><img src="img/3d/persona-${id}.webp" width="${d.ancho}" height="${d.alto}" alt="" loading="lazy" decoding="async"><span class="pc-pant"><iframe tabindex="-1" aria-hidden="true" title="" data-src="diseno?t=${id}&amp;m=1"></iframe></span></span>
      <span class="pc-ir" aria-hidden="true">${icono('arrow')}</span></a></li>`;
  }).join('')}</ul><p class="pc-nota">Personas de ejemplo creadas con IA. Las webs que enseñan son diseños de partida reales.</p>`;

  const encaja = fig => {
    const id = fig.closest('.pc').dataset.id, q = ESCENA.personas[id]?.pantalla, d = ESCENA.personas[id];
    const pant = fig.querySelector('.pc-pant');
    if (!q || !pant) return;
    const k = fig.clientWidth / d.ancho;
    // esquinas metidas un poco hacia dentro para dejar el marco negro del móvil
    const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
    const [tl, tr, br, bl] = q.map(p => [(p[0] + (cx - p[0]) * .09) * k, (p[1] + (cy - p[1]) * .05) * k]);
    const a = (tr[0] - tl[0]) / PW, b = (tr[1] - tl[1]) / PW, c = (bl[0] - tl[0]) / PH, dd = (bl[1] - tl[1]) / PH;
    const det = a * dd - b * c, dx = br[0] - tl[0], dy = br[1] - tl[1];
    const bx = (dd * dx - c * dy) / det, by = (-b * dx + a * dy) / det;
    pant.style.transform = `matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${dd.toFixed(5)},${tl[0].toFixed(2)},${tl[1].toFixed(2)})`;
    pant.style.clipPath = `polygon(0 0,${PW}px 0,${bx.toFixed(1)}px ${by.toFixed(1)}px,0 ${PH}px)`;
    pant.style.borderRadius = '0';
  };
  const ro = new ResizeObserver(es => es.forEach(e => encaja(e.target)));
  nav.querySelectorAll('.pc-fig').forEach(f => { encaja(f); ro.observe(f); });
  // Las webs de las pantallas se cargan al acercarse; al llegar la web, la pantalla «se enciende»
  const encender = f => {
    const pant = f.parentElement; let hecho = false;
    const ok = () => { if (!hecho) { hecho = true; pant.classList.add('lista'); } };
    f.addEventListener('load', ok, { once: true }); setTimeout(ok, 5000);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const f = e.target.querySelector('iframe[data-src]'); if (f) { encender(f); f.src = f.dataset.src; f.removeAttribute('data-src'); }
    io.unobserve(e.target);
  }), { rootMargin: '300px' });
  // Entrada escalonada (una vez) y respiración solo mientras la tarjeta se ve
  const entra = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('viva'); entra.unobserve(e.target); } }), { threshold: .2 });
  const vista = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('en-vista', e.isIntersecting)), { threshold: 0 });
  nav.querySelectorAll('.pc').forEach(c => { io.observe(c); entra.observe(c); vista.observe(c); });
}
