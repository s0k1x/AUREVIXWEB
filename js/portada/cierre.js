/* ==========================================================
   PORTÁTIL Y MÓVIL CON EL SCROLL (portada)
   Al bajar, la tapa del portátil se cierra sobre el teclado y el móvil
   se retira hasta desaparecer; al subir, se abre y el móvil vuelve.
   La pantalla del portátil siempre enseña las webs.
   - Un muelle sin rebote (críticamente amortiguado) sigue al scroll: con
     la rueda del ratón no va a saltos y se puede invertir a medias.
   - Escribe transform/opacity directamente en las 5 piezas que se mueven
     (sin variables heredadas que obliguen a recalcular todo el bloque).
   - El bucle solo corre mientras hay movimiento; en reposo no gasta nada.
   Sin movimiento («menos movimiento» o ajuste de Apariencia) se queda abierto.
   ========================================================== */
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
const lim = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = t => t * t * (3 - 2 * t); // entra y sale sin tirones

export function iniciarCierre() {
  const v = document.getElementById('vitrina');
  if (!v || window.self !== window.top) return;
  const $ = s => v.querySelector(s);
  const escena = $('.lt-escena'), tapa = $('.lt-tapa'), movil = $('.vt-movil'), sombra = $('.lt-sombra'), brillo = $('.lt-brillo'), reflejo = $('.lt-reflejo');
  if (!escena || !tapa) return;
  let inicio = 0, tramo = 1, fondo = 300, actual = 0, objetivo = 0, raf = 0, t0 = 0;

  const medir = () => {
    const r = v.getBoundingClientRect(), y = r.top + scrollY;
    // Empieza en cuanto se baja (en el móvil, cuando la maqueta llega a media pantalla) y termina con ella aún a la vista
    inicio = Math.max(0, y - innerHeight * .55);
    tramo = Math.max(220, r.height * .55);
    fondo = Math.round(tapa.offsetHeight);
    v.style.setProperty('--fondo', `${fondo}px`);
  };
  const leer = () => (objetivo = quieto() ? 0 : lim((scrollY - inicio) / tramo));

  const pintar = p => {
    const e = suave(p);
    escena.style.transform = `translateZ(${(-fondo * .45).toFixed(1)}px) rotateX(${(-9 - 22 * e).toFixed(2)}deg) translateY(${(-14 * e).toFixed(2)}%)`;
    tapa.style.transform = `rotateX(${(10 - 100 * e).toFixed(2)}deg)`;
    if (reflejo) reflejo.style.transform = `translateX(${(-30 + 80 * e).toFixed(1)}%)`;
    if (brillo) brillo.style.transform = `translateX(${(-60 + 120 * e).toFixed(1)}%)`;
    if (sombra) { sombra.style.transform = `scale(${(1 - .12 * e).toFixed(3)}, ${(1 - .35 * e).toFixed(3)})`; sombra.style.opacity = (1 - .3 * e).toFixed(3); }
    if (movil) {
      // El móvil se va en la primera mitad del cierre: baja, se hace pequeño y se desvanece
      const q = suave(lim(p / .5));
      movil.style.translate = `${(8 * q).toFixed(1)}% ${(18 * q).toFixed(1)}%`;
      movil.style.scale = (1 - .12 * q).toFixed(3);
      movil.style.opacity = (1 - q).toFixed(3);
      movil.classList.toggle('fuera', q >= .999);
    }
  };

  const bucle = t => {
    const dt = Math.min(.05, (t - (t0 || t)) / 1000); t0 = t;
    // Muelle críticamente amortiguado (~0,12 s): llega sin pasarse
    actual += (objetivo - actual) * (1 - Math.exp(-dt / .07));
    if (Math.abs(objetivo - actual) < .0008) actual = objetivo;
    pintar(actual);
    raf = actual === objetivo ? 0 : requestAnimationFrame(bucle);
    if (!raf) t0 = 0;
  };
  const pedir = () => { leer(); if (!raf) raf = requestAnimationFrame(bucle); };

  medir(); leer(); actual = objetivo; pintar(actual);
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', () => { medir(); pedir(); }, { passive: true });
  new ResizeObserver(() => { medir(); pedir(); }).observe(v);
  addEventListener('load', () => { medir(); pedir(); }, { once: true });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', pedir);
}
