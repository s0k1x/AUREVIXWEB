/* ==========================================================
   TEMPORADAS (Halloween, Navidad, Año Nuevo, San Valentín,
   Verano, Black Friday)
   El propietario la elige en Ajustes → Negocio → «Temporada»:
   una fija, «Automática» (según la fecha) o ninguna.
   - Cambia el color de acento de toda la web (oscuro y claro):
     el CSS lo lee de html[data-temporada] (temporadas.css).
   - En las páginas públicas añade un ambiente ligero (nieve,
     murciélagos, corazones, confeti…) en un <canvas>: pocas
     piezas, se para con la pestaña oculta y no sale si la
     persona ha pedido reducir el movimiento.
   ========================================================== */
export const TEMPORADAS = {
  halloween: { nombre: 'Halloween', desc: 'Naranja calabaza y murciélagos', ambiente: 'murcielagos', muestra: ['#ff8a1f', '#a855f7'] },
  blackfriday: { nombre: 'Black Friday', desc: 'Amarillo intenso y destellos', ambiente: 'destellos', muestra: ['#ffd400', '#0c0c0e'] },
  navidad: { nombre: 'Navidad', desc: 'Rojo y nieve que cae', ambiente: 'nieve', muestra: ['#ff5c6c', '#3ddc84'] },
  anonuevo: { nombre: 'Año Nuevo', desc: 'Dorado y confeti', ambiente: 'confeti', muestra: ['#f5c76b', '#ffffff'] },
  sanvalentin: { nombre: 'San Valentín', desc: 'Rosa y corazones', ambiente: 'corazones', muestra: ['#ff7eb3', '#ffd1e3'] },
  verano: { nombre: 'Verano', desc: 'Turquesa y burbujas de luz', ambiente: 'burbujas', muestra: ['#3ce0d0', '#ffd166'] }
};

/** Qué temporada toca hoy en modo «Automática» */
export function temporadaPorFecha(d = new Date()) {
  const m = d.getMonth() + 1, dia = d.getDate(), md = m * 100 + dia;
  if (md >= 1015 && md <= 1101) return 'halloween';
  if (md >= 1120 && md <= 1130) return 'blackfriday';
  if (md >= 1201 && md <= 1230) return 'navidad';
  if (md >= 1231 || md <= 106) return 'anonuevo';
  if (md >= 207 && md <= 214) return 'sanvalentin';
  if (md >= 701 && md <= 831) return 'verano';
  return '';
}

/** «auto» → la de la fecha; un id → esa; cualquier otra cosa → ninguna */
export const resolverTemporada = v => (v === 'auto' ? temporadaPorFecha() : TEMPORADAS[v] ? v : '');

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
let ambiente = null;

/** Pone los colores de la temporada y, si se pide, su ambiente animado */
export function aplicarTemporada(valor, { animar = false } = {}) {
  const id = resolverTemporada(valor);
  const d = document.documentElement;
  if (id) d.dataset.temporada = id; else delete d.dataset.temporada;
  ambiente?.parar(); ambiente = null;
  if (id && animar && !quieto()) ambiente = crearAmbiente(TEMPORADAS[id].ambiente);
  return id;
}

/* ---------- Ambiente ---------- */
function crearAmbiente(tipo) {
  const c = document.createElement('canvas');
  c.className = 'temporada-ambiente';
  c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  const x = c.getContext('2d');
  let W = 0, H = 0, dpr = 1, piezas = [], raf = 0, ultimo = 0, vivo = true;
  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c8f560';
  let acento = color(), claro = document.documentElement.dataset.tema === 'claro';
  const azar = (a, b) => a + Math.random() * (b - a);
  const cuantas = () => Math.round(Math.min(22, Math.max(7, innerWidth / (tipo === 'murcielagos' ? 260 : 70))));

  const nueva = (inicio = false) => {
    const p = { x: azar(0, W), y: inicio ? azar(0, H) : 0, t: azar(0, 1000), s: azar(.6, 1.2) };
    switch (tipo) {
      case 'nieve': return { ...p, y: inicio ? p.y : -10, r: azar(1.2, 3.4) * dpr, vy: azar(.35, 1.1) * dpr, vx: azar(-.2, .2) * dpr, a: azar(.35, .85) };
      case 'confeti': return { ...p, y: inicio ? p.y : -12, r: azar(3, 6) * dpr, vy: azar(.6, 1.4) * dpr, vx: azar(-.4, .4) * dpr, giro: azar(0, 6.3), vg: azar(-.06, .06), a: azar(.55, .95), dorado: Math.random() < .55 };
      case 'corazones': return { ...p, y: inicio ? p.y : H + 14, r: azar(5, 10) * dpr, vy: -azar(.3, .8) * dpr, vx: 0, a: azar(.2, .5) };
      case 'burbujas': return { ...p, y: inicio ? p.y : H + 14, r: azar(3, 12) * dpr, vy: -azar(.2, .6) * dpr, vx: 0, a: azar(.12, .3) };
      case 'destellos': return { ...p, r: azar(1.5, 3.2) * dpr, vy: 0, vx: 0, a: 0, vida: azar(60, 180), edad: inicio ? azar(0, 180) : 0 };
      case 'murcielagos': {
        const izq = Math.random() < .5;
        return { ...p, x: inicio ? p.x : izq ? -30 * dpr : W + 30 * dpr, y: azar(H * .08, H * .6), r: azar(9, 16) * dpr, vx: (izq ? 1 : -1) * azar(.7, 1.6) * dpr, vy: 0, a: azar(.35, .7), brasa: Math.random() < .5 };
      }
    }
    return p;
  };
  const medir = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = c.width = Math.round(innerWidth * dpr); H = c.height = Math.round(innerHeight * dpr);
    piezas = Array.from({ length: cuantas() }, () => nueva(true));
  };

  const corazon = (cx, cy, r) => {
    x.beginPath();
    x.moveTo(cx, cy + r * .35);
    x.bezierCurveTo(cx - r * 1.1, cy - r * .45, cx - r * .45, cy - r * 1.15, cx, cy - r * .45);
    x.bezierCurveTo(cx + r * .45, cy - r * 1.15, cx + r * 1.1, cy - r * .45, cx, cy + r * .35);
    x.fill();
  };
  const murcielago = (cx, cy, r, aleteo) => {
    const al = Math.sin(aleteo) * .55; // las alas suben y bajan
    x.beginPath();
    x.moveTo(cx, cy);
    x.quadraticCurveTo(cx - r * .5, cy - r * (.25 + al), cx - r * 1.3, cy - r * (.15 + al * 1.4));
    x.quadraticCurveTo(cx - r * .9, cy + r * .1, cx - r * .55, cy + r * .2);
    x.quadraticCurveTo(cx - r * .25, cy + r * .05, cx, cy + r * .35);
    x.quadraticCurveTo(cx + r * .25, cy + r * .05, cx + r * .55, cy + r * .2);
    x.quadraticCurveTo(cx + r * .9, cy + r * .1, cx + r * 1.3, cy - r * (.15 + al * 1.4));
    x.quadraticCurveTo(cx + r * .5, cy - r * (.25 + al), cx, cy);
    x.fill();
  };

  const pintar = t => {
    if (!vivo) return;
    raf = requestAnimationFrame(pintar);
    const dt = Math.min(3, (t - (ultimo || t)) / 16.67); ultimo = t; // independiente de los fps
    x.clearRect(0, 0, W, H);
    for (let i = 0; i < piezas.length; i++) {
      const p = piezas[i];
      p.t += dt;
      switch (tipo) {
        case 'nieve':
          p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.t / 60) * .35 * dpr) * dt;
          x.globalAlpha = p.a; x.fillStyle = claro ? '#9fb3c8' : '#fff';
          x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
          if (p.y > H + 10) piezas[i] = nueva();
          break;
        case 'confeti':
          p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.t / 50) * .4 * dpr) * dt; p.giro += p.vg * dt;
          x.save(); x.translate(p.x, p.y); x.rotate(p.giro); x.scale(1, Math.cos(p.t / 18));
          x.globalAlpha = p.a; x.fillStyle = p.dorado ? acento : '#fff';
          x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore();
          if (p.y > H + 12) piezas[i] = nueva();
          break;
        case 'corazones':
          p.y += p.vy * dt; p.x += Math.sin(p.t / 70) * .4 * dpr * dt;
          x.globalAlpha = p.a * Math.min(1, p.y / (H * .25)); x.fillStyle = acento;
          corazon(p.x, p.y, p.r);
          if (p.y < -16) piezas[i] = nueva();
          break;
        case 'burbujas': {
          p.y += p.vy * dt; p.x += Math.sin(p.t / 90) * .3 * dpr * dt;
          const g = x.createRadialGradient(p.x - p.r * .3, p.y - p.r * .3, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.globalAlpha = p.a * Math.min(1, p.y / (H * .2)); x.fillStyle = g;
          x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
          if (p.y < -16) piezas[i] = nueva();
          break;
        }
        case 'destellos': {
          p.edad += dt;
          const k = p.edad / p.vida, a = Math.sin(Math.PI * Math.min(1, k));
          x.globalAlpha = a * .8; x.fillStyle = acento;
          const r = p.r * (.6 + a * .6);
          x.beginPath(); // estrella de cuatro puntas
          x.moveTo(p.x, p.y - r * 2.4); x.quadraticCurveTo(p.x, p.y, p.x + r * 2.4, p.y);
          x.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2.4); x.quadraticCurveTo(p.x, p.y, p.x - r * 2.4, p.y);
          x.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2.4); x.fill();
          if (k >= 1) piezas[i] = nueva();
          break;
        }
        case 'murcielagos':
          p.x += p.vx * dt; p.y += Math.sin(p.t / 40) * .5 * dpr * dt;
          // Sobre fondo oscuro, murciélagos morados; brasas del color de la temporada
          if (p.brasa) { x.globalAlpha = p.a * .6; x.fillStyle = acento; x.beginPath(); x.arc(p.x, p.y, p.r * .18, 0, 6.283); x.fill(); }
          else { x.globalAlpha = p.a * .8; x.fillStyle = claro ? '#2b1640' : '#a855f7'; murcielago(p.x, p.y, p.r, p.t / 6); }
          if (p.x < -40 * dpr || p.x > W + 40 * dpr) piezas[i] = nueva();
          break;
      }
    }
    x.globalAlpha = 1;
  };

  const seguir = () => { if (vivo && !raf && !document.hidden) { ultimo = 0; raf = requestAnimationFrame(pintar); } };
  const pausar = () => { cancelAnimationFrame(raf); raf = 0; };
  const alCambiarVisibilidad = () => (document.hidden ? pausar() : seguir());
  let tRes = 0;
  const alRedimensionar = () => { clearTimeout(tRes); tRes = setTimeout(medir, 200); };
  medir();
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  addEventListener('resize', alRedimensionar);
  // Solo arriba del todo: al bajar a leer el ambiente se desvanece y deja de dibujarse (no tapa el contenido ni gasta batería)
  let tope = 1;
  const alBajar = () => {
    const k = Math.max(0, Math.min(1, 1 - scrollY / (innerHeight * .7)));
    if (Math.abs(k - tope) < .02 && k !== 0 && k !== 1) return;
    tope = k; c.style.opacity = c.classList.contains('on') ? k : '';
    k === 0 ? pausar() : seguir();
  };
  addEventListener('scroll', alBajar, { passive: true });
  // El color se vuelve a leer si cambia el tema claro/oscuro
  const mo = new MutationObserver(() => { acento = color(); claro = document.documentElement.dataset.tema === 'claro'; });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema', 'data-temporada'] });
  // Entra suave cuando el navegador está libre
  (window.requestIdleCallback || (f => setTimeout(f, 400)))(() => { c.classList.add('on'); alBajar(); if (tope > 0) seguir(); });
  return {
    parar() {
      vivo = false; pausar(); mo.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      removeEventListener('resize', alRedimensionar);
      removeEventListener('scroll', alBajar);
      c.remove();
    }
  };
}
