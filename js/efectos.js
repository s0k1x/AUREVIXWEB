/* ==========================================================
   Efectos y microanimaciones (todo opcional y ligero)
   ========================================================== */
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const conRaton = () => matchMedia('(hover: hover)').matches;

/* Onda al pulsar botones (también funciona con el dedo) */
function ondas() {
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .social, .icon-btn');
    if (!b || b.disabled || reducido()) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, { passive: true });
}

/* Foco de luz que sigue al ratón en las tarjetas (solo ordenador) */
const SEL_FOCO = '.plan-card, .dz, .op-card, .puesto, .kpi, .cand';
export function focos(raiz = document) {
  if (!conRaton()) return;
  raiz.querySelectorAll(SEL_FOCO).forEach(c => c.classList.add('foco'));
}
function seguirRaton() {
  if (!conRaton()) return;
  document.addEventListener('pointermove', e => {
    const c = e.target.closest?.(SEL_FOCO);
    if (!c) return;
    c.classList.add('foco');
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

/* Cabecera que se esconde al bajar y aparece al subir + barra de progreso */
function scroll() {
  const h = document.getElementById('header');
  const barra = document.createElement('div');
  barra.className = 'progreso';
  document.body.appendChild(barra);
  let ultimo = scrollY, pend = false;
  addEventListener('scroll', () => {
    if (pend) return;
    pend = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      barra.style.setProperty('--p', max > 0 ? Math.min(1, y / max) : 0);
      const menuAbierto = h?.classList.contains('open') || document.querySelector('.user-menu.open');
      if (h && !menuAbierto) h.classList.toggle('hide', y > ultimo && y > 160);
      ultimo = y;
      pend = false;
    });
  }, { passive: true });
}

/* Números que cuentan hacia arriba al aparecer */
export function contar(raiz = document) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, fin = parseFloat(el.dataset.count);
    if (reducido() || !isFinite(fin)) return;
    const t0 = performance.now(), dur = 1100;
    const paso = t => {
      const k = Math.min(1, (t - t0) / dur), v = fin * (1 - Math.pow(1 - k, 3));
      el.textContent = Math.round(v).toLocaleString('es-ES');
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }), { threshold: .5 });
  raiz.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

/* Botón flotante de WhatsApp: aparece tras unos segundos */
function botonWhatsapp(link) {
  const b = document.querySelector('[data-wa-fab]');
  if (!b) return;
  b.href = link;
  setTimeout(() => b.classList.add('show'), 2200);
}

export function iniciarEfectos({ waLink } = {}) {
  ondas();
  seguirRaton();
  scroll();
  focos();
  contar();
  if (waLink) botonWhatsapp(waLink);
}
