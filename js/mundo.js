/* ==========================================================
   RECORRIDO CON SCROLL («Cómo trabajamos»)
   Un pequeño mundo isométrico en SVG: al bajar, la cámara viaja de
   una estación a la siguiente sin cortes (técnica de Scroll World,
   pero dibujado en vector: no hay vídeos que descargar).
   Solo transform y opacity; el bucle rAF solo corre mientras se ve.
   Sin JS o con «reducir movimiento» se queda la lista de pasos.
   ========================================================== */
const NS = 'http://www.w3.org/2000/svg';
const iso = (x, y, z = 0) => [(x - y) * .866, (x + y) * .5 - z];
const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');

/* Prisma: caras superior, izquierda y derecha. cls: tono (base | acento | claro) */
function caja(x, y, w, d, h, cls = 'b', z = 0) {
  const t = h + z;
  return `<g class="m-${cls}">
    <polygon class="f-l" points="${pts([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x, y + d, t)])}"/>
    <polygon class="f-r" points="${pts([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x + w, y, t)])}"/>
    <polygon class="f-t" points="${pts([iso(x, y, t), iso(x + w, y, t), iso(x + w, y + d, t), iso(x, y + d, t)])}"/>
  </g>`;
}
/* Dibujo plano sobre la cara izquierda de una caja (pantallas, hojas) */
function enCara(x, y, d, z, cont) {
  const [ox, oy] = iso(x, y + d, z);
  return `<g transform="matrix(.866 .5 0 1 ${ox.toFixed(1)} ${oy.toFixed(1)})">${cont}</g>`;
}
const lineas = (n, x, y, w, paso = 9) => Array.from({ length: n }, (_, i) => `<rect class="m-ln" x="${x}" y="${y + i * paso}" width="${i === n - 1 ? w * .6 : w}" height="3" rx="1.5"/>`).join('');

const ESCENAS = [
  // 1 · Pedido: hoja con casillas y una caja de tipo de web
  () => caja(-110, -110, 220, 220, 16) +
    caja(-80, -60, 120, 26, 120, 'c', 16) + enCara(-80, -60, 26, 16, `<rect class="m-hoja" x="10" y="-112" width="100" height="96" rx="5"/>${lineas(3, 22, -98, 70)}<rect class="m-ac" x="22" y="-60" width="10" height="10" rx="2"/><rect class="m-ln" x="38" y="-57" width="44" height="3"/><rect class="m-ac" x="22" y="-42" width="10" height="10" rx="2"/><rect class="m-ln" x="38" y="-39" width="34" height="3"/>`) +
    caja(50, -50, 50, 50, 40, 'a', 16) + caja(-20, 30, 40, 40, 22, 'b', 16) + caja(-12, 38, 24, 24, 14, 'a', 38),
  // 2 · Dominio y contenido: navegador con barra de dirección y fotos apiladas
  () => caja(-110, -110, 220, 220, 16) +
    caja(-95, -80, 150, 24, 110, 'c', 16) + enCara(-95, -80, 24, 16, `<rect class="m-hoja" x="8" y="-104" width="134" height="88" rx="5"/><rect class="m-ac" x="16" y="-96" width="118" height="12" rx="6"/><rect class="m-img" x="16" y="-76" width="54" height="48" rx="3"/>${lineas(4, 78, -74, 52, 11)}`) +
    caja(0, 10, 70, 50, 10, 'b', 16) + caja(6, 14, 58, 42, 10, 'c', 26) + caja(12, 18, 46, 34, 10, 'a', 36),
  // 3 · Diseño y revisión: pantalla grande, móvil y burbuja de comentario
  () => caja(-110, -110, 220, 220, 16) +
    caja(-95, -85, 140, 20, 100, 'c', 16) + enCara(-95, -85, 20, 16, `<rect class="m-hoja" x="8" y="-94" width="124" height="80" rx="5"/><rect class="m-ac" x="18" y="-84" width="60" height="22" rx="3"/>${lineas(3, 18, -54, 100, 10)}`) +
    caja(40, 10, 42, 14, 74, 'c', 16) + enCara(40, 10, 14, 16, `<rect class="m-hoja" x="5" y="-68" width="32" height="60" rx="5"/><rect class="m-ac" x="10" y="-60" width="22" height="12" rx="2"/>${lineas(3, 10, -42, 22, 8)}`) +
    caja(-60, 10, 50, 50, 8, 'a', 16),
  // 4 · Publicación: web en línea con su marca de verificación y bandera
  () => caja(-110, -110, 220, 220, 16) +
    caja(-90, -70, 130, 22, 104, 'c', 16) + enCara(-90, -70, 22, 16, `<rect class="m-hoja" x="8" y="-98" width="114" height="84" rx="5"/><circle class="m-ok" cx="65" cy="-56" r="22"/><path class="m-okv" d="M54 -56 l8 8 l15 -16"/>`) +
    caja(70, 60, 8, 8, 150, 'b', 16) + `<polygon class="m-flag" points="${pts([iso(74, 64, 164), iso(74, 110, 152), iso(74, 64, 136)])}"/>` +
    caja(-60, 20, 40, 40, 30, 'a', 16)
];
/* Decorado lejano (parallax): bloques sueltos entre estaciones */
const DECO = [[-260, 40, 30, 'b'], [300, -200, 22, 'c'], [620, 160, 36, 'b'], [980, -150, 26, 'a'], [1300, 190, 30, 'c'], [1650, -170, 24, 'b'], [2000, 120, 34, 'c']];

export function montarMundo(sec) {
  const lista = sec.querySelector('.steps');
  const pasos = [...lista.querySelectorAll('.step')].map(s => ({ t: s.querySelector('h3')?.textContent || '', p: s.querySelector('p')?.textContent || '' }));
  const n = Math.min(pasos.length, ESCENAS.length);
  if (n < 2) return;
  const POS = Array.from({ length: n }, (_, i) => [i * 640, i % 2 ? 90 : -40]);

  const pista = document.createElement('div');
  pista.className = 'mundo';
  pista.style.setProperty('--n', n);
  pista.innerHTML = `
    <div class="mundo-stage">
      <svg class="mundo-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
        <g class="m-cam">
          <g class="m-deco">${DECO.map(([x, y, s, c]) => `<g transform="translate(${x} ${y})">${caja(-s / 2, -s / 2, s, s, s * .8, c)}</g>`).join('')}</g>
          <path class="m-ruta" d="M${POS.map(p => p.join(' ')).join(' L')}"/>
          <path class="m-ruta on" d="M${POS.map(p => p.join(' ')).join(' L')}" pathLength="1"/>
          ${POS.map((p, i) => `<g class="m-est" transform="translate(${p[0]} ${p[1] - 30})">${ESCENAS[i]()}</g>`).join('')}
          <circle class="m-viajero" r="7"/>
        </g>
      </svg>
      <div class="mundo-txt">
        <p class="mundo-num"><b>01</b> / ${String(n).padStart(2, '0')}</p>
        <h3></h3><p class="mundo-p"></p>
        <div class="mundo-dots">${pasos.slice(0, n).map((s, i) => `<button type="button" aria-label="Paso ${i + 1}: ${s.t}"></button>`).join('')}</div>
      </div>
    </div>`;
  lista.after(pista);
  sec.classList.add('con-mundo');

  const svg = pista.querySelector('svg'), cam = pista.querySelector('.m-cam'), deco = pista.querySelector('.m-deco');
  const ruta = pista.querySelector('.m-ruta.on'), viajero = pista.querySelector('.m-viajero');
  const est = [...pista.querySelectorAll('.m-est')], dots = [...pista.querySelectorAll('.mundo-dots button')];
  const txt = pista.querySelector('.mundo-txt'), h3 = txt.querySelector('h3'), pp = txt.querySelector('.mundo-p'), num = txt.querySelector('.mundo-num b');
  let W = 1000, H = 560, actual = -1, vista = 0, objetivo = 0, raf = 0, visible = false;

  const medir = () => {
    const r = svg.getBoundingClientRect();
    H = 560; W = Math.max(420, Math.round(H * (r.width / Math.max(r.height, 1))));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };
  const progreso = () => {
    const r = pista.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  };
  /* Meseta: la cámara se queda quieta un rato en cada estación y viaja entre medias */
  const meseta = f => { const a = .28, b = .72; if (f <= a) return 0; if (f >= b) return 1; const t = (f - a) / (b - a); return t * t * (3 - 2 * t); };
  const pintar = v => {
    const pos = v * (n - 1), i = Math.min(n - 2, Math.floor(pos)), f = meseta(pos - i);
    const x = POS[i][0] + (POS[i + 1][0] - POS[i][0]) * f, y = POS[i][1] + (POS[i + 1][1] - POS[i][1]) * f;
    const movil = W < 700, s = (movil ? 1.3 : 1.25) - Math.sin(Math.PI * f) * .32;
    const cx = movil ? W / 2 : W * .62;
    cam.setAttribute('transform', `translate(${(cx - x * s).toFixed(1)} ${(H * (movil ? .56 : .52) - y * s).toFixed(1)}) scale(${s.toFixed(3)})`);
    deco.setAttribute('transform', `translate(${(x * .18).toFixed(1)} 0)`);
    viajero.setAttribute('cx', x.toFixed(1)); viajero.setAttribute('cy', y.toFixed(1));
    ruta.style.strokeDashoffset = (1 - (i + f) / (n - 1)).toFixed(4);
    est.forEach((e, k) => e.style.opacity = (1 - Math.min(1, Math.abs(k - (i + f)) * .55)).toFixed(3));
    const act = Math.round(i + f);
    if (act !== actual) {
      actual = act;
      txt.classList.remove('cambia'); void txt.offsetWidth; txt.classList.add('cambia');
      h3.textContent = pasos[act].t; pp.textContent = pasos[act].p; num.textContent = String(act + 1).padStart(2, '0');
      dots.forEach((d, k) => { d.classList.toggle('on', k === act); d.setAttribute('aria-current', k === act ? 'step' : 'false'); });
    }
  };
  const bucle = () => {
    objetivo = progreso();
    vista += (objetivo - vista) * .14;
    if (Math.abs(objetivo - vista) < .0005) vista = objetivo;
    pintar(vista);
    raf = visible && vista !== objetivo ? requestAnimationFrame(bucle) : 0;
  };
  const despertar = () => { if (visible && !raf) raf = requestAnimationFrame(bucle); };
  dots.forEach((d, k) => d.addEventListener('click', () => {
    const r = pista.getBoundingClientRect(), alto = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + alto * (k / (n - 1)), behavior: 'smooth' });
  }));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; despertar(); }).observe(pista);
  addEventListener('scroll', despertar, { passive: true });
  addEventListener('resize', () => { medir(); pintar(vista); }, { passive: true });
  medir();
  vista = objetivo = progreso();
  pintar(vista);
}
