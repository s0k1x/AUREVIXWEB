/* ==========================================================
   MASCOTA DEL ASISTENTE
   Un robot blanco con casco, auriculares y luces verdes, dibujado en
   vectores (SVG) para poder animarlo entero: respira, parpadea, mira
   a su aire y sigue el dedo o el ratón con la cabeza y los ojos.
   Dos formas:
     · cara   → solo la cabeza en un disco (botón y cabecera del chat)
     · cuerpo → el robot entero (vuelo, inicio y cierre de sesión)
   Estados (data-estado): normal · feliz · saluda · habla · piensa ·
   escucha · dormido · adios · guino · vuela.   Estilos: funciones.css («Mascota»).
   Todo se anima en código (sin imágenes): cada estado es una coreografía
   que mueve las piezas en vivo con la API de animaciones del navegador.
   ========================================================== */
import { COLORES_ASISTENTE, guardarApariencia, leerApariencia } from './apariencia.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';

/* Degradados compartidos: se meten una sola vez en la página
   (fuera de cualquier elemento oculto, para que siempre se vean).
   Los brillos verdes NO usan filtros de desenfoque (van lentos al animar):
   son trazos más anchos y transparentes por debajo. */
function defs() {
  if (document.getElementById('masc-defs')) return;
  const d = document.createElement('div');
  d.innerHTML = `<svg id="masc-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="mg-cab" cx=".34" cy=".24" r=".95"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f3f6f5"/><stop offset=".85" stop-color="#c8d1ce"/><stop offset="1" stop-color="#a7b3af"/></radialGradient>
    <linearGradient id="mg-bco" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#e9eeec"/><stop offset="1" stop-color="#b3beba"/></linearGradient>
    <linearGradient id="mg-osc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4743"/><stop offset="1" stop-color="#0b0f0d"/></linearGradient>
    <linearGradient id="mg-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1512"/><stop offset="1" stop-color="#010302"/></linearGradient>
    <linearGradient id="mg-llama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#fff"/><stop offset=".3" style="stop-color:var(--m-luz)"/><stop offset=".55" style="stop-color:var(--m-halo)" stop-opacity=".85"/><stop offset="1" style="stop-color:var(--m-halo)" stop-opacity="0"/></linearGradient>
    <linearGradient id="mg-logo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--m-luz)"/><stop offset="1" style="stop-color:var(--m-logo,var(--m-halo))"/></linearGradient>
    <mask id="mm-logo" maskContentUnits="objectBoundingBox" style="mask-type:alpha"><image href="icons/logo-a-verde.png" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/></mask>
  </defs></svg>`;
  (document.body || document.documentElement).prepend(d.firstChild);
}

/* ---------- El dibujo (400 × 470; la cabeza ocupa de y 22 a 240) ---------- */
// El color de las luces sale de dos variables CSS (--m-luz: el trazo claro; --m-halo: el resplandor), así se
// puede cambiar en Ajustes → Apariencia sin volver a dibujar. Ver COLORES_ASISTENTE y funciones.css.
const LIMA = 'var(--m-luz)', HALO = 'var(--m-halo)';
const tz = c => `style="stroke:${c}"`, rl = c => `style="fill:${c}"`;
const espejo = x => `<g transform="translate(400 0) scale(-1 1)">${x}</g>`;
/** Brillo: capas cada vez más anchas y transparentes por debajo del trazo claro (simula el resplandor sin filtros) */
const CAPAS = [[4.4, .05], [3.3, .08], [2.4, .13], [1.6, .22]];
const trazo = (d, w) => `<g class="m-neon" fill="none" stroke-linecap="round" stroke-linejoin="round">${CAPAS.map(([k, o]) => `<path d="${d}" ${tz(HALO)} stroke-opacity="${o}" stroke-width="${(w * k).toFixed(1)}"/>`).join('')}<path d="${d}" ${tz(LIMA)} stroke-width="${w}"/></g>`;
const aro = (cx, cy, rx, ry, w) => `<g class="m-neon">${CAPAS.map(([k, o]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${tz(HALO)} stroke-opacity="${o}" stroke-width="${(w * k).toFixed(1)}"/>`).join('')}<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" style="fill:${HALO};stroke:${LIMA}" fill-opacity=".16" stroke-width="${w}"/></g>`;
const PIERNA = `<rect x="156" y="368" width="40" height="54" rx="18" fill="url(#mg-bco)"/>
  <rect x="156" y="398" width="40" height="12" rx="5" fill="url(#mg-osc)"/>
  <path d="M143 424Q143 412 166 412L188 412Q210 412 210 426L210 437Q210 446 199 446L154 446Q143 446 143 437Z" fill="url(#mg-bco)"/>
  <path d="M145 438H208V441Q208 448 199 448H154Q145 448 145 441Z" fill="url(#mg-osc)"/>
  ${trazo('M152 445H201', 3)}`;
const BRAZO = `<rect x="116" y="284" width="40" height="60" rx="19" fill="url(#mg-bco)"/>
  <circle cx="136" cy="351" r="21" fill="url(#mg-bco)"/>
  <path d="M115 340Q136 351 157 340L157 346Q136 357 115 346Z" fill="url(#mg-osc)"/>
  <circle cx="136" cy="281" r="25" fill="url(#mg-osc)"/>
  ${trazo('M118 272Q136 258 154 272', 3.5)}`;
const LLAMA = x => `<path d="M${x - 10} 448Q${x} 498 ${x + 10} 448Z" fill="url(#mg-llama)"/>`;

/* ---------- Capas ----------
   Para ir a 60 fps aunque la página esté ocupada, el robot NO es un solo SVG con piezas que se mueven por dentro
   (eso obliga a repintar el dibujo en cada fotograma, en el hilo principal). Cada pieza es su propio SVG
   a tamaño completo, colocado encima de los demás: se dibuja una sola vez y después solo se mueve con
   transform y opacity, que hace la tarjeta gráfica sin tocar el hilo principal.
   Todas las capas usan el mismo sistema de coordenadas (400 × 470), así que los ejes de giro son porcentajes fijos. */
const capa = (cls, dentro) => `<svg class="l ${cls}" viewBox="0 0 400 470" focusable="false" aria-hidden="true">${dentro}</svg>`;

const ojo = (cx, lado) => {
  const rect = (extra) => `<rect x="${cx - 10.5}" y="131" width="21" height="36" rx="10.5" ${extra}/>`;
  return capa(`ojo ojo-${lado} m-${lado}`, `
        <g class="o-arco">${trazo(`M${cx - 23} 161Q${cx} 119 ${cx + 23} 161`, 12)}</g>
        <g class="o-pill">${[[40, .05], [30, .08], [21, .13], [12, .22]].map(([w, o]) => rect(`fill="none" ${tz(HALO)} stroke-opacity="${o}" stroke-width="${w}"`)).join('')}${rect(rl(LIMA))}</g>
        <g class="o-sue">${trazo(`M${cx - 21} 144Q${cx} 166 ${cx + 21} 144`, 9)}</g>`);
};
/** Logotipo: la forma del PNG hace de máscara y el color lo ponen las variables (un degradado como el original) */
const LOGO = (x, y, t) => `<rect x="${x}" y="${y}" width="${t}" height="${t}" fill="url(#mg-logo)" mask="url(#mm-logo)"/>`;
const OREJA = `<ellipse cx="46" cy="150" rx="25" ry="58" fill="url(#mg-osc)"/>${aro(45, 150, 15.5, 43, 5)}`;
const RANURA = `<path d="M66 106C76 76 96 56 120 44" fill="none" stroke="#18211d" stroke-width="12" stroke-linecap="round"/>${trazo('M66 106C76 76 96 56 120 44', 3)}`;
const CASCO = `
    <path d="M52 150C52 70 112 22 200 22C288 22 348 70 348 150C348 208 300 240 200 240C100 240 52 208 52 150Z" fill="url(#mg-cab)"/>
    <path d="M72 108C86 58 138 32 200 30" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>
    <path d="M160 26C152 46 148 60 140 76M240 26C248 46 252 60 260 76" fill="none" stroke="#b9c4c0" stroke-width="1.6" stroke-linecap="round"/>
    ${RANURA}${espejo(RANURA)}
    ${LOGO(174, 36, 52)}
    ${OREJA}${espejo(OREJA)}
    <rect x="85" y="79" width="230" height="132" rx="60" fill="#aab6b2"/>
    <rect x="88" y="82" width="224" height="126" rx="57" fill="url(#mg-visor)"/>
    <path d="M246 92Q292 92 306 122Q270 106 232 100Z" fill="#fff" fill-opacity=".13"/>
    <circle cx="112" cy="188" r="3" fill="#fff" fill-opacity=".18"/>`;
const PUNTOS = `<g ${rl(LIMA)}><circle cx="292" cy="30" r="5"/><circle cx="312" cy="18" r="6.5"/><circle cx="336" cy="8" r="8"/></g>`;
const TORSO = `
  <rect x="178" y="232" width="44" height="30" rx="12" fill="url(#mg-osc)"/>
  <path d="M146 266Q146 257 158 257L242 257Q254 257 254 266L256 330Q256 376 200 380Q144 376 144 330Z" fill="url(#mg-bco)"/>
  <path d="M145 348Q200 366 255 348L256 361Q200 380 144 361Z" fill="url(#mg-osc)"/>
  ${trazo('M166 260Q200 275 234 260', 3.5)}${trazo('M156 322Q152 344 161 363', 3)}${trazo('M244 322Q248 344 239 363', 3)}
  ${LOGO(182, 283, 36)}`;

/* Arcoíris (celebraciones): seis copias de los ojos, una por color, que se funden una en otra (solo opacidad) */
const ARCO = [['#ffd0d6', '#ff3b5c'], ['#ffe0b8', '#ff9a1f'], ['#fff6b0', '#ffd21a'], ['#d6ff9a', '#4cff2a'], ['#b8f2ff', '#1fb8ff'], ['#e2c8ff', '#9a4dff']];
const ARCO_C = ARCO.map(c => c[1]);
/** HTML de la mascota. cuerpo: robot entero · disco: círculo oscuro detrás (solo en el vuelo) */
export function mascotaHTML(estado = 'normal', { cuerpo = false, disco = false, clase = '', vivo = true, arcoiris = false } = {}) {
  defs(); iniciar(); vigilar();
  const cabeza = `<span class="l-g l-cabeza"><span class="l-g l-sigue-c">
        ${capa('l-casco', CASCO)}
        <span class="l-g l-ojos">${arcoiris ? ARCO.map(([luz, halo], i) => `<span class="l-g ojos-arco" style="--m-luz:${luz};--m-halo:${halo};--i:${i}">${ojo(149, 'i')}${ojo(251, 'd')}</span>`).join('') : `${ojo(149, 'i')}${ojo(251, 'd')}`}</span>
        ${cuerpo ? capa('l-puntos', PUNTOS) : ''}
      </span></span>`;
  const corporal = cuerpo ? `<span class="l-g m-cuerpo l-corporal">
        ${capa('l-sombra', `<ellipse cx="200" cy="454" rx="100" ry="9" fill="rgba(0,0,0,.55)"/><ellipse cx="200" cy="454" rx="108" ry="11" fill="none" ${tz(HALO)} stroke-opacity=".28" stroke-width="2"/>`)}
        ${capa('l-llama l-llama-i', LLAMA(176))}${capa('l-llama l-llama-d', LLAMA(224))}
        ${capa('l-pierna l-pierna-i', PIERNA)}${capa('l-pierna l-pierna-d', espejo(PIERNA))}
        ${capa('l-torso', TORSO)}
      </span>` : '';
  const brazos = cuerpo ? `<span class="l-g m-cuerpo l-brazos">${capa('l-brazo l-brazo-i', BRAZO)}${capa('l-brazo l-brazo-d', espejo(BRAZO))}</span>` : '';
  return `<span class="masc ${cuerpo ? 'cuerpo' : 'cara'} ${clase}" data-estado="${estado}"${vivo ? '' : ' data-anim="no"'} aria-hidden="true" style="--d:${(Math.random() * 3).toFixed(2)}s">
    <span class="masc-lienzo">
      ${disco ? `<span class="l-g l-disco">${capa('', '<circle cx="200" cy="134" r="186" fill="#040a06"/>')}</span>` : ''}
      <span class="l-g m-todo">${corporal}${cabeza}${brazos}</span>
    </span>
  </span>`;
}

/** Cambia el estado de una mascota; si das «volverEn» (ms), regresa sola a «normal» */
export function estadoMascota(el, estado, volverEn = 0) {
  if (!el) return;
  clearTimeout(el._vuelve);
  el.dataset.estado = estado;
  if (volverEn) el._vuelve = setTimeout(() => { el.dataset.estado = 'normal'; }, volverEn);
}

/* ---------- Vida propia: parpadea, mira a su aire, sigue el ratón o el dedo, a veces sonríe ----------
   Todo con temporizadores sueltos y transiciones CSS (nada de animaciones infinitas):
   así la página no se repinta sin parar y no gasta batería. */
let iniciada = false, ultimo = null, raf = 0, quieto = 0, antes = [9, 9];
function mirarA(x, y) {
  document.querySelectorAll('.masc').forEach(m => {
    const r = m.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    const px = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / 300)), py = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / 300));
    if (Math.abs(px - antes[0]) < .06 && Math.abs(py - antes[1]) < .06) return; // casi igual: no se toca (evita repintar)
    antes = [px, py];
    m.style.setProperty('--px', px.toFixed(2));
    m.style.setProperty('--py', py.toFixed(2));
  });
}
function iniciar() {
  if (iniciada) return;
  iniciada = true;
  const mover = e => {
    if (sinMovimiento()) return;
    ultimo = [e.clientX, e.clientY];
    if (e.pointerType === 'touch') { clearTimeout(quieto); quieto = setTimeout(() => { antes = [9, 9]; mirarA(innerWidth / 2, innerHeight / 2); }, 2600); }
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; mirarA(...ultimo); });
  };
  addEventListener('pointermove', mover, { passive: true });
  addEventListener('pointerdown', mover, { passive: true });
  const latido = () => {
    setTimeout(latido, 600);
    if (document.hidden || sinMovimiento()) return;
    const ahora = performance.now();
    document.querySelectorAll('.masc').forEach(m => {
      const e = m.dataset.estado;
      if (m._parp === undefined) { m._parp = ahora + 700 + Math.random() * 2200; m._mira = ahora + 1400 + Math.random() * 2500; m._feliz = ahora + 7000 + Math.random() * 6000; }
      if (ahora > m._parp && !m._ojosAnim && e !== 'dormido' && !/^(feliz|saluda|adios)$/.test(e)) {
        parpadear(m);
        m._parp = ahora + (Math.random() < .22 ? 380 : 2400 + Math.random() * 4200); // a veces, doble parpadeo
      }
      if (ahora > m._mira && e === 'normal') {
        const quieta = Math.random() < .4;
        m.style.setProperty('--gx', quieta ? 0 : (Math.random() * 2 - 1).toFixed(2));
        m.style.setProperty('--gy', quieta ? 0 : (Math.random() * 1.2 - .6).toFixed(2));
        m._mira = ahora + 1500 + Math.random() * 3200;
      }
      if (ahora > m._feliz && e === 'normal' && m.classList.contains('cara')) { estadoMascota(m, 'feliz', 1300); m._feliz = ahora + 9000 + Math.random() * 8000; }
    });
  };
  latido();
}
/** Parpadeo de verdad: cierra deprisa, se queda un instante, abre más despacio y se pasa un pelo (ojos vivos) */
function parpadear(m) {
  m.querySelectorAll('.ojo').forEach(o => o.animate([
    { transform: 'scaleY(1)' }, { transform: 'scaleY(.07)', offset: .3, easing: 'linear' }, { transform: 'scaleY(.07)', offset: .42, easing: 'cubic-bezier(.2,.7,.3,1.2)' }, { transform: 'scaleY(1)' }
  ], { duration: 200, easing: 'cubic-bezier(.5,0,.9,.4)' }));
}
export const seguirPuntero = iniciar; // por compatibilidad: arranca la vida propia
/** Descarga el logotipo del pecho antes de necesitarlo, para que el vuelo no tenga tirones */
export function precargar() { const i = new Image(); i.src = 'icons/logo-a-verde.png'; return i.decode ? i.decode().catch(() => {}) : Promise.resolve(); }

/* ---------- Vuelo: el robot sale del botón, cruza la pantalla y se convierte en el avatar ---------- */
const LADO = 372, CX = 200, CY = 134; // el disco de la cara mide 372 unidades y su centro cae en (200, 134)
function anillo(r, ms = 700) {
  const a = document.createElement('i');
  a.className = 'masc-anillo';
  a.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.width}px`;
  document.body.append(a);
  setTimeout(() => a.remove(), ms + 100);
}
/* ---------- Física: muelle amortiguado ----------
   Respuesta de un muelle real (masa 1): sube de 0 a 1, se pasa un poco y se asienta. Se usa para los rebotes y
   como curva «linear()» del navegador, que la ejecuta en la tarjeta gráfica igual que cualquier otra curva. */
function muelle(t, { rigidez = 170, amort = 14 } = {}) {
  const w0 = Math.sqrt(rigidez), z = amort / (2 * w0);
  if (z >= 1) return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
}
/** Rebote al aterrizar: escala con muelle (se pasa y se asienta), solo transform → 60 fps */
export function rebote(el, { de = .78, ms = 620 } = {}) {
  if (!el || sinMovimiento() || typeof el.animate !== 'function') return;
  const N = 36, seg = ms / 1000;
  el.animate(Array.from({ length: N + 1 }, (_, k) => {
    const v = muelle((k / N) * seg, { rigidez: 260, amort: 15 });
    const sc = de + (1 - de) * v;
    return { transform: `scale(${(sc * (1 + (1 - v) * .06)).toFixed(4)},${(sc * (1 - (1 - v) * .06)).toFixed(4)})`, offset: k / N };
  }), { duration: ms, easing: 'linear' });
}

const ss = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
/**
 * Postura en el aire según hacia dónde va (tx, ty: dirección; rap: rapidez 0–1; u: momento del vuelo 0–1).
 * - Subiendo o de lado: va derecho, inclinado hacia donde avanza, con un vaivén suave.
 * - Bajando: se da la vuelta poco a poco y cae de cabeza, como un clavado (la cabeza apunta hacia donde va).
 * - Antes de tocar («llega»): se endereza con un golpe de propulsores para aterrizar de pie.
 * Devuelve el giro en grados y cuánto está «de cabeza» (0–1) y frenando (0–1).
 */
function posturaVuelo(tx, ty, rap, u, llega) {
  const endereza = ss((u - (llega - .17)) / .15);
  const cae = ss((ty - .2) / .55) * Math.min(1, rap * 1.6) * (1 - endereza);
  const inclina = Math.max(-22, Math.min(22, tx * 20 * rap)) + 5 * Math.sin(u * Math.PI * 5) * rap * (1 - cae);
  let clavado = Math.atan2(tx, -ty) * 180 / Math.PI;
  if (Math.abs(tx) < .04) clavado = 170 * (tx < 0 ? -1 : 1);
  clavado = Math.max(-170, Math.min(170, clavado));
  return { rot: inclina + (clavado - inclina) * cae, cae, frena: campana(u, llega - .2, llega + .02) };
}

/**
 * «de» y «a» son los rectángulos (en pantalla) de dos mascotas de tipo cara.
 * Vuelo con física: se agacha para coger impulso, despega estirándose, recorre un arco con el cuerpo
 * inclinado hacia donde va, se encoge al llegar, se aplasta al tocar y se asienta con un muelle.
 * Son 60 fotogramas calculados de antemano (posición, giro, escala y estiramiento) que el navegador
 * reproduce en la tarjeta gráfica: solo transform y opacity, sin trabajo en el hilo principal durante el vuelo.
 * Devuelve una promesa que se cumple al aterrizar (al momento con poco movimiento).
 */
export function volar(de, a, { ms = 950 } = {}) {
  if (sinMovimiento() || !de?.width || !a?.width || typeof Element.prototype.animate !== 'function') return Promise.resolve();
  const c0 = { x: de.left + de.width / 2, y: de.top + de.width / 2 }, c1 = { x: a.left + a.width / 2, y: a.top + a.width / 2 };
  const s0 = de.width / LADO, s1 = a.width / LADO;
  const dist = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const alto = Math.min(190, dist * .36 + 40);
  // Se dibuja ya al mayor tamaño que tendrá y durante el vuelo solo se reduce: se ve nítido y no se recalcula el vector
  const grande = Math.max(.42, (s0 + s1) * 1.9), S = Math.max(grande, s0, s1) * 1.08;
  const el = document.createElement('div');
  el.className = 'masc-vuelo';
  el.style.cssText = `width:${400 * S}px;height:${470 * S}px;transform-origin:${CX * S}px ${CY * S}px`;
  el.innerHTML = mascotaHTML('vuela', { cuerpo: true, disco: true, vivo: false });
  document.body.append(el);

  // Trayectoria: curva de Bézier cuadrática con el punto de control por encima del punto medio (arco limpio)
  const ctrl = { x: (c0.x + c1.x) / 2 + (c1.x - c0.x) * .08, y: Math.min(c0.y, c1.y) - alto * 1.6 };
  const bez = p => ({ x: (1 - p) ** 2 * c0.x + 2 * (1 - p) * p * ctrl.x + p * p * c1.x, y: (1 - p) ** 2 * c0.y + 2 * (1 - p) * p * ctrl.y + p * p * c1.y });
  const vel = p => ({ x: 2 * (1 - p) * (ctrl.x - c0.x) + 2 * p * (c1.x - ctrl.x), y: 2 * (1 - p) * (ctrl.y - c0.y) + 2 * p * (c1.y - ctrl.y) });
  const suave = v => (v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2); // cúbica entrada-salida
  const IMPULSO = .13, LLEGA = .84, N = 60;
  const vMax = Math.max(1, ...Array.from({ length: 21 }, (_, k) => Math.hypot(vel(k / 20).x, vel(k / 20).y)));
  const fotogramas = [], M = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    let p, sx = 1, sy = 1, rot = 0, baja = 0, sc, tx = 0, ty = 0, rap = 0, cae = 0, frena = 0;
    if (u < IMPULSO) {
      // Coge impulso: se agacha y se ensancha
      const w = Math.sin(Math.PI * (u / IMPULSO));
      p = 0; sx = 1 + .14 * w; sy = 1 - .16 * w; baja = 6 * w; rot = -4 * w; sc = s0;
    } else if (u < LLEGA) {
      const v = (u - IMPULSO) / (LLEGA - IMPULSO);
      p = suave(v);
      const d = vel(p), rapidez = Math.hypot(d.x, d.y) / vMax;
      tx = d.x / (Math.hypot(d.x, d.y) || 1); ty = d.y / (Math.hypot(d.x, d.y) || 1); rap = rapidez * Math.sin(Math.PI * v) ** .5;
      // Se estira con la velocidad y se inclina hacia donde va
      sx = 1 - .07 * rapidez; sy = 1 + .11 * rapidez;
      ({ rot, cae, frena } = posturaVuelo(tx, ty, rapidez, u, LLEGA));
      sc = s0 + (s1 - s0) * p + (grande - (s0 + s1) / 2) * Math.sin(Math.PI * p);
    } else {
      // Toca destino: se aplasta y se asienta con un muelle
      const w = (u - LLEGA) / (1 - LLEGA), f = Math.exp(-5 * w) * Math.sin(Math.PI * 2.4 * w);
      p = 1; sx = 1 + .12 * f; sy = 1 - .12 * f; sc = s1 * (1 + .1 * (1 - muelle(w * .5, { rigidez: 300, amort: 16 })) * (w < .02 ? 0 : 1));
    }
    const c = bez(p);
    M.push({ u, tx, ty, rap, rot, cae, frena, fin: 0 });
    fotogramas.push({
      transform: `translate3d(${(c.x - CX * S).toFixed(2)}px,${(c.y + baja - CY * S).toFixed(2)}px,0) scale(${(sc / S).toFixed(5)}) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`,
      offset: u
    });
  }
  anillo({ left: de.left, top: de.top, width: de.width }, 600);
  const vuelo = el.animate(fotogramas, { duration: ms, fill: 'both', easing: 'linear' });
  vidaEnVuelo(el, M, ms);
  // Al salir enseña el cuerpo y pierde el disco; al llegar, al revés: queda idéntico al avatar
  el.querySelector('.l-disco')?.animate([{ opacity: 1 }, { opacity: 0, offset: .22 }, { opacity: 0, offset: .74 }, { opacity: 1, offset: .86 }, { opacity: 1 }], { duration: ms, fill: 'both' });
  el.querySelectorAll('.m-cuerpo').forEach(c => c.animate([{ opacity: 0 }, { opacity: 1, offset: .22 }, { opacity: 1, offset: .74 }, { opacity: 0, offset: .86 }, { opacity: 0 }], { duration: ms, fill: 'both' }));
  // Estela: chispas que nacen en el camino y caen apagándose (solo transform y opacity)
  for (let i = 0; i < 9; i++) {
    const v = .08 + i * .1, t = IMPULSO + v * (LLEGA - IMPULSO), c = bez(suave(v)), ch = document.createElement('i');
    ch.className = 'masc-chispa';
    const tam = (3 + Math.random() * 5).toFixed(1);
    ch.style.cssText = `left:${(c.x + (Math.random() - .5) * 22).toFixed(1)}px;top:${(c.y + 20 * S / .5 + (Math.random() - .5) * 18).toFixed(1)}px;width:${tam}px;height:${tam}px`;
    document.body.append(ch);
    ch.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: .95, transform: 'scale(1)', offset: .2 }, { opacity: 0, transform: `translate(${((Math.random() - .5) * 18).toFixed(1)}px,22px) scale(.15)` }],
      { duration: 620, delay: ms * t, fill: 'both', easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.catch(() => {}).then(() => ch.remove());
  }
  return vuelo.finished.catch(() => {}).then(() => {
    anillo({ left: a.left, top: a.top, width: a.width });
    el.remove();
  });
}

/**
 * Vida durante el vuelo: el robot no viaja rígido. Con los datos de cada fotograma del vuelo (hacia dónde va,
 * lo rápido que va y cuánto se inclina) se calcula el movimiento de cada pieza:
 * - brazos que baten como alas (más deprisa y más abiertos cuanto más rápido va; el de dentro de la curva, más alto),
 * - piernas que patalean y se quedan atrás con la velocidad,
 * - cabeza que se adelanta hacia donde va y se balancea, ojos que miran el camino y un parpadeo a mitad,
 * - llamas más largas al acelerar.
 * Todo con transform (tarjeta gráfica); los fotogramas se reproducen a la vez que el vuelo.
 */
function vidaEnVuelo(el, M, ms) {
  const q = sel => el.querySelector(sel), dur = { duration: ms, fill: 'both', easing: 'linear' };
  let fase = 0;
  const K = M.map((m, i) => {
    if (i) fase += (M[i].u - M[i - 1].u) * ms / 1000 * Math.PI * 2 * (2.2 + 3.4 * m.rap); // aleteo: 2,2 a 5,6 por segundo
    const cae = m.cae || 0, frena = m.frena || 0, recto = 1 - cae;
    const ala = Math.sin(fase), lado = Math.max(-1, Math.min(1, m.rot / 18)) * recto, quieto = 1 - m.rap;
    // Hacia dónde va, visto desde el propio robot (si va de cabeza, «adelante» es hacia su coronilla): ahí miran los ojos
    const g = -(m.rot || 0) * Math.PI / 180, lx = m.tx * Math.cos(g) - m.ty * Math.sin(g), ly = m.tx * Math.sin(g) + m.ty * Math.cos(g);
    const mezcla = (a, b) => a + (b - a) * cae;
    return {
      u: m.u,
      // De cabeza: brazos estirados por delante (como un clavado) y piernas juntas; al frenar, brazos abiertos para equilibrarse
      bi: mezcla(50 + 34 * (.5 + .5 * m.rap) * ala + 14 * lado - 30 * m.fin, 158 + 6 * ala) + 28 * frena,
      bd: mezcla(-(50 + 34 * (.5 + .5 * m.rap) * Math.sin(fase + .35)) + 14 * lado + 30 * m.fin, -158 - 6 * Math.sin(fase + .35)) - 28 * frena,
      pi: mezcla(8 + 12 * Math.sin(fase * .9 + 1) * (.4 + .6 * m.rap) - 10 * m.tx * m.rap, 3) + 10 * frena,
      pd: mezcla(-6 + 12 * Math.sin(fase * .9 + 1 + Math.PI) * (.4 + .6 * m.rap) - 10 * m.tx * m.rap, -3) - 10 * frena,
      cab: mezcla(m.tx * 9 * m.rap + 2.5 * Math.sin(fase * .5) * quieto - lado * 4, 0),
      cy: -1.2 * Math.sin(fase) * (.4 + .6 * m.rap) * recto + 1.5 * frena,
      ox: lx * 4.5, oy: ly * 3,
      parp: Math.abs(m.u - .42) < .025 ? .12 : 1,
      // Llamas más largas al acelerar y un golpe fuerte al enderezarse para frenar
      ll: .7 + .7 * m.rap + .9 * frena
    };
  });
  const a = (s, f) => { const n = q(s); if (n) n.animate(K.map(k => ({ transform: f(k), offset: k.u })), dur); };
  a('.l-brazo-i', k => `rotate(${k.bi.toFixed(2)}deg)`);
  a('.l-brazo-d', k => `rotate(${k.bd.toFixed(2)}deg)`);
  a('.l-pierna-i', k => `rotate(${k.pi.toFixed(2)}deg)`);
  a('.l-pierna-d', k => `rotate(${k.pd.toFixed(2)}deg)`);
  a('.l-cabeza', k => `translateY(${k.cy.toFixed(2)}%) rotate(${k.cab.toFixed(2)}deg)`);
  a('.l-ojos', k => `translate(${k.ox.toFixed(2)}%,${k.oy.toFixed(2)}%)`);
  el.querySelectorAll('.ojo').forEach(o => o.animate(K.map(k => ({ transform: `scaleY(${k.parp})`, offset: k.u })), dur));
  el.querySelectorAll('.l-llama').forEach(l => l.parentElement && l.animate(K.map(k => ({ transform: `scale(${(.9 + .1 * k.ll).toFixed(3)},${k.ll.toFixed(3)})`, offset: k.u })), { ...dur, composite: 'add' }));
}

/** Dónde está la cara de una mascota en pantalla: centro del disco (x, y) y escala (px por unidad del dibujo) */
export function puntoMascota(m) {
  const r = m?.getBoundingClientRect();
  if (!r?.width) return null;
  if (m.classList.contains('cara')) return { x: r.left + r.width / 2, y: r.top + r.width / 2, s: r.width / LADO };
  const s = r.width / 400;
  return { x: r.left + CX * s, y: r.top + CY * s, s };
}

/**
 * Trayecto: el robot entero vuela de un punto a otro por una curva amplia (sube, se inclina en el giro y baja),
 * moviendo brazos, piernas, cabeza, ojos y llamas todo el camino (vidaEnVuelo). Sirve para entrar y salir de
 * la cuenta: sale del botón del asistente hasta el centro de la pantalla, y al cerrar sesión vuelve a él.
 * «de» y «a» son puntos de puntoMascota(). «deCara»/«aCara»: si sale o llega en forma de cara (con su disco).
 * La curva pasa por cuatro puntos (Catmull-Rom centrípeta) y se recorre por distancia, con salida y llegada
 * suaves; al principio coge impulso (se agacha) y al final se aplasta y se asienta.
 * Son 96 fotogramas calculados de antemano: solo transform y opacity, en la tarjeta gráfica.
 */
export function trayecto(de, a, { ms = 1100, deCara = false, aCara = false, capa = document.body, arcoiris = false } = {}) {
  if (sinMovimiento() || !de || !a || typeof Element.prototype.animate !== 'function') return Promise.resolve(false);
  const dx = a.x - de.x, dy = a.y - de.y, dist = Math.hypot(dx, dy) || 1;
  // El arco se abre hacia el lado con más sitio (prefiriendo subir) y nunca se sale de la pantalla
  const curva = Math.min(240, dist * .32), W = innerWidth, H = innerHeight, m = Math.min(70, W * .12);
  const sitio = (nx, ny) => { const x = (de.x + a.x) / 2 + nx * curva, y = (de.y + a.y) / 2 + ny * curva; return Math.min(x - m, W - m - x, y - m, H - m - y) - ny * 30; };
  let nx = -dy / dist, ny = dx / dist;
  if (sitio(-nx, -ny) > sitio(nx, ny)) { nx = -nx; ny = -ny; }
  const dentro = q => ({ x: Math.min(W - m, Math.max(m, q.x)), y: Math.min(H - m, Math.max(m, q.y)) });
  const lerp = (t, k) => ({ x: de.x + dx * t + nx * curva * k, y: de.y + dy * t + ny * curva * k });
  const P = [lerp(-.15, -.2), { x: de.x, y: de.y }, dentro(lerp(.3, 1)), dentro(lerp(.72, .75)), { x: a.x, y: a.y }, lerp(1.15, -.2)];
  const cr = (p0, p1, p2, p3, t) => {
    const d = (u, v) => Math.max(1e-3, Math.hypot(v.x - u.x, v.y - u.y) ** .5);
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
    const L = (q, w, ta, tb) => ({ x: ((tb - u) * q.x + (u - ta) * w.x) / (tb - ta), y: ((tb - u) * q.y + (u - ta) * w.y) / (tb - ta) });
    const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    return L(L(A1, A2, 0, t2), L(A2, A3, t1, t3), t1, t2);
  };
  const pts = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 80; k++) pts.push(cr(P[i - 1], P[i], P[i + 1], P[i + 2], k / 80));
  pts.push({ x: a.x, y: a.y });
  const largo = [0];
  for (let i = 1; i < pts.length; i++) largo.push(largo[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = largo[largo.length - 1];
  const en = f => {
    const obj = f * total; let i = 1;
    while (i < largo.length - 1 && largo[i] < obj) i++;
    const r = (obj - largo[i - 1]) / Math.max(1e-6, largo[i] - largo[i - 1]);
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r };
  };
  // Velocidad: entrada y salida suaves (cúbica), y su derivada para saber lo rápido que va en cada momento
  const avance = v => (v < .5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);
  const rapidez = v => (v < .5 ? 12 * v * v : 6 * (-2 * v + 2) ** 2 / 2) / 3;
  const IMPULSO = .12, LLEGA = .86, N = 140;
  const S = Math.max(de.s, a.s) * 1.08;
  const el = document.createElement('div');
  el.className = 'masc-vuelo';
  el.style.cssText = `width:${400 * S}px;height:${470 * S}px;transform-origin:${CX * S}px ${CY * S}px`;
  el.innerHTML = mascotaHTML('vuela', { cuerpo: true, disco: deCara || aCara, vivo: false, arcoiris });
  capa.append(el);

  const F = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N, v = Math.min(1, Math.max(0, (u - IMPULSO) / (LLEGA - IMPULSO))), f = avance(v), c = en(f);
    const d = en(Math.min(1, f + .012)), b = en(Math.max(0, f - .012)), paso = Math.hypot(d.x - b.x, d.y - b.y) || 1;
    F.push({ u, f, c, tx: (d.x - b.x) / paso, ty: (d.y - b.y) / paso, rap: u > IMPULSO && u < LLEGA ? Math.min(1, rapidez(v)) : 0 });
  }
  const PO = F.map(q => posturaVuelo(q.tx, q.ty, q.rap, q.u, LLEGA));
  let rot = PO.map(q => q.rot);
  for (let pasada = 0; pasada < 4; pasada++) rot = rot.map((r, i) => (rot[Math.max(0, i - 1)] + 2 * r + rot[Math.min(N, i + 1)]) / 4);
  const fotogramas = F.map((q, k) => {
    const { u, f, c, rap } = q;
    // Crece a mitad de camino (se acerca a la pantalla) y acaba a su tamaño
    const sc = de.s + (a.s - de.s) * ss(f) + Math.max(de.s, a.s) * .12 * Math.sin(Math.PI * f);
    let sx = 1 - .06 * rap, sy = 1 + .1 * rap, baja = 0;
    if (u < IMPULSO) { const w = Math.sin(Math.PI * u / IMPULSO); sx = 1 + .12 * w; sy = 1 - .14 * w; baja = 8 * w * de.s / .4; }
    if (u >= LLEGA) { const w = (u - LLEGA) / (1 - LLEGA), g = Math.exp(-5 * w) * Math.sin(Math.PI * 2.4 * w); sx = 1 + .12 * g; sy = 1 - .12 * g; }
    const vaiven = Math.sin(f * Math.PI * 3) * 5 * Math.sin(Math.PI * f);
    return { transform: `translate3d(${(c.x - CX * S).toFixed(2)}px,${(c.y + baja + vaiven - CY * S).toFixed(2)}px,0) scale(${(sc / S).toFixed(5)}) rotate(${rot[k].toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`, offset: u };
  });
  const vuelo = el.animate(fotogramas, { duration: ms, fill: 'both', easing: 'linear' });
  vidaEnVuelo(el, F.map((q, k) => ({ u: q.u, tx: q.tx, ty: q.ty, rap: q.rap, rot: rot[k], cae: PO[k].cae, frena: PO[k].frena, fin: aCara ? ss((q.u - .66) / .2) : 0 })), ms);
  // Forma de cara en un extremo: el disco y el cuerpo se cruzan al salir o al llegar
  const disco = el.querySelector('.l-disco'), cuerpos = el.querySelectorAll('.m-cuerpo');
  if (deCara || aCara) {
    disco?.animate(deCara ? [{ opacity: 1 }, { opacity: 0, offset: .2 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0, offset: .76 }, { opacity: 1, offset: .87 }, { opacity: 1 }], { duration: ms, fill: 'both' });
    cuerpos.forEach(c => c.animate(deCara ? [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 1, offset: .76 }, { opacity: 0, offset: .87 }, { opacity: 0 }], { duration: ms, fill: 'both' }));
  }
  // Estela de chispas (en arcoíris: más, más grandes y de todos los colores, dibujando el camino)
  const nCh = arcoiris ? 30 : 10;
  for (let i = 0; i < nCh; i++) {
    const u = IMPULSO + .04 + i * (.7 / nCh), c = en(avance((u - IMPULSO) / (LLEGA - IMPULSO)));
    const ch = document.createElement('i'), tam = ((arcoiris ? 5 : 3) + Math.random() * (arcoiris ? 6 : 4)).toFixed(1);
    ch.className = 'masc-chispa';
    ch.style.cssText = `left:${(c.x + (Math.random() - .5) * 20).toFixed(1)}px;top:${(c.y + 300 * (de.s + a.s) / 2 + (Math.random() - .5) * 16).toFixed(1)}px;width:${tam}px;height:${tam}px${arcoiris ? `;--c:${ARCO_C[i % ARCO_C.length]}` : ''}`;
    capa.append(ch);
    ch.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: .95, transform: 'scale(1)', offset: .18 }, { opacity: 0, transform: `translate(${((Math.random() - .5) * 22).toFixed(1)}px,${arcoiris ? 34 : 24}px) scale(.15)` }],
      { duration: arcoiris ? 900 : 650, delay: ms * u, fill: 'both', easing: 'cubic-bezier(.23,1,.32,1)' }).finished.catch(() => {}).then(() => ch.remove());
  }
  return vuelo.finished.catch(() => {}).then(() => { el.remove(); return true; });
}

/* ---------- Coreografías en vivo: el robot animado en código, sin imágenes ----------
   Cada estado es una función del tiempo t ∈ [0, 1) que devuelve la pose de cada pieza. Con ella se calculan
   los fotogramas clave del bucle y el navegador los reproduce en la tarjeta gráfica (solo transform y opacity),
   interpolando entre ellos a la frecuencia de la pantalla (60, 90 o 120 Hz): nítido a cualquier tamaño y sin
   descargar nada. El último fotograma enlaza con el primero, así el bucle no se nota.
   Al cambiar de estado, cada pieza pasa de donde está a la pose nueva con una transición corta (sin saltos).
   El parpadeo y la mirada no van en el bucle: los lanza la «vida propia» al azar (más natural que un ciclo). */
const TAU = Math.PI * 2;
const sn = (t, f = 1, fase = 0) => Math.sin(TAU * (t * f + fase)); // onda que cierra el bucle si f es entero
const campana = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
const n2 = v => +v.toFixed(3);
const PIEZAS = {
  todo: '.m-todo', cabeza: '.l-cabeza', ojos: '.l-ojos', ojoI: '.ojo-i', ojoD: '.ojo-d', brazoI: '.l-brazo-i', brazoD: '.l-brazo-d',
  piernaI: '.l-pierna-i', piernaD: '.l-pierna-d', sombra: '.l-sombra', llama: '.l-llama', puntos: '.l-puntos'
};
/* Coreografías. Cada una da la acción PRINCIPAL en función de t ∈ [0, 1) (todo en números):
     y (cuerpo, % hacia abajo) · r (giro del cuerpo) · sx, sy (estirar y aplastar) · hr, hy (cabeza: giro y % hacia abajo)
     bi, bd (brazos, grados) · pi, pd (piernas) · ex, ey (mirada, %) · oi, od, ow (ojos: alto izquierdo, alto derecho, ancho)
     pu (puntos de pensar) · so, sa (sombra: tamaño, opacidad) · lx, ly, lo (llamas: ancho, largo, opacidad)
   Lo que no da una coreografía no se toca (así la mirada sigue al ratón y el parpadeo sale al azar).
   La acción SECUNDARIA no se escribe a mano: la calcula hornear() con física (muelles), ver más abajo. */
const COREO = {
  // Reposo: respira (el pecho se ensancha un pelo al subir) y se balancea; la cabeza va un poco por detrás
  normal: {
    ms: f => (f === 'cara' ? 4600 : 3800),
    pose: (t, f) => ({
      y: f === 'cara' ? 0 : -1.2 * sn(t), sx: 1 + .008 * sn(t, 1, .2), sy: 1 - .008 * sn(t, 1, .2),
      hr: 2.4 * sn(t, 1, -.12) + 1.1 * sn(t, 2, .2), hy: f === 'cara' ? -1.1 * sn(t, 1, -.06) : 0,
      bi: 9 + 3.5 * sn(t, 1, -.16), bd: -9 - 3.5 * sn(t, 1, .34)
    })
  },
  // Escucha (mientras le escribes): se inclina hacia ti, asiente despacio y abre mucho los ojos
  escucha: {
    ms: () => 1900,
    pose: t => ({
      y: -.7 * sn(t), r: -1.2,
      hr: 7 + 2 * sn(t, 1, .08), hy: .9 + .7 * Math.max(0, sn(t, 2)),
      ow: 1.07 + .02 * sn(t, 2), oi: 1.12 + .03 * sn(t, 2), od: 1.12 + .03 * sn(t, 2, .08),
      bi: 15 + 3 * sn(t), bd: -15 - 3 * sn(t, 1, .4)
    })
  },
  // Habla: cabecea con las frases, los ojos laten como una voz y la mano explica en arcos
  habla: {
    ms: () => 2000,
    pose: t => {
      const voz = k => .5 - .5 * Math.cos(TAU * (t * 8 + k)) * (.6 + .4 * sn(t, 3, k)), frase = .5 - .5 * Math.cos(TAU * t);
      return {
        y: -.8 * sn(t, 2), r: .8 * sn(t, 1, .3),
        hr: 2.6 * sn(t, 2, .1) + 1.2 * sn(t, 3), hy: .5 * Math.abs(sn(t, 4)),
        oi: 1 - .38 * voz(0), od: 1 - .38 * voz(.06),
        bi: 10 + 3 * sn(t, 2), bd: -16 - 36 * frase - 10 * sn(t, 4) * frase
      };
    }
  },
  // Piensa: mano a la barbilla, cabeza ladeada, ojos que buscan arriba y puntos que aparecen
  piensa: {
    ms: () => 2600,
    pose: t => ({
      y: -.6 * sn(t), r: 1,
      hr: -8 + 2.4 * sn(t, 1, .15), hy: .4,
      ex: -2.4 + 2.8 * (.5 - .5 * Math.cos(TAU * t)), ey: -1.4 + .4 * sn(t, 2),
      oi: .84 - .76 * campana(t, .62, .66), od: .84 - .76 * campana(t, .62, .66),
      bi: 9 + 2 * sn(t), bd: -126 + 5 * sn(t, 1, .3) - 4 * campana(t, .2, .3),
      pu: Math.min(1, .25 + .75 * Math.max(0, sn(t, 1, -.25)))
    })
  },
  // Alegría: se agacha para coger impulso, salta en parábola estirándose, celebra con los brazos arriba,
  // cae, se aplasta al tocar el suelo y rebota hasta asentarse
  feliz: {
    ms: () => 1100,
    pose: (t, f) => {
      const H = f === 'cara' ? 2.4 : 9, A = .17, B = .72;
      let y = 0, sx = 1, sy = 1, aire = 0, brazos = 0;
      if (t < A) { const c = (t / A) ** 2; y = 1.4 * c; sx = 1 + .1 * c; sy = 1 - .13 * c; brazos = -.15 * c; }
      else if (t < B) {
        const p = (t - A) / (B - A), v = 1 - 2 * p; // velocidad: máxima al despegar y al caer, cero arriba
        y = -H * 4 * p * (1 - p); sx = 1 - .055 * Math.abs(v); sy = 1 + .085 * Math.abs(v); aire = Math.sin(Math.PI * p); brazos = ss(p * 2.6);
      } else {
        const l = (t - B) / (1 - B), g = Math.exp(-5.5 * l) * Math.cos(TAU * 1.5 * l) * (1 - l);
        y = .9 * Math.max(0, g); sx = 1 + .11 * g; sy = 1 - .14 * g; brazos = 1 - ss(l * 1.5);
      }
      return {
        y, sx, sy, hr: 4 * sn(t, 1, .1), hy: 0,
        bi: 14 + 106 * brazos + 9 * sn(t, 4) * brazos, bd: -14 - 106 * brazos - 9 * sn(t, 4, .25) * brazos,
        pi: 10 * aire, pd: -10 * aire,
        so: 1 - .3 * aire, sa: 1 - .5 * aire
      };
    }
  },
  // Saluda: brazo arriba moviendo la mano (con un pequeño latigazo al cambiar de lado); el cuerpo acompaña
  saluda: {
    ms: () => 1100,
    pose: t => ({
      y: -1 * sn(t), r: 1.4 * sn(t, 2, .5),
      hr: 4 + 3 * sn(t, 2, .1), hy: 0,
      bi: 10 + 3 * sn(t), bd: -124 - 20 * sn(t, 2) - 5 * sn(t, 4, .1)
    })
  },
  // Se despide: más despacio y con la cabeza un poco gacha
  adios: {
    ms: () => 1500,
    pose: t => ({
      y: -.8 * sn(t), r: 1 * sn(t, 2, .5),
      hr: -3 + 2.4 * sn(t, 1, .1), hy: .6,
      bi: 8 + 2 * sn(t), bd: -118 - 16 * sn(t, 2)
    })
  },
  // Dormido: respira hondo con la cabeza caída
  dormido: {
    ms: () => 3400,
    pose: t => {
      const aire = .5 - .5 * Math.cos(TAU * t);
      return { y: 0, sx: 1 + .012 * aire, sy: 1 + .022 * aire, hr: 9 + 1.6 * sn(t, 1, .2), hy: 1.5 + .5 * sn(t, 1, .2), bi: 4 + 1.5 * sn(t), bd: -4 - 1.5 * sn(t) };
    }
  },
  // Voltereta (pantalla de mantenimiento): se agacha, salta girando una vuelta entera sobre su centro con brazos y
  // piernas recogidos (como un mortal), se abre al bajar para frenar y aterriza aplastándose; luego respira un momento
  voltereta: {
    ms: () => 2000,
    pose: t => {
      const A = .16, B = .62, C = .8;
      let y = 0, sx = 1, sy = 1, vr = 0, recoge = 0, brazos = 0, aire = 0;
      if (t < A) { const c = ss(t / A); y = 2 * c; sx = 1 + .1 * c; sy = 1 - .14 * c; brazos = -.3 * c; }
      else if (t < B) {
        const p = (t - A) / (B - A), v = 1 - 2 * p;
        y = -18 * 4 * p * (1 - p); aire = Math.sin(Math.PI * p);
        vr = 360 * (p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2); // gira despacio al salir y al acabar, deprisa arriba
        recoge = Math.sin(Math.PI * Math.min(1, p * 1.15)); sx = 1 - .05 * Math.abs(v); sy = 1 + .08 * Math.abs(v); brazos = 1 - recoge * .6;
      } else if (t < C) {
        const l = (t - B) / (C - B), g = Math.exp(-5 * l) * Math.cos(TAU * 1.4 * l) * (1 - l);
        y = 1.2 * Math.max(0, g); sx = 1 + .12 * g; sy = 1 - .15 * g; brazos = .6 * (1 - ss(l)); vr = 360;
      } else vr = 360; // 360° es la misma postura que 0°: el bucle vuelve a empezar sin dar marcha atrás
      return {
        y, sx, sy, vr, hr: 3 * sn(t, 1, .1) - 6 * recoge, hy: 1.2 * recoge,
        bi: 10 + 120 * brazos + 40 * recoge, bd: -10 - 120 * brazos - 40 * recoge,
        pi: 34 * recoge, pd: -34 * recoge,
        so: 1 - .45 * aire, sa: 1 - .7 * aire
      };
    }
  },
  // Asombro (celebraciones): ojos enormes que laten, brazos arriba celebrando y saltitos de alegría
  asombro: {
    ms: () => 1200,
    pose: t => {
      const bote = Math.abs(sn(t, 2)), brilla = .5 + .5 * sn(t, 4);
      return {
        y: -3.2 * bote, sx: 1 + .05 * (1 - bote) - .03 * bote, sy: 1 - .06 * (1 - bote) + .05 * bote,
        hr: 3 * sn(t, 1, .1), hy: -.6 * bote,
        ow: 1.3 + .04 * brilla, oi: 1.42 + .06 * brilla, od: 1.42 + .06 * brilla,
        bi: 128 + 18 * sn(t, 2), bd: -128 - 18 * sn(t, 2, .5), pi: 9 * bote, pd: -9 * bote,
        so: 1 - .25 * bote, sa: 1 - .4 * bote
      };
    }
  },
  // Vuela en el sitio: los propulsores lo sostienen, sube y baja con un vaivén; las piernas cuelgan con inercia
  vuela: {
    ms: () => 1600,
    pose: t => ({
      y: -1.8 * sn(t), r: 2.2 * sn(t, 1, .25),
      hr: -1.5 * sn(t, 1, .1), hy: 0,
      bi: 62 + 6 * sn(t, 2), bd: -62 - 6 * sn(t, 2, .5), pi: 8, pd: -5,
      lx: 1.05 + .12 * sn(t, 13) + .06 * sn(t, 21), ly: 1.15 + .28 * sn(t, 11, .3) + .12 * sn(t, 17) + .15 * sn(t), lo: 1,
      so: .7 + .08 * sn(t, 1, .5), sa: .4
    })
  }
};

/* Física de la acción secundaria: cada pieza cuelga de un muelle amortiguado que empuja la aceleración del cuerpo.
   Así la cabeza se retrasa y se pasa al frenar, los brazos «flotan» un instante cuando el cuerpo cambia de dirección y
   las piernas se balancean con inercia: los principios de «acción superpuesta» y «seguimiento» de la animación clásica.
   Se simula a 240 pasos por segundo durante tres vueltas (para que el movimiento entre en régimen y el bucle cierre
   perfecto) y se guarda la última a 60 fotogramas por segundo. Se calcula una sola vez por estado y tamaño. */
const MUELLES = [
  // pieza, frecuencia (Hz), amortiguación, ganancia, de qué aceleración
  ['hy', 7, .42, -.0034, 'ay'], ['hr', 4.5, .38, -.03, 'ar'], ['hr', 3.2, .5, .0045, 'ay2'],
  ['bi', 3.6, .3, .085, 'ay'], ['bd', 3.6, .3, -.085, 'ay'], ['bi', 3, .35, -.06, 'ar'], ['bd', 3, .35, -.06, 'ar'],
  ['pi', 4.2, .28, .05, 'ay'], ['pd', 4.2, .28, -.05, 'ay'], ['pi', 3.4, .3, -.05, 'ar'], ['pd', 3.4, .3, -.05, 'ar']
];
const BASE = { y: 0, r: 0, sx: 1, sy: 1, hr: 0, hy: 0, bi: 9, bd: -9 };
const horno = new Map();
function hornear(estado, forma, ms) {
  const def = COREO[estado], clave = `${estado}|${forma}|${Math.round(ms / 20)}`;
  if (horno.has(clave)) return horno.get(clave);
  const T = ms / 1000, dt = 1 / 240, F = Math.max(30, Math.round(T * 60));
  const pose = t => ({ ...BASE, ...def.pose(((t % 1) + 1) % 1, forma) });
  const muelles = MUELLES.map(([k, hz, z, g, de]) => ({ k, w: TAU * hz, z, g, de, x: 0, v: 0 }));
  const sal = [];
  const pasos = Math.round(3 * T / dt), ultima = pasos - Math.round(T / dt);
  let siguiente = 0;
  for (let i = 0; i <= pasos; i++) {
    const t = i * dt / T, p = pose(t), pa = pose(t - dt / T), pd = pose(t + dt / T);
    const acel = { ay: (pd.y - 2 * p.y + pa.y) / (dt * dt), ar: (pd.r - 2 * p.r + pa.r) / (dt * dt) };
    acel.ay2 = acel.ay * Math.sign(p.hr || 1); // la cabeza ladeada cae un poco más hacia su lado
    const extra = {};
    for (const m of muelles) {
      const objetivo = Math.max(-40, Math.min(40, m.g * acel[m.de]));
      m.v += (m.w * m.w * (objetivo - m.x) - 2 * m.z * m.w * m.v) * dt; m.x += m.v * dt;
      extra[m.k] = (extra[m.k] || 0) + m.x;
    }
    if (i >= ultima && (i - ultima) * dt >= siguiente * T / F - 1e-9 && sal.length < F) {
      const q = { ...p };
      for (const k in extra) if (k in q) q[k] += extra[k];
      sal.push(q); siguiente++;
    }
  }
  sal.push({ ...sal[0], ...(sal[0].vr != null ? { vr: sal[sal.length - 1].vr } : {}) }); // el bucle cierra en el mismo sitio (una vuelta entera = la misma postura)
  // Cada pieza, sus fotogramas (solo las que mueve esta coreografía)
  const tiene = k => k in def.pose(0, forma);
  const fr = (f, k) => ({ ...f, offset: k / F });
  const piezas = {};
  const cuerpo = forma === 'cuerpo';
  // La vuelta (vr) gira sobre el centro del cuerpo, no sobre los pies: se sube el eje, se gira y se vuelve a bajar
  const vuelta = tiene('vr') ? q => `translateY(-44%) rotate(${n2(q.vr)}deg) translateY(44%) ` : () => '';
  if (cuerpo || tiene('sx') || sal.some(q => Math.abs(q.y) > .05)) piezas.todo = sal.map((q, k) => fr({ transform: `translateY(${n2(q.y)}%) ${vuelta(q)}rotate(${n2(q.r)}deg) scale(${n2(q.sx)},${n2(q.sy)})` }, k));
  piezas.cabeza = sal.map((q, k) => fr({ transform: `translateY(${n2(q.hy)}%) rotate(${n2(q.hr)}deg)` }, k));
  if (cuerpo) {
    piezas.brazoI = sal.map((q, k) => fr({ transform: `rotate(${n2(q.bi)}deg)` }, k));
    piezas.brazoD = sal.map((q, k) => fr({ transform: `rotate(${n2(q.bd)}deg)` }, k));
    if (tiene('pi') || sal.some(q => Math.abs(q.pi || 0) > .3)) {
      piezas.piernaI = sal.map((q, k) => fr({ transform: `rotate(${n2(q.pi || 0)}deg)` }, k));
      piezas.piernaD = sal.map((q, k) => fr({ transform: `rotate(${n2(q.pd || 0)}deg)` }, k));
    }
    if (tiene('so')) piezas.sombra = sal.map((q, k) => fr({ transform: `scale(${n2(q.so)})`, opacity: n2(q.sa ?? 1) }, k));
    if (tiene('lo')) piezas.llama = sal.map((q, k) => fr({ transform: `scale(${n2(q.lx)},${n2(q.ly)})`, opacity: n2(q.lo) }, k));
  }
  if (tiene('ex')) piezas.ojos = sal.map((q, k) => fr({ transform: `translate(${n2(q.ex)}%,${n2(q.ey)}%)` }, k));
  if (tiene('oi')) {
    piezas.ojoI = sal.map((q, k) => fr({ transform: `scale(${n2(q.ow ?? 1)},${n2(q.oi)})` }, k));
    piezas.ojoD = sal.map((q, k) => fr({ transform: `scale(${n2(q.ow ?? 1)},${n2(q.od)})` }, k));
  }
  if (tiene('pu')) piezas.puntos = sal.map((q, k) => fr({ opacity: n2(q.pu) }, k));
  horno.set(clave, piezas);
  return piezas;
}
const ENTRA = 260; // ms de la transición de una pose a la siguiente
/** Quita las animaciones de una mascota. Devuelve dónde estaba cada pieza (para enlazar con lo siguiente). */
function parar(m) {
  const antes = new Map();
  (m._anims || []).forEach(a => {
    const el = a.effect?.target;
    if (el && !antes.has(el)) { const cs = getComputedStyle(el); antes.set(el, { transform: cs.transform, opacity: cs.opacity }); }
    a.cancel();
  });
  m._anims = [];
  return antes;
}
/** Pone la coreografía del estado actual (o deja la pose fija si ese estado no tiene) */
function coreografia(m) {
  if (!m?.isConnected || m.dataset.anim === 'no') return;
  const antes = parar(m);
  const def = COREO[m.dataset.estado];
  const forma = m.classList.contains('cuerpo') ? 'cuerpo' : 'cara';
  const ahora = new Set();
  if (def && !sinMovimiento() && typeof m.animate === 'function') {
    const ms = def.ms(forma) * (m._ritmo ||= .95 + Math.random() * .1);
    const piezas = hornear(m.dataset.estado, forma, ms);
    for (const [clave, fotos] of Object.entries(piezas)) {
      m.querySelectorAll(PIEZAS[clave]).forEach(el => {
        ahora.add(el);
        const bucle = el.animate(fotos, { duration: ms, iterations: Infinity, delay: ENTRA, easing: 'linear' });
        m._anims.push(bucle);
        // Enlace: de la pose en la que estaba a la primera del bucle
        const de = antes.get(el) || { transform: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity };
        const { offset, ...primera } = fotos[0];
        m._anims.push(el.animate([{ transform: de.transform, opacity: de.opacity }, { transform: 'none', opacity: 1, ...primera }], { duration: ENTRA, easing: 'cubic-bezier(.3,.7,.3,1)' }));
      });
    }
  }
  // Las piezas que se movían y ahora no: vuelven a su sitio con suavidad
  antes.forEach((de, el) => {
    if (ahora.has(el)) return;
    const cs = getComputedStyle(el);
    if (de.transform !== cs.transform || de.opacity !== cs.opacity) el.animate([{ transform: de.transform, opacity: de.opacity }, { transform: cs.transform, opacity: cs.opacity }], { duration: ENTRA + 60, easing: 'cubic-bezier(.3,.7,.3,1)' });
  });
  m._ojosAnim = ahora.has(m.querySelector('.ojo-i'));
}
// Cada vez que una mascota cambia de estado (o aparece una nueva) se le pone su coreografía.
// Las que no se ven (chat cerrado, fuera de pantalla) se pausan para no gastar batería.
let vigilando = false, visibles = null;
function vigilar() {
  if (vigilando || typeof MutationObserver === 'undefined') return;
  vigilando = true;
  visibles = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => es.forEach(e => {
    e.target._fuera = !e.isIntersecting;
    (e.target._anims || []).forEach(a => (e.isIntersecting ? a.playState === 'paused' && a.play() : a.playState === 'running' && a.pause()));
  })) : null;
  const nueva = m => { if (m.dataset.anim === 'no') return; visibles?.observe(m); coreografia(m); };
  new MutationObserver(lista => {
    for (const r of lista) {
      if (r.type === 'attributes') { if (r.target.classList?.contains('masc')) { coreografia(r.target); if (r.target._fuera) (r.target._anims || []).forEach(a => a.pause()); } continue; }
      r.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.classList.contains('masc')) nueva(n); n.querySelectorAll?.('.masc').forEach(nueva); });
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-estado'] });
  document.querySelectorAll('.masc').forEach(nueva);
}

/* ---------- Animación al iniciar y cerrar sesión ---------- */
let activa = null;
/**
 * tipo «entra»: el robot salta, saluda y suelta chispas.
 * tipo «sale»: se despide con la mano, se le cierran los ojos y se duerme.
 * Devuelve { minimo(), fin() }: minimo() espera lo justo para que se vea;
 * fin() la quita con un fundido.
 */
export function transicionSesion(tipo, nombre = '') {
  activa?.quitar(true);
  const entra = tipo === 'entra';
  const primero = String(nombre || '').trim().split(/\s+/)[0];
  const capa = document.createElement('div');
  capa.className = `ses-fx ses-${entra ? 'entra' : 'sale'}`;
  capa.setAttribute('role', 'status');
  capa.setAttribute('aria-live', 'polite');
  capa.innerHTML = `<div class="ses-caja">
      <div class="ses-masc">${mascotaHTML(entra ? 'feliz' : 'adios', { cuerpo: true })}
        ${entra ? `<span class="ses-chispas" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--r:${i % 2 ? 90 : 118}px;--t:${(i % 3) * 45}ms"></i>`).join('')}</span>`
                : sinMovimiento() ? '<span class="ses-zz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>' : ''}
      </div>
      <b>${entra ? (primero ? `¡Hola, ${esc(primero)}!` : '¡Hola!') : 'Hasta pronto'}</b>
      <small>${entra ? 'Entrando en tu cuenta…' : 'Cerrando tu sesión…'}</small>
      <span class="ses-barra" aria-hidden="true"><i></i></span>
    </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('ses-activa');
  const masc = capa.querySelector('.masc');
  // El robot del botón del asistente (si se ve) es el que vuela: al entrar sale de él y al salir vuelve a él
  const boton = [...document.querySelectorAll('#chat .chat-fab .masc')].find(m => { const r = m.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; });
  const rincon = boton ? puntoMascota(boton) : { x: innerWidth - 44, y: innerHeight - 44, s: 46 / LADO };
  // Dónde queda el robot del centro con la tarjeta ya colocada (se mide sin su animación de entrada)
  const caja = capa.querySelector('.ses-caja');
  capa.classList.add('con-vuelo');
  caja.style.transition = 'none'; caja.style.transform = 'none';
  const centro = puntoMascota(masc);
  caja.style.transform = ''; void caja.offsetWidth; caja.style.transition = '';
  requestAnimationFrame(() => capa.classList.add('on'));
  const vuela = !sinMovimiento() && centro;
  let quitarBoton = () => {};
  if (vuela && boton) { boton.style.visibility = 'hidden'; quitarBoton = () => { boton.style.visibility = ''; }; }
  if (entra) {
    if (vuela) {
      masc.style.visibility = 'hidden';
      trayecto(rincon, centro, { ms: 1050, deCara: true }).then(() => {
        masc.style.visibility = '';
        rebote(masc, { de: .86 });
        estadoMascota(masc, 'saluda');
      });
    } else setTimeout(() => estadoMascota(masc, 'saluda'), 900);
  } else if (vuela) {
    // Se despide con la mano y se va volando a su sitio
    setTimeout(() => {
      if (!masc.isConnected) return;
      masc.style.visibility = 'hidden';
      trayecto(centro, rincon, { ms: 1000, aCara: true }).then(() => { if (boton) { quitarBoton(); quitarBoton = () => {}; rebote(boton); estadoMascota(boton, 'feliz', 1400); } });
    }, 850);
  } else setTimeout(() => estadoMascota(masc, 'dormido'), 1050);
  const t0 = Date.now(), MIN = entra ? (vuela ? 2000 : 1700) : (vuela ? 2050 : 1900);
  const o = {
    minimo: () => new Promise(ok => setTimeout(ok, Math.max(0, MIN - (Date.now() - t0)))),
    fin: async () => { await o.minimo(); o.quitar(); },
    quitar(ya) {
      if (activa !== o) return;
      activa = null;
      clearTimeout(seguro);
      quitarBoton();
      document.documentElement.classList.remove('ses-activa');
      capa.classList.remove('on');
      ya || sinMovimiento() ? capa.remove() : setTimeout(() => capa.remove(), 380);
    }
  };
  const seguro = setTimeout(() => o.quitar(), 9000); // nunca se queda pegada
  activa = o;
  return o;
}

/* ---------- Color del asistente ---------- */
/** Botones para elegir el color (radios name="asistente"); los usan Ajustes → Apariencia y el chat */
export function paletaAsistente(actual = leerApariencia().asistente) {
  return `<div class="masc-paleta" role="radiogroup" aria-label="Color del asistente">${Object.entries(COLORES_ASISTENTE).map(([id, [nombre, luz, halo]]) =>
    `<label class="mp-c" title="${nombre}"><input type="radio" name="asistente" value="${id}" ${id === (actual || 'lima') ? 'checked' : ''}><i style="--a:${luz};--b:${halo}" aria-hidden="true"></i><span class="sr">${nombre}</span></label>`).join('')}</div>`;
}
/** Cambia el color de todas las mascotas (y lo recuerda); se alegran al estrenarlo */
export function colorAsistente(id) {
  if (!COLORES_ASISTENTE[id]) return;
  guardarApariencia({ asistente: id });
  document.querySelectorAll('.masc[data-estado=normal]').forEach(m => estadoMascota(m, 'feliz', 1000));
}

/* ---------- Celebración (solo en momentos importantes: pago, pedido nuevo, web aprobada) ----------
   El robot sale volando del botón del asistente dejando una estela de colores, se pone en grande con los ojos
   enormes en arcoíris, celebra con una explosión de chispas y un bocadillo, y vuelve en picado a su sitio.
   No bloquea nada (no recoge toques) y va por encima de los diálogos abiertos (capa «popover» del navegador). */
let enFiesta = false;
export function fiesta(titulo = '¡Hecho!', texto = '') {
  if (enFiesta || document.hidden) return Promise.resolve();
  enFiesta = true;
  defs(); iniciar(); vigilar();
  const capa = document.createElement('div');
  capa.className = 'masc-fiesta';
  capa.setAttribute('aria-hidden', 'true'); // el mensaje ya está en la página; esto es solo la celebración
  capa.innerHTML = `<div class="mf-masc">${mascotaHTML('asombro', { cuerpo: true, arcoiris: true })}
      <span class="mf-chispas">${Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg;--r:${i % 2 ? 96 : 128}px;--t:${(i % 4) * 40}ms;--c:${ARCO_C[i % ARCO_C.length]}"></i>`).join('')}</span></div>
    <div class="mf-bocadillo"><b>${esc(titulo)}</b>${texto ? `<small>${esc(texto)}</small>` : ''}</div>`;
  try { capa.popover = 'manual'; } catch { /* sin popover: va en el documento */ }
  document.body.append(capa);
  try { capa.showPopover?.(); } catch { /* ya visible */ }
  const masc = capa.querySelector('.masc');
  const centro = puntoMascota(masc);
  const boton = [...document.querySelectorAll('#chat .chat-fab .masc')].find(m => { const r = m.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; });
  const rincon = boton ? puntoMascota(boton) : { x: innerWidth - 44, y: innerHeight - 44, s: 46 / LADO };
  const quitar = () => { try { capa.hidePopover?.(); } catch {} capa.remove(); if (boton) boton.style.visibility = ''; enFiesta = false; };
  if (sinMovimiento() || !centro) {
    capa.classList.add('llega');
    return new Promise(ok => setTimeout(() => { quitar(); ok(); }, 2200));
  }
  masc.style.visibility = 'hidden';
  if (boton) boton.style.visibility = 'hidden';
  return trayecto(rincon, centro, { ms: 1000, deCara: !!boton, capa, arcoiris: true })
    .then(() => {
      masc.style.visibility = '';
      rebote(masc, { de: .78, ms: 700 });
      capa.classList.add('llega');
      return new Promise(ok => setTimeout(ok, 1900));
    })
    .then(() => {
      capa.classList.add('se-va');
      masc.style.visibility = 'hidden';
      return trayecto(centro, rincon, { ms: 950, aCara: !!boton, capa, arcoiris: true });
    })
    .then(() => {
      quitar();
      if (boton) { rebote(boton); estadoMascota(boton, 'feliz', 1400); }
    })
    .catch(quitar);
}
