/* ==========================================================
   IDIOMA: ESPAÑOL / INGLÉS
   La web está escrita en español. En inglés, cada texto de la
   página se cambia por su traducción (js/idioma-en.js), también
   los que aparecen después (diálogos, chat, cuestionario…).
   Lo que escribe la gente (nombres, mensajes) no se toca.
   Elección: botón ES/EN de la cabecera, ?lang=en o el idioma del
   navegador la primera vez. Los textos legales siguen en español,
   que es la versión que vale.
   ========================================================== */
const CLAVE = 'tm_idioma';
const leer = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const guardar = v => { try { localStorage.setItem(CLAVE, v); } catch { /* sin almacenamiento */ } };

function elegido() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'es') { guardar(q); return q; }
  const guardado = leer();
  if (guardado) return guardado;
  // El panel y los ajustes son del equipo: en español salvo que se elija inglés a mano
  if (/\/(panel|ajustes)(\.html)?$/.test(location.pathname)) return 'es';
  return (navigator.languages?.[0] || navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}
export const IDIOMA = elegido();
export const enIngles = IDIOMA === 'en';

/* ---------- Transición al cambiar de idioma ----------
   Un círculo crece desde donde se ha tocado y escribe el idioma nuevo
   letra a letra; la página se recarga traducida y el círculo se abre. */
const PALABRA = { es: 'Español', en: 'English' };
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
function cortina(v, x, y, saliendo) {
  const c = document.createElement('div');
  c.className = 'idioma-cortina' + (saliendo ? ' sale' : '');
  c.dataset.noTraducir = '';
  c.setAttribute('aria-hidden', 'true');
  c.style.setProperty('--x', `${x}px`);
  c.style.setProperty('--y', `${y}px`);
  c.innerHTML = `<div class="ic-texto"><small>${v === 'en' ? 'Idioma · Language' : 'Language · Idioma'}</small><b>${[...PALABRA[v]].map((l, i) => `<span style="--i:${i}">${l}</span>`).join('')}</b></div>`;
  // Fuera del body: el body puede estar oculto mientras se traduce
  document.documentElement.appendChild(c);
  return c;
}

export function cambiarIdioma(v, origen) {
  guardar(v);
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  if (quieto()) return location.replace(u.href);
  const r = origen?.getBoundingClientRect?.();
  const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2;
  try { sessionStorage.setItem('tm_idioma_anim', JSON.stringify({ v, x, y })); } catch { /* sin almacenamiento */ }
  cortina(v, x, y, false);
  setTimeout(() => location.replace(u.href), 900);
}

/** Al llegar a la página después de cambiar de idioma: la cortina se abre */
function abrirCortina() {
  let d = null;
  try { d = JSON.parse(sessionStorage.getItem('tm_idioma_anim') || 'null'); sessionStorage.removeItem('tm_idioma_anim'); } catch { /* nada */ }
  // La cubierta que pintó el <head> mientras cargaba (misma palabra, mismo sitio) deja paso a la cortina real
  const cubierta = () => document.documentElement.classList.remove('i18n-anim');
  if (!d || quieto()) return cubierta();
  const c = cortina(d.v, d.x, d.y, true);
  cubierta();
  requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('abre')));
  setTimeout(() => c.remove(), 1100);
}

/* ---------- Traductor ---------- */
let EN = null, PATRONES = [];
const ORIG = new WeakMap(); // nodo → texto español que se tradujo (para no traducir dos veces)
const NO = 'script,style,textarea,code,pre,iframe,[data-no-traducir],.msg.yo,.notranslate,[contenteditable]';
const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt'];

export function T(texto) {
  if (!EN || !texto) return texto;
  const s = texto.replace(/\s+/g, ' ').trim();
  if (!s) return texto;
  let r = EN[s];
  if (r === undefined) {
    for (const [re, f] of PATRONES) { const m = s.match(re); if (m) { r = f(m, T); break; } }
  }
  // «A · B»: se traduce cada parte que se conozca
  if (r === undefined && s.includes(' · ')) {
    const partes = s.split(' · '), tr = partes.map(p => EN[p] ?? null);
    if (tr.some(x => x !== null)) r = partes.map((p, i) => tr[i] ?? T(p)).join(' · ');
  }
  if (r === undefined) return texto;
  // Respeta los espacios de alrededor
  const ini = texto.match(/^\s*/)[0], fin = texto.match(/\s*$/)[0];
  return ini + r + fin;
}

function traducirTexto(n) {
  const v = n.nodeValue;
  if (!v || !/[a-záéíóúñ]/i.test(v)) return;
  if (ORIG.get(n) === v) return;
  const p = n.parentElement;
  if (!p || p.closest(NO)) return;
  const t = T(v);
  if (t !== v) { n.nodeValue = t; ORIG.set(n, t); }
}
function traducirAtributos(el) {
  if (el.closest(NO) && !el.matches('textarea')) return;
  for (const a of ATRIBUTOS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const t = T(v);
    if (t !== v) el.setAttribute(a, t);
  }
  if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) { const t = T(el.value); if (t !== el.value) el.value = t; }
}
export function traducir(raiz = document.body) {
  if (!EN || !raiz) return;
  if (raiz.nodeType === 3) return traducirTexto(raiz);
  if (raiz.nodeType !== 1) return;
  traducirAtributos(raiz);
  raiz.querySelectorAll('[placeholder],[aria-label],[title],[alt],input[type=submit],input[type=button]').forEach(traducirAtributos);
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) traducirTexto(w.currentNode);
}

/* ---------- Botón ES / EN ---------- */
/* Interruptor ES | EN con una pastilla que se desliza */
export function botonIdioma({ largo = false } = {}) {
  const g = document.createElement('div');
  g.className = 'idioma-sw' + (largo ? ' largo' : '');
  g.dataset.noTraducir = '';
  g.dataset.v = IDIOMA;
  g.setAttribute('role', 'radiogroup');
  g.setAttribute('aria-label', enIngles ? 'Language' : 'Idioma');
  g.innerHTML = `<i class="isw-pastilla" aria-hidden="true"></i>
    <button type="button" role="radio" data-v="es" aria-checked="${!enIngles}" lang="es">${largo ? 'Español' : 'ES'}</button>
    <button type="button" role="radio" data-v="en" aria-checked="${enIngles}" lang="en">${largo ? 'English' : 'EN'}</button>`;
  g.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b || b.dataset.v === IDIOMA) return;
    g.dataset.v = b.dataset.v;
    g.classList.remove('mueve'); void g.offsetWidth; g.classList.add('mueve');
    g.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    // Primero se desliza la pastilla y luego entra la cortina
    setTimeout(() => cambiarIdioma(b.dataset.v, b), quieto() ? 0 : 180);
  });
  return g;
}

/* ---------- Arranque ---------- */
export async function iniciarIdioma() {
  document.documentElement.lang = IDIOMA;
  if (!enIngles) { abrirCortina(); return; }
  const m = await import('./idioma-en.js');
  EN = m.EN; PATRONES = m.PATRONES;
  document.title = T(document.title);
  document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"]').forEach(x => { x.content = T(x.content); });
  // Los textos legales valen en español: se avisa en lugar de traducirlos
  if (/terminos/.test(location.pathname)) {
    const main = document.querySelector('main .wrap, main');
    if (main) main.insertAdjacentHTML('afterbegin', '<p class="aviso-idioma" data-no-traducir>Our legal terms are only available in Spanish, which is the binding version. If you have any questions about them, write to us and we will explain them in English.</p>');
    document.querySelectorAll('main article, main section, .legal').forEach(x => x.setAttribute('data-no-traducir', ''));
  }
  // Títulos partidos palabra a palabra (efecto de entrada): se traducen enteros y se vuelven a partir
  globalThis.__traducir = T;
  document.querySelectorAll('h2.split[aria-label]').forEach(h => {
    const t = T(h.getAttribute('aria-label'));
    h.setAttribute('aria-label', t);
    h.dataset.noTraducir = '';
    const esc = x => x.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    h.innerHTML = t.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
  });
  traducir(document.body);
  abrirCortina();
  // Lo que aparece o cambia después también se traduce
  let cola = new Set(), pendiente = false;
  const vaciar = () => { pendiente = false; const L = cola; cola = new Set(); L.forEach(n => n.isConnected && traducir(n)); };
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(n => cola.add(n));
      else if (m.type === 'characterData') cola.add(m.target);
      else if (m.type === 'attributes') cola.add(m.target);
    }
    if (!pendiente && cola.size) { pendiente = true; queueMicrotask(vaciar); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  // Los toasts y avisos que se crean con textContent pasan por el mismo camino
}
