/* ==========================================================
   REVISA TU WEB GRATIS (revisa-tu-web.html)
   Analiza la web que escribe el visitante con PageSpeed Insights de
   Google (gratis, sin claves; en español), como se ve en un móvil:
   velocidad, accesibilidad, buenas prácticas y SEO, y lo que conviene
   mejorar. No se guarda nada: la dirección va de su navegador a Google.
   Si un día hay muchas revisiones, se puede añadir una clave de la API
   de Google en config.js → pagespeedKey (restringida a aurevixweb.es).
   ========================================================== */
import { CONFIG } from '../config.js';
import { $, esc, icono, toast } from './ui.js';

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIAS = [
  ['performance', 'Velocidad', 'Lo que tarda en verse y en poder usarse en un móvil con datos.'],
  ['seo', 'Google (SEO)', 'Lo básico para que Google entienda y muestre tu web.'],
  ['accessibility', 'Accesibilidad', 'Que todo el mundo pueda usarla, también con lector de pantalla.'],
  ['best-practices', 'Buenas prácticas', 'Seguridad, HTTPS y errores de la página.']
];
const METRICAS = [
  ['largest-contentful-paint', 'Contenido principal visible'],
  ['first-contentful-paint', 'Primer contenido'],
  ['total-blocking-time', 'Tiempo bloqueada'],
  ['cumulative-layout-shift', 'Saltos de diseño']
];
const estado = s => (s >= 0.9 ? ['bien', 'Bien'] : s >= 0.5 ? ['medio', 'Mejorable'] : ['mal', 'Mal']);
// Los títulos de Lighthouse a veces traen `código` o [enlaces](url): se dejan en texto
const limpio = t => String(t || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '');

/** Normaliza lo que escribe el visitante: «tunegocio.es» → https://tunegocio.es/ */
export function normalizarUrl(txt) {
  let t = String(txt || '').trim();
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
  try {
    const u = new URL(t);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname)) return '';
    return u.href;
  } catch { return ''; }
}

function anillo(score, nombre, desc) {
  const pct = Math.round(score * 100), [cls, txt] = estado(score);
  return `<article class="rv-cat ${cls}">
    <div class="rv-anillo" style="--p:${pct}" role="img" aria-label="${esc(nombre)}: ${pct} de 100, ${txt.toLowerCase()}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9"/><circle class="v" cx="18" cy="18" r="15.9" pathLength="100"/></svg><b>${pct}</b></div>
    <div><h3>${esc(nombre)}</h3><span class="rv-est">${icono(cls === 'bien' ? 'check' : 'alert')}${txt}</span><p>${esc(desc)}</p></div>
  </article>`;
}

function pintar(res, url) {
  const lh = res.lighthouseResult, A = lh.audits;
  const cats = CATEGORIAS.filter(([k]) => lh.categories[k]).map(([k, n, d]) => anillo(lh.categories[k].score ?? 0, n, d)).join('');
  const metricas = METRICAS.filter(([k]) => A[k]).map(([k, n]) => {
    const [cls] = estado(A[k].score ?? 0);
    return `<div class="rv-met ${cls}"><small>${esc(n)}</small><b>${esc(A[k].displayValue || '—')}</b></div>`;
  }).join('');
  // Qué mejorar: primero lo que más tiempo ahorra; después lo que falla de SEO, accesibilidad y buenas prácticas
  const ahorro = Object.values(A).filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9 && (a.details.overallSavingsMs || 0) > 100)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0)).slice(0, 4)
    .map(a => ({ t: limpio(a.title), d: a.displayValue ? limpio(a.displayValue) : '', c: 'Velocidad' }));
  const fallos = ['seo', 'accessibility', 'best-practices'].flatMap(k => (lh.categories[k]?.auditRefs || [])
    .filter(r => r.weight > 0 && A[r.id] && A[r.id].score !== null && A[r.id].score < 1 && A[r.id].scoreDisplayMode !== 'notApplicable')
    .map(r => ({ t: limpio(A[r.id].title), d: '', c: CATEGORIAS.find(c => c[0] === k)[1] }))).slice(0, 8);
  const mejoras = [...ahorro, ...fallos];
  const foto = A['final-screenshot']?.details?.data;
  const host = new URL(url).hostname.replace(/^www\./, '');
  return `<div class="wrap">
    <div class="rv-cab">
      ${foto && /^data:image\/(jpeg|png|webp);base64,/.test(foto) ? `<figure class="rv-movil"><img src="${foto}" alt="Así se ve ${esc(host)} en un móvil"></figure>` : ''}
      <div>
        <span class="eyebrow">Resultado · móvil</span>
        <h2>${esc(host)}</h2>
        <div class="rv-cats">${cats}</div>
      </div>
    </div>
    ${metricas ? `<h3 class="rv-sub">Tiempos de carga</h3><div class="rv-mets">${metricas}</div>` : ''}
    <h3 class="rv-sub">Lo que conviene mejorar</h3>
    ${mejoras.length ? `<ul class="rv-mejoras">${mejoras.map(m => `<li><span class="rv-tag">${esc(m.c)}</span><b>${esc(m.t)}</b>${m.d ? `<small>${esc(m.d)}</small>` : ''}</li>`).join('')}</ul>`
      : `<p class="rv-ok">${icono('check')} No hemos encontrado nada importante que mejorar. ¡Buen trabajo!</p>`}
    <aside class="guia-cta rv-cta">
      <b>¿Quieres que te la dejemos perfecta?</b>
      <p>Te enviamos un presupuesto cerrado para mejorarla o hacerla nueva, con lo que has visto aquí resuelto.</p>
      <div class="pg-ctas"><a class="btn btn-primary" href="./#contacto">Pedir presupuesto <i data-i="arrow"></i></a><a class="btn btn-ghost" href="./#webs">Ver webs y precios</a></div>
    </aside>
    <p class="rv-nota">Análisis de PageSpeed Insights (Google) en un móvil simulado. Los resultados cambian un poco de una vez a otra.</p>
  </div>`;
}

export function iniciarRevision() {
  const form = $('#rvForm'), input = $('#rvUrl'), btn = $('#rvBtn'), res = $('#rvRes');
  let ctl = null;
  // ?url=… para enlazar directamente un análisis
  const pedida = new URLSearchParams(location.search).get('url');
  if (pedida) input.value = pedida;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = normalizarUrl(input.value);
    if (!url) { input.setAttribute('aria-invalid', 'true'); input.focus(); return toast('Escribe la dirección de tu web, por ejemplo tunegocio.es', 'err'); }
    input.removeAttribute('aria-invalid');
    ctl?.abort();
    ctl = new AbortController();
    const corte = setTimeout(() => ctl.abort(), 90000);
    btn.disabled = true;
    res.hidden = false;
    res.innerHTML = `<div class="wrap rv-carga"><span class="rv-spin" aria-hidden="true"></span><div><b>Analizando ${esc(new URL(url).hostname)}…</b><p>Google abre tu web como un móvil y la mide. Suele tardar entre 20 y 40 segundos.</p></div></div>`;
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const q = new URLSearchParams({ url, strategy: 'mobile', locale: 'es' });
      CATEGORIAS.forEach(([k]) => q.append('category', k));
      if (CONFIG.pagespeedKey) q.set('key', CONFIG.pagespeedKey);
      const r = await fetch(`${API}?${q}`, { signal: ctl.signal });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) throw new Error('Ahora mismo hay muchas revisiones. Prueba de nuevo en un minuto.');
      if (!r.ok || !j.lighthouseResult) throw new Error('No hemos podido analizar esa web. Comprueba que la dirección es correcta y que la web está publicada.');
      res.innerHTML = pintar(j, url);
      res.querySelectorAll('i[data-i]').forEach(i => (i.outerHTML = icono(i.dataset.i)));
      res.querySelector('h2')?.focus?.();
    } catch (err) {
      const m = err.name === 'AbortError' ? 'La web ha tardado demasiado en responder. Prueba de nuevo.' : err.message || 'No se ha podido hacer la revisión.';
      res.innerHTML = `<div class="wrap rv-error">${icono('alert')}<div><b>No se ha podido revisar</b><p>${esc(m)}</p></div></div>`;
    } finally {
      clearTimeout(corte);
      btn.disabled = false;
    }
  });
}
