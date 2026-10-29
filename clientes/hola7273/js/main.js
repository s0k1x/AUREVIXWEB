/* ==========================================================
   Hola7273! · Comportamiento común de todas las páginas
   Menú, estado «abierto ahora», datos del negocio y animaciones
   ========================================================== */
(function () {
  const d = document, r = d.documentElement, C = window.HOLA || {};
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];

  // Aviso breve en la parte de abajo (lo usan otros scripts)
  const tt = $('#tToast'); let tTimer;
  window.avisar = t => {
    if (!tt) return;
    tt.textContent = t; tt.classList.add('on');
    clearTimeout(tTimer); tTimer = setTimeout(() => tt.classList.remove('on'), 2600);
  };

  // Datos del negocio que vienen de config.js
  if (C.direccion) $$('[data-direccion]').forEach(el => {
    const t = C.direccion + (C.ciudad ? ' · ' + C.ciudad : '');
    const span = el.querySelector('span'); (span || el).textContent = t;
  });
  if (C.mapa) $$('[data-mapa]').forEach(a => a.href = C.mapa);
  $$('[data-anio]').forEach(el => el.textContent = new Date().getFullYear());

  // Navegación transparente sobre la foto y sólida al bajar
  const nv = $('#nv');
  if (nv && nv.classList.contains('over')) {
    const alBajar = () => nv.classList.toggle('solid', scrollY > 40);
    addEventListener('scroll', alBajar, { passive: true }); alBajar();
  }

  // Menú del móvil
  const btn = $('#nvMenu'), mnav = $('#mnav');
  if (btn && mnav) {
    const abrir = si => {
      mnav.classList.toggle('open', si); nv.classList.toggle('menu', si);
      btn.setAttribute('aria-expanded', si); btn.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
    };
    btn.addEventListener('click', () => abrir(!mnav.classList.contains('open')));
    mnav.addEventListener('click', e => { if (e.target.closest('a')) abrir(false); });
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && mnav.classList.contains('open')) { abrir(false); btn.focus(); } });
  }

  // Horario: marca hoy y si está abierto ahora
  const ahora = new Date(), dia = ahora.getDay(), min = ahora.getHours() * 60 + ahora.getMinutes();
  const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const tramos = (C.horario && C.horario[dia]) || [];
  const abierto = tramos.some(([a, c]) => min >= aMin(a) && min < aMin(c));
  $$('.horario > div').forEach(f => {
    if (f.dataset.dias.split(',').map(Number).includes(dia)) f.classList.add('hoy');
  });
  let txt = abierto ? `Abierto ahora · hasta las ${tramos.find(([a, c]) => min >= aMin(a) && min < aMin(c))[1]}` : 'Cerrado ahora';
  if (!abierto) {
    const sig = tramos.find(([a]) => aMin(a) > min);
    if (sig) txt += ` · abrimos a las ${sig[0]}`;
  }
  $$('[data-estado]').forEach(el => el.innerHTML = `<span class="pill ${abierto ? 'si' : 'no'}"><i></i>${txt}</span>`);
  $$('[data-estado-txt]').forEach(el => el.textContent = abierto ? txt : 'Lunes a sábado con cita');

  // Fotos: quita el brillo de carga al terminar y retira las que fallen
  $$('.ph img').forEach(img => {
    const ok = () => { img.classList.add('ok'); img.parentElement.classList.add('ok'); };
    if (img.complete && img.naturalWidth) ok();
    else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', () => { img.parentElement.classList.add('ok'); img.remove(); }, { once: true }); }
  });

  // Animaciones: solo si el navegador las soporta y el usuario no pide movimiento reducido
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);
  if (quieto) { r.classList.add('sin-anim'); return; }

  // Titulares que suben palabra a palabra (el lector de pantalla sigue leyendo la frase entera)
  $$('.parte').forEach(h => {
    h.setAttribute('aria-label', h.textContent.trim());
    let i = 0;
    const envolver = nodo => [...nodo.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = d.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(d.createTextNode(' ')); return; }
          const o = d.createElement('span'); o.className = 'pw'; o.setAttribute('aria-hidden', 'true');
          const t = d.createElement('span'); t.textContent = w; t.style.transitionDelay = `${i++ * 60}ms`;
          o.appendChild(t); frag.appendChild(o);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
        const o = d.createElement('span'); o.className = 'pw'; o.setAttribute('aria-hidden', 'true');
        ch.style.transitionDelay = `${i++ * 60}ms`;
        ch.replaceWith(o); o.appendChild(ch);
      }
    });
    envolver(h);
  });
  r.classList.add('anim');

  const io = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    x.target.classList.add('in'); io.unobserve(x.target);
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .rvi, .parte').forEach((el, k) => {
    if (el.classList.contains('rv')) el.style.transitionDelay = `${(k % 3) * 90}ms`;
    io.observe(el);
  });
  $$('.hero .parte, .cab .parte').forEach(h => requestAnimationFrame(() => h.classList.add('in')));
})();
