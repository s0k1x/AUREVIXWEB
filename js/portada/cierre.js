/* ==========================================================
   PORTÁTIL Y MÓVIL CON EL SCROLL (portada)
   Al bajar, la tapa del portátil se cierra poco a poco sobre el teclado
   y el móvil pasa delante con el aviso de web publicada; al subir, se
   abre otra vez. Sigue al dedo o a la rueda exactamente (se puede parar
   a medias). Solo pone --p (0 abierto → 1 cerrado) y --fondo (fondo del
   teclado en px) en #vitrina: el CSS hace el resto con transform y opacity.
   Sin movimiento («menos movimiento» o ajuste de Apariencia) se queda abierto.
   ========================================================== */
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';

export function iniciarCierre() {
  const v = document.getElementById('vitrina');
  if (!v || window.self !== window.top) return;
  let inicio = 0, tramo = 1, raf = 0, ultimo = -1;
  const medir = () => {
    const r = v.getBoundingClientRect(), y = r.top + scrollY, alto = innerHeight;
    // Empieza en cuanto se baja (o cuando la maqueta llega a media pantalla, en el móvil) y termina con ella aún a la vista
    inicio = Math.max(0, y - alto * .55);
    tramo = Math.max(220, r.height * .55);
    const tapa = v.querySelector('.lt-tapa');
    if (tapa) v.style.setProperty('--fondo', `${Math.round(tapa.offsetHeight)}px`);
  };
  const pintar = () => {
    raf = 0;
    const p = quieto() ? 0 : Math.min(1, Math.max(0, (scrollY - inicio) / tramo));
    const r = Math.round(p * 1000) / 1000;
    if (r === ultimo) return;
    ultimo = r;
    v.style.setProperty('--p', r);
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };
  medir(); pintar();
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', () => { medir(); pedir(); }, { passive: true });
  new ResizeObserver(() => { medir(); pedir(); }).observe(v);
  addEventListener('load', () => { medir(); pedir(); }, { once: true });
}
