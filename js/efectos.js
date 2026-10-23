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

/* Inclinación 3D de las miniaturas de diseños al mover el ratón */
function inclinar() {
  if (!conRaton() || reducido()) return;
  document.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.dz');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.setProperty('--ry', `${x * 7}deg`);
    c.style.setProperty('--rx', `${-y * 7}deg`);
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    const c = e.target.closest?.('.dz');
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); }
  });
}

/* Botones "magnéticos": se acercan un poco al ratón */
function magnetos() {
  if (!conRaton() || reducido()) return;
  document.querySelectorAll('[data-magnet]').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* Títulos que aparecen palabra a palabra */
export function partirTitulos(raiz = document) {
  raiz.querySelectorAll('.sec-head h2:not(.split)').forEach(h => {
    const palabras = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = palabras.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
    h.classList.add('split');
  });
}

/* En el móvil, las ventanas que salen desde abajo se cierran deslizando hacia abajo */
function deslizarParaCerrar() {
  let box = null, y0 = 0, dy = 0;
  document.addEventListener('pointerdown', e => {
    if (innerWidth > 640 || e.pointerType === 'mouse') return;
    const b = e.target.closest('dialog.dlg:not(.dlg-wiz):not(.dlg-prev):not(.dlg-side) > .dlg-box');
    if (!b || b.scrollTop > 0 || e.clientY - b.getBoundingClientRect().top > 70) return;
    if (e.target.closest('input, textarea, select, button, a, label')) return;
    box = b; y0 = e.clientY; dy = 0;
    box.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!box) return;
    dy = Math.max(0, e.clientY - y0);
    box.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const soltar = () => {
    if (!box) return;
    const b = box; box = null;
    b.style.transition = '';
    if (dy > 110) { b.closest('dialog').close(); setTimeout(() => (b.style.transform = ''), 350); }
    else b.style.transform = '';
  };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
}

/* Enlace "Saltar al contenido" para teclado y lectores de pantalla */
function saltar() {
  const m = document.querySelector('main');
  if (!m) return;
  m.id ||= 'main';
  const a = document.createElement('a');
  a.className = 'skip'; a.href = '#' + m.id; a.textContent = 'Saltar al contenido';
  document.body.prepend(a);
}

export function iniciarEfectos({ waLink } = {}) {
  saltar();
  ondas();
  seguirRaton();
  inclinar();
  magnetos();
  scroll();
  focos();
  contar();
  partirTitulos();
  deslizarParaCerrar();
  if (waLink) botonWhatsapp(waLink);
}
