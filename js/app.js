/* ==========================================================
   Página de inicio: planes, diseños, opiniones, compra y mis pedidos
   ========================================================== */
import { CONFIG, PLANES, EXTRAS, URGENTE } from '../config.js';
import { PLANTILLAS, plantillaPorId } from './plantillas.js';
import * as store from './store.js';
import {
  $, $$, esc, euros, fecha, icono, toast, abrir, cerrar, conSesion, arrancar, waLink, refPedido,
  ESTADOS, campo, desplegable, opciones, interruptor, aceptarTerminos, terminosAceptados,
  estrellas, ocupado, cargandoHTML, spinner, etiquetas, TAREAS, progreso, PAGOS
} from './ui.js';
import { botonPago, abrirPago, abrirResena, animarYPagar } from './pago.js';
import { recomendar, iniciarChat } from './asistente.js';
import { ETAPAS, barraEtapas, accionCliente, leerFormulario, aprobarWeb, estadoParaEtapa, indiceEtapa, dominioTexto } from './proyecto.js';

/* Enlace de ventas: si alguien entra con ?ref=ID, el pedido queda a nombre de ese vendedor (30 días) */
const REF = 'tm_ref';
(() => {
  const r = new URLSearchParams(location.search).get('ref');
  if (r && /^[\w-]{3,64}$/.test(r)) { try { localStorage.setItem(REF, JSON.stringify({ uid: r, t: Date.now() })); } catch {} }
})();
const leerRef = () => {
  try { const r = JSON.parse(localStorage.getItem(REF) || 'null'); return r && Date.now() - r.t < 30 * 864e5 ? r.uid : ''; } catch { return ''; }
};

await arrancar('inicio');
iniciarChat();

/* ==========================================================
   MINIATURAS VIVAS DE LAS PLANTILLAS
   ========================================================== */
const urlPlantilla = (id, nombre = '', color = '', mini = false) => {
  const q = new URLSearchParams({ t: id });
  if (nombre) q.set('n', nombre);
  if (color) q.set('c', color);
  if (mini) q.set('m', '1'); // miniatura: sin animaciones de scroll
  return `plantilla.html?${q}`;
};
const ro = new ResizeObserver(es => es.forEach(en => en.target.style.setProperty('--s', en.contentRect.width / 1280)));
const miniatura = (id, nombre, color, lazy = true) =>
  `<div class="thumb"><div class="thumb-load">${spinner()}</div><iframe src="${urlPlantilla(id, nombre, color, true)}" tabindex="-1" aria-hidden="true" ${lazy ? 'loading="lazy"' : ''} title=""></iframe></div>`;
const vigilarMiniaturas = raiz => $$('.thumb', raiz).forEach(t => ro.observe(t));
// Quitar el "cargando" cuando la miniatura termina de cargar
document.addEventListener('load', e => {
  if (e.target.tagName === 'IFRAME' && e.target.getAttribute('src')) e.target.parentElement?.querySelector('.thumb-load')?.remove();
}, true);

/* ==========================================================
   VITRINA DE LA PORTADA: portátil + móvil que van cambiando de diseño
   ========================================================== */
const VITRINA = ['filo', 'calma', 'brasa', 'kiosko', 'pulso', 'lienzo'];
const DURA = 5200;
let vtIdx = 0, vtTimer = null, vtPausa = false;
const capas = el => {
  el.innerHTML = '<iframe tabindex="-1" aria-hidden="true" title=""></iframe><iframe tabindex="-1" aria-hidden="true" title=""></iframe>';
  return [...el.querySelectorAll('iframe')];
};
const vt = { pc: capas($('#vtPc')), mv: capas($('#vtMv')), activa: 0 };
function escalaVitrina() {
  const pc = $('#vtPc'), mv = $('#vtMv');
  pc.style.setProperty('--s', pc.clientWidth / 1280);
  mv.style.setProperty('--s', mv.clientWidth / 390);
  pc.style.setProperty('--d', `${-(2400 * pc.clientWidth / 1280 - pc.clientHeight)}px`);
  mv.style.setProperty('--d', `${-(2600 * mv.clientWidth / 390 - mv.clientHeight)}px`);
}
new ResizeObserver(escalaVitrina).observe($('#vitrina'));
$('#vtChips').innerHTML = VITRINA.map((id, i) => {
  const p = plantillaPorId(id);
  return `<button type="button" role="tab" data-vt="${i}" style="--c:${p.c.accent}"><b class="vt-prog"></b><small>${String(i + 1).padStart(2, '0')}</small><span>${esc(p.nombre)}</span><em>${esc(p.sector.split('·')[0].trim())}</em></button>`;
}).join('');
function mostrarVitrina(i) {
  vtIdx = (i + VITRINA.length) % VITRINA.length;
  const id = VITRINA[vtIdx], p = plantillaPorId(id);
  const old = vt.activa, sig = 1 - old;
  ['pc', 'mv'].forEach(k => {
    const f = vt[k][sig], o = vt[k][old];
    f.classList.remove('on', 'vt-rec');
    f.onload = () => requestAnimationFrame(() => {
      f.classList.add('on');
      o.classList.remove('on', 'vt-rec');
      setTimeout(() => f.classList.add('vt-rec'), 700);
    });
    f.src = urlPlantilla(id, '', '', true);
  });
  vt.activa = sig;
  $('#vtUrl').textContent = p.dominio;
  $$('#vtChips [data-vt]').forEach((b, k) => {
    b.classList.toggle('on', k === vtIdx);
    b.setAttribute('aria-selected', k === vtIdx);
    const pr = b.querySelector('.vt-prog'); pr.style.animation = 'none'; void pr.offsetWidth; pr.style.animation = '';
  });
  $('#vitrina').style.setProperty('--vt', p.c.accent);
  clearTimeout(vtTimer);
  if (!vtPausa && vtVisible !== false && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) vtTimer = setTimeout(() => mostrarVitrina(vtIdx + 1), DURA);
}
$('#vtChips').addEventListener('click', e => { const b = e.target.closest('[data-vt]'); if (b) mostrarVitrina(+b.dataset.vt); });
$('#vitrina').addEventListener('pointerenter', () => { vtPausa = true; clearTimeout(vtTimer); $('.hero-art').classList.add('pausa'); });
$('#vitrina').addEventListener('pointerleave', () => { vtPausa = false; $('.hero-art').classList.remove('pausa'); mostrarVitrina(vtIdx + 1); });
const abrirVitrina = () => abrirPreview(VITRINA[vtIdx]);
$('#vitrina').addEventListener('click', abrirVitrina);
$('#vitrina').addEventListener('keydown', e => { if (e.key === 'Enter') abrirVitrina(); });
const arrancarVitrina = () => setTimeout(() => { escalaVitrina(); mostrarVitrina(0); }, 200);
// Fluidez: la vitrina solo cambia de diseño cuando está a la vista (no recarga nada fuera de pantalla)
let vtVisible = true;
const reanudarVitrina = () => { if (vtVisible && !vtPausa && !document.hidden) { clearTimeout(vtTimer); vtTimer = setTimeout(() => mostrarVitrina(vtIdx + 1), DURA); } };
new IntersectionObserver(([e]) => {
  vtVisible = e.isIntersecting;
  $('.hero-art').classList.toggle('dormida', !vtVisible);
  vtVisible ? reanudarVitrina() : clearTimeout(vtTimer);
}, { threshold: .05 }).observe($('#vitrina'));
document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(vtTimer) : reanudarVitrina());
document.readyState === 'complete' ? arrancarVitrina() : addEventListener('load', arrancarVitrina);

/* ==========================================================
   PLANES
   ========================================================== */
$('#planes').innerHTML = PLANES.map(p => `
  <article class="plan-card reveal ${p.popular ? 'popular' : ''}">
    ${p.popular ? '<span class="tag">El más pedido</span>' : ''}
    <div class="pc-top"><span class="pc-ic">${icono(p.icono)}</span><span class="pc-time">${icono('clock')} ${esc(p.entrega)}</span></div>
    <h3>${esc(p.nombre)}</h3>
    <p class="pc-desc">${esc(p.desc)}</p>
    <div class="pc-price"><small>desde</small> ${euros(p.precio)}</div>
    <ul>${p.incluye.slice(0, 4).map(i => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>
    <button class="btn ${p.popular ? 'btn-dark' : 'btn-ghost btn-fill'} w100" data-comprar="${p.id}"><span>Comprar</span>${icono('arrow')}</button>
  </article>`).join('');

/* ==========================================================
   GALERÍA DE DISEÑOS
   ========================================================== */
const GRUPO = { filo: 'local', brasa: 'local', calma: 'local', pulso: 'local', kiosko: 'tienda', lienzo: 'pro' };
const FILTROS_DZ = [['todos', 'Todos'], ['local', 'Negocio local'], ['tienda', 'Tienda online'], ['pro', 'Profesional']];
$('#dzFiltro').innerHTML = FILTROS_DZ.map(([k, t], i) =>
  `<label class="opt"><input type="radio" name="dzf" value="${k}" ${i === 0 ? 'checked' : ''}><span><i>${t}</i></span></label>`).join('');
$('#dzFiltro').addEventListener('change', e => {
  const g = e.target.value;
  $$('#disenosGrid .dz').forEach((c, i) => {
    const ver = g === 'todos' || c.dataset.grupo === g;
    if (ver) { c.hidden = false; requestAnimationFrame(() => c.classList.remove('fuera')); c.style.transitionDelay = `${i * 40}ms`; }
    else { c.classList.add('fuera'); setTimeout(() => { if (c.classList.contains('fuera')) c.hidden = true; }, 350); }
  });
});
$('#disenosGrid').innerHTML = PLANTILLAS.map(p => `
  <article class="dz reveal" data-ver="${p.id}" data-grupo="${GRUPO[p.id] || 'local'}" tabindex="0" role="button" aria-label="Ver diseño ${esc(p.nombre)}" style="--c:${p.c.accent}">
    <div class="dz-win">
      <div class="dz-bar"><i></i><i></i><i></i><span>${esc(p.dominio)}</span></div>
      <div class="dz-view"><div class="thumb-load">${spinner()}</div><iframe src="${urlPlantilla(p.id, '', '', true)}" loading="lazy" tabindex="-1" aria-hidden="true" title=""></iframe></div>
      <span class="dz-scroll" aria-hidden="true">${icono('move')} recorre la web</span>
    </div>
    <div class="dz-info">
      <div><b>${esc(p.nombre)}</b><small>${esc(p.sector)}</small></div>
      <div class="dz-pal" title="Colores del diseño">${[p.c.bg, p.c.accent, p.c.text].map(c => `<i style="background:${c}"></i>`).join('')}</div>
    </div>
    <p>${esc(p.desc)}</p>
    <div class="dz-cta"><span>Ver en vivo</span>${icono('arrow')}</div>
  </article>`).join('');
// Escala de cada ventana y distancia que recorre al hacer "scroll" automático
const roDz = new ResizeObserver(es => es.forEach(({ target: v }) => {
  const s = v.clientWidth / 1280;
  v.style.setProperty('--s', s);
  v.style.setProperty('--d', `${-(2600 * s - v.clientHeight)}px`);
}));
$$('#disenosGrid .dz-view').forEach(v => roDz.observe(v));
// En el móvil (sin ratón) la web se recorre sola cuando la tarjeta está en el centro de la pantalla
if (!matchMedia('(hover: hover)').matches) {
  const ioDz = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('recorre', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
  $$('#disenosGrid .dz').forEach(c => ioDz.observe(c));
}

/* ==========================================================
   OPINIONES
   ========================================================== */
async function pintarOpiniones() {
  const grid = $('#opGrid');
  grid.innerHTML = cargandoHTML('Cargando opiniones…');
  let lista = [];
  try { lista = await store.resenasPublicas(); } catch (e) { console.warn(e); }
  const media = lista.length ? lista.reduce((s, r) => s + r.estrellas, 0) / lista.length : 0;

  $('#opScore').innerHTML = lista.length
    ? `<b>${media.toFixed(1).replace('.', ',')}</b><div>${estrellas(media)}<small>${lista.length} opinión${lista.length === 1 ? '' : 'es'} verificada${lista.length === 1 ? '' : 's'}</small></div>`
    : '';
  grid.innerHTML = lista.length
    ? lista.slice(0, 6).map(r => `
      <figure class="op-card reveal">
        <div class="op-top">${estrellas(r.estrellas)}${r.demo ? '<span class="op-demo">Ejemplo</span>' : ''}</div>
        <blockquote>“${esc(r.texto)}”</blockquote>
        <figcaption><span class="avatar sm">${esc((r.nombre || '?')[0])}</span><span><b>${esc(r.nombre)}</b><small>${esc(r.plan || '')} · ${fecha(r.createdAt)}</small></span></figcaption>
      </figure>`).join('')
    : `<div class="empty"><div class="em">${icono('star')}</div><b>Aún no hay opiniones publicadas</b><p>Cuando entreguemos las primeras webs, aquí verás lo que opinan nuestros clientes.</p></div>`;

  $('#opActions').innerHTML = `
    ${CONFIG.trustpilot ? `<a class="btn btn-primary" href="${esc(CONFIG.trustpilot)}" target="_blank" rel="noopener">${icono('star')}<span>Ver opiniones en Trustpilot</span></a>` : ''}
    <button class="btn btn-ghost" data-mis-pedidos>¿Ya eres cliente? Deja tu opinión</button>`;
  $$('#opGrid .reveal').forEach(el => io.observe(el));
}

/* ---------- Animaciones al aparecer ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .1, rootMargin: '0px 0px -30px 0px' });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(el); });
pintarOpiniones();

/* ---------- Línea de tiempo de "Cómo funciona": se rellena al hacer scroll ---------- */
const pasosEl = $('#pasos');
const pasosHijos = $$('.step', pasosEl);
function avanzarPasos() {
  const r = pasosEl.getBoundingClientRect();
  const k = Math.min(1, Math.max(0, (innerHeight * .75 - r.top) / (r.height + innerHeight * .25)));
  pasosEl.style.setProperty('--prog', k.toFixed(3));
  pasosHijos.forEach((s, i) => s.classList.toggle('hecho', k >= (i + .35) / pasosHijos.length));
}
addEventListener('scroll', () => requestAnimationFrame(avanzarPasos), { passive: true });
avanzarPasos();

/* ==========================================================
   TE AYUDO A ELEGIR (asistente: texto libre o 3 preguntas)
   ========================================================== */
const recoDlg = $('#recoDlg');
const PREG = [
  ['necesito', '¿Qué necesitas principalmente?', ['Que me encuentren y me contacten', 'Mostrar mis trabajos', 'Recibir reservas de citas', 'Vender productos', 'Algo a medida']],
  ['tamano', '¿Cuánta información vas a incluir?', ['Poca: una sola página', 'Bastante: servicios, galería, horario…']],
  ['prisa', '¿Para cuándo la necesitas?', ['Sin prisa', 'Lo antes posible']]
];
$('#recoForm').innerHTML = `
  <p class="reco-intro">Describe tu negocio y lo que quieres conseguir con la web. ${store.iaDisponible() ? 'Nuestro asistente con IA' : 'El asistente'} te recomendará el tipo de web, el diseño y los extras.</p>
  <div class="reco-ia">
    <textarea id="recoTexto" rows="3" maxlength="800" placeholder="Ej.: Tengo una peluquería en Sevilla, quiero que los clientes reserven cita desde el móvil y aún no tengo dominio."></textarea>
    <button type="button" class="btn btn-primary" id="recoIA"><span>Recomendar</span>${icono('sparkle')}</button>
  </div>
  <details class="reco-preg">
    <summary>Prefiero responder 3 preguntas</summary>
    ${PREG.map(([n, q, o]) => `<span class="q-label">${q}</span>${opciones(n, o, '')}`).join('')}
  </details>`;

function tarjetaReco(r) {
  const pl = PLANES.find(p => p.id === r.plan);
  const dz = r.plantilla ? plantillaPorId(r.plantilla) : null;
  const ex = (r.extras || []).map(id => EXTRAS.find(e => e.id === id)).filter(Boolean);
  $('#recoRes').innerHTML = `
    <div class="reco-card">
      <small>${r.ia ? `${icono('sparkle')} Recomendación del asistente` : 'Te recomendamos'}</small>
      <div class="reco-top"><span class="pc-ic">${icono(pl.icono)}</span><div><b>${esc(pl.nombre)}</b><span>desde ${euros(pl.precio)} · ${esc(pl.entrega)}</span></div></div>
      <p>${esc(r.motivo)}${r.urgente ? ' Te marcamos la entrega urgente.' : ''}</p>
      ${dz || ex.length ? `<div class="reco-extra">
        ${dz ? `<span>${icono('landing')} Diseño <b>${esc(dz.nombre)}</b> <button type="button" class="link-btn" data-ver-dz="${dz.id}">ver</button></span>` : ''}
        ${ex.map(e => `<span>${icono('plus')} ${esc(e.nombre)}</span>`).join('')}
      </div>` : ''}
      <button type="button" class="btn btn-primary w100" data-reco="${pl.id}" data-dz="${dz ? dz.id : ''}" data-urg="${r.urgente ? 1 : ''}"><span>Empezar con esta opción</span>${icono('arrow')}</button>
    </div>`;
}
function recomendarPreguntas() {
  const fd = new FormData($('#recoForm'));
  const [a, b, c] = ['necesito', 'tamano', 'prisa'].map(k => fd.get(k));
  if (!a) return;
  let plan = 'negocio', dz = 'filo', motivo = 'Para un negocio local lo más útil es una web completa con servicios, precios, galería, horario y ubicación.';
  if (a.startsWith('Mostrar')) { plan = 'portfolio'; dz = 'lienzo'; motivo = 'El portfolio da protagonismo a tus trabajos y facilita que te contacten.'; }
  else if (a.startsWith('Recibir')) { plan = 'reservas'; dz = 'calma'; motivo = 'Tus clientes eligen día y hora y reservan sin necesidad de llamar.'; }
  else if (a.startsWith('Vender')) { plan = 'tienda'; dz = 'kiosko'; motivo = 'Incluye catálogo, carrito y pago online sin comisiones de marketplaces.'; }
  else if (a.startsWith('Algo')) { plan = 'medida'; dz = ''; motivo = 'Lo diseñamos y desarrollamos a partir de tu idea, con presupuesto según el alcance.'; }
  else if (b?.startsWith('Poca')) { plan = 'landing'; dz = 'lienzo'; motivo = 'Una página bien estructurada es suficiente para presentarte y recibir contactos, y es la opción más económica.'; }
  tarjetaReco({ plan, plantilla: dz, extras: [], urgente: c === 'Lo antes posible', motivo, ia: false });
}
$('#recoForm').addEventListener('change', recomendarPreguntas);
$('#recoIA').addEventListener('click', async e => {
  const texto = $('#recoTexto').value.trim();
  if (texto.length < 8) { toast('Cuéntanos un poco más sobre tu negocio', 'err'); $('#recoTexto').focus(); return; }
  const btn = e.currentTarget;
  ocupado(btn, true);
  $('#recoRes').innerHTML = cargandoHTML('Analizando lo que necesitas…');
  try { tarjetaReco(await recomendar(texto)); }
  finally { ocupado(btn, false); }
});
$('#abrirReco').addEventListener('click', () => { abrir(recoDlg); setTimeout(() => $('#recoTexto').focus(), 200); });
recoDlg.addEventListener('click', e => {
  const v = e.target.closest('[data-ver-dz]');
  if (v) return abrirPreview(v.dataset.verDz);
  const b = e.target.closest('[data-reco]');
  if (!b) return;
  cerrar(recoDlg);
  abrirCompra(b.dataset.reco, b.dataset.dz || '', { urgente: !!b.dataset.urg });
});

/* ==========================================================
   VISTA PREVIA DE UN DISEÑO
   ========================================================== */
const prevDlg = $('#prevDlg');
let prevActual = null;
let prevAlElegir = null;
let dispositivo = innerWidth < 700 ? 'movil' : 'pc';

function ajustarPreview() {
  const stage = $('#prevStage'), frame = $('#prevFrame'), ifr = $('#prevIframe');
  const W = stage.clientWidth, H = stage.clientHeight;
  if (dispositivo === 'movil') {
    frame.className = 'prev-frame movil';
    frame.style.width = Math.min(390, W - 24) + 'px';
    frame.style.height = Math.min(H - 24, 844) + 'px';
    Object.assign(ifr.style, { width: '100%', height: '100%', transform: '' });
  } else {
    const ancho = Math.max(1280, W), s = W / ancho;
    frame.className = 'prev-frame pc';
    frame.style.width = W + 'px';
    frame.style.height = H + 'px';
    Object.assign(ifr.style, { width: ancho + 'px', height: H / s + 'px', transform: `scale(${s})` });
  }
  $$('[data-dev]', prevDlg).forEach(b => b.classList.toggle('on', b.dataset.dev === dispositivo));
}

function abrirPreview(id, { nombre = '', color = '', alElegir = null } = {}) {
  const p = plantillaPorId(id);
  if (!p) return;
  prevActual = id;
  prevAlElegir = alElegir;
  $('#prevTitle').textContent = `Diseño ${p.nombre}`;
  $('#prevSector').textContent = p.sector;
  $('#prevPick').innerHTML = `<span>${alElegir ? 'Elegir este' : 'Lo quiero'}</span>`;
  $('#prevIframe').src = urlPlantilla(id, nombre, color);
  abrir(prevDlg);
  requestAnimationFrame(ajustarPreview);
}
addEventListener('resize', () => prevDlg.open && ajustarPreview());
$$('[data-dev]', prevDlg).forEach(b => b.addEventListener('click', () => { dispositivo = b.dataset.dev; ajustarPreview(); }));
$('#prevPick').addEventListener('click', () => {
  cerrar(prevDlg);
  if (prevAlElegir) return prevAlElegir(prevActual);
  const plan = PLANES.find(pl => pl.plantillas[0] === prevActual) || PLANES.find(pl => pl.plantillas.includes(prevActual)) || PLANES[2];
  abrirCompra(plan.id, prevActual);
});

document.addEventListener('click', e => {
  const v = e.target.closest('[data-ver]');
  if (v) abrirPreview(v.dataset.ver);
  const c = e.target.closest('[data-comprar]');
  if (c) abrirCompra(c.dataset.comprar);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-ver]')) { e.preventDefault(); abrirPreview(e.target.dataset.ver); }
});

/* ==========================================================
   COMPRA: info → negocio → estilo → extras → diseño → resumen
   ========================================================== */
const PASOS = [
  { id: 'info', titulo: 'Qué incluye' },
  { id: 'negocio', titulo: 'Tu negocio' },
  { id: 'estilo', titulo: 'Estilo' },
  { id: 'extras', titulo: 'Extras' },
  { id: 'diseno', titulo: 'Elige diseño' },
  { id: 'resumen', titulo: 'Resumen' }
];
const SECTORES = ['Peluquería / barbería', 'Restaurante / bar', 'Tienda / comercio', 'Belleza y estética', 'Salud / clínica', 'Gimnasio / deporte', 'Profesional / freelance', 'Academia / formación', 'Otro'];
const OBJETIVOS = ['Que me contacten', 'Vender online', 'Reservas / citas', 'Darme a conocer'];
const ESTILOS = ['Moderno', 'Elegante', 'Minimalista', 'Divertido', 'Oscuro'];
const COLORES = ['#2f5bff', '#c4532d', '#c9a24a', '#6f8f72', '#ff5a1f', '#b98cff', '#e8437a', '#111111'];

const dlg = $('#compraDlg');
const form = $('#wizForm');
let W = null;

/* --- Borrador: si cierras el cuestionario, lo recuperamos al volver --- */
const BORRADOR = 'tm_borrador';
const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch { return null; } };
const borrarBorrador = () => { try { localStorage.removeItem(BORRADOR); } catch {} };
let tGuardar;
function guardarBorrador() {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(() => {
    if (!W) return;
    const campos = {};
    $$('input[name], select[name], textarea[name]', form).forEach(el => {
      if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) (campos[el.name] ||= []).push(el.value); }
      else campos[el.name] = el.value;
    });
    try { localStorage.setItem(BORRADOR, JSON.stringify({ plan: W.plan.id, paso: W.paso, max: W.max, campos, colorCustom: W.colorCustom, plantilla: W.plantilla, t: Date.now() })); } catch {}
  }, 300);
}
function restaurarBorrador(b) {
  $$('input[name], select[name], textarea[name]', form).forEach(el => {
    const v = b.campos[el.name];
    if (v === undefined) { if (el.type === 'radio' || el.type === 'checkbox') el.checked = false; return; }
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = v.includes(el.value);
    else el.value = v;
  });
  W.colorCustom = b.colorCustom || '';
  W.plantilla = b.plantilla || W.plantilla;
  W.max = b.max || 0;
}

function abrirCompra(planId, plantillaInicial = '', { urgente = false } = {}) {
  const plan = PLANES.find(p => p.id === planId);
  if (!plan) return;
  W = { plan, paso: 0, max: 0, plantilla: plantillaInicial || plan.plantillas[0] || 'cero', colorCustom: '' };
  const objetivo = plan.id === 'reservas' ? 'Reservas / citas' : plan.id === 'tienda' ? 'Vender online' : OBJETIVOS[0];

  form.innerHTML = `
    <div class="paso" data-paso="info">
      <div class="info-head">
        <span class="pc-ic big">${icono(plan.icono)}</span>
        <div><h3>${esc(plan.nombre)}</h3><p class="muted">${esc(plan.desc)}</p></div>
      </div>
      <div class="info-price"><div><small>Precio desde</small><b>${euros(plan.precio)}</b></div><div><small>Entrega</small><b>${esc(plan.entrega)}</b></div></div>
      <h4 class="mini-h">Incluye</h4>
      <ul class="incl">${plan.incluye.map(i => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>
      <h4 class="mini-h">Siguientes pasos</h4>
      <ol class="flow">
        <li><b>Cuestionario</b><span>Datos del negocio, estilo y extras. El precio total se actualiza a medida que eliges.</span></li>
        <li><b>Diseño de partida</b><span>Puedes verlo en vista previa con el nombre de tu negocio.</span></li>
        <li><b>Confirmación</b><span>Se abona el ${CONFIG.senal} % para empezar y el resto al aprobar la web.</span></li>
      </ol>
    </div>

    <div class="paso" data-paso="negocio">
      <h3 class="paso-h">Datos del negocio</h3>
      ${campo({ id: 'fNegocio', name: 'negocio', label: 'Nombre del negocio', required: true, attrs: 'autocomplete="organization"' })}
      ${desplegable({ id: 'fSector', name: 'sector', label: 'Sector', opciones: SECTORES })}
      <span class="q-label">Objetivo principal de la web</span>
      ${opciones('objetivo', OBJETIVOS, objetivo)}
      ${campo({ id: 'fTel', name: 'telefono', label: 'WhatsApp o teléfono', type: 'tel', required: true, attrs: 'inputmode="tel" autocomplete="tel"' })}
      ${campo({ id: 'fWeb', name: 'webActual', label: 'Tu web actual (opcional)', attrs: 'inputmode="url"' })}
    </div>

    <div class="paso" data-paso="estilo">
      <h3 class="paso-h">Estilo y contenido</h3>
      <span class="q-label">Estilo</span>
      ${opciones('estilo', ESTILOS)}
      <span class="q-label">Color principal</span>
      <div class="swatches">
        <label class="sw sw-orig" title="Los colores del diseño que elijas"><input type="radio" name="color" value="" checked><span></span><em>Original</em></label>
        ${COLORES.map(c => `<label class="sw" title="${c}"><input type="radio" name="color" value="${c}"><span style="--c:${c}"></span></label>`).join('')}
        <label class="sw-custom"><input type="color" id="colorPick" value="#ff4f8b" aria-label="Elegir otro color"> Otro</label>
      </div>
      <span class="q-label">Logotipo</span>
      ${opciones('logo', ['Sí, ya tengo', 'No, necesito uno', 'No hace falta'])}
      <span class="q-label">Textos y fotos</span>
      ${opciones('contenido', ['Sí, todo', 'Tengo algunos', 'Necesito ayuda'], 'Tengo algunos')}
    </div>

    <div class="paso" data-paso="extras">
      <h3 class="paso-h">Extras <span class="muted">(opcional)</span></h3>
      <div class="checks">${EXTRAS.map(x => `
        <label class="check-card"><input type="checkbox" name="extra" value="${x.id}"><span class="ck-mark"></span>
          <span class="ct"><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></span>
          <span class="pr">+${euros(x.precio)}${x.mensual ? '<small>/mes</small>' : ''}</span></label>`).join('')}
      </div>
      <div style="margin-top:12px">${interruptor({ id: 'fUrg', name: 'urgente', titulo: 'Entrega urgente', texto: `Reduce el plazo de entrega · +${URGENTE * 100} % sobre el precio base` })}</div>
      ${campo({ id: 'fCom', name: 'comentarios', label: 'Comentarios (opcional)', type: 'textarea', hint: 'Secciones que necesitas, webs de referencia, ideas…' })}
    </div>

    <div class="paso" data-paso="diseno">
      <h3 class="paso-h">Elige un diseño de partida</h3>
      <p class="muted paso-sub">Se muestran con el nombre y el color de tu negocio. Pulsa «Ver» para abrirlos a pantalla completa.</p>
      <div class="pick-grid" id="pickGrid"></div>
    </div>

    <div class="paso" data-paso="resumen"><div id="resumen"></div></div>`;

  etiquetas(form);
  if (urgente) $('#fUrg', form).checked = true;
  const b = leerBorrador();
  let inicio = 0;
  if (b && b.plan === plan.id && Date.now() - b.t < 7 * 864e5 && b.campos?.negocio) {
    restaurarBorrador(b);
    inicio = Math.min(b.paso || 0, PASOS.length - 2);
    setTimeout(() => toast('Hemos recuperado los datos que ya habías rellenado', 'ok'), 400);
  }
  W.paso = inicio;
  irA(inicio);
  abrir(dlg);
}

/* --- Leer el formulario --- */
function datos() {
  const fd = new FormData(form);
  const extrasIds = fd.getAll('extra');
  const extras = EXTRAS.filter(x => extrasIds.includes(x.id));
  const urgente = !!$('#fUrg', form)?.checked;
  const base = W.plan.precio;
  const recargo = urgente ? base * URGENTE : 0;
  const unico = extras.filter(x => !x.mensual).reduce((s, x) => s + x.precio, 0);
  const mensual = extras.filter(x => x.mensual).reduce((s, x) => s + x.precio, 0);
  const txt = k => (fd.get(k) || '').toString().trim();
  return {
    respuestas: {
      negocio: txt('negocio'), sector: txt('sector'), objetivo: txt('objetivo'), telefono: txt('telefono'),
      webActual: txt('webActual'), estilo: txt('estilo'), color: W.colorCustom || txt('color'),
      logo: txt('logo'), contenido: txt('contenido'), plazo: urgente ? 'Urgente' : 'Normal', comentarios: txt('comentarios')
    },
    extras: extras.map(({ id, nombre, precio, mensual }) => ({ id, nombre, precio, mensual: !!mensual })),
    urgente, recargo, total: base + recargo + unico, mensual
  };
}

function actualizarTotal() {
  if (!W) return;
  const d = datos();
  const t = $('#wizTotal'), nuevo = euros(d.total);
  if (t.textContent !== nuevo) { t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
  t.textContent = nuevo;
  $('#wizMensual').textContent = d.mensual ? `+ ${euros(d.mensual)}/mes` : '';
}

form.addEventListener('change', e => {
  if (!W) return;
  if (e.target.name === 'color') W.colorCustom = '';
  if (e.target.name === 'plantilla') W.plantilla = e.target.value;
  const marcarExtra = id => { const x = form.querySelector(`input[name=extra][value=${id}]`); if (x) x.checked = true; };
  if (e.target.name === 'logo' && e.target.value === 'No, necesito uno') marcarExtra('logo');
  if (e.target.name === 'contenido' && e.target.value === 'Necesito ayuda') marcarExtra('textos');
  actualizarTotal();
  guardarBorrador();
});
form.addEventListener('input', e => {
  guardarBorrador();
  if (e.target.id === 'colorPick') {
    W.colorCustom = e.target.value;
    $$('input[name=color]', form).forEach(r => (r.checked = false));
  }
});
form.addEventListener('submit', e => { e.preventDefault(); $('#wizNext').click(); });
// Intro en un campo de texto = Continuar
form.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=color])')) { e.preventDefault(); $('#wizNext').click(); }
});
// Puntos de pasos: se puede volver a cualquier paso ya visitado
$('#wizDots').addEventListener('click', e => {
  const d = e.target.closest('[data-ir]');
  if (d && W && +d.dataset.ir <= W.max) irA(+d.dataset.ir);
});

/* --- Pasos --- */
function irA(i) {
  form.dataset.dir = i >= W.paso ? 'fwd' : 'back';
  W.paso = i;
  W.max = Math.max(W.max || 0, i);
  const paso = PASOS[i];
  $('#wizDots').innerHTML = PASOS.map((p, k) =>
    `<button type="button" class="${k === i ? 'on' : k <= W.max ? 'hecho' : ''}" data-ir="${k}" ${k > W.max ? 'disabled' : ''} aria-label="Paso ${k + 1}: ${p.titulo}"></button>`).join('');
  guardarBorrador();
  $$('.paso', form).forEach(p => p.classList.toggle('on', p.dataset.paso === paso.id));
  $('#wizStep').textContent = `Paso ${i + 1} de ${PASOS.length} · ${paso.titulo}`;
  $('#wizTitle').textContent = W.plan.nombre;
  $('#wizBar').style.width = `${((i + 1) / PASOS.length) * 100}%`;
  $('#wizBack').style.visibility = i === 0 ? 'hidden' : 'visible';
  $('#wizFoot').hidden = false;
  const next = $('#wizNext');
  ocupado(next, false);
  next.innerHTML = `<span>${i === 0 ? 'Empezar' : paso.id === 'resumen' ? 'Confirmar pedido' : 'Continuar'}</span>`;
  if (paso.id === 'diseno') pintarSelectorDiseno();
  if (paso.id === 'resumen') pintarResumen();
  actualizarTotal();
  form.scrollTop = 0;
}

function validar(pasoId) {
  if (pasoId !== 'negocio') return true;
  let ok = true;
  [['#fNegocio', v => v.trim().length > 1], ['#fTel', v => v.replace(/\D/g, '').length >= 9]].forEach(([sel, f]) => {
    const el = $(sel, form), mal = !f(el.value);
    el.closest('.fc').classList.toggle('error', mal);
    if (mal && ok) { el.focus(); ok = false; }
  });
  if (!ok) toast('Rellena el nombre y un teléfono válido', 'err');
  return ok;
}

$('#wizBack').addEventListener('click', () => W && W.paso > 0 && irA(W.paso - 1));
$('#wizNext').addEventListener('click', () => {
  if (!W) return;
  const paso = PASOS[W.paso];
  if (!validar(paso.id)) return;
  if (paso.id === 'resumen') return confirmarPedido();
  irA(W.paso + 1);
});

/* --- Paso: diseño --- */
function pintarSelectorDiseno() {
  const { respuestas } = datos();
  const rec = W.plan.plantillas;
  const orden = [...PLANTILLAS].sort((a, b) => (rec.includes(b.id) ? 1 : 0) - (rec.includes(a.id) ? 1 : 0));
  $('#pickGrid').innerHTML = orden.map(p => `
    <label class="pick">
      <input type="radio" name="plantilla" value="${p.id}" ${W.plantilla === p.id ? 'checked' : ''}>
      <div class="pick-card">
        ${miniatura(p.id, respuestas.negocio, respuestas.color)}
        ${rec.includes(p.id) ? '<span class="rec">Recomendado</span>' : ''}
        <div class="pick-info"><div><b>${esc(p.nombre)}</b><small>${esc(p.sector)}</small></div>
          <button type="button" class="btn btn-sm btn-ghost" data-preview="${p.id}">${icono('eye')} Ver</button></div>
      </div>
    </label>`).join('') + `
    <label class="pick">
      <input type="radio" name="plantilla" value="cero" ${W.plantilla === 'cero' ? 'checked' : ''}>
      <div class="pick-card cero"><div class="cero-ic">${icono('sparkle')}</div><b>Diseño desde cero</b><small>Lo creamos 100 % a tu medida a partir del cuestionario.</small></div>
    </label>`;
  vigilarMiniaturas($('#pickGrid'));
}
dlg.addEventListener('click', e => {
  const b = e.target.closest('[data-preview]');
  if (!b) return;
  e.preventDefault();
  const { respuestas } = datos();
  abrirPreview(b.dataset.preview, {
    nombre: respuestas.negocio, color: respuestas.color,
    alElegir: id => {
      W.plantilla = id;
      const r = form.querySelector(`input[name=plantilla][value="${id}"]`);
      if (r) r.checked = true;
      toast(`Diseño ${plantillaPorId(id).nombre} elegido`);
    }
  });
});

/* --- Paso: resumen --- */
function pintarResumen() {
  const d = datos(), r = d.respuestas, p = W.plan;
  const pl = plantillaPorId(W.plantilla);
  const fila = (k, v) => v ? `<div class="rs-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
  $('#resumen').innerHTML = `
    <h3 class="paso-h">Revisa tu pedido</h3>
    <div class="rs-card">
      <div class="rs-plan">
        ${pl ? `<div class="rs-thumb">${miniatura(pl.id, r.negocio, r.color, false)}</div>` : `<div class="rs-thumb cero-mini">${icono('sparkle')}</div>`}
        <div><b>${esc(p.nombre)}</b><small>${pl ? `Diseño ${esc(pl.nombre)}` : 'Diseño desde cero'} · ${esc(r.negocio)}</small></div>
      </div>
      ${fila('Sector', r.sector)}${fila('Objetivo', r.objetivo)}${fila('Estilo', r.estilo)}
      <div class="rs-row"><span>Color</span><b>${r.color ? `<i class="rs-color" style="background:${esc(r.color)}"></i>${esc(r.color)}` : 'Los del diseño'}</b></div>
      ${fila('Logo', r.logo)}${fila('Contenido', r.contenido)}${fila('Contacto', r.telefono)}
    </div>
    <div class="rs-card">
      <div class="rs-row"><span>${esc(p.nombre)}</span><b>${euros(p.precio)}</b></div>
      ${d.extras.map(x => `<div class="rs-row"><span>${esc(x.nombre)}</span><b>+${euros(x.precio)}${x.mensual ? '/mes' : ''}</b></div>`).join('')}
      ${d.urgente ? `<div class="rs-row"><span>Entrega urgente</span><b>+${euros(d.recargo)}</b></div>` : ''}
      <div class="rs-row total"><span>Total</span><b>${euros(d.total)}</b></div>
      ${d.mensual ? `<div class="rs-row"><span>Cuota mensual</span><b>${euros(d.mensual)}/mes</b></div>` : ''}
      <div class="rs-note">Para empezar pagas la señal de <b>${euros(d.total * CONFIG.senal / 100)}</b> (${CONFIG.senal} %) y el resto cuando la web esté lista y te guste.</div>
    </div>
    <div class="rs-terms">${aceptarTerminos('wizTerms')}</div>
    ${store.usuarioActual() ? '' : '<p class="muted rs-login">Al confirmar te pediremos iniciar sesión para que puedas seguir tu pedido.</p>'}`;
  vigilarMiniaturas($('#resumen'));
}

async function confirmarPedido() {
  if (!terminosAceptados('wizTerms')) return;
  const btn = $('#wizNext');
  const u = await conSesion('Inicia sesión para confirmar tu pedido y seguir su estado.');
  if (!u || !W) return;
  ocupado(btn, true);
  const d = datos();
  try {
    const pedido = await store.crearPedido({
      plan: W.plan.id, planNombre: W.plan.nombre, precioBase: W.plan.precio,
      extras: d.extras, urgente: d.urgente, total: d.total, mensual: d.mensual,
      plantilla: W.plantilla, respuestas: d.respuestas, aceptaTerminos: Date.now(),
      ref: leerRef() && leerRef() !== u.uid ? leerRef() : ''
    });
    exito(pedido);
  } catch (e) {
    console.error(e);
    toast(e.message || 'No se pudo enviar el pedido', 'err');
    ocupado(btn, false);
  }
}

function exito(p) {
  const r = p.respuestas;
  const pl = plantillaPorId(p.plantilla);
  const msg = `¡Hola! Acabo de hacer un pedido en vuestra web 🙌
▸ ${p.planNombre} — ${euros(p.total)}${p.mensual ? ` + ${euros(p.mensual)}/mes` : ''}
▸ Negocio: ${r.negocio}
▸ Diseño: ${pl ? pl.nombre : 'desde cero'}
▸ Ref: ${refPedido(p.id)}`;
  borrarBorrador();
  clearTimeout(tGuardar);
  $('#wizDots').innerHTML = '';
  $('#wizFoot').hidden = true;
  $('#wizBack').style.visibility = 'hidden';
  $('#wizStep').textContent = 'Pedido enviado';
  $('#wizBar').style.width = '100%';
  form.innerHTML = `
    <div class="paso on exito">
      <div class="ok-ic">${icono('check')}</div>
      <h3>Pedido recibido</h3>
      <p class="muted">Referencia <b>${refPedido(p.id)}</b>. Te contactaremos al <b>${esc(r.telefono)}</b> en menos de 24 horas. Si abonas ahora la señal, empezamos en cuanto confirmemos el pedido. Desde «Mis proyectos» podrás elegir el dominio y enviarnos el contenido.</p>
      <div class="exito-pay">${botonPago(p)}</div>
      <a class="btn btn-wa w100" href="${waLink(msg)}" target="_blank" rel="noopener">${icono('wa')} Avisar por WhatsApp</a>
      <button type="button" class="btn btn-ghost w100" id="verPedidos">Ir a mis proyectos</button>
    </div>`;
  $('#verPedidos').addEventListener('click', () => { cerrar(dlg); abrirPedidos(); });
  $('[data-pagar]', form)?.addEventListener('click', e =>
    animarYPagar(e.currentTarget, () => abrirPago(p, 'senal', () => {
      const pay = $('.exito-pay', form); if (pay) pay.innerHTML = botonPago(p);
    })));
  W = null;
}

dlg.addEventListener('close', () => { W = null; });
dlg.addEventListener('cancel', () => { if (W && W.paso > 0) toast('Hemos guardado lo que has rellenado'); });

/* ==========================================================
   MIS PEDIDOS
   ========================================================== */
const pedDlg = $('#pedidosDlg');
let misPedidos = [];

async function abrirPedidos() {
  const u = await conSesion('Inicia sesión para ver tus proyectos.');
  if (!u) return;
  $('#pedidosList').innerHTML = cargandoHTML('Cargando tus proyectos…');
  abrir(pedDlg);
  await pintarPedidos();
}

async function pintarPedidos() {
  const list = $('#pedidosList');
  try {
    misPedidos = await store.misPedidos();
    if (!misPedidos.length) {
      list.innerHTML = `<div class="empty"><div class="em">${icono('bag')}</div><b>Todavía no tienes proyectos</b><p>Elige el tipo de web que necesitas para empezar.</p><a href="#webs" class="btn btn-primary" data-close style="margin-top:18px">Ver tipos de web</a></div>`;
      return;
    }
    list.innerHTML = misPedidos.map(p => {
      const est = ESTADOS[p.estado] || ESTADOS.nuevo;
      const pl = plantillaPorId(p.plantilla);
      const cancelado = p.estado === 'cancelado';
      return `
      <article class="mp mp-proyecto">
        <div class="mp-top">
          <div><b>${esc(p.respuestas?.negocio || p.planNombre)}</b><small>${esc(p.planNombre)} · ${pl ? 'Diseño ' + esc(pl.nombre) : 'Diseño a medida'} · Ref. ${refPedido(p.id)} · ${fecha(p.createdAt)}</small></div>
          <div class="mp-top-r"><b>${euros(p.total)}${p.mensual ? ` <small>+ ${euros(p.mensual)}/mes</small>` : ''}</b><span class="pill ${est.cls}">${est.txt}</span></div>
        </div>
        ${cancelado ? '<p class="muted">Este pedido está cancelado.</p>' : `
        ${barraEtapas(p)}
        <div class="mp-cuerpo">
          <div class="mp-accion">${accionCliente(p, botonPago(p))}</div>
          <aside class="mp-lado">
            ${p.dominio ? `<div class="mp-dato">${icono('link')}<span>Dominio</span><b>${esc(dominioTexto(p.dominio))}</b></div>` : ''}
            ${p.asignadoNombre ? `<div class="mp-dato">${icono('laptop')}<span>Responsable</span><b>${esc(p.asignadoNombre)}</b></div>` : ''}
            <div class="mp-dato">${icono('euro')}<span>Pago</span><b>${esc((PAGOS[p.pagoEstado || 'pendiente'] || PAGOS.pendiente).txt)}</b></div>
            <div class="mp-dato">${icono('chart')}<span>Avance</span><b>${Math.round(indiceEtapa(p) / (ETAPAS.length - 1) * 100)} %</b></div>
          </aside>
        </div>`}
      </article>`;
    }).join('');
    etiquetas(list);
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="empty"><b>No se han podido cargar</b><p>${esc(e.message)}</p></div>`;
  }
}

async function guardarProyecto(p, cambios, msg, btn) {
  if (btn) ocupado(btn, true);
  try {
    if (cambios.etapa) cambios.estado = estadoParaEtapa(cambios.etapa, p.estado);
    await store.actualizarPedido(p.id, cambios);
    toast(msg);
    await pintarPedidos();
  } catch (err) {
    toast(err.message, 'err');
    if (btn) ocupado(btn, false);
  }
}

$('#pedidosList').addEventListener('submit', e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const p = misPedidos.find(x => x.id === form.dataset.id);
  try {
    const cambios = leerFormulario(form, p);
    const msg = { dominio: 'Dominio guardado. Ahora puedes enviarnos el contenido.', contenido: 'Contenido recibido. Empezamos con el diseño.', cambios: 'Cambios enviados. Te avisaremos cuando estén hechos.' }[form.dataset.form];
    guardarProyecto(p, cambios, msg, form.querySelector('[type=submit]'));
  } catch (err) { toast(err.message, 'err'); }
});
$('#pedidosList').addEventListener('click', e => {
  const pg = e.target.closest('[data-pagar]');
  if (pg) {
    const p = misPedidos.find(x => x.id === pg.dataset.pagar);
    return animarYPagar(pg, () => abrirPago(p, pg.dataset.fase, pintarPedidos));
  }
  const ap = e.target.closest('[data-aprobar-web]');
  if (ap) {
    const p = misPedidos.find(x => x.id === ap.dataset.aprobarWeb);
    return guardarProyecto(p, aprobarWeb(p), 'Web aprobada. Solo falta el pago final para publicarla.', ap);
  }
  const v = e.target.closest('[data-valorar]');
  if (v) abrirResena(misPedidos.find(x => x.id === v.dataset.valorar), () => pintarPedidos());
});
$('#pedidosList').addEventListener('input', e => {
  if (!e.target.matches('.dom-in')) return;
  e.target.value = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
});

document.addEventListener('click', e => {
  if (e.target.closest('[data-mis-pedidos]')) { e.preventDefault(); $('.user-menu')?.classList.remove('open'); abrirPedidos(); }
});
if (location.hash === '#mis-pedidos') {
  history.replaceState(null, '', location.pathname);
  abrirPedidos();
}

// Acceso directo de la app instalada (?comprar=negocio)
const qComprar = new URLSearchParams(location.search).get('comprar');
if (qComprar) abrirCompra(qComprar);

// Vuelta desde Stripe (?pagado=ID): recordar que avise del pago
if (new URLSearchParams(location.search).get('pagado')) {
  toast('Gracias por tu pago. Lo verás confirmado en «Mis proyectos» cuando lo comprobemos.');
}
