/* ==========================================================
   REVISA TU WEB GRATIS (revisa-tu-web.html)
   Analiza la web que escribe el visitante con PageSpeed Insights de
   Google (gratis, sin claves; en español), como se ve en un móvil:
   velocidad, accesibilidad, buenas prácticas y SEO, y lo que conviene
   mejorar. No se guarda nada: la dirección va de su navegador a Google.
   La medición la hace la función de Supabase «revisar» con la clave de Google guardada
   como secreto (PAGESPEED_KEY): la clave nunca está en la web y el cupo es propio.
   ========================================================== */
import { CONFIG } from '../../config.js';
import { $, esc, icono, toast } from '../base/ui.js';

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

/* Comparación honesta: a la vez que su web se mide, en vivo y en las mismas condiciones, uno de nuestros diseños publicados */
const NUESTRA = 'https://aurevixweb.es/diseno?t=filo&m=1';
function comparar(lh, nuestra) {
  const filas = CATEGORIAS.filter(([k]) => lh.categories[k] && nuestra.categories?.[k]).map(([k, n]) => {
    const a = Math.round((lh.categories[k].score ?? 0) * 100), b = Math.round((nuestra.categories[k].score ?? 0) * 100);
    return `<div class="rv-cmp-f"><span>${esc(n)}</span>
      <div class="rv-cmp-b"><i class="${estado(a / 100)[0]}" style="--v:${a}%"></i><b>${a}</b></div>
      <div class="rv-cmp-b nuestra"><i class="${estado(b / 100)[0]}" style="--v:${b}%"></i><b>${b}</b></div></div>`;
  }).join('');
  return filas ? `<h3 class="rv-sub">Tu web frente a una web nuestra</h3>
    <div class="rv-cmp"><div class="rv-cmp-cab"><span></span><small>Tu web</small><small>Diseño «Filo» de ${esc(CONFIG.marca)}</small></div>${filas}</div>
    <p class="rv-nota">Las dos se han medido ahora mismo, a la vez y en las mismas condiciones (PageSpeed Insights, móvil).</p>` : '';
}

function pintar(res, url, nuestra = null) {
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
    ${nuestra?.categories ? comparar(lh, nuestra) : ''}
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
  // Desde la portada (?url=…&auto=1) el análisis empieza solo
  if (pedida && new URLSearchParams(location.search).get('auto')) queueMicrotask(() => form.requestSubmit());
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
      // Con Supabase, la revisión la hace la función «revisar» con la clave de Google guardada como secreto
      // (nunca en la web). Sin Supabase (modo demo), directamente a Google sin clave.
      const pedir = u => {
        if (CONFIG.supabase?.url) return fetch(`${CONFIG.supabase.url}/functions/v1/revisar`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', apikey: CONFIG.supabase.anonKey, Authorization: `Bearer ${CONFIG.supabase.anonKey}` },
          body: JSON.stringify({ url: u })
        });
        const q = new URLSearchParams({ url: u, strategy: 'mobile', locale: 'es' });
        CATEGORIAS.forEach(([k]) => q.append('category', k));
        return fetch(`${API}?${q}`, { signal: ctl.signal });
      };
      // Si Google está ocupado (cupo compartido sin clave), se reintenta solo dos veces antes de rendirse
      const espera = ms => new Promise(ok => setTimeout(ok, ms));
      let r, j;
      for (const pausa of [0, 4000, 9000]) {
        if (pausa) {
          const b = res.querySelector('.rv-carga b');
          if (b) b.textContent = 'Google está muy ocupado, lo intentamos otra vez…';
          await espera(pausa);
        }
        r = await pedir(url);
        j = await r.json().catch(() => ({}));
        if (r.status !== 429) break;
      }
      if (r.status === 429) throw new Error('Google tiene ahora mismo demasiadas revisiones. Prueba de nuevo en un par de minutos.');
      // La nuestra, después (no a la vez: así no se gasta el doble de cupo en el mismo momento). Si falla, sale sin comparación
      const refNuestra = /aurevixweb\.es/i.test(url) ? null : await pedir(NUESTRA).then(x => (x.ok ? x.json() : null)).then(x => x?.lighthouseResult || null).catch(() => null);
      if (!r.ok || !j.lighthouseResult) throw new Error('No hemos podido analizar esa web. Comprueba que la dirección es correcta y que la web está publicada.');
      res.innerHTML = pintar(j, url, refNuestra);
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
