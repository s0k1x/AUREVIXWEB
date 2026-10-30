/* ==========================================================
   INCLINACIÓN 3D AL PASAR EL RATÓN (portada)
   La maqueta del portátil (#vitrina) y las tarjetas de precios (.plan-card)
   se inclinan hacia el puntero como un objeto real, con una luz suave que
   lo sigue. Al salir vuelven a su sitio.
   - Muelle amortiguado (se acerca un 12 % por fotograma): llega y se para,
     sin rebotar. Solo transform → tarjeta gráfica, 60 fps.
   - Solo con ratón (hover + puntero fino) y sin «menos movimiento».
   - Se monta al primer paso del ratón por encima (sirve para tarjetas que
     se pintan después) y, en reposo, deja el estilo como estaba.
   ========================================================== */
// selector, grados máximos, escala al pasar, luz que sigue al puntero (la maqueta no: su caja incluye el fondo)
const OBJETIVOS = [['#vitrina', 7, 1.012, false], ['.plan-card', 5, 1.015, true]];

const conRaton = () => matchMedia('(hover:hover) and (pointer:fine)').matches
  && !matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.movimiento !== 'reducido';

function montar(el, max, escala, conBrillo) {
  el.dataset.inclina = '1';
  el.classList.add('inclina');
  const brillo = document.createElement('i');
  if (conBrillo) {
    brillo.className = 'inclina-brillo';
    brillo.setAttribute('aria-hidden', 'true');
    el.append(brillo);
  }
  let tx = 0, ty = 0, ts = 1, x = 0, y = 0, s = 1, raf = 0;
  const bucle = () => {
    x += (tx - x) * .12; y += (ty - y) * .12; s += (ts - s) * .12;
    const quieto = Math.abs(tx - x) + Math.abs(ty - y) < .03 && Math.abs(ts - s) < .0005; // a menos de 0,03° ya no se ve
    if (quieto && !tx && !ty && ts === 1) { el.style.transform = ''; raf = 0; return; } // en reposo, como estaba
    el.style.transform = `perspective(1100px) rotateX(${y.toFixed(3)}deg) rotateY(${x.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    raf = quieto ? 0 : requestAnimationFrame(bucle);
  };
  const mover = () => { if (!raf) raf = requestAnimationFrame(bucle); };
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !conRaton()) return;
    const r = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) - .5, ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) - .5;
    tx = nx * max * 2; ty = -ny * max * 1.4; ts = escala;
    brillo.style.setProperty('--bx', `${((nx + .5) * 100).toFixed(1)}%`);
    brillo.style.setProperty('--by', `${((ny + .5) * 100).toFixed(1)}%`);
    mover();
  });
  el.addEventListener('pointerleave', () => { tx = ty = 0; ts = 1; mover(); });
}

export function iniciarInclinacion() {
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || !conRaton()) return;
    for (const [sel, max, escala, conBrillo] of OBJETIVOS) {
      const el = e.target.closest?.(sel);
      if (el && !el.dataset.inclina) montar(el, max, escala, conBrillo);
    }
  }, { passive: true });
}
