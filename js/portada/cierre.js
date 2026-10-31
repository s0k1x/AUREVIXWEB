/* ==========================================================
   PORTÁTIL Y MÓVIL EN 3D CON EL SCROLL (portada)
   El portátil son 4 imágenes (abierto → cerrado, js/portada/escena-datos.js dice dónde está su pantalla).
   Al bajar se mezclan de una a otra y la web de la pantalla las sigue (transformación 2D + recorte, sin
   capas 3D: Safari no pinta bien un iframe dentro de ellas). El móvil se retira, los objetos se mueven
   a distinta velocidad y, al cerrarse, la maqueta se encoge y recoge el hueco.
   - Un muelle sin rebote sigue al scroll (con la rueda no va a saltos y se puede invertir a medias).
   - El bucle solo corre mientras hay movimiento. Sin movimiento («menos movimiento») se queda abierto.
   ========================================================== */
import { ESCENA } from './escena-datos.js';
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
const lim = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = t => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;
const PW = 1280, PH = 800; // tamaño lógico de la pantalla del portátil

export function iniciarCierre() {
  const v = document.getElementById('vitrina');
  if (!v || window.self !== window.top) return;
  const lp = v.querySelector('#lp'), pant = v.querySelector('#lpPant'), mv = v.querySelector('#mv');
  const marcos = [...v.querySelectorAll('.lp-f')]; // 1 (abierto) … 4 (cerrado), el último queda encima
  const objs = [...v.querySelectorAll('.obj')], sombra = v.querySelector('.lp-sombra');
  if (!lp || !pant || marcos.length < 4) return;
  const D = ESCENA.portatil;
  // Esquinas de la pantalla (TL, TR, BR, BL) metidas un poco hacia dentro para dejar el marco
  const dentro = q => { const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4; return q.map(p => [mezcla(p[0], cx, .035), mezcla(p[1], cy, .045)]); };
  const Q = D.pantallas.map(q => q && dentro(q));
  // Móvil: pantalla útil dentro de la imagen
  let inicio = 0, tramo = 1, abierto = 0, k = 1, hueco = 0, actual = 0, objetivo = 0, raf = 0, t0 = 0, cerrando = null, vistoCerrado = null;

  const medir = () => {
    lp.style.height = ''; v.style.marginBottom = '';
    const r = v.getBoundingClientRect(), y = r.top + scrollY;
    abierto = r.height; k = lp.clientWidth / D.ancho;
    // Primero se ve entera y abierta: empieza a cerrarse cuando su borde superior sube al tercio de la pantalla
    inicio = Math.max(0, y - innerHeight * .34);
    tramo = Math.max(200, Math.min(abierto * .62, innerHeight * .36));
    hueco = (D.altos[0] - D.altos[3]) * k;
  };
  const leer = () => (objetivo = quieto() ? 0 : lim((scrollY - inicio) / tramo));

  // Esquinas de la pantalla en cada instante (u = 0…3 recorre los 4 pasos del portátil)
  const pantallaEn = u => {
    const i = Math.min(2, Math.floor(u)), f = u - i, a = Q[i], b = Q[Math.min(i + 1, 2)];
    if (!a || !b) return null;
    return a.map((p, j) => [mezcla(p[0], b[j][0], i === 2 ? 0 : f), mezcla(p[1], b[j][1], i === 2 ? 0 : f)]);
  };
  const pintarPantalla = (u, desplaza) => {
    const q = pantallaEn(Math.min(u, 2));
    const visible = lim(1 - (u - 1.55) / .5); // se apaga cuando la tapa casi toca el teclado
    if (!q || visible <= 0) { pant.style.opacity = '0'; pant.style.visibility = 'hidden'; return; }
    pant.style.visibility = ''; pant.style.opacity = visible.toFixed(3);
    // La maqueta se acorta por arriba (las imágenes van pegadas abajo): las coordenadas suben lo mismo
    const [tl, tr, br, bl] = q.map(p => [p[0] * k, p[1] * k - desplaza]);
    const a = (tr[0] - tl[0]) / PW, b = (tr[1] - tl[1]) / PW, c = (bl[0] - tl[0]) / PH, d = (bl[1] - tl[1]) / PH;
    // Esquina inferior derecha de la web en sus propias coordenadas (para recortar el trapecio)
    const det = a * d - b * c, dx = br[0] - tl[0], dy = br[1] - tl[1];
    const bx = (d * dx - c * dy) / det, by = (-b * dx + a * dy) / det;
    pant.style.transform = `matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${d.toFixed(5)},${tl[0].toFixed(2)},${tl[1].toFixed(2)})`;
    pant.style.clipPath = `polygon(0 0,${PW}px 0,${bx.toFixed(1)}px ${by.toFixed(1)}px,0 ${PH}px)`;
  };

  const pintar = p => {
    const u = p * 3, i = Math.min(3, Math.floor(u)), f = u - i, e = suave(p);
    // Entre dos pasos, el que se va se apaga rápido y el que llega aparece encima (así no queda el fantasma de la tapa alta)
    const sm = x => suave(lim(x)), baja = i === 3 ? 0 : 1 - sm((f - .1) / .6), sube = sm((f - .2) / .7);
    marcos.forEach((m, j) => { m.style.opacity = i === 3 ? (j === 3 ? '1' : '0') : j === i ? baja.toFixed(3) : j === i + 1 ? sube.toFixed(3) : '0'; });
    // Altura de la maqueta: sigue a la del portátil (así no queda un hueco al cerrarse)
    const alto = mezcla(D.altos[Math.min(i, 3)], D.altos[Math.min(i + 1, 3)], f) * k;
    const c = p > .002;
    pintarPantalla(Math.min(u, 3), c ? D.alto * k - alto : 0);
    if (c !== cerrando) { cerrando = c; v.classList.toggle('cerrando', c); if (!c) document.dispatchEvent(new Event('vitrina-abierta')); }
    lp.style.height = c ? `${alto.toFixed(1)}px` : '';
    v.style.marginBottom = '';
    if (sombra) sombra.style.opacity = (1 - .35 * e).toFixed(3);
    if (mv) {
      const q = suave(lim(p / .45));
      mv.style.translate = `${(10 * q).toFixed(1)}% ${(22 * q).toFixed(1)}%`;
      mv.style.scale = (1 - .14 * q).toFixed(3);
      mv.style.opacity = (1 - q).toFixed(3);
      const fuera = q >= .999; if (fuera !== vistoCerrado) { vistoCerrado = fuera; mv.classList.toggle('fuera', fuera); }
    }
    objs.forEach((o, n) => { const prof = [.5, .9, .7, 1.2][n % 4]; o.style.translate = `0 ${(-p * 90 * prof).toFixed(1)}px`; o.style.opacity = (1 - .85 * e).toFixed(3); });
  };

  const bucle = t => {
    const dt = Math.min(.05, (t - (t0 || t)) / 1000); t0 = t;
    actual += (objetivo - actual) * (1 - Math.exp(-dt / .07));
    if (Math.abs(objetivo - actual) < .0008) actual = objetivo;
    pintar(actual);
    raf = actual === objetivo ? 0 : requestAnimationFrame(bucle);
    if (!raf) t0 = 0;
  };
  const pedir = () => { leer(); if (!raf) raf = requestAnimationFrame(bucle); };

  // Pantalla del móvil: el recuadro útil dentro de su imagen
  if (mv && ESCENA.movil) {
    const [x0, y0, x1, y1] = ESCENA.movil.pantalla, W = ESCENA.movil.ancho, H = ESCENA.movil.alto, m = mv.querySelector('.mv-pant');
    const ix = (x1 - x0) * .03, iy = (y1 - y0) * .015;
    m.style.left = `${((x0 + ix) / W * 100).toFixed(2)}%`; m.style.top = `${((y0 + iy) / H * 100).toFixed(2)}%`;
    m.style.width = `${((x1 - x0 - 2 * ix) / W * 100).toFixed(2)}%`; m.style.height = `${((y1 - y0 - 2 * iy) / H * 100).toFixed(2)}%`;
  }
  medir(); leer(); actual = objetivo; pintar(actual);
  addEventListener('scroll', pedir, { passive: true });
  const remedir = () => { const p = actual; medir(); pintar(p); pedir(); };
  addEventListener('resize', remedir, { passive: true });
  new ResizeObserver(() => { if (Math.abs(lp.clientWidth / D.ancho - k) > .002) remedir(); }).observe(lp);
  addEventListener('load', remedir, { once: true });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', pedir);
}
