/* ==========================================================
   «WEBS PENSADAS PARA TU SECTOR» (portada)
   Cada sector es una tarjeta con el diseño de partida real dentro de un móvil (iPhone) que recorre la web despacio
   (solo mientras se ve), con el color de ese diseño como luz de fondo y una entrada escalonada. Sin JavaScript queda la fila de enlaces del HTML. Las webs de las pantallas se
   cargan al acercarse a la tarjeta (cada una es un diseño entero) y aparecen cuando ya están pintadas.
   ========================================================== */
import { plantillaPorId } from './plantillas.js';
import { icono } from '../base/iconos.js';

const SECTORES = { 'webs-para-barberias': 'filo', 'webs-para-centros-de-estetica': 'calma', 'webs-para-restaurantes': 'brasa', 'tiendas-online': 'kiosko', 'webs-para-gimnasios': 'pulso', 'webs-para-profesionales': 'lienzo' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function iniciarSectores() {
  const nav = document.querySelector('.dz-sectores');
  if (!nav || window.self !== window.top) return;
  const enlaces = [...nav.querySelectorAll('a.pg-otro')].map(a => ({ href: a.getAttribute('href'), texto: a.firstChild?.textContent?.trim() || a.textContent.trim() })).filter(e => SECTORES[e.href]);
  if (enlaces.length < 3) return;
  const titulo = nav.querySelector('b')?.textContent || '';
  nav.className = 'dz-cards anim'; // anim: entran escalonadas al verlas (sin JavaScript se ven ya)
  nav.innerHTML = `<b>${esc(titulo)}</b><ul>${enlaces.map((e, n) => {
    const id = SECTORES[e.href], p = plantillaPorId(id);
    return `<li><a class="pc" href="${esc(e.href)}" style="--ac:${p.c.accent};--i:${n}">
      <span class="pc-txt"><b>${esc(e.texto)}</b><small>${esc(p.nombre)} · ${esc(p.sector.split('·')[0].trim())}</small></span>
      <span class="pc-mv" aria-hidden="true"><span class="pc-pant"><span class="pc-rec"><iframe tabindex="-1" title="" data-src="diseno?t=${id}&amp;m=1"></iframe></span></span></span>
      <span class="pc-ir" aria-hidden="true">${icono('arrow')}</span></a></li>`;
  }).join('')}</ul>`;

  // La web de la pantalla va a su tamaño de móvil (390 px) y se reduce para caber en el marco; --d es lo que sube y baja
  const ro = new ResizeObserver(es => es.forEach(e => {
    const s = e.contentRect.width / 390, util = e.contentRect.height - (innerWidth <= 560 ? 12 : 16); // 16/12 px: franja de la isla arriba
    e.target.style.setProperty('--s', s.toFixed(4));
    e.target.style.setProperty('--d', `${(-Math.max(0, 2600 * s - util) * .5).toFixed(1)}px`); // recorre la mitad de arriba de la web
  }));
  nav.querySelectorAll('.pc-pant').forEach(p => ro.observe(p));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const f = e.target.querySelector('iframe[data-src]');
    if (f) { const pant = f.closest('.pc-pant'); let hecho = false; const ok = () => { if (!hecho) { hecho = true; pant.classList.add('lista'); } };
      f.addEventListener('load', ok, { once: true }); setTimeout(ok, 5000); f.src = f.dataset.src; f.removeAttribute('data-src'); }
    io.unobserve(e.target);
  }), { rootMargin: '300px' });
  // Entrada escalonada (una vez) y recorrido de la pantalla solo mientras la tarjeta se ve
  const entra = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('viva'); entra.unobserve(e.target); } }), { threshold: .2 });
  const vista = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('en-vista', e.isIntersecting)), { threshold: 0 });
  nav.querySelectorAll('.pc').forEach(c => { io.observe(c); entra.observe(c); vista.observe(c); });
}
