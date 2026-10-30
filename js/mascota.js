/* ==========================================================
   MASCOTA DEL ASISTENTE
   Un robot blanco con casco, auriculares y luces verdes, dibujado en
   vectores (SVG) para poder animarlo entero: respira, parpadea, mira
   a su aire y sigue el dedo o el ratón con la cabeza y los ojos.
   Dos formas:
     · cara   → solo la cabeza en un disco (botón y cabecera del chat)
     · cuerpo → el robot entero (vuelo, inicio y cierre de sesión)
   Estados (data-estado): normal · feliz · saluda · habla · piensa ·
   dormido · adios · guino · vuela.   Estilos: funciones.css («Mascota»).
   ========================================================== */

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
    <linearGradient id="mg-llama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0ffc2"/><stop offset=".45" stop-color="#7dff2a" stop-opacity=".85"/><stop offset="1" stop-color="#3cff10" stop-opacity="0"/></linearGradient>
  </defs></svg>`;
  (document.body || document.documentElement).prepend(d.firstChild);
}

/* ---------- El dibujo (400 × 470; la cabeza ocupa de y 22 a 240) ---------- */
const LIMA = '#d6ff7a', HALO = '#5cff22';
const espejo = x => `<g transform="translate(400 0) scale(-1 1)">${x}</g>`;
/** Brillo: capas cada vez más anchas y transparentes por debajo del trazo claro (simula el resplandor sin filtros) */
const CAPAS = [[4.4, .05], [3.3, .08], [2.4, .13], [1.6, .22]];
const trazo = (d, w) => `<g class="m-neon" fill="none" stroke-linecap="round" stroke-linejoin="round">${CAPAS.map(([k, o]) => `<path d="${d}" stroke="${HALO}" stroke-opacity="${o}" stroke-width="${(w * k).toFixed(1)}"/>`).join('')}<path d="${d}" stroke="${LIMA}" stroke-width="${w}"/></g>`;
const aro = (cx, cy, rx, ry, w) => `<g class="m-neon">${CAPAS.map(([k, o]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${HALO}" stroke-opacity="${o}" stroke-width="${(w * k).toFixed(1)}"/>`).join('')}<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(160,255,70,.16)" stroke="${LIMA}" stroke-width="${w}"/></g>`;
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
        <g class="o-pill">${[[40, .05], [30, .08], [21, .13], [12, .22]].map(([w, o]) => rect(`fill="none" stroke="${HALO}" stroke-opacity="${o}" stroke-width="${w}"`)).join('')}${rect(`fill="${LIMA}"`)}</g>
        <g class="o-sue">${trazo(`M${cx - 21} 144Q${cx} 166 ${cx + 21} 144`, 9)}</g>`);
};
const OREJA = `<ellipse cx="46" cy="150" rx="25" ry="58" fill="url(#mg-osc)"/>${aro(45, 150, 15.5, 43, 5)}`;
const RANURA = `<path d="M66 106C76 76 96 56 120 44" fill="none" stroke="#18211d" stroke-width="12" stroke-linecap="round"/>${trazo('M66 106C76 76 96 56 120 44', 3)}`;
const CASCO = `
    <path d="M52 150C52 70 112 22 200 22C288 22 348 70 348 150C348 208 300 240 200 240C100 240 52 208 52 150Z" fill="url(#mg-cab)"/>
    <path d="M72 108C86 58 138 32 200 30" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>
    <path d="M160 26C152 46 148 60 140 76M240 26C248 46 252 60 260 76" fill="none" stroke="#b9c4c0" stroke-width="1.6" stroke-linecap="round"/>
    ${RANURA}${espejo(RANURA)}
    <image href="icons/logo-a-verde.png" x="174" y="36" width="52" height="52"/>
    ${OREJA}${espejo(OREJA)}
    <rect x="85" y="79" width="230" height="132" rx="60" fill="#aab6b2"/>
    <rect x="88" y="82" width="224" height="126" rx="57" fill="url(#mg-visor)"/>
    <path d="M246 92Q292 92 306 122Q270 106 232 100Z" fill="#fff" fill-opacity=".13"/>
    <circle cx="112" cy="188" r="3" fill="#fff" fill-opacity=".18"/>`;
const PUNTOS = `<g fill="${LIMA}"><circle cx="292" cy="30" r="5"/><circle cx="312" cy="18" r="6.5"/><circle cx="336" cy="8" r="8"/></g>`;
const TORSO = `
  <rect x="178" y="232" width="44" height="30" rx="12" fill="url(#mg-osc)"/>
  <path d="M146 266Q146 257 158 257L242 257Q254 257 254 266L256 330Q256 376 200 380Q144 376 144 330Z" fill="url(#mg-bco)"/>
  <path d="M145 348Q200 366 255 348L256 361Q200 380 144 361Z" fill="url(#mg-osc)"/>
  ${trazo('M166 260Q200 275 234 260', 3.5)}${trazo('M156 322Q152 344 161 363', 3)}${trazo('M244 322Q248 344 239 363', 3)}
  <image href="icons/logo-a-verde.png" x="182" y="283" width="36" height="36"/>`;

/** HTML de la mascota. cuerpo: robot entero · disco: círculo oscuro detrás (solo en el vuelo) */
export function mascotaHTML(estado = 'normal', { cuerpo = false, disco = false, clase = '' } = {}) {
  defs(); iniciar();
  const cabeza = `<span class="l-g l-cabeza"><span class="l-g l-sigue-c">
        ${capa('l-casco', CASCO)}
        <span class="l-g l-ojos">${ojo(149, 'i')}${ojo(251, 'd')}</span>
        ${cuerpo ? capa('l-puntos', PUNTOS) : ''}
      </span></span>`;
  const corporal = cuerpo ? `<span class="l-g m-cuerpo l-corporal">
        ${capa('l-sombra', `<ellipse cx="200" cy="454" rx="100" ry="9" fill="rgba(0,0,0,.55)"/><ellipse cx="200" cy="454" rx="108" ry="11" fill="none" stroke="${HALO}" stroke-opacity=".28" stroke-width="2"/>`)}
        ${capa('l-llama l-llama-i', LLAMA(176))}${capa('l-llama l-llama-d', LLAMA(224))}
        ${capa('l-pierna l-pierna-i', PIERNA)}${capa('l-pierna l-pierna-d', espejo(PIERNA))}
        ${capa('l-torso', TORSO)}
      </span>` : '';
  const brazos = cuerpo ? `<span class="l-g m-cuerpo l-brazos">${capa('l-brazo l-brazo-i', BRAZO)}${capa('l-brazo l-brazo-d', espejo(BRAZO))}</span>` : '';
  return `<span class="masc ${cuerpo ? 'cuerpo' : 'cara'} ${clase}" data-estado="${estado}" aria-hidden="true" style="--d:${(Math.random() * 3).toFixed(2)}s">
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
      if (ahora > m._parp && e !== 'dormido' && !/^(feliz|saluda|adios)$/.test(e)) {
        m.classList.add('parp'); setTimeout(() => m.classList.remove('parp'), 130);
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
/**
 * «de» y «a» son los rectángulos (en pantalla) de dos mascotas de tipo cara.
 * Se lanza el robot entero: al salir enseña el cuerpo, sube en arco creciendo,
 * gira un poco, y al llegar se encoge hasta quedar solo la cabeza en el disco de destino.
 * Devuelve una promesa que se cumple al aterrizar (al momento con poco movimiento).
 */
export function volar(de, a, { ms = 950 } = {}) {
  if (sinMovimiento() || !de?.width || !a?.width || typeof Element.prototype.animate !== 'function') return Promise.resolve();
  const c0 = { x: de.left + de.width / 2, y: de.top + de.width / 2 }, c1 = { x: a.left + a.width / 2, y: a.top + a.width / 2 };
  const s0 = de.width / LADO, s1 = a.width / LADO;
  const dist = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const alto = Math.min(170, dist * .34 + 30);
  // El dibujo se crea ya al mayor tamaño que tendrá y durante el vuelo solo se reduce: así se ve nítido y
  // se mueve en la tarjeta gráfica (solo transform y opacity), sin recalcular el vector en cada fotograma.
  const grande = Math.max(.42, (s0 + s1) * 1.9), S = Math.max(grande, s0, s1);
  const el = document.createElement('div');
  el.className = 'masc-vuelo';
  el.style.cssText = `width:${400 * S}px;height:${470 * S}px;transform-origin:${CX * S}px ${CY * S}px`;
  el.innerHTML = mascotaHTML('vuela', { cuerpo: true, disco: true });
  const paso = (t, s, rot, lift = 0) => `translate3d(${c0.x + (c1.x - c0.x) * t - CX * S}px,${c0.y + (c1.y - c0.y) * t - lift - CY * S}px,0) scale(${s / S}) rotate(${rot}deg)`;
  document.body.append(el);
  anillo({ left: de.left, top: de.top, width: de.width }, 600);
  const vuelo = el.animate([
    { transform: paso(0, s0, 0), offset: 0, easing: 'cubic-bezier(.3,0,.2,1)' },
    { transform: paso(.5, grande, -14, alto), offset: .5, easing: 'cubic-bezier(.45,0,.55,1)' },
    { transform: paso(.9, s1 * 1.5, 8, 0), offset: .84, easing: 'cubic-bezier(.2,.8,.3,1)' },
    { transform: paso(1, s1, 0), offset: 1 }
  ], { duration: ms, fill: 'both' });
  // Al salir se ve el cuerpo y se pierde el disco; al llegar, al revés: queda idéntico al avatar
  el.querySelector('.l-disco')?.animate([{ opacity: 1 }, { opacity: 0, offset: .2 }, { opacity: 0, offset: .72 }, { opacity: 1 }], { duration: ms, fill: 'both' });
  el.querySelectorAll('.m-cuerpo').forEach(c => c.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .72 }, { opacity: 0 }], { duration: ms, fill: 'both' }));
  // Estela: chispas que se quedan por el camino y se apagan (cada una es un punto que solo cambia transform y opacity)
  for (let i = 0; i < 7; i++) {
    const t = .08 + i * .12, ch = document.createElement('i');
    ch.className = 'masc-chispa';
    const x = c0.x + (c1.x - c0.x) * t + (Math.random() - .5) * 26, y = c0.y + (c1.y - c0.y) * t - Math.sin(Math.PI * t) * alto + (Math.random() - .5) * 26;
    ch.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${(4 + Math.random() * 5).toFixed(1)}px;height:${(4 + Math.random() * 5).toFixed(1)}px`;
    document.body.append(ch);
    ch.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: .95, transform: 'scale(1)', offset: .25 }, { opacity: 0, transform: 'translateY(14px) scale(.2)' }], { duration: 560, delay: ms * t * .9, fill: 'both' }).finished.catch(() => {}).then(() => ch.remove());
  }
  return vuelo.finished.catch(() => {}).then(() => {
    anillo({ left: a.left, top: a.top, width: a.width });
    el.remove();
  });
}

/* ---------- Fotogramas: el robot saludando, 60 imágenes (bucle de 1 s a 60 fps) ----------
   Una hoja de sprites de 10 × 6 fotogramas (icons/asistente/saluda.webp, hecha con scripts/generar-mascota.js).
   Se mueve con dos animaciones de transform/translate por pasos, que hace la tarjeta gráfica:
   va a 60 fps exactos aunque la página esté ocupada. */
const HOJA = 'icons/asistente/saluda.webp';
let hojaLista = null;
/** Descarga y descodifica la hoja antes de necesitarla (sin bloquear nada). Devuelve una promesa que dice si se pudo. */
export function precargarFrames() {
  if (hojaLista) return hojaLista;
  hojaLista = new Promise(ok => {
    const i = new Image();
    i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => ok(true));
    i.onerror = () => ok(false);
    i.src = HOJA;
  });
  return hojaLista;
}
/** El robot saludando en fotogramas. Empieza oculto: se muestra (clase «lista») cuando la hoja ya está descodificada. */
export function framesHTML(clase = '') {
  return `<span class="masc-fr ${clase}" aria-hidden="true"><img class="fr-hoja" src="${HOJA}" alt="" decoding="async" draggable="false"></span>`;
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
      <div class="ses-masc">${mascotaHTML(entra ? 'feliz' : 'adios', { cuerpo: true })}${framesHTML()}
        ${entra ? `<span class="ses-chispas" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--r:${i % 2 ? 90 : 118}px;--t:${(i % 3) * 45}ms"></i>`).join('')}</span>`
                : '<span class="ses-zz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>'}
      </div>
      <b>${entra ? (primero ? `¡Hola, ${esc(primero)}!` : '¡Hola!') : 'Hasta pronto'}</b>
      <small>${entra ? 'Entrando en tu cuenta…' : 'Cerrando tu sesión…'}</small>
      <span class="ses-barra" aria-hidden="true"><i></i></span>
    </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('ses-activa');
  const masc = capa.querySelector('.masc');
  // Con la hoja lista, el robot en fotogramas sustituye al dibujo en vector (si no se puede cargar, queda el dibujo)
  precargarFrames().then(ok => { if (ok && capa.isConnected) capa.classList.add('ses-frames'); });
  requestAnimationFrame(() => capa.classList.add('on'));
  if (entra) setTimeout(() => estadoMascota(masc, 'saluda'), 900);
  else setTimeout(() => estadoMascota(masc, 'dormido'), 1050);
  const t0 = Date.now(), MIN = entra ? 1700 : 1900;
  const o = {
    minimo: () => new Promise(ok => setTimeout(ok, Math.max(0, MIN - (Date.now() - t0)))),
    fin: async () => { await o.minimo(); o.quitar(); },
    quitar(ya) {
      if (activa !== o) return;
      activa = null;
      clearTimeout(seguro);
      document.documentElement.classList.remove('ses-activa');
      capa.classList.remove('on');
      ya || sinMovimiento() ? capa.remove() : setTimeout(() => capa.remove(), 380);
    }
  };
  const seguro = setTimeout(() => o.quitar(), 9000); // nunca se queda pegada
  activa = o;
  return o;
}
