/* ==========================================================
   PÁGINAS DE CONTENIDO (webs por sector, guías, revisa tu web,
   mantenimiento). El HTML lo genera scripts/paginas.py; aquí se
   ponen los precios y plazos actuales (los de Ajustes), la vista
   previa del diseño, la lista de comprobación y las preguntas.
   ========================================================== */
import { CONFIG, PLANES, EXTRAS } from '../../config.js';
import { $, $$, esc, euros, icono, arrancar, ivaTexto } from '../base/ui.js';
import { plantillaPorId } from './plantillas.js';

const pagina = document.body.dataset.pagina || 'contenido';
await arrancar(pagina);

/* ---------- Precios y plazos vivos (los de Ajustes → Negocio) ---------- */
const plan = id => PLANES.find(p => p.id === id && p.activo !== false);
$$('[data-precio]').forEach(el => { const p = plan(el.dataset.precio); if (p) el.textContent = euros(p.precio); });
$$('[data-entrega]').forEach(el => { const p = plan(el.dataset.entrega); if (p) el.textContent = p.entrega; });
$$('[data-extra]').forEach(el => { const x = EXTRAS.find(x => x.id === el.dataset.extra); if (x) el.textContent = euros(x.precio); });
$$('[data-iva]').forEach(el => (el.textContent = ivaTexto()));
$$('[data-senal]').forEach(el => (el.textContent = `${CONFIG.senal} %`));

/* ---------- Tarjetas de los tipos de web recomendados ---------- */
$$('[data-planes]').forEach(caja => {
  const diseno = caja.dataset.diseno || '';
  caja.innerHTML = caja.dataset.planes.split(',').map(plan).filter(Boolean).map((p, i) => `
    <article class="pg-plan ${i === 0 ? 'pg-rec' : ''}">
      ${i === 0 ? '<span class="pg-plan-rec">Recomendada</span>' : ''}
      <h3>${esc(p.nombre)}</h3>
      <p class="pg-plan-desc">${esc(p.desc)}</p>
      <p class="pg-plan-precio"><small>desde</small><b>${euros(p.precio)}</b><small>${ivaTexto()}</small></p>
      <ul>${p.incluye.map(t => `<li>${icono('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
      <p class="pg-plan-ent">${icono('clock')}<span>Entrega en ${esc(p.entrega)}</span></p>
      <a class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}" href="./?comprar=${encodeURIComponent(p.id)}${diseno ? `&diseno=${encodeURIComponent(diseno)}` : ''}">Empezar ${icono('arrow')}</a>
    </article>`).join('');
});

/* ---------- Tabla de precios (guía de precios) ---------- */
$$('[data-tabla-planes]').forEach(c => {
  c.innerHTML = `<table><thead><tr><th scope="col">Tipo de web</th><th scope="col">Desde</th><th scope="col">Plazo</th></tr></thead><tbody>${
    PLANES.filter(p => p.activo !== false).map(p => `<tr><th scope="row">${esc(p.nombre)}<small>${esc(p.desc)}</small></th><td><b>${euros(p.precio)}</b></td><td>${esc(p.entrega)}</td></tr>`).join('')
  }</tbody></table><p class="guia-nota">${ivaTexto()}. Precios de partida: el total exacto, con los extras que elijas, lo ves antes de confirmar.</p>`;
});

/* ---------- Vista previa del diseño en un navegador ----------
   El diseño se pinta a 1280 px de ancho y se reduce al tamaño del marco.
   Solo se carga cuando el marco está cerca de la pantalla. */
$$('.pg-marco[data-diseno]').forEach(m => {
  const id = m.dataset.diseno, pl = plantillaPorId(id);
  const vista = $('.pg-marco-vista', m);
  $('.pg-marco-bar span', m).textContent = pl?.dominio || '';
  const escala = () => vista.style.setProperty('--s', vista.clientWidth / 1280);
  new ResizeObserver(escala).observe(vista);
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return;
    o.disconnect();
    const f = document.createElement('iframe');
    f.src = `diseno?t=${encodeURIComponent(id)}`;
    f.title = `Diseño ${pl?.nombre || ''}`;
    f.tabIndex = -1;
    f.setAttribute('aria-hidden', 'true');
    f.loading = 'lazy';
    f.onload = () => m.classList.add('cargado');
    vista.append(f);
  }, { rootMargin: '300px' }).observe(m);
  m.tabIndex = 0;
  m.setAttribute('role', 'link');
  const abrir = () => open(`diseno?t=${encodeURIComponent(id)}`, '_blank', 'noopener');
  m.addEventListener('click', abrir);
  m.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(); });
});

/* ---------- Preguntas numeradas (igual que en la portada) ---------- */
$$('.faq details').forEach((d, i) => {
  const s = d.querySelector('summary');
  const t = document.createElement('span');
  t.className = 'faq-t';
  t.append(...s.childNodes);
  s.innerHTML = `<span class="faq-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`;
  s.append(t);
  d.classList.add('faq-it');
});

/* ---------- Lista de comprobación (solo en esta pantalla: no se guarda) ---------- */
$$('[data-checklist]').forEach(c => {
  const cajas = $$('input[type=checkbox]', c), n = $('[data-chk-n]', c), barra = $('.chk-barra i', c);
  const pinta = () => {
    const hechas = cajas.filter(x => x.checked).length;
    n.textContent = hechas === cajas.length ? '¡Lista para publicar!' : `${hechas} de ${cajas.length}`;
    barra.style.transform = `scaleX(${hechas / cajas.length})`;
    c.classList.toggle('completa', hechas === cajas.length);
  };
  c.addEventListener('change', pinta);
  pinta();
});

/* ---------- Revisa tu web ---------- */
if (pagina === 'revisa-tu-web') import('./revisa.js').then(m => m.iniciarRevision());
