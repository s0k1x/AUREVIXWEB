/* ==========================================================
   Efectos y microanimaciones (todo opcional y ligero)
   ========================================================== */
const reducido = () => document.documentElement.dataset.movimiento === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const conRaton = () => matchMedia('(hover: hover)').matches;

/* Onda al pulsar botones (también funciona con el dedo) */
function ondas() {
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .social, .icon-btn');
    if (!b || b.disabled || reducido() || b.classList.contains('av-btn')) return; // la campana no lleva onda (su número sobresale)
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
      // En el móvil la cabecera no se esconde: en el iPhone dejaba ver la página por detrás de la hora
      if (h && !menuAbierto) h.classList.toggle('hide', innerWidth > 640 && y > ultimo && y > 160);
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
    // Si la web está en inglés, se parte ya el título traducido (no palabra a palabra)
    const texto = (globalThis.__traducir || (x => x))(h.textContent.trim());
    const palabras = texto.split(/\s+/);
    h.setAttribute('aria-label', texto);
    if (globalThis.__traducir) h.dataset.noTraducir = '';
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

/* Apariciones al hacer scroll en cualquier página (.reveal) */
const ioRev = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); ioRev.unobserve(e.target); }
}), { threshold: .1, rootMargin: '0px 0px -30px 0px' });
export function apariciones(raiz = document) {
  raiz.querySelectorAll('.reveal:not(.in)').forEach((el, i) => {
    if (!el.style.transitionDelay) el.style.transitionDelay = `${(i % 3) * 70}ms`;
    ioRev.observe(el);
  });
}

/* Confeti de celebración (pedido enviado). Ligero: un canvas que se borra solo */
export function confeti() {
  if (reducido()) return;
  const c = document.createElement('canvas');
  c.className = 'confeti';
  c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
  const x = c.getContext('2d');
  const colores = ['#c8f560', '#ffffff', '#9fd23a', '#ffd166', '#7cc4ff'];
  const piezas = Array.from({ length: 120 }, () => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .45,
    vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 14 - 6) * dpr,
    r: (4 + Math.random() * 5) * dpr, a: Math.random() * 6, va: (Math.random() - .5) * .3,
    col: colores[(Math.random() * colores.length) | 0], forma: Math.random() > .5
  }));
  const t0 = performance.now();
  const paso = t => {
    const k = (t - t0) / 2600;
    x.clearRect(0, 0, W, H);
    piezas.forEach(p => {
      p.vy += .42 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.col;
      p.forma ? x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r) : (x.beginPath(), x.arc(0, 0, p.r / 1.6, 0, 7), x.fill());
      x.restore();
    });
    k < 1 ? requestAnimationFrame(paso) : c.remove();
  };
  requestAnimationFrame(paso);
}

/* Botón «volver arriba» con anillo de progreso (aparece en páginas largas) */
function arriba() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'arriba';
  b.setAttribute('aria-label', 'Volver arriba');
  b.innerHTML = '<svg class="arriba-anillo" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/><circle class="p" cx="22" cy="22" r="20"/></svg><svg class="arriba-f" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  document.body.appendChild(b);
  b.addEventListener('click', () => scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }));
  let pend = false;
  const act = () => {
    pend = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    b.style.setProperty('--p', p);
    b.classList.toggle('on', scrollY > innerHeight * 1.5 && max > innerHeight * 2);
  };
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(act); } }, { passive: true });
  act();
}

/* Saltos a un apartado (enlaces con #, scrollIntoView): se dibujan todas las secciones durante el salto
   (ver content-visibility en inicio.css) y se vuelve a lo normal al terminar. */
function anclas() {
  let t;
  const activar = () => { document.documentElement.classList.add('ancla'); clearTimeout(t); t = setTimeout(() => document.documentElement.classList.remove('ancla'), 1600); };
  document.addEventListener('click', e => { if (e.target.closest?.('a[href*="#"]')) activar(); }, true);
  addEventListener('hashchange', activar);
  if (location.hash) activar();
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...a) { activar(); return orig.apply(this, a); };
}

export function iniciarEfectos() {
  anclas();
  saltar();
  arriba();
  ondas();
  seguirRaton();
  // inclinar(); // desactivado: la inclinación 3D deformaba las tarjetas de diseños
  magnetos();
  scroll();
  focos();
  contar();
  partirTitulos();
  deslizarParaCerrar();
  apariciones();
}
