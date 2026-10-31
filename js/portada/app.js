/* ==========================================================
   Página de inicio: planes, diseños, opiniones, compra y mis pedidos
   ========================================================== */
import { fiesta } from '../asistente/mascota.js';
import { CONFIG, PLANES, EXTRAS, COMPARATIVA } from '../../config.js';
import { PLANTILLAS, plantillaPorId } from './plantillas.js';
import * as store from '../base/store.js';
import { $, $$, esc, revisarCampos, euros, fecha, icono, toast, abrir, cerrar, conSesion, pedirLogin, arrancar, mailLink, refPedido, whatsappLink, contarEvento, ESTADOS, campo, desplegable, opciones, interruptor, aceptarTerminos, terminosAceptados, desgloseIVA, ivaTexto, infoDatos, descargar, estrellas, ocupado, copiar, cargandoHTML, errorCarga, metaHTML, spinner, etiquetas, PAGOS, haceCuanto } from '../base/ui.js';
import { planesActivos, extrasActivos } from '../base/sitio.js';
import { montarHilo, montarArchivos, abrirRecibo } from '../cuenta/colabora.js';
import { botonPago, abrirPago, abrirResena, animarYPagar } from '../cuenta/pago.js';
import { recomendar, iniciarChat } from '../asistente/asistente.js';
import { ETAPAS, barraEtapas, accionCliente, leerFormulario, aprobarWeb, pedirCambios, webCliente, desistimientoHTML, puedeDesistir, finDesistimiento, estadoParaEtapa, indiceEtapa, fechaEntrega, plazoTexto, plazoClase, conHistorial, lineaTiempoHTML } from '../cuenta/proyecto.js';
import { importeSenal, importeResto } from '../cuenta/pago.js';
import { confeti, contar } from '../base/efectos.js';
import { conMantenimiento, mantClienteHTML, extrasClienteHTML, textoAcuerdo, resumirVisitas, estadisticasHTML } from '../cuenta/negocio.js';
import { comprobar as comprobarCampo } from '../base/validar.js';
import { dominioHTML, montarDominio, leerDominio, sugerirNombre, marcarError } from '../cuenta/dominio.js';
import { prefsPermitidas, consentidoExpreso } from '../base/cookies.js';
import { iniciarInclinacion } from './inclinar.js';

/* Enlace de ventas: si alguien entra con ?ref=ID, el pedido queda a nombre de ese vendedor.
   Recordarlo 30 días en el navegador no es imprescindible para el visitante, así que solo se guarda
   si acepta las cookies de preferencias (LSSI, art. 22.2). Si no, vale mientras siga en la página. */
const REF = 'tm_ref';
let refSesion = '';
const guardarRef = () => { if (refSesion && consentidoExpreso()) { try { localStorage.setItem(REF, JSON.stringify({ uid: refSesion, t: Date.now() })); } catch {} } };
(() => {
  const r = new URLSearchParams(location.search).get('ref');
  if (r && /^[\w-]{3,64}$/.test(r)) { refSesion = r; guardarRef(); }
})();
document.addEventListener('cookies', e => { if (e.detail?.preferencias) guardarRef(); else { try { localStorage.removeItem(REF); } catch {} } });
const leerRef = () => {
  if (refSesion) return refSesion;
  try { const r = JSON.parse(localStorage.getItem(REF) || 'null'); return r && Date.now() - r.t < 30 * 864e5 ? r.uid : ''; } catch { return ''; }
};

/* ---------- Recomienda a un amigo: ?amigo=AMIGO-XXXXXXXX ---------- */
const AMIGO = 'tm_amigo';
let amigoSesion = '';
const guardarAmigo = () => { if (amigoSesion && consentidoExpreso()) { try { localStorage.setItem(AMIGO, JSON.stringify({ c: amigoSesion, t: Date.now() })); } catch {} } };
(() => {
  const c = (new URLSearchParams(location.search).get('amigo') || '').toUpperCase();
  if (/^AMIGO-[0-9A-F]{8}$/.test(c)) { amigoSesion = c; guardarAmigo(); }
})();
document.addEventListener('cookies', e => { if (e.detail?.preferencias) guardarAmigo(); else { try { localStorage.removeItem(AMIGO); } catch {} } });
const leerAmigo = () => {
  if (!CONFIG.referidos?.activo) return '';
  if (amigoSesion) return amigoSesion;
  try { const r = JSON.parse(localStorage.getItem(AMIGO) || 'null'); return r && Date.now() - r.t < 30 * 864e5 ? r.c : ''; } catch { return ''; }
};

await arrancar('inicio');
iniciarInclinacion();
if (amigoSesion && CONFIG.referidos?.activo) setTimeout(() => toast(`Un amigo te recomienda: tienes un ${CONFIG.referidos.pct} % de descuento en tu primera web`, 'ok'), 1200);
// El chat (y su robot) se prepara cuando el navegador queda libre: no compite con la carga de la portada
('requestIdleCallback' in window ? requestIdleCallback : f => setTimeout(f, 800))(() => iniciarChat(), { timeout: 2000 });

/* ==========================================================
   MINIATURAS VIVAS DE LAS PLANTILLAS
   ========================================================== */
const urlPlantilla = (id, nombre = '', color = '', mini = false) => {
  const q = new URLSearchParams({ t: id });
  if (nombre) q.set('n', nombre);
  if (color) q.set('c', color);
  if (mini) q.set('m', '1'); // miniatura: sin animaciones de scroll
  return `diseno?${q}`;
};
const ro = new ResizeObserver(es => es.forEach(en => en.target.style.setProperty('--s', en.contentRect.width / 1280)));
const miniatura = (id, nombre, color, lazy = true) =>
  `<div class="thumb"><div class="thumb-load">${spinner()}</div><iframe ${lazy ? 'data-src' : 'src'}="${urlPlantilla(id, nombre, color, true)}" tabindex="-1" aria-hidden="true" title=""></iframe></div>`;
/* Las miniaturas son webs enteras: se cargan solo cuando están a punto de verse
   (loading="lazy" en conexiones lentas empieza a miles de píxeles de distancia) */
const ioMini = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  ioMini.unobserve(e.target);
  e.target.src = e.target.dataset.src;
  e.target.removeAttribute('data-src');
}), { rootMargin: '300px 0px' });
const vigilarCarga = raiz => $$('iframe[data-src]', raiz).forEach(f => ioMini.observe(f));
const vigilarMiniaturas = raiz => { $$('.thumb', raiz).forEach(t => ro.observe(t)); vigilarCarga(raiz); };
// Quitar el "cargando" cuando la miniatura termina de cargar
document.addEventListener('load', e => {
  if (e.target.tagName === 'IFRAME' && e.target.getAttribute('src')) e.target.parentElement?.querySelector('.thumb-load')?.remove();
}, true);

/* ==========================================================
   VITRINA DE LA PORTADA: portátil + móvil que van cambiando de diseño
   ========================================================== */
const VITRINA = ['filo', 'calma', 'brasa', 'kiosko', 'pulso', 'lienzo'];
const DURA = 5200;
let vtIdx = 0, vtTimer = null, vtPausa = false, vtTurno = 0;
/* «Pruébalo con tu negocio»: el nombre que escribe el visitante sale en la vitrina, en la galería y en las vistas previas */
let vtNombre = '';
try { vtNombre = sessionStorage.getItem('tm_prueba_nombre') || ''; } catch { /* sin almacenamiento */ }
const dominioDe = n => (n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'tunegocio') + '.es';
// Chrome, Edge y Firefox reducen la web con «zoom» (nítido). Safari se queda con scale:
// su zoom no siempre llega al contenido del iframe
if (/(Chrome|Firefox)\//.test(navigator.userAgent) && !/iP(hone|ad|od)/.test(navigator.userAgent)) document.documentElement.classList.add('zoom-ok');
// Dos capas por pantalla: una se ve y la otra carga el diseño siguiente.
// La web va con «zoom» (no con scale): el navegador la dibuja ya a su tamaño final y el texto sale nítido.
const capas = el => {
  el.innerHTML = '<div class="vt-capa"><iframe tabindex="-1" aria-hidden="true" title=""></iframe></div>'.repeat(2);
  return [...el.querySelectorAll('.vt-capa')];
};
/* Espera a que las fotos de la parte visible hayan llegado (como mucho 3 s) para no enseñar huecos */
const fotosListas = f => new Promise(ok => {
  let doc; try { doc = f.contentDocument; } catch { return ok(); }
  const imgs = doc ? [...doc.images].filter(i => i.getBoundingClientRect().top < 1600) : [];
  imgs.forEach(i => { i.loading = 'eager'; });
  const pend = imgs.filter(i => !i.complete);
  if (!pend.length) return ok();
  let n = pend.length; const fin = () => { if (--n <= 0) ok(); };
  pend.forEach(i => { i.addEventListener('load', fin, { once: true }); i.addEventListener('error', fin, { once: true }); });
  setTimeout(ok, 3000);
});
const vt = { pc: null, mv: null, activa: 0 }; // las ventanas se crean al arrancar la vitrina (no durante la carga)
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
  return `<button type="button" role="tab" data-vt="${i}" style="--c:${p.c.accent}"><b class="vt-prog"></b><span>${esc(p.nombre)}</span><em>${esc(p.sector.split('·')[0].trim())}</em></button>`;
}).join('');
function mostrarVitrina(i) {
  vtIdx = (i + VITRINA.length) % VITRINA.length;
  const id = VITRINA[vtIdx], p = plantillaPorId(id);
  const old = vt.activa, sig = 1 - old;
  // Portátil y móvil cargan el diseño en la capa oculta y cambian a la vez, cuando los dos están listos
  const turno = ++vtTurno;
  Promise.all(['pc', 'mv'].map(k => new Promise(ok => {
    const c = vt[k][sig], f = c.firstElementChild;
    c.classList.remove('on', 'vt-rec');
    f.onload = () => fotosListas(f).then(ok);
    f.src = urlPlantilla(id, vtNombre, '', true);
  }))).then(() => requestAnimationFrame(() => {
    if (turno !== vtTurno) return; // mientras tanto se ha pedido otro diseño
    vt.activa = sig; // la capa visible solo cambia cuando el nuevo diseño ya se ve
    $('#vtUrl').textContent = vtNombre ? dominioDe(vtNombre) : p.dominio;
    ['pc', 'mv'].forEach(k => {
      const c = vt[k][sig];
      c.classList.add('on');
      vt[k][old].classList.remove('on', 'vt-rec');
      setTimeout(() => turno === vtTurno && c.classList.add('vt-rec'), 700);
    });
  }));
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
const abrirVitrina = () => abrirPreview(VITRINA[vtIdx], { nombre: vtNombre });
if (vtNombre) $('#vtNombre').value = vtNombre;
let vtEscribe = null;
$('#vtNombre').addEventListener('input', e => {
  clearTimeout(vtEscribe);
  vtEscribe = setTimeout(() => {
    vtNombre = e.target.value.trim().slice(0, 32);
    if (vtNombre) contarEvento('nombre-prueba');
    try { vtNombre ? sessionStorage.setItem('tm_prueba_nombre', vtNombre) : sessionStorage.removeItem('tm_prueba_nombre'); } catch { /* sin almacenamiento */ }
    $('#vtAviso').textContent = vtNombre ? `Así se vería «${vtNombre}». Cambia de diseño abajo.` : 'Se ve al momento en todos los diseños';
    if (vtArrancada) mostrarVitrina(vtIdx);
    document.dispatchEvent(new CustomEvent('nombre-prueba', { detail: vtNombre }));
  }, 450);
});
$('#vtPrueba').addEventListener('submit', e => { e.preventDefault(); $('#vtNombre').blur(); });
$('#vitrina').addEventListener('click', abrirVitrina);
$('#vitrina').addEventListener('keydown', e => { if (e.key === 'Enter') abrirVitrina(); });
/* Fluidez: cada diseño de la vitrina es una web entera (HTML, estilos y fotos), así que no se carga
   hasta que la página ya está lista, el navegador está libre y la vitrina se ve en pantalla.
   Fuera de pantalla no cambia de diseño ni recarga nada. */
let vtVisible = false, vtLista = false, vtArrancada = false;
const arrancarVitrina = () => {
  if (vtArrancada || !vtLista || !vtVisible) return;
  vtArrancada = true;
  vt.pc = capas($('#vtPc')); vt.mv = capas($('#vtMv'));
  escalaVitrina(); mostrarVitrina(0);
};
const reanudarVitrina = () => { if (vtArrancada && vtVisible && !vtPausa && !document.hidden) { clearTimeout(vtTimer); vtTimer = setTimeout(() => mostrarVitrina(vtIdx + 1), DURA); } };
new IntersectionObserver(([e]) => {
  vtVisible = e.isIntersecting;
  $('.hero-art').classList.toggle('dormida', !vtVisible);
  if (!vtArrancada) return arrancarVitrina();
  vtVisible ? reanudarVitrina() : clearTimeout(vtTimer);
}, { threshold: .05 }).observe($('#vitrina'));
document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(vtTimer) : reanudarVitrina());
const cuandoLibre = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 600));
const vitrinaLista = () => cuandoLibre(() => { vtLista = true; arrancarVitrina(); });
document.readyState === 'complete' ? vitrinaLista() : addEventListener('load', vitrinaLista);

/* ==========================================================
   PLANES
   ========================================================== */
/* Píldora de la portada (la cambia el propietario en Ajustes) */
$('#heroAviso span').textContent = CONFIG.aviso;
if (!CONFIG.aceptarPedidos) $('#heroAviso').classList.add('cerrado');

const textoComprar = () => (CONFIG.aceptarPedidos ? 'Comprar' : 'Lista de espera');
/* Descuento de bienvenida (primera web) */
const bvActivo = () => !!(CONFIG.bienvenida?.activo && CONFIG.bienvenida.codigo && CONFIG.aceptarPedidos);
const bienvenidaOK = () => bvActivo() && !W?.sinBienvenida;
/* ---------- Widgets de la portada: garantías y calculadora ---------- */
$('#grIva') && ($('#grIva').textContent = CONFIG.iva ? `${CONFIG.iva} % de IVA incluido` : 'sin IVA');
$('#grSenal') && ($('#grSenal').textContent = `${CONFIG.senal} % al inicio, el resto a la entrega`);
$('#grResp') && ($('#grResp').textContent = CONFIG.respuesta.replace(/^Respondemos\s+/i, ''));
function alAcercarse(el, fn, margen = '600px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margen });
  io.observe(el);
}
alAcercarse($('#calc'), () => import('./calculadora.js').then(m => m.montarCalculadora($('#calc'), { bienvenida: bvActivo() })));
/* Navegación lateral por secciones (solo en pantallas anchas; el CSS la oculta en el resto) */
(() => {
  const SEC = [['disenos', 'Diseños'], ['cambio', 'Antes y después'], ['webs', 'Precios'], ['calcula', 'Presupuesto'], ['como', 'Cómo trabajamos'], ['opiniones', 'Opiniones'], ['revisa', 'Revisa tu web'], ['faq', 'Preguntas'], ['contacto', 'Contacto']]
    .map(([id, t]) => [document.getElementById(id), t]).filter(([el]) => el);
  if (!SEC.length || !('IntersectionObserver' in window)) return;
  const nav = document.createElement('nav');
  nav.className = 'secnav';
  nav.setAttribute('aria-label', 'Secciones de la página');
  nav.innerHTML = SEC.map(([el, t]) => `<a href="#${el.id}"><span>${t}</span><i></i></a>`).join('');
  document.body.appendChild(nav);
  const links = [...nav.children], vis = new Map();
  const marcar = () => {
    let mejor = null, max = 0;
    for (const [el] of SEC) { const v = vis.get(el) || 0; if (v > max) { max = v; mejor = el; } }
    nav.classList.toggle('ver', !!mejor);
    links.forEach((a, i) => { const on = SEC[i][0] === mejor; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
  };
  const io = new IntersectionObserver(es => {
    for (const e of es) vis.set(e.target, e.isIntersecting ? e.intersectionRect.height : 0);
    marcar();
  // Solo cuenta la franja central de la pantalla: así se esconde mientras pasan
  // la portada, las garantías y las garantías (van a todo el ancho y se taparían)
  }, { threshold: [0, .1, .25, .5, .75, 1], rootMargin: '-40% 0px -40% 0px' });
  SEC.forEach(([el]) => io.observe(el));
})();
/* Botones del asistente: abren lo que corresponde en la propia web */
document.addEventListener('aurevix:abrir', async e => {
  const d = e.detail || {};
  if (d.tipo === 'login') return pedirLogin('Entra con la cuenta con la que hiciste el pedido.');
  if (d.tipo === 'proyectos') return abrirPedidos();
  if (d.tipo === 'proyecto') return abrirPedidos(d.id, d.pest || 'estado');
  if (d.tipo === 'soporte') return abrirSoporte();
  if (d.tipo === 'llamada') return import('./llamada.js').then(m => m.abrirLlamada());
  if (d.tipo === 'comprar') return abrirCompra(d.plan, '', { urgente: !!d.urgente, extras: d.extras || [] });
  if (d.tipo === 'elegir') return $('#abrirReco')?.click();
  if (d.tipo === 'pagar') {
    try {
      const p = (await store.misPedidos()).find(x => x.id === d.id);
      const { faseDePago } = await import('../cuenta/pago.js');
      if (p && faseDePago(p)) abrirPago(p, faseDePago(p), () => {});
      else abrirPedidos(d.id, 'pagos');
    } catch (err) { toast(err.message, 'err'); }
  }
});
document.addEventListener('aurevix:pedir', e => {
  const { plan, urgente, extras } = e.detail || {};
  abrirCompra(plan, '', { urgente, extras });
});

if (bvActivo()) {
  $('#planes').insertAdjacentHTML('beforebegin', `<div class="bv-banda reveal">
    <span class="bv-ic">${icono('gift')}</span>
    <div><b>−${CONFIG.bienvenida.pct} % en tu primera web</b><span>Usa el código <button type="button" class="bv-cod" data-copy="${esc(CONFIG.bienvenida.codigo)}" aria-label="Copiar código ${esc(CONFIG.bienvenida.codigo)}">${esc(CONFIG.bienvenida.codigo)} ${icono('copy')}</button> al revisar tu pedido.</span></div>
  </div>`);
}
$('#planes').innerHTML = planesActivos().map(p => `
  <article class="plan-card reveal ${p.popular ? 'popular' : ''}">
    ${p.popular ? '<span class="tag">El más pedido</span>' : ''}
    <div class="pc-top"><span class="pc-ic">${icono(p.icono)}</span><span class="pc-time">${icono('clock')} ${esc(p.entrega)}</span></div>
    <h3>${esc(p.nombre)}</h3>
    <p class="pc-desc">${esc(p.desc)}</p>
    <div class="pc-price"><small>desde</small> ${euros(p.precio)}<small class="pc-iva">${ivaTexto()}</small></div>
    ${bvActivo() ? `<p class="pc-bv">${icono('gift')} ${euros(Math.round(p.precio * (100 - CONFIG.bienvenida.pct)) / 100)} en tu primera web</p>` : ''}
    <ul>${p.incluye.slice(0, 4).map(i => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>
    <button class="btn ${p.popular ? 'btn-dark' : 'btn-ghost btn-fill'} w100" data-comprar="${p.id}"><span>${textoComprar()}</span>${icono('arrow')}</button>
  </article>`).join('');

/* Datos de la portada al día con los precios y la señal de Ajustes */
{
  const minimo = Math.min(...planesActivos().map(p => p.precio));
  const t = $$('.trust .num');
  if (t[0] && isFinite(minimo)) { t[0].dataset.count = minimo; t[0].textContent = minimo; }
  if (t[1]) { t[1].dataset.count = CONFIG.senal; t[1].textContent = CONFIG.senal; }
}

/* ---------- Comparativa de planes ----------
   Ordenador: tabla con todos los planes. Móvil: dos planes uno al lado del otro, que se eligen
   arriba (una tabla de seis columnas no cabe y obligaba a arrastrarla de lado). */
let cmpSel = null;
function pintarComparaMovil(P) {
  const caja = $('#cmpMovil');
  if (!caja) return;
  if (!cmpSel) { const pop = P.findIndex(p => p.popular); cmpSel = [Math.max(0, pop - 1), pop >= 0 ? pop : Math.min(1, P.length - 1)]; if (cmpSel[0] === cmpSel[1]) cmpSel[1] = Math.min(P.length - 1, cmpSel[0] + 1); }
  const [a, b] = cmpSel.map(i => P[i]);
  const sel = (k, actual) => `<label class="cmp-sel"><span class="sr">Plan ${k + 1}</span><select data-cmp="${k}" aria-label="Plan ${k + 1}">${P.map((p, i) => `<option value="${i}" ${i === actual ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>`;
  const marca = (p, ids) => ids.includes(p.id) ? `<span class="si" aria-label="Incluido">${icono('check')}</span>` : '<span class="no" aria-label="No incluido">—</span>';
  const col = p => `<div class="cmp-col ${p.popular ? 'pop' : ''}"><span class="pc-ic">${icono(p.icono)}</span><strong>${esc(p.nombre)}</strong><small>desde</small><b>${euros(p.precio)}</b><em>${esc(p.entrega)}</em></div>`;
  caja.innerHTML = `
    <div class="cmp-cab">${sel(0, cmpSel[0])}<span class="cmp-vs" aria-hidden="true">vs</span>${sel(1, cmpSel[1])}</div>
    <div class="cmp-precios">${col(a)}${col(b)}</div>
    <ul class="cmp-filas">${COMPARATIVA.map(([txt, ids]) => `<li class="${ids.includes(a.id) !== ids.includes(b.id) ? 'dif' : ''}"><span>${esc(txt)}</span>${marca(a, ids)}${marca(b, ids)}</li>`).join('')}</ul>
    <p class="cmp-nota">${icono('check')} Las filas resaltadas son las diferencias. Precios finales con el ${CONFIG.iva || 0} % de IVA incluido.</p>
    <div class="cmp-btns"><button class="btn btn-sm ${a.popular ? 'btn-primary' : 'btn-ghost'}" data-comprar="${a.id}">${esc(textoComprar())} ${esc(a.nombre.toLowerCase())}</button><button class="btn btn-sm ${b.popular ? 'btn-primary' : 'btn-ghost'}" data-comprar="${b.id}">${esc(textoComprar())} ${esc(b.nombre.toLowerCase())}</button></div>`;
  caja.onchange = e => {
    const k = e.target.dataset.cmp;
    if (k === undefined) return;
    cmpSel[+k] = +e.target.value;
    if (cmpSel[0] === cmpSel[1]) cmpSel[1 - k] = (cmpSel[+k] + 1) % P.length; // nunca el mismo plan dos veces
    pintarComparaMovil(P);
  };
}

/* Comparativa de los tipos de web: siempre a la vista debajo de los precios (en el móvil, dos a dos) */
function pintarComparativa() {
  const t = $('#comparaTabla');
  {
    const P = planesActivos();
    t.innerHTML = `<div class="compara-scroll"><table class="compara"><caption class="compara-iva">Precios finales con el ${CONFIG.iva || 0} % de IVA incluido.</caption>
      <thead><tr><th></th>${P.map(p => `<th class="${p.popular ? 'pop' : ''}"><span class="pc-ic">${icono(p.icono)}</span><b>${esc(p.nombre)}</b><small>desde ${euros(p.precio)}</small></th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Plazo de entrega</td>${P.map(p => `<td class="${p.popular ? 'pop' : ''}">${esc(p.entrega)}</td>`).join('')}</tr>
        ${COMPARATIVA.map(([txt, ids]) => `<tr><td>${esc(txt)}</td>${P.map(p => `<td class="${p.popular ? 'pop' : ''}">${ids.includes(p.id) ? `<span class="si">${icono('check')}</span>` : '<span class="no">—</span>'}</td>`).join('')}</tr>`).join('')}
        <tr class="cta"><td></td>${P.map(p => `<td class="${p.popular ? 'pop' : ''}"><button class="btn btn-sm ${p.popular ? 'btn-primary' : 'btn-ghost'}" data-comprar="${p.id}">${textoComprar()}</button></td>`).join('')}</tr>
      </tbody></table></div>
      <div class="cmp-m" id="cmpMovil"></div>`;
    pintarComparaMovil(P);
  }
}
pintarComparativa();

/* ==========================================================
   GALERÍA DE DISEÑOS
   ========================================================== */
/* Galería a pantalla completa: a la izquierda cada diseño en grande (nombre, para quién, precio y botones);
   a la derecha, fija mientras se baja, la web en vivo del diseño que está en el centro de la pantalla.
   En el móvil cada diseño lleva su propia ventana. Las webs solo se cargan cuando están a punto de verse. */
const planesDe = id => planesActivos().filter(pl => pl.plantillas.includes(id));
const precioDesde = id => { const ps = planesDe(id); return ps.length ? Math.min(...ps.map(pl => pl.precio)) : null; };
$('#disenosGrid').innerHTML = `<div class="gal-lista">${PLANTILLAS.map((p, i) => {
  const ps = planesDe(p.id), desde = precioDesde(p.id);
  return `<article class="gal-item${i === 0 ? ' on' : ''}" data-gal="${i}" style="--c:${p.c.accent}">
    <div class="gal-mini" data-ver="${p.id}" role="button" tabindex="0" aria-label="Ver el diseño ${esc(p.nombre)} en vivo">
      <div class="dz-bar"><i></i><i></i><i></i><span>${esc(vtNombre ? dominioDe(vtNombre) : p.dominio)}</span></div>
      <div class="gal-mini-v" style="background:${p.c.bg}"><iframe data-src="${urlPlantilla(p.id, vtNombre, '', true)}" width="1280" height="2600" tabindex="-1" aria-hidden="true" title=""></iframe></div>
    </div>
    <h3>${esc(p.nombre)}</h3>
    <p class="gal-sector">${esc(p.sector)}</p>
    <p class="gal-desc">${esc(p.desc)}</p>
    ${desde !== null ? `<p class="gal-precio"><b>Desde ${euros(desde)}</b><span>${ps.map(pl => esc(pl.nombre)).join(' · ')}</span></p>` : ''}
    <div class="gal-pal" aria-hidden="true">${[p.c.bg, p.c.surface, p.c.accent, p.c.text].map(c => `<i style="background:${c}"></i>`).join('')}</div>
    <div class="gal-btns">
      <button type="button" class="btn btn-primary" data-quiero="${p.id}"><span>Quiero este diseño</span></button>
      <button type="button" class="btn btn-ghost" data-ver="${p.id}"><span>Verlo en vivo</span></button>
      <a class="gal-ficha" href="diseno-${p.id}">Ficha del diseño ${icono('arrow')}</a>
    </div>
  </article>`;
}).join('')}</div>
<div class="gal-escena" aria-hidden="true"><div class="gal-win"><div class="dz-bar"><i></i><i></i><i></i><span id="galUrl">${esc(PLANTILLAS[0].dominio)}</span></div><div class="gal-view" id="galView"><div class="gal-capa"><iframe tabindex="-1" title=""></iframe></div><div class="gal-capa"><iframe tabindex="-1" title=""></iframe></div></div></div></div>`;
vigilarCarga($('#disenosGrid'));
const galGrande = matchMedia('(min-width:1000px)');
let galIdx = -1, galCapa = 0, galTurno = 0, galCerca = false;
function escalaGal() {
  const v = $('#galView'); if (v?.clientWidth) { v.style.setProperty('--s', v.clientWidth / 1280); v.style.setProperty('--d', `${-(2600 * v.clientWidth / 1280 - v.clientHeight)}px`); }
  $$('#disenosGrid .gal-mini-v').forEach(m => { if (m.clientWidth) m.style.setProperty('--s', m.clientWidth / 1280); });
}
new ResizeObserver(escalaGal).observe($('#disenosGrid'));
function activarGal(i, forzar = false) {
  if (i === galIdx && !forzar) return;
  galIdx = i;
  const p = PLANTILLAS[i];
  $$('#disenosGrid .gal-item').forEach((it, k) => it.classList.toggle('on', k === i));
  if (!galGrande.matches || !galCerca) return;
  const capas = $$('#galView .gal-capa'), sig = 1 - galCapa, turno = ++galTurno, f = capas[sig].firstElementChild;
  capas[sig].classList.remove('on', 'rec');
  f.onload = () => fotosListas(f).then(() => requestAnimationFrame(() => {
    if (turno !== galTurno) return;
    capas[sig].classList.add('on'); capas[galCapa].classList.remove('on', 'rec'); galCapa = sig;
    $('#galUrl').textContent = vtNombre ? dominioDe(vtNombre) : p.dominio;
    $('#galView').style.setProperty('--c', p.c.accent);
    setTimeout(() => turno === galTurno && capas[sig].classList.add('rec'), 900);
  }));
  f.src = urlPlantilla(p.id, vtNombre, '', true);
}
// El diseño activo es el que cruza el centro de la pantalla
const ioGal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activarGal(+e.target.dataset.gal); }), { rootMargin: '-45% 0px -45% 0px' });
$$('#disenosGrid .gal-item').forEach(it => ioGal.observe(it));
// La ventana grande solo empieza a cargar cuando la galería está cerca
new IntersectionObserver(([e]) => { if (e.isIntersecting && !galCerca) { galCerca = true; escalaGal(); activarGal(Math.max(0, galIdx), true); } }, { rootMargin: '400px 0px' }).observe($('#disenosGrid'));
galGrande.addEventListener('change', () => { escalaGal(); if (galGrande.matches) activarGal(Math.max(0, galIdx), true); });
// Con nombre de prueba, las ventanas lo enseñan
document.addEventListener('nombre-prueba', () => {
  $$('#disenosGrid .gal-mini .dz-bar span').forEach((sp, i) => { sp.textContent = vtNombre ? dominioDe(vtNombre) : PLANTILLAS[i].dominio; });
  $$('#disenosGrid .gal-mini-v iframe').forEach((f, i) => { const u = urlPlantilla(PLANTILLAS[i].id, vtNombre, '', true); f.getAttribute('src') ? (f.src = u) : (f.dataset.src = u); });
  if (galIdx >= 0) activarGal(galIdx, true);
});

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
    ? `<b>${media.toFixed(1).replace('.', ',')}</b><div>${estrellas(media)}<small>${lista.length} ${lista.length === 1 ? 'opinión verificada' : 'opiniones verificadas'}</small></div>`
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
// Solo se mide mientras la sección está cerca de la pantalla (antes, en cada scroll desde el principio)
let pasosCerca = false;
new IntersectionObserver(([e]) => { pasosCerca = e.isIntersecting; if (pasosCerca) requestAnimationFrame(avanzarPasos); }, { rootMargin: '200px 0px' }).observe(pasosEl);
addEventListener('scroll', () => { if (pasosCerca) requestAnimationFrame(avanzarPasos); }, { passive: true });

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
  contarEvento('vio-diseno');
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
  quieroDiseno(prevActual);
});

const planPara = id => PLANES.find(pl => pl.plantillas[0] === id) || PLANES.find(pl => pl.plantillas.includes(id)) || PLANES[2];
const quieroDiseno = id => plantillaPorId(id) && abrirCompra(planPara(id).id, id);
document.addEventListener('click', async e => {
  const sg = e.target.closest('[data-seguimiento]');
  if (sg) {
    ocupado(sg, true);
    try {
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}seguimiento?t=${await store.crearSeguimiento(sg.dataset.seguimiento)}`;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: 'Así va mi web', url }); } catch { /* cancelado */ } }
      else await copiar(url);
    } catch (err) { toast(err.message, 'err'); }
    ocupado(sg, false);
    return;
  }
  const q = e.target.closest('[data-quiero]');
  if (q) return quieroDiseno(q.dataset.quiero);
  const v = e.target.closest('[data-ver]');
  if (v) abrirPreview(v.dataset.ver, { nombre: vtNombre });
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
  { id: 'contacto', titulo: 'Contacto' },
  { id: 'dominio', titulo: 'Dominio y correo' },
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
/* «Tienes un pedido a medias»: aviso en la portada para continuar donde lo dejó */
function avisoBorrador() {
  $('.medias')?.remove();
  const b = leerBorrador();
  const plan = b && planesActivos().find(p => p.id === b.plan);
  if (!plan || Date.now() - b.t > 7 * 864e5 || !b.campos?.negocio || !CONFIG.aceptarPedidos) return;
  const div = document.createElement('div');
  div.className = 'medias';
  div.innerHTML = `<span class="medias-ic">${icono('pen')}</span><span class="medias-t"><b>Tienes un pedido a medias</b><small>${esc(plan.nombre)} · ${esc(b.campos.negocio)}</small></span>
    <button type="button" class="btn btn-sm btn-primary" data-comprar="${plan.id}"><span>Continuar</span></button>
    <button type="button" class="icon-btn sm" id="mediasX" aria-label="Descartar el pedido a medias">${icono('x')}</button>`;
  $('.hero-ctas')?.after(div);
  $('#mediasX').addEventListener('click', () => { borrarBorrador(); div.remove(); toast('Pedido a medias descartado'); });
}
avisoBorrador();
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
    if (prefsPermitidas()) try { localStorage.setItem(BORRADOR, JSON.stringify({ plan: W.plan.id, paso: W.paso, max: W.max, campos, colorCustom: W.colorCustom, plantilla: W.plantilla, t: Date.now() })); } catch {}
  }, 300);
}
function restaurarBorrador(b) {
  const v = k => ([].concat(b.campos[k] || []))[0];
  const marcado = id => [].concat(b.campos.extra || []).includes(id);
  $$('input[name], select[name], textarea[name]', form).forEach(el => {
    const v = b.campos[el.name];
    if (v === undefined) { if (el.type === 'radio' || el.type === 'checkbox') el.checked = false; return; }
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = v.includes(el.value);
    else el.value = v;
  });
  revisarCampos(form);
  W.colorCustom = b.colorCustom || '';
  W.plantilla = b.plantilla || W.plantilla;
  W.auto = { logo: v('logo') === 'No, necesito uno' && marcado('logo'), textos: v('contenido') === 'Necesito ayuda' && marcado('textos') };
  W.max = b.max || 0;
}

function abrirCompra(planId, plantillaInicial = '', { urgente = false, extras = [] } = {}) {
  const plan = PLANES.find(p => p.id === planId);
  if (!plan) return;
  contarEvento('pedido');
  // Agenda completa: en vez del cuestionario, lista de espera
  if (!CONFIG.aceptarPedidos) return irAContacto('espera', `Lista de espera: ${plan.nombre}`);
  W = { plan, paso: 0, max: 0, plantilla: plantillaInicial || plan.plantillas[0] || 'cero', colorCustom: '', clave: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) };
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
      <h3 class="paso-h">Tu negocio</h3>
      <p class="muted paso-sub">Lo básico para empezar. Todo se puede cambiar después.</p>
      <fieldset class="q-sec"><legend>Cómo se llama y a qué se dedica</legend>
        ${campo({ id: 'fNegocio', name: 'negocio', label: 'Nombre del negocio', required: true, attrs: 'autocomplete="organization" maxlength="80"' })}
        ${desplegable({ id: 'fSector', name: 'sector', label: 'Sector', opciones: SECTORES })}
      </fieldset>
      <fieldset class="q-sec"><legend>Qué quieres conseguir con la web</legend>
        ${opciones('objetivo', OBJETIVOS, objetivo)}
      </fieldset>
      <fieldset class="q-sec"><legend>¿Ya tienes web? <span class="muted">(opcional)</span></legend>
        ${campo({ id: 'fWeb', name: 'webActual', label: 'Dirección de tu web actual', attrs: 'inputmode="url" autocapitalize="off" spellcheck="false" maxlength="120"' })}
      </fieldset>
    </div>

    <div class="paso" data-paso="contacto">
      <h3 class="paso-h">Contacto</h3>
      <p class="muted paso-sub">Para avisarte de cada paso de tu pedido. No lo publicamos ni lo compartimos.</p>
      <fieldset class="q-sec"><legend>Quién lleva el pedido</legend>
        ${campo({ id: 'fNombre', name: 'contactoNombre', label: 'Nombre y apellidos', required: true, value: store.usuarioActual()?.name || '', attrs: 'autocomplete="name" maxlength="80"' })}
      </fieldset>
      <fieldset class="q-sec"><legend>Cómo te localizamos</legend>
        ${campo({ id: 'fTel', name: 'telefono', label: 'Teléfono', type: 'tel', required: true, hint: 'Un solo número. Si no es español, empieza por + y su prefijo', attrs: 'autocomplete="tel"' })}
        ${campo({ id: 'fEmail', name: 'email', label: 'Correo electrónico', type: 'email', required: true, value: store.usuarioActual()?.email || '', hint: 'Aquí te llegarán los avisos y los recibos', attrs: 'autocomplete="email"' })}
      </fieldset>
    </div>

    <div class="paso" data-paso="dominio">
      <h3 class="paso-h">Dominio y correo</h3>
      <p class="muted paso-sub">La dirección de tu web y el correo de tu negocio. Si aún no lo tienes claro, pon una idea: lo confirmamos contigo antes de registrar nada.</p>
      ${dominioHTML({ ext: '.es' })}
    </div>

    <div class="paso" data-paso="estilo">
      <h3 class="paso-h">Estilo y contenido</h3>
      <div class="wz-vivo" aria-label="Vista previa de tu web">
        <div class="wz-vivo-pc"><div class="wz-vivo-bar"><i></i><i></i><i></i><span id="wzVivoUrl"></span></div>
          <div class="thumb wz-vivo-pant">${'<iframe tabindex="-1" aria-hidden="true" title=""></iframe>'.repeat(2)}</div></div>
        <p class="wz-vivo-nota">${icono('eye')}<span>Así quedaría con tu nombre y tu color. El diseño lo eliges en el paso 7.</span></p>
      </div>
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
      <div class="checks">${extrasActivos().map(x => `
        <label class="check-card"><input type="checkbox" name="extra" value="${x.id}"><span class="ck-mark"></span>
          <span class="ct"><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></span>
          <span class="pr">+${euros(x.precio)}${x.mensual ? '<small>/mes</small>' : ''}</span></label>`).join('')}
      </div>
      <div style="margin-top:12px">${interruptor({ id: 'fUrg', name: 'urgente', titulo: 'Entrega urgente', texto: `Reduce el plazo de entrega en torno a un 40 % · +${Math.round(CONFIG.urgente * 100)} % sobre el precio base` })}</div>
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
  for (const id of extras) { const x = form.querySelector(`input[name=extra][value="${CSS.escape(id)}"]`); if (x) x.checked = true; }
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
  const recargo = urgente ? base * CONFIG.urgente : 0;
  const unico = extras.filter(x => !x.mensual).reduce((s, x) => s + x.precio, 0);
  const mensual = extras.filter(x => x.mensual).reduce((s, x) => s + x.precio, 0);
  const bruto = base + recargo + unico;
  const descuento = W.cupon ? Math.round(bruto * W.cupon.pct) / 100 : 0;
  const txt = k => (fd.get(k) || '').toString().trim();
  return {
    respuestas: {
      negocio: txt('negocio'), sector: txt('sector'), objetivo: txt('objetivo'), telefono: txt('telefono'),
      contactoNombre: txt('contactoNombre'), email: txt('email').toLowerCase(),
      ...(dom => ({ dominioTipo: dom.tipo || '', dominio: dom.dominio || '', correoTipo: dom.correoTipo || '', correo: dom.correo || '' }))(leerDominio(form)),
      webActual: txt('webActual'), estilo: txt('estilo'), color: W.colorCustom || txt('color'),
      logo: txt('logo'), contenido: txt('contenido'), plazo: urgente ? 'Urgente' : 'Normal', comentarios: txt('comentarios')
    },
    extras: extras.map(({ id, nombre, precio, mensual }) => ({ id, nombre, precio, mensual: !!mensual })),
    urgente, recargo, total: Math.round((bruto - descuento) * 100) / 100, mensual, descuento, bruto
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
  // «Necesito un logo» y «Necesito ayuda con los textos» añaden su extra; si se cambia de opción, se quita
  // (solo si lo añadió esta respuesta: si el cliente lo marcó él mismo en Extras, se respeta)
  const enlazarExtra = (campo, valor, id) => {
    if (e.target.name !== campo) return;
    const x = form.querySelector(`input[name=extra][value=${id}]`);
    if (!x) return;
    const nombre = EXTRAS.find(z => z.id === id);
    if (e.target.value === valor) {
      if (!x.checked) { x.checked = true; W.auto[id] = true; if (nombre) toast(`Añadido «${nombre.nombre}» (+${euros(nombre.precio)})`, 'ok'); }
    } else if (W.auto[id] && x.checked) {
      x.checked = false; W.auto[id] = false;
      if (nombre) toast(`Quitado «${nombre.nombre}»`, 'ok');
    }
  };
  W.auto ??= {};
  if (e.target.name === 'extra') W.auto[e.target.value] = false;
  enlazarExtra('logo', 'No, necesito uno', 'logo');
  enlazarExtra('contenido', 'Necesito ayuda', 'textos');
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
/* Vista previa en vivo (paso «Estilo»): el diseño con el nombre y el color del cliente. La versión nueva se carga
   detrás y aparece con un fundido cuando ya está lista, así nunca se ve en blanco ni da un salto */
let vivoUrl = '', vivoT = 0, vivoCapa = 0;
function pintarVivo() {
  if (!W || !$('.wz-vivo', form)) return;
  ro.observe($('.wz-vivo-pant', form));
  const id = W.plantilla && W.plantilla !== 'cero' ? W.plantilla : W.plan.plantillas?.[0] || PLANTILLAS[0].id;
  const nombre = $('#fNegocio', form)?.value.trim() || '';
  const color = W.colorCustom || $('input[name=color]:checked', form)?.value || '';
  const url = urlPlantilla(id, nombre, color, true);
  $('#wzVivoUrl').textContent = (sugerirNombre(nombre) || plantillaPorId(id)?.dominio.split('.')[0] || 'tunegocio') + '.es';
  if (url === vivoUrl) return;
  vivoUrl = url;
  clearTimeout(vivoT);
  vivoT = setTimeout(() => {
    const capas = $$('.wz-vivo-pant iframe', form), sig = capas[1 - vivoCapa];
    sig.onload = () => { if (sig.src.endsWith(vivoUrl)) { sig.classList.add('on'); capas[vivoCapa].classList.remove('on'); vivoCapa = 1 - vivoCapa; } };
    sig.src = vivoUrl;
  }, 220);
}
form.addEventListener('change', e => { if (e.target.name === 'color' || e.target.name === 'plantilla') pintarVivo(); });
form.addEventListener('input', e => { if (e.target.id === 'colorPick') pintarVivo(); });
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
  contarEvento(`paso-${paso.id}`);
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
  next.innerHTML = `<span>${i === 0 ? 'Empezar' : paso.id === 'resumen' ? 'Pedido con obligación de pago' : 'Continuar'}</span>`;
  next.classList.toggle('obligacion', paso.id === 'resumen');
  if (paso.id === 'dominio') {
    const inp = $('.dom-in', form);
    if (!inp.value) inp.value = sugerirNombre($('#fNegocio', form).value);
    montarDominio(form);
    inp.dispatchEvent(new Event('input'));
  }
  if (paso.id === 'estilo') pintarVivo();
  if (paso.id === 'diseno') pintarSelectorDiseno();
  if (paso.id === 'resumen') pintarResumen();
  actualizarTotal();
  form.scrollTop = 0;
}

function validar(pasoId) {
  const marcar = (el, msg) => { el.closest('.fc')?.classList.add('error'); el.focus(); toast(msg, 'err'); return false; };
  if (pasoId === 'negocio') {
    const n = $('#fNegocio', form);
    if (n.value.trim().length < 2) return marcar(n, 'Escribe el nombre de tu negocio');
  }
  if (pasoId === 'contacto') {
    const n = $('#fNombre', form);
    if (n.value.trim().length < 3) return marcar(n, 'Escribe tu nombre y apellidos');
    for (const el of [$('#fTel', form), $('#fEmail', form)]) {
      if (!el.value.trim()) return marcar(el, el.type === 'tel' ? 'Escribe tu teléfono' : 'Escribe tu correo');
      if (!comprobarCampo(el)) return marcar(el, el.validationMessage || 'Revisa este dato');
    }
  }
  if (pasoId === 'dominio') {
    const r = leerDominio(form);
    if (!r.ok) { marcarError(form, r); toast(r.motivo, 'err'); return false; }
  }
  return true;
}

$('#wizBack').addEventListener('click', () => W && W.paso > 0 && irA(W.paso - 1));
$('#wizNext').addEventListener('click', () => {
  if (!W) return;
  const paso = PASOS[W.paso];
  if (!validar(paso.id)) return;
  if (paso.id === 'resumen') return confirmarPedido();
  // Dominio nuevo: se añade su extra (una vez; si luego lo quita en «Extras», se respeta)
  // Dominio nuevo y correo con dominio: se añaden sus extras avisando (y se quitan si cambia de opinión)
  if (paso.id === 'dominio') {
    const r = leerDominio(form);
    W.auto ??= {};
    const ajustar = (id, quiere, porque) => {
      const x = form.querySelector(`input[name=extra][value=${id}]`), e = EXTRAS.find(z => z.id === id);
      if (!x || !e) return;
      if (quiere && !x.checked && !W.auto[id + 'Visto']) { x.checked = true; W.auto[id] = true; W.auto[id + 'Visto'] = true; toast(`Añadido «${e.nombre}» (+${euros(e.precio)})`, 'ok'); }
      if (!quiere && W.auto[id] && x.checked) { x.checked = false; W.auto[id] = false; W.auto[id + 'Visto'] = false; toast(`Quitado «${e.nombre}»: ${porque}`, 'ok'); }
    };
    ajustar('dominio', r.tipo === 'nuevo', 'ya tienes dominio');
    ajustar('correo', r.correoTipo === 'dominio', 'usarás Gmail');
    actualizarTotal();
  }
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
      ${fila('Logo', r.logo)}${fila('Contenido', r.contenido)}
    </div>
    <div class="rs-card">
      <h4 class="rs-h">Contacto</h4>
      ${fila('Nombre', r.contactoNombre)}${fila('Teléfono', r.telefono)}${fila('Correo', r.email)}
      <h4 class="rs-h">Dominio y correo</h4>
      ${fila(r.dominioTipo === 'propio' ? 'Tu dominio' : 'Dominio nuevo', r.dominio ? 'www.' + r.dominio : '')}${fila(r.correoTipo === 'gmail' ? 'Correo (Gmail, gratis, lo creamos nosotros)' : 'Correo con tu dominio', r.correo)}
    </div>
    <div class="rs-card">
      <div class="rs-row"><span>${esc(p.nombre)}</span><b>${euros(p.precio)}</b></div>
      ${d.extras.map(x => `<div class="rs-row"><span>${esc(x.nombre)}</span><b>+${euros(x.precio)}${x.mensual ? '/mes' : ''}</b></div>`).join('')}
      ${d.urgente ? `<div class="rs-row"><span>Entrega urgente</span><b>+${euros(d.recargo)}</b></div>` : ''}
      ${d.descuento ? `<div class="rs-row dto"><span>Descuento ${esc(W.cupon.codigo)} (${W.cupon.pct} %)</span><b>−${euros(d.descuento)}</b></div>` : ''}
      <div class="rs-row total"><span>Total <small>${ivaTexto()}</small></span><b>${euros(d.total)}</b></div>
      ${CONFIG.iva ? (iv => `<div class="rs-row rs-iva"><span>Base imponible ${euros(iv.base)} + IVA ${iv.pct} %</span><b>${euros(iv.cuota)}</b></div>`)(desgloseIVA(d.total)) : ''}
      <div class="cupon">
        ${W.cupon
          ? `<p class="cupon-ok">${icono('tag')} Cupón <b>${esc(W.cupon.codigo)}</b> aplicado <button type="button" class="link-btn" id="cuponQuitar">Quitar</button></p>`
          : `${leerAmigo() && !W.sinAmigo ? `<button type="button" class="cupon-bv" id="cuponAmigo">${icono('gift')}<span><b>Te recomienda un amigo <span class="nw">−${CONFIG.referidos.pct}&nbsp;%</span></b><small>Aplica el código ${esc(leerAmigo())}</small></span><i>Aplicar</i></button>` : bienvenidaOK() ? `<button type="button" class="cupon-bv" id="cuponBv">${icono('gift')}<span><b>¿Es tu primera web? <span class="nw">−${CONFIG.bienvenida.pct}&nbsp;%</span></b><small>Aplica el código ${esc(CONFIG.bienvenida.codigo)}</small></span><i>Aplicar</i></button>` : ''}<details><summary>${icono('tag')} ¿Tienes un código de descuento?</summary><div class="cupon-fila"><input id="cuponIn" maxlength="30" placeholder="CÓDIGO" autocomplete="off" aria-label="Código de descuento"><button type="button" class="btn btn-sm btn-ghost" id="cuponOk">Aplicar</button></div></details>`}
      </div>
      <div class="rs-row"><span>Entrega prevista</span><b>${esc(W.plan.entrega)}${d.urgente ? ' (urgente: antes)' : ''}</b></div>
      ${d.mensual ? `<div class="rs-row"><span>Cuota mensual</span><b>${euros(d.mensual)}/mes</b></div>` : ''}
      <div class="rs-note">Para empezar pagas la señal de <b>${euros(d.total * CONFIG.senal / 100)}</b> (${CONFIG.senal} %) por ${CONFIG.pagos?.bizum ? 'Bizum o transferencia' : 'transferencia'} y el resto cuando la web esté lista y te guste.</div>
    </div>
    <div class="rs-legal">
      <p><b>Antes de confirmar</b></p>
      <ul>
        <li>Contratas con ${esc(CONFIG.legal?.titular && !/^tu nombre/i.test(CONFIG.legal.titular) ? `${CONFIG.legal.titular} (NIF ${CONFIG.legal.nif})` : CONFIG.marca)}, ${esc(CONFIG.legal?.actividad || 'diseño web').toLowerCase()}. Datos completos en el <a href="terminos-y-privacidad#aviso-legal" target="_blank" rel="noopener">aviso legal</a>.</li>
        <li>${CONFIG.iva ? `Precio final con el ${CONFIG.iva} % de IVA incluido` : 'Precio final, sin IVA'}. Pago por ${CONFIG.pagos?.bizum ? 'Bizum o transferencia bancaria' : 'transferencia bancaria'}.</li>
        <li>Tienes <b>14 días naturales para desistir</b> sin dar explicaciones, desde «Mis proyectos». <a href="terminos-y-privacidad#desistimiento" target="_blank" rel="noopener">Cómo funciona</a>.</li>
      </ul>
      <label class="rs-inicio"><input type="checkbox" id="wizInicio" ${W.inicioAnticipado ? 'checked' : ''}>
        <span>Quiero que empecéis mi web <b>antes de que terminen los 14 días</b>. Sé que, si desisto, pagaré la parte del trabajo ya hecha y que, cuando la web esté terminada y entregada, ya no podré desistir. <small>Si no lo marcas, empezamos el día 15.</small></span></label>
    </div>
    <div class="rs-terms">${aceptarTerminos('wizTerms', 'He leído y acepto las <a href="terminos-y-privacidad#condiciones" target="_blank" rel="noopener">condiciones de contratación</a> y la <a href="terminos-y-privacidad#privacidad" target="_blank" rel="noopener">política de privacidad</a>')}</div>
    ${store.usuarioActual() ? '' : '<p class="muted rs-login">Al confirmar te pediremos iniciar sesión para que puedas seguir tu pedido.</p>'}
    ${infoDatos('preparar, hacer y facturar tu web, y atenderte durante el proyecto')}`;
  vigilarMiniaturas($('#resumen'));
  $('#cuponOk')?.addEventListener('click', async e => {
    const codigo = $('#cuponIn').value.trim();
    if (!codigo) return;
    ocupado(e.currentTarget, true);
    try {
      const c = await store.comprobarCupon(codigo);
      if (!c) { toast('Ese código no existe o ha caducado', 'err'); ocupado(e.currentTarget, false); return; }
      W.cupon = { codigo: c.codigo.toUpperCase(), pct: Math.min(100, Math.max(0, +c.pct || 0)), primera: !!c.primera };
      toast(`Descuento del ${W.cupon.pct} % aplicado`, 'ok');
      pintarResumen(); actualizarTotal();
    } catch (err) { toast(err.message, 'err'); ocupado(e.currentTarget, false); }
  });
  $('#cuponBv')?.addEventListener('click', async e => {
    ocupado(e.currentTarget, true);
    try {
      const c = await store.comprobarCupon(CONFIG.bienvenida.codigo);
      if (!c) { toast('El descuento de bienvenida es solo para tu primera web', 'err'); W.sinBienvenida = true; pintarResumen(); return; }
      W.cupon = { codigo: c.codigo.toUpperCase(), pct: Math.min(100, Math.max(0, +c.pct || 0)), primera: true };
      toast(`¡Bienvenida! −${W.cupon.pct} % aplicado`, 'ok');
      pintarResumen(); actualizarTotal();
    } catch (err) { toast(err.message, 'err'); ocupado(e.currentTarget, false); }
  });
  $('#cuponAmigo')?.addEventListener('click', async e => {
    ocupado(e.currentTarget, true);
    try {
      const c = await store.comprobarCupon(leerAmigo());
      if (!c) { toast('El código de tu amigo solo vale en tu primera web (y no puede ser el tuyo)', 'err'); W.sinAmigo = true; pintarResumen(); return; }
      W.cupon = { codigo: c.codigo.toUpperCase(), pct: Math.min(100, Math.max(0, +c.pct || 0)), primera: true };
      toast(`Descuento de tu amigo: −${W.cupon.pct} % aplicado`, 'ok');
      pintarResumen(); actualizarTotal();
    } catch (err) { toast(err.message, 'err'); ocupado(e.currentTarget, false); }
  });
  $('#wizInicio')?.addEventListener('change', e => { W.inicioAnticipado = e.target.checked; });
  $('#cuponIn')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#cuponOk').click(); } });
  $('#cuponQuitar')?.addEventListener('click', () => { W.cupon = null; pintarResumen(); actualizarTotal(); });
}

async function confirmarPedido() {
  if (!terminosAceptados('wizTerms')) return;
  const btn = $('#wizNext');
  const u = await conSesion('Inicia sesión para confirmar tu pedido y seguir su estado.');
  if (!u || !W) return;
  // El descuento de bienvenida solo vale si es su primera web
  if (W.cupon?.primera) {
    let repetido = false;
    try { repetido = await store.tienePedidos(); } catch { /* si falla, lo revisa el propietario */ }
    if (repetido) {
      W.cupon = null; W.sinBienvenida = true;
      pintarResumen(); actualizarTotal();
      return toast('El descuento de bienvenida es solo para la primera web. Hemos actualizado el total.', 'err');
    }
  }
  try { await import('../base/verificacion.js').then(v => v.siEsInusual('pedido')); }
  catch (er) { return toast(er.message, 'err'); }
  const d = datos();
  // Firma del pedido (queda en el detalle y en el resumen imprimible)
  const { pedirFirma } = await import('../cuenta/firma.js');
  const img = await pedirFirma({ titulo: 'Firma tu pedido', nombre: u.name, texto: `Acepto el pedido «${W.plan.nombre}» por ${euros(d.total)}${d.mensual ? ` y ${euros(d.mensual)}/mes` : ''}, con obligación de pago, y las condiciones de contratación.` });
  if (!img) return;
  ocupado(btn, true);
  try {
    const pedido = await store.crearPedido({
      plan: W.plan.id, planNombre: W.plan.nombre, precioBase: W.plan.precio,
      extras: d.extras, urgente: d.urgente, total: d.total, mensual: d.mensual,
      plantilla: W.plantilla, respuestas: d.respuestas, aceptaTerminos: Date.now(), condiciones: CONFIG.condiciones, clave: W.clave,
      // Consentimiento expreso para empezar dentro del plazo de desistimiento (art. 98.8 y 108.3 TRLGDCU)
      inicioAnticipado: !!$('#wizInicio')?.checked,
      iva: CONFIG.iva || 0,
      ...(W.cupon ? { cupon: W.cupon.codigo, descuento: d.descuento, precioSinDescuento: d.bruto } : {}),
      ref: leerRef() && leerRef() !== u.uid ? leerRef() : '',
      firma: { img, nombre: u.name, t: Date.now() }
    });
    contarEvento('pedido-hecho');
    exito(pedido);
  } catch (e) {
    console.error(e);
    toast(e.message || 'No se pudo enviar el pedido', 'err');
    ocupado(btn, false);
  }
}

function exito(p) {
  const r = p.respuestas;
  borrarBorrador();
  $('.medias')?.remove();
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
      <p class="muted">Referencia <b>${refPedido(p.id)}</b>. Te escribiremos a <b>${esc(p.clienteEmail)}</b> en menos de 24 horas laborables para confirmar los detalles. Si abonas ahora la señal, empezamos en cuanto lo confirmemos. Fecha prevista de entrega: <b>${fecha(fechaEntrega(p))}</b>.</p>
      <div class="exito-pay">${botonPago(p)}</div>
      <button type="button" class="btn btn-ghost w100" id="verPedidos">${icono('bag')} Ir a mi proyecto</button>
      <p class="muted exito-nota">En «Mis proyectos» puedes elegir el dominio, subir tus fotos y hablar con el equipo.</p>
    </div>`;
  requestAnimationFrame(() => confeti(form.querySelector('.ok-ic')));
  setTimeout(() => fiesta('¡Pedido recibido!', 'Ya estamos con tu web'), 450);
  $('#verPedidos').addEventListener('click', () => { cerrar(dlg); abrirPedidos(p.id); });
  $('[data-pagar]', form)?.addEventListener('click', e =>
    animarYPagar(e.currentTarget, () => abrirPago(p, 'senal', () => {
      const pay = $('.exito-pay', form); if (pay) pay.innerHTML = botonPago(p);
    })));
  W = null;
}

dlg.addEventListener('close', () => { W = null; });
dlg.addEventListener('cancel', () => { if (W && W.paso > 0) toast('Hemos guardado lo que has rellenado'); });

/* ==========================================================
   MIS PROYECTOS
   Cada proyecto tiene pestañas: Estado · Mensajes · Archivos · Pagos · Historial
   ========================================================== */
const pedDlg = $('#pedidosDlg');
let misPedidos = [];
let abierto = '';          // proyecto desplegado
let pestana = 'estado';    // pestaña del proyecto desplegado
let desmontar = () => {};

async function abrirPedidos(id = '', pest = '') {
  const u = await conSesion('Inicia sesión para ver tus proyectos.');
  if (!u) return;
  if (id) { abierto = id; pestana = pest || 'estado'; }
  $('#pedidosList').innerHTML = cargandoHTML('Cargando tus proyectos…');
  abrir(pedDlg);
  await pintarPedidos();
}
pedDlg.addEventListener('close', () => { desmontar(); desmontar = () => {}; });

const PESTANAS = [['estado', 'Estado', 'chart'], ['mensajes', 'Mensajes', 'message'], ['archivos', 'Archivos', 'folder'], ['pagos', 'Pagos', 'receipt'], ['historial', 'Historial', 'history']];

function resumenProyectos() {
  const activos = misPedidos.filter(p => !['entregado', 'cancelado'].includes(p.estado));
  const tuTurno = activos.filter(p => ETAPAS.find(e => e.id === (p.etapa || 'recibido'))?.accion || (p.pagoEstado || 'pendiente') === 'pendiente');
  const pendiente = misPedidos.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + (p.pagoEstado === 'pagado' ? 0 : p.pagoEstado === 'senal' ? importeResto(p) : p.total || 0), 0);
  return `<div class="mp-resumen">
    <div><small>Proyectos activos</small><b>${activos.length}</b></div>
    <div class="${tuTurno.length ? 'turno' : ''}"><small>Te toca a ti</small><b>${tuTurno.length}</b></div>
    <div><small>Pendiente de pago</small><b>${euros(pendiente)}</b></div>
    <div class="mp-res-btns"><button class="btn btn-sm btn-ghost" data-soporte>${icono('help')}<span>Ayuda</span></button><a class="btn btn-sm btn-primary" href="#webs" data-close>${icono('plus')}<span>Nueva web</span></a></div>
  </div>`;
}

/* «Lo que te toca»: cada tarea del cliente, con un botón que abre su proyecto en la pestaña donde se hace */
const PEST_TAREA = { dominio: 'estado', contenido: 'archivos', revision: 'estado', pago: 'pagos' };
function tareasCliente() {
  const tareas = [];
  misPedidos.filter(p => !['entregado', 'cancelado'].includes(p.estado)).forEach(p => {
    const nombre = p.respuestas?.negocio || p.planNombre;
    if ((p.pagoEstado || 'pendiente') === 'pendiente') tareas.push({ p, ic: 'euro', t: 'Paga la señal para empezar', pest: 'pagos', nombre });
    const e = ETAPAS.find(x => x.id === (p.etapa || 'recibido'));
    if (e?.accion && !(e.id === 'pago' && (p.pagoEstado || 'pendiente') === 'pendiente')) tareas.push({ p, ic: e.icono, t: e.cliente, pest: PEST_TAREA[e.id] || 'estado', nombre });
  });
  if (!tareas.length) return misPedidos.some(p => !['entregado', 'cancelado'].includes(p.estado))
    ? `<div class="mp-hoy al-dia">${icono('check')}<div><b>Todo al día</b><span>Ahora nos toca a nosotros. Te avisamos cuando necesitemos algo.</span></div></div>` : '';
  return `<section class="mp-hoy" aria-label="Lo que te toca">
    <h3>Lo que te toca</h3>
    <ul>${tareas.map(x => `<li><button type="button" data-ir-proy="${x.p.id}" data-ir-pest="${x.pest}">${icono(x.ic)}<span><b>${esc(x.t)}</b><small>${esc(x.nombre)}</small></span>${icono('arrow')}</button></li>`).join('')}</ul>
  </section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ir-proy]');
  if (!b) return;
  abierto = b.dataset.irProy; pestana = b.dataset.irPest || 'estado';
  pintarPedidos().then(() => $(`[data-proy="${abierto}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});

/* Acceso al correo que hemos creado (lo rellena el equipo en el panel) */
function accesoCorreo(p) {
  const c = p.accesos?.correo;
  if (!c?.usuario) return '';
  return `<div class="mp-dato mp-dato-ancho mp-acceso">${icono('key')}<span>Acceso a tu correo</span>
    <b>${esc(c.usuario)} <button type="button" class="link-btn" data-copy="${esc(c.usuario)}" aria-label="Copiar usuario">${icono('copy')}</button></b>
    ${c.clave ? `<small>Contraseña: <code class="mp-clave" data-clave="${esc(c.clave)}">••••••••</code> <button type="button" class="link-btn" data-ver-clave>Ver</button> · <button type="button" class="link-btn" data-copy="${esc(c.clave)}">Copiar</button></small>
    <small class="mp-acceso-nota">Cámbiala la primera vez que entres${/@gmail\.com$/i.test(c.usuario) ? ' (en myaccount.google.com → Seguridad)' : ''}.</small>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ver-clave]');
  if (!b) return;
  const code = b.parentElement.querySelector('.mp-clave'), ver = code.textContent.startsWith('•');
  code.textContent = ver ? code.dataset.clave : '••••••••';
  b.textContent = ver ? 'Ocultar' : 'Ver';
});

/* Recomienda a un amigo: el código del cliente, para copiarlo o compartir el enlace */
function tarjetaAmigo() {
  const r = CONFIG.referidos, u = store.usuarioActual();
  if (!r?.activo || !u || !misPedidos.some(p => p.estado !== 'cancelado')) return '';
  const cod = store.codigoAmigo(u.uid), enlace = `${location.origin}${location.pathname}?amigo=${cod}`;
  return `<section class="amigo" aria-label="Recomienda a un amigo">${icono('gift')}<div>
    <b>Recomienda ${esc(CONFIG.marca)} a un amigo</b>
    <p>Tu amigo tiene un ${r.pct} % de descuento en su primera web con tu código y tú, ${esc(r.premio)}, cuando la pague.</p>
    <div class="amigo-cod"><code>${cod}</code><button type="button" class="btn btn-sm btn-ghost" data-copy="${esc(enlace)}">${icono('link')}<span>Copiar enlace</span></button>${navigator.share ? `<button type="button" class="btn btn-sm btn-primary" data-compartir-amigo="${esc(enlace)}">${icono('share')}<span>Compartir</span></button>` : ''}</div>
  </div></section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-compartir-amigo]');
  if (b) navigator.share({ title: CONFIG.marca, text: `Te recomiendo ${CONFIG.marca} para tu web: con este enlace tienes un ${CONFIG.referidos.pct} % de descuento en la primera.`, url: b.dataset.compartirAmigo }).catch(() => {});
});

function tarjetaProyecto(p) {
  const est = ESTADOS[p.estado] || ESTADOS.nuevo;
  const pl = plantillaPorId(p.plantilla);
  const cancelado = p.estado === 'cancelado';
  const abiertoAqui = abierto === p.id;
  const plazo = plazoTexto(p);
  return `
  <article class="mp mp-proyecto ${abiertoAqui ? 'abierto' : ''}" data-proy="${p.id}">
    <button type="button" class="mp-top mp-toggle" data-toggle="${p.id}" aria-expanded="${abiertoAqui}">
      <div><b>${esc(p.respuestas?.negocio || p.planNombre)}</b>${metaHTML([p.planNombre, pl ? 'Diseño ' + pl.nombre : 'Diseño a medida', 'Ref. ' + refPedido(p.id), fecha(p.createdAt)])}</div>
      <div class="mp-top-r"><b class="mp-precio"><span>${euros(p.total)}</span>${p.mensual ? `<small>+ ${euros(p.mensual)}/mes</small>` : ''}</b>
        <span class="mp-pills"><span class="pill ${est.cls}">${est.txt}</span>${plazo ? `<span class="pill plazo ${plazoClase(p)}">${icono('clock')} ${plazo}</span>` : ''}</span></div>
      <span class="mp-chev">${icono('down')}</span>
    </button>
    ${cancelado ? '<p class="muted">Este pedido está cancelado.</p>' : `
    ${barraEtapas(p)}
    ${abiertoAqui ? `
    <div class="mp-seg"><button type="button" class="link-btn" data-seguimiento="${p.id}">${icono('link')}<span>Compartir el seguimiento</span></button><small>Un enlace para enseñar cómo va tu web, sin iniciar sesión</small></div>
    <nav class="mp-tabs" role="tablist">${PESTANAS.map(([k, t, ic]) => `<button type="button" role="tab" data-pest="${k}" class="${pestana === k ? 'on' : ''}">${icono(ic)}<span>${t}</span></button>`).join('')}</nav>
    <div class="mp-pest" id="pest-${p.id}">${pestanaHTML(p)}</div>` : `
    <button type="button" class="mp-abrir" data-toggle="${p.id}">${ETAPAS.find(e => e.id === (p.etapa || 'recibido'))?.accion ? `${icono('alert')} <b>Te toca a ti:</b> ${esc(ETAPAS.find(e => e.id === p.etapa)?.cliente || '')}` : `${icono('eye')} Ver detalles, mensajes y archivos`}</button>`}`}
  </article>`;
}

function pestanaHTML(p) {
  if (pestana === 'mensajes' || pestana === 'archivos') return '<div class="mp-montaje"></div>';
  if (pestana === 'historial') return lineaTiempoHTML(p);
  if (pestana === 'pagos') {
    const s = importeSenal(p), r = importeResto(p), e = p.pagoEstado || 'pendiente';
    const fila = (txt, imp, pagado, fase) => `<div class="pg-fila ${pagado ? 'ok' : ''}"><span class="pg-ic">${icono(pagado ? 'check' : 'clock')}</span><div><b>${txt}</b><small>${pagado ? 'Pagado' : e === 'verificando' && p.pagoFase === fase ? 'Comprobando tu pago' : 'Pendiente'}</small></div><b>${euros(imp)}</b>${pagado ? `<button type="button" class="btn btn-sm btn-ghost" data-recibo="${p.id}" data-fase="${fase}">${icono('receipt')}<span>Recibo</span></button>` : ''}</div>`;
    return `<div class="pg">
      ${fila(`Señal (${CONFIG.senal} %)`, s, ['senal', 'pagado'].includes(e), 'senal')}
      ${fila('Pago final', r, e === 'pagado', 'resto')}
      ${p.mensual && !conMantenimiento(p) ? `<div class="pg-fila"><span class="pg-ic">${icono('calendar')}</span><div><b>Cuotas mensuales</b><small>${esc((p.extras || []).filter(x => x.mensual).map(x => x.nombre).join(' · ') || 'Mantenimiento')} · se cobran cada mes desde la publicación</small></div><b>${euros(p.mensual)}/mes</b></div>` : ''}
      ${mantClienteHTML(p, { bajaPedida: bajaPedida(p) })}
      ${extrasClienteHTML(p, CONFIG.marca)}
      ${p.descuento ? `<p class="ac-nota">${icono('tag')} Cupón ${esc(p.cupon || '')}: −${euros(p.descuento)} ya descontados del total.</p>` : ''}
      <div class="pg-pie"><div class="mp-pay">${botonPago(p)}</div>
        <button type="button" class="btn btn-sm btn-ghost" data-recibo="${p.id}" data-fase="">${icono('printer')}<span>Resumen del pedido</span></button></div>
      <p class="ac-nota">${icono('file')} ¿Necesitas factura a nombre de tu empresa? Añade tus datos fiscales en <a class="link-btn" href="ajustes#facturacion">Ajustes → Facturación</a>.</p>
    </div>`;
  }
  const extrasPend = (p.cambiosExtra || []).some(x => x.estado === 'propuesto');
  return `<div class="mp-cuerpo">
    <div class="mp-accion">${extrasPend ? extrasClienteHTML(p, CONFIG.marca) : ''}${accionCliente(p, botonPago(p))}
      ${p.publica?.slug ? `<section class="mp-est"><h4>${icono('chart')} Visitas de tu web</h4><div class="mp-est-c" data-est="${p.id}"><p class="muted">Cargando…</p></div></section>` : ''}</div>
    <aside class="mp-lado">
      <div class="mp-dato">${icono('calendar')}<span>Entrega prevista</span><b>${fecha(fechaEntrega(p))}</b></div>
      ${p.dominio ? `<div class="mp-dato mp-dato-ancho">${icono('link')}<span>${p.dominio.correo ? 'Dominio y correo' : 'Dominio'}</span><b>www.${esc(p.dominio.nombre)}${p.dominio.tipo === 'propio' ? ' <em>(ya es tuyo)</em>' : ''}</b>${p.dominio.correo ? `<small>${esc(p.dominio.correo)}${p.dominio.correoTipo === 'gmail' ? ' · Gmail' : ''}</small>` : ''}</div>` : ''}
      ${accesoCorreo(p)}
      ${p.asignadoNombre ? `<div class="mp-dato">${icono('laptop')}<span>Responsable</span><b>${esc(p.asignadoNombre)}</b></div>` : ''}
      <div class="mp-dato">${icono('euro')}<span>Pago</span><b>${esc((PAGOS[p.pagoEstado || 'pendiente'] || PAGOS.pendiente).txt)}</b></div>
      <div class="mp-dato">${icono('chart')}<span>Avance</span><b>${Math.round(indiceEtapa(p) / (ETAPAS.length - 1) * 100)} %</b></div>
    </aside>
  </div>
  ${desistimientoHTML(p)}`;
}

function montarPestana() {
  desmontar(); desmontar = () => {};
  $$('[data-form="dominio"]', $('#pedidosList')).forEach(f => montarDominio(f));
  const p = misPedidos.find(x => x.id === abierto);
  const caja = p && $(`#pest-${p.id} .mp-montaje`);
  const est = p && $(`[data-est="${p.id}"]`);
  if (est) store.estadisticasWeb(p.id, 30).then(f => { est.innerHTML = estadisticasHTML(resumirVisitas(f, 30), 30); }).catch(err => { est.innerHTML = `<p class="muted">${esc(err.message)}</p>`; });
  if (!caja) return;
  if (pestana === 'mensajes') desmontar = montarHilo(caja, p) || (() => {});
  if (pestana === 'archivos') montarArchivos(caja, p);
}

let misTicketsCli = [];
const bajaPedida = p => misTicketsCli.some(t => t.tipo === 'baja' && t.pedido === p.id && t.estado !== 'cerrado');

async function pintarPedidos() {
  const list = $('#pedidosList');
  try {
    [misPedidos, misTicketsCli] = await Promise.all([store.misPedidos(), store.misTickets().catch(() => [])]);
    if (!misPedidos.length) {
      list.innerHTML = `<div class="empty"><div class="em">${icono('bag')}</div><b>Todavía no tienes proyectos</b><p>Elige el tipo de web que necesitas para empezar.</p><a href="#webs" class="btn btn-primary" data-close style="margin-top:18px">Ver tipos de web</a></div>`;
      return;
    }
    if (!abierto || !misPedidos.some(p => p.id === abierto)) abierto = misPedidos.length === 1 ? misPedidos[0].id : '';
    list.innerHTML = resumenProyectos() + tareasCliente() + '<div id="mpPush"></div>' + tarjetaAmigo() + misPedidos.map(tarjetaProyecto).join('');
    import('../base/push.js').then(m => m.montarAvisoPush($('#mpPush'))).catch(() => {});
    etiquetas(list);
    montarPestana();
  } catch (e) {
    errorCarga(list, e, () => { list.innerHTML = cargandoHTML('Cargando tus proyectos…'); pintarPedidos(); }, 'No se han podido cargar tus proyectos');
  }
}

async function guardarProyecto(p, cambios, msg, btn, hito = '') {
  if (btn) ocupado(btn, true);
  try {
    if (cambios.etapa) cambios.estado = estadoParaEtapa(cambios.etapa, p.estado);
    if (hito) cambios = conHistorial(p, cambios, hito, store.usuarioActual()?.name);
    await store.actualizarPedido(p.id, cambios);
    toast(msg, 'ok');
    await pintarPedidos();
    return true;
  } catch (err) {
    toast(err.message, 'err');
    if (btn) ocupado(btn, false);
    return false;
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
  const tg = e.target.closest('[data-toggle]');
  if (tg) {
    abierto = abierto === tg.dataset.toggle ? '' : tg.dataset.toggle;
    pestana = 'estado';
    $('#pedidosList').innerHTML = resumenProyectos() + tareasCliente() + misPedidos.map(tarjetaProyecto).join('');
    etiquetas($('#pedidosList'));
    montarPestana();
    if (abierto) $(`[data-proy="${abierto}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const pe = e.target.closest('[data-pest], [data-ir-pestana]');
  if (pe) {
    pestana = pe.dataset.pest || pe.dataset.irPestana;
    const p = misPedidos.find(x => x.id === abierto);
    const art = $(`[data-proy="${abierto}"]`);
    if (!p || !art) return;
    $$('.mp-tabs [data-pest]', art).forEach(b => b.classList.toggle('on', b.dataset.pest === pestana));
    $(`#pest-${p.id}`).innerHTML = pestanaHTML(p);
    etiquetas(art);
    montarPestana();
    return;
  }
  const pg = e.target.closest('[data-pagar]');
  if (pg) {
    const p = misPedidos.find(x => x.id === pg.dataset.pagar);
    return animarYPagar(pg, () => abrirPago(p, pg.dataset.fase, pintarPedidos));
  }
  const xs = e.target.closest('[data-extra-si], [data-extra-no]');
  if (xs) return (async () => {
    const p = misPedidos.find(x => x.id === xs.dataset.p), si = 'extraSi' in xs.dataset;
    const L = (p.cambiosExtra || []).map(x => ({ ...x })), x = L.find(y => y.id === (xs.dataset.extraSi || xs.dataset.extraNo));
    if (!x || x.estado !== 'propuesto') return;
    let img = '';
    if (si) { img = await (await import('../cuenta/firma.js')).pedirFirma({ titulo: 'Firma el presupuesto', texto: textoAcuerdo(x, CONFIG.marca), nombre: store.usuarioActual()?.name || p.clienteNombre }); if (!img) return; }
    if (!si && !confirm(`¿Rechazar el presupuesto «${x.concepto}»?`)) return;
    const u = store.usuarioActual();
    x.estado = si ? 'aceptado' : 'rechazado'; x.respondido = Date.now();
    if (si) x.acuerdo = { nombre: u?.name || p.clienteNombre, texto: textoAcuerdo(x, CONFIG.marca), t: Date.now(), firma: img };
    return guardarProyecto(p, { cambiosExtra: L }, si ? 'Presupuesto aceptado. Te indicamos cómo pagarlo en Mensajes.' : 'Presupuesto rechazado', xs, `${si ? 'Aceptado' : 'Rechazado'} el presupuesto «${x.concepto}» (${euros(x.importe)})`)
      .then(ok => ok && store.enviarMensaje(p.id, `${si ? 'He aceptado' : 'He rechazado'} el presupuesto «${x.concepto}» (${euros(x.importe)}).`).catch(() => {}));
  })();
  const mb = e.target.closest('[data-mant-baja]');
  if (mb) {
    const p = misPedidos.find(x => x.id === mb.dataset.mantBaja);
    const motivo = prompt('¿Seguro que quieres darte de baja del mantenimiento? Tu web seguirá publicada. Cuéntanos el motivo (opcional):', '');
    if (motivo === null) return;
    ocupado(mb, true);
    return store.crearTicket({ tipo: 'baja', asunto: `Baja del mantenimiento · ${p.respuestas?.negocio || p.planNombre}`, mensaje: `Quiero darme de baja del mantenimiento mensual.${motivo.trim() ? `\n\nMotivo: ${motivo.trim().slice(0, 500)}` : ''}`, pedido: p.id })
      .then(() => { toast('Solicitud de baja enviada. Te respondemos en menos de 24 h laborables.', 'ok'); return pintarPedidos(); })
      .catch(err => { toast(err.message, 'err'); ocupado(mb, false); });
  }
  const rc = e.target.closest('[data-recibo]');
  if (rc) return abrirRecibo(misPedidos.find(x => x.id === rc.dataset.recibo), rc.dataset.fase);
  const vw = e.target.closest('[data-ver-web]');
  if (vw) return verPropuesta(misPedidos.find(x => x.id === vw.dataset.verWeb));
  const ap = e.target.closest('[data-aprobar-web]');
  if (ap) {
    const p = misPedidos.find(x => x.id === ap.dataset.aprobarWeb);
    return guardarProyecto(p, aprobarWeb(p), 'Web aprobada. Solo falta el pago final para publicarla.', ap);
  }
  const de = e.target.closest('[data-desistir]');
  if (de) return abrirDesistimiento(misPedidos.find(x => x.id === de.dataset.desistir));
  const ju = e.target.closest('[data-justificante]');
  if (ju) return justificanteDesistimiento(misPedidos.find(x => x.id === ju.dataset.justificante));
  const ca = e.target.closest('[data-cancelar]');
  if (ca) {
    const p = misPedidos.find(x => x.id === ca.dataset.cancelar);
    const motivo = prompt('¿Por qué quieres cancelar el pedido? (opcional)');
    if (motivo === null) return;
    return guardarProyecto(p, { cancelacion: { motivo: motivo.trim(), t: Date.now() } }, 'Solicitud de cancelación enviada', ca);
  }
  const v = e.target.closest('[data-valorar]');
  if (v) abrirResena(misPedidos.find(x => x.id === v.dataset.valorar), () => pintarPedidos());
});

document.addEventListener('click', e => {
  if (e.target.closest('[data-mis-pedidos]')) { e.preventDefault(); $('.user-menu')?.classList.remove('open'); abrirPedidos(); }
  if (e.target.closest('[data-soporte]')) { e.preventDefault(); $('.user-menu')?.classList.remove('open'); abrirSoporte(); }
});

/* ==========================================================
   AYUDA Y SOPORTE (consultas del cliente con respuesta del equipo)
   ========================================================== */
const sopDlg = $('#soporteDlg');
const TIPOS = { duda: 'Duda', cambio: 'Cambio en mi web', incidencia: 'Algo no funciona', factura: 'Facturación', otro: 'Otro' };
const ESTADO_TICKET = { abierto: ['Pendiente', 'p-pend'], respondido: ['Respondido', 'p-new'], cerrado: ['Resuelto', 'p-done'] };

async function abrirSoporte() {
  const u = await conSesion('Inicia sesión para escribir al equipo de soporte.');
  if (!u) return;
  abrir(sopDlg);
  await pintarSoporte();
}
async function pintarSoporte() {
  const box = $('#soporteBody');
  box.innerHTML = cargandoHTML('Cargando tus consultas…');
  let L = [], P = [];
  try { [L, P] = await Promise.all([store.misTickets(), store.misPedidos().catch(() => [])]); }
  catch (e) { errorCarga(box, e, pintarSoporte, 'No se han podido cargar tus consultas'); return; }
  box.innerHTML = `
    <form class="sop-form" id="sopForm" novalidate>
      <p class="muted">Cuéntanos qué necesitas. ${esc(CONFIG.respuesta)} y te avisamos aquí y en la campana.</p>
      <div class="row-2">
        <label class="fc-select"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="fc-select"><span>Proyecto</span><select name="pedido"><option value="">General</option>${P.map(p => `<option value="${p.id}">${esc(p.respuestas?.negocio || p.planNombre)} · ${refPedido(p.id)}</option>`).join('')}</select></label>
      </div>
      ${campo({ id: 'sopAsunto', name: 'asunto', label: 'Asunto', required: true, attrs: 'maxlength="120"' })}
      ${campo({ id: 'sopMsg', name: 'mensaje', label: 'Mensaje', type: 'textarea', required: true, attrs: 'maxlength="3000"' })}
      <button class="btn btn-primary" type="submit"><span>Enviar consulta</span>${icono('send')}</button>
      ${infoDatos('responder a tu consulta y resolverla')}
    </form>
    <h3 class="sop-h">Tus consultas</h3>
    <div class="sop-list">${L.length ? L.map(t => {
      const [txt, cls] = ESTADO_TICKET[t.estado] || ESTADO_TICKET.abierto;
      return `<details class="tk" ${t.estado === 'respondido' ? 'open' : ''}>
        <summary><div><b>${esc(t.asunto)}</b><small>${TIPOS[t.tipo] || 'Consulta'} · ${haceCuanto(t.createdAt)}</small></div><span class="pill ${cls}">${txt}</span></summary>
        <div class="tk-hilo">
          <div class="tk-m yo"><small>Tú · ${fecha(t.createdAt)}</small><p>${esc(t.mensaje)}</p></div>
          ${(t.respuestas || []).map(r => `<div class="tk-m ${r.rol === 'client' ? 'yo' : 'el'}"><small>${r.rol === 'client' ? 'Tú' : esc(r.autor) + ' · Equipo'} · ${haceCuanto(r.t)}</small><p>${esc(r.texto)}</p></div>`).join('')}
          ${t.estado !== 'cerrado' ? `<form class="tk-resp" data-tk="${t.id}"><input name="texto" placeholder="Responder…" maxlength="2000" aria-label="Responder"><button class="btn btn-sm btn-ghost">Enviar</button></form>` : ''}
        </div>
      </details>`;
    }).join('') : `<p class="muted" style="font-size:14px">Aún no has escrito ninguna consulta.</p>`}</div>`;
  etiquetas(box);
  $('#sopForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const asunto = String(f.get('asunto')).trim(), mensaje = String(f.get('mensaje')).trim();
    if (!asunto || mensaje.length < 5) return toast('Escribe un asunto y el mensaje', 'err');
    const b = e.submitter; ocupado(b, true);
    try { await store.crearTicket({ tipo: f.get('tipo'), asunto, mensaje, pedido: f.get('pedido') }); toast('Consulta enviada. Te responderemos pronto.', 'ok'); pintarSoporte(); }
    catch (err) { toast(err.message, 'err'); ocupado(b, false); }
  });
  $$('.tk-resp', box).forEach(fm => fm.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = fm.texto.value.trim();
    if (!texto) return;
    const t = L.find(x => x.id === fm.dataset.tk);
    try { await store.responderTicket(t, texto); toast('Respuesta enviada', 'ok'); pintarSoporte(); }
    catch (err) { toast(err.message, 'err'); }
  }));
}

/* ==========================================================
   CONTACTO (sin cuenta) y LISTA DE ESPERA
   ========================================================== */
$('#ctMail').href = mailLink('Consulta desde la web');
$('#ctMail b').textContent = CONFIG.email;
$('#ctHorario b').textContent = CONFIG.horario;
$('#ctResp b').textContent = CONFIG.respuesta;
$$('.contacto-datos .cd > span').forEach((s, i) => (s.innerHTML = icono(['mail', 'clock', 'message'][i])));
// WhatsApp, solo si el propietario ha puesto su número en Ajustes
if (whatsappLink()) $('#ctMail').insertAdjacentHTML('afterend', `<a class="cd" id="ctWa" href="${esc(whatsappLink('Hola, os escribo desde la web de AurevixWeb.'))}" target="_blank" rel="noopener"><span>${icono('wa')}</span><div><small>WhatsApp</small><b>Escríbenos por WhatsApp</b></div></a>`);
const MOTIVOS = { presupuesto: 'Quiero un presupuesto', duda: 'Tengo una duda', espera: 'Lista de espera', trabajo: 'Trabajar con vosotros', otro: 'Otro' };
function pintarContacto() {
  const u = store.usuarioActual();
  $('#contactoForm').innerHTML = `
    <div class="row-2">
      ${campo({ id: 'ctNombre', name: 'nombre', label: 'Nombre', required: true, value: u?.name || '', attrs: 'autocomplete="name" maxlength="80"' })}
      ${campo({ id: 'ctEmail', name: 'email', label: 'Correo electrónico', type: 'email', required: true, value: u?.email || '', attrs: 'autocomplete="email" maxlength="120"' })}
    </div>
    <label class="fc-select"><span>Motivo</span><select name="tipo" id="ctTipo">${Object.entries(MOTIVOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
    ${campo({ id: 'ctAsunto', name: 'asunto', label: 'Asunto', required: true, attrs: 'maxlength="120"' })}
    ${campo({ id: 'ctMsg', name: 'mensaje', label: 'Cuéntanos tu proyecto o tu duda', type: 'textarea', required: true, attrs: 'maxlength="3000"' })}
    <input type="text" name="web" tabindex="-1" autocomplete="off" class="trampa" aria-hidden="true">
    ${aceptarTerminos('ctTerms', 'He leído y acepto la <a href="terminos-y-privacidad#privacidad" target="_blank" rel="noopener">política de privacidad</a>')}
    ${infoDatos('responder a tu mensaje; lo conservamos hasta un año después de resolverlo')}
    <div class="ct-btns"><button class="btn btn-primary" type="submit"><span>Enviar mensaje</span>${icono('send')}</button>
    <a class="btn btn-ghost" id="ctCorreo" href="${mailLink('Consulta desde la web')}">${icono('mail')}<span>Abrir mi correo</span></a></div>
    <p class="form-err" id="ctErr" role="alert"></p>`;
  etiquetas($('#contactoForm'));
}
pintarContacto();
store.alCambiarUsuario(u => { if (u && !$('#ctNombre').value) pintarContacto(); });
function irAContacto(tipo, asunto = '') {
  cerrar(dlg);
  $('#contacto').scrollIntoView({ behavior: 'smooth' });
  $('#ctTipo').value = tipo;
  if (asunto) { $('#ctAsunto').value = asunto; }
  revisarCampos($('#contacto'));
  if (tipo === 'espera') toast(CONFIG.mensajeCerrado);
  setTimeout(() => $('#ctMsg').focus({ preventScroll: true }), 700);
}
$('#contactoForm').addEventListener('input', e => {
  if (['ctAsunto', 'ctMsg'].includes(e.target.id)) $('#ctCorreo').href = mailLink($('#ctAsunto').value || 'Consulta desde la web', $('#ctMsg').value);
});
$('#contactoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (f.get('web')) return; // trampa para robots
  const d = Object.fromEntries(['nombre', 'email', 'tipo', 'asunto', 'mensaje'].map(k => [k, String(f.get(k) || '').trim()]));
  const err = m => ($('#ctErr').textContent = m);
  const marcar = (id, mal) => $('#' + id).closest('.fc').classList.toggle('error', mal);
  marcar('ctNombre', !d.nombre); marcar('ctEmail', !/^\S+@\S+\.\S+$/.test(d.email)); marcar('ctAsunto', !d.asunto); marcar('ctMsg', d.mensaje.length < 10);
  if (!d.nombre || !/^\S+@\S+\.\S+$/.test(d.email) || !d.asunto || d.mensaje.length < 10) return err('Revisa los campos marcados. El mensaje debe tener al menos 10 caracteres.');
  if (!terminosAceptados('ctTerms')) return;
  err('');
  const b = e.submitter; ocupado(b, true);
  try {
    await import('../base/verificacion.js').then(v => v.siEsInusual('contacto'));
  } catch (er) { ocupado(b, false); return err(er.message); }
  try {
    await store.crearTicket(d);
    $('#contactoForm').innerHTML = `<div class="exito"><div class="ok-ic">${icono('check')}</div><h3>Mensaje enviado</h3><p class="muted">Gracias, ${esc(d.nombre.split(' ')[0])}. Te responderemos a <b>${esc(d.email)}</b>. ${esc(CONFIG.respuesta)}.</p></div>`;
  } catch (er) {
    ocupado(b, false);
    err('No se ha podido enviar. Escríbenos directamente a ' + CONFIG.email);
  }
});

/* ---------- Casos reales (Ajustes → Negocio → Casos reales) ---------- */
/* Cifras reales (webs entregadas, días de media, valoración): los números suben al verse y una pequeña gráfica dibuja
   las entregas de los últimos seis meses. Solo aparece con al menos tres webs entregadas: nunca se enseñan cifras de relleno. */
async function pintarCifras() {
  const c = await store.cifrasPublicas();
  if (!c || (c.entregadas || 0) < 3) return;
  const M = (c.por_mes || []).slice(-6), max = Math.max(1, ...M);
  const pts = M.map((v, i) => [i * (120 / Math.max(1, M.length - 1)), 34 - (v / max) * 30]);
  const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const meses = M.map((_, i) => new Date(new Date().getFullYear(), new Date().getMonth() - (M.length - 1 - i), 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''));
  const caja = (num, txt, extra = '') => `<div class="cifra"><b>${num}</b><span>${txt}</span>${extra}</div>`;
  $('#cifrasGrid').innerHTML =
    caja(`<em class="num" data-count="${c.entregadas}">${c.entregadas}</em>`, 'webs entregadas',
      M.length > 1 ? `<svg class="cifra-graf" viewBox="-4 0 128 40" role="img" aria-label="Webs entregadas por mes: ${M.map((v, i) => `${meses[i]} ${v}`).join(', ')}"><path class="cg-area" d="${linea} L120 40 L0 40Z"/><path class="cg-linea" d="${linea}" pathLength="1"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2"/>`).join('')}</svg>` : '')
    + (c.dias ? caja(`<em class="num" data-count="${c.dias}">${c.dias}</em> días`, 'de media desde el pedido hasta la web publicada') : '')
    + (c.valoracion && c.resenas ? caja(`${String(Math.round(c.valoracion * 10) / 10).replace('.', ',')}<small> / 5</small>`, `de valoración en ${c.resenas} opinion${c.resenas === 1 ? '' : 'es'}`) : '');
  $('#cifras').hidden = false;
  contar($('#cifras'));
  const g = $('#cifras .cifras');
  io?.observe?.(g);
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); g.classList.add('dibuja'); } }, { threshold: .4 }).observe(g);
}
pintarCifras().then(alternarFranjas);
/* Franjas de fondo alternas según las secciones que se ven (Casos y Cifras solo aparecen con datos reales) */
function alternarFranjas() { $$('main > section:not(.hero):not(.join-sec):not([hidden])').forEach((s, i) => s.classList.toggle('alt', i % 2 === 1)); }
alternarFranjas();
document.querySelectorAll('[data-reservar-llamada]').forEach(b => { b.hidden = !CONFIG.llamadas?.activo; });
// Antes y después: la barbería con una web anticuada y con el diseño «Filo»
import('./antes-despues.js').then(m => m.iniciarAntesDespues(urlPlantilla('filo', 'Barbería Filo', '', true))).catch(() => {});
if (CONFIG.casos?.length) {
  // Cada caso, dentro de un portátil con la captura de su web que se desplaza sola al pasar por encima o al verse en el
  // móvil (captura pública de WordPress.com «mShots»; si no llega, la tarjeta se queda solo con el texto)
  const captura = u => `https://s0.wp.com/mshots/v1/${encodeURIComponent(u)}?w=1280&h=2200`;
  $('#casosGrid').innerHTML = CONFIG.casos.map(c => `<a class="caso reveal" href="${esc(c.url)}" target="_blank" rel="noopener">
    <span class="caso-disp" aria-hidden="true"><span class="caso-bar"><i></i><i></i><i></i></span><span class="caso-pant cargando" data-dom="${esc(c.url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, ''))}"><img data-captura="${esc(captura(c.url))}" alt="" loading="lazy" decoding="async"></span></span>
    ${c.sector ? `<small>${esc(c.sector)}</small>` : ''}<h3>${esc(c.nombre)}</h3>${c.texto ? `<p>${esc(c.texto)}</p>` : '<p></p>'}
    <span class="caso-url">${esc(c.url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, ''))}${icono('external')}</span></a>`).join('');
  $('#casos').hidden = false;
  alternarFranjas();
  $$('#casos .reveal').forEach(el => io?.observe?.(el));
  // mShots devuelve primero una imagen provisional («Generating preview», 400 px de ancho) mientras hace la captura.
  // No se enseña: se vuelve a pedir cada pocos segundos hasta que llega la de verdad (1280 px). Si no llega, queda
  // una tarjeta limpia con el nombre de la web en vez del logo de WordPress.
  $$('#casosGrid img[data-captura]').forEach(img => {
    const pant = img.closest('.caso-pant');
    let intento = 0;
    const pedir = () => { img.src = img.dataset.captura + (intento ? `&r=${intento}` : ''); };
    img.addEventListener('load', () => {
      if (img.naturalWidth >= 1000) { pant.classList.remove('cargando'); pant.classList.add('lista'); return; }
      if (++intento <= 8) setTimeout(pedir, 3500); else { pant.classList.remove('cargando'); pant.classList.add('sin-captura'); }
    });
    img.addEventListener('error', () => { pant.classList.remove('cargando'); pant.classList.add('sin-captura'); });
    pedir();
  });
}

/* ---------- Preguntas frecuentes: lista numerada (adaptada de «Interactive Accordion» de 21st.dev) ----------
   Sigue siendo <details> nativo (teclado, lector de pantalla y buscador funcionan igual);
   solo se añade el número y se envuelve el texto de la pregunta para animarlo. */
$$('.faq details').forEach((d, i) => {
  const s = d.querySelector('summary');
  const t = document.createElement('span');
  t.className = 'faq-t';
  t.append(...s.childNodes);
  s.innerHTML = `<span class="faq-n" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>`;
  s.append(t);
  d.classList.add('faq-it');
});

/* ---------- Buscador de preguntas frecuentes ---------- */
$('#faqQ').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let n = 0;
  $$('.faq details').forEach(d => {
    const ok = !q || d.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
    d.hidden = !ok; if (ok) n++;
    d.open = !!q && ok && n <= 2;
  });
  $('#faqNada').hidden = n > 0;
});

/* ---------- Preguntas frecuentes para Google (datos estructurados FAQPage) ----------
   Se leen del propio HTML, así nunca se desincronizan. Solo en español (los buscadores ven el español). */
if (document.documentElement.lang === 'es') {
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: $$('.faq details').map(d => ({
      '@type': 'Question', name: (d.querySelector('.faq-t') || d.querySelector('summary')).textContent.trim(),
      acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p')?.textContent.trim() || '' }
    }))
  });
  document.head.appendChild(ld);
}

/* ---------- Enlaces directos ---------- */
// #proyecto-<id> abre sus mensajes; #proyecto-<id>/pagos (enlace del correo de pago), esa pestaña
const pestanaValida = k => (PESTANAS.some(([x]) => x === k) ? k : 'mensajes');
const hash = location.hash;
if (hash === '#mis-pedidos' || hash.startsWith('#proyecto-')) {
  history.replaceState(null, '', location.pathname);
  const [id, pest] = hash.startsWith('#proyecto-') ? hash.slice(10).split('/') : [''];
  abrirPedidos(id, id ? pestanaValida(pest) : '');
} else if (hash === '#soporte') {
  history.replaceState(null, '', location.pathname);
  abrirSoporte();
} else if (hash.startsWith('#quiero-')) {
  // Desde la ficha de un diseño (diseno-filo…): se abre el pedido con ese diseño elegido
  history.replaceState(null, '', location.pathname);
  quieroDiseno(hash.slice(8));
}
addEventListener('hashchange', () => {
  if (location.hash === '#mis-pedidos') { history.replaceState(null, '', location.pathname); abrirPedidos(); }
  if (location.hash.startsWith('#proyecto-')) { const [id, pest] = location.hash.slice(10).split('/'); history.replaceState(null, '', location.pathname); abrirPedidos(id, pestanaValida(pest)); }
  if (location.hash === '#soporte') { history.replaceState(null, '', location.pathname); abrirSoporte(); }
});

// Acceso directo de la app instalada (?comprar=negocio)
const qComprar = new URLSearchParams(location.search).get('comprar');
if (qComprar) abrirCompra(qComprar, new URLSearchParams(location.search).get('diseno') || '');


/* ---------- La web que ha subido el equipo (vista del cliente) ---------- */
async function verPropuesta(p) {
  const v = p && webCliente(p);
  if (!v) return toast('Tu web todavía no está lista para verla. Te avisaremos.');
  // El visor solo se descarga cuando se abre (la portada no lo necesita)
  const { abrirVisor, cerrarVisor, enlaceVista } = await import('../cuenta/vistaweb.js');
  abrirVisor({
    p, version: v, modo: 'cliente',
    enlace: (w, pag) => enlaceVista(p, w, pag),
    alAprobar: async () => {
      if (!await guardarProyecto(p, aprobarWeb(p), 'Web aprobada. Solo falta el pago final para publicarla.', null, `Versión ${v.n} aprobada`)) throw new Error(''); // el aviso del fallo ya lo enseña guardarProyecto
      cerrarVisor();
      confeti();
      fiesta('¡Web aprobada!', 'Solo falta el pago final para publicarla');
    },
    alCambios: async (_w, texto, pagina) => {
      if (!await guardarProyecto(p, pedirCambios(p, texto, { pagina }), 'Cambios enviados. Te avisaremos cuando estén hechos.')) throw new Error('');
      cerrarVisor();
    }
  });
}

/* ---------- Desistimiento del contrato (14 días) ----------
   Un paso para explicar qué pasa, otro para confirmar, y el justificante
   con la fecha y la hora para que el cliente lo guarde. */
let desDlg;
function abrirDesistimiento(p) {
  if (!p || !puedeDesistir(p)) return toast('El plazo para desistir de este pedido ya ha terminado. Escríbenos y lo vemos.', 'err');
  if (!desDlg) {
    desDlg = document.createElement('dialog');
    desDlg.className = 'dlg dlg-sm';
    desDlg.setAttribute('aria-labelledby', 'desTit');
    desDlg.innerHTML = `<div class="dlg-box"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="desBody"></div></div>`;
    document.body.appendChild(desDlg);
  }
  const body = $('#desBody', desDlg);
  const pagado = p.pagoEstado === 'pagado' ? p.total : p.pagoEstado === 'senal' ? importeSenal(p) : 0;
  body.innerHTML = `
    <h2 class="dlg-h" id="desTit">Desistir del contrato</h2>
    <p class="muted" style="margin:-8px 0 14px;font-size:14.5px">${esc(p.respuestas?.negocio || p.planNombre)} · ${refPedido(p.id)} · plazo hasta el ${fecha(finDesistimiento(p))}</p>
    <ul class="des-lista">
      <li>No tienes que dar ninguna explicación.</li>
      <li>${pagado ? `Te devolvemos lo que has pagado (${euros(pagado)}) por transferencia en un máximo de 14 días.` : 'No has pagado nada, así que no hay nada que devolver.'}</li>
      ${p.inicioAnticipado && pagado ? '<li>Como pediste que empezáramos antes, descontaremos la parte proporcional del trabajo ya hecho.</li>' : ''}
      <li>Se cancela el pedido y dejamos de trabajar en tu web.</li>
    </ul>
    <form id="desForm" novalidate>
      ${campo({ id: 'desMotivo', label: 'Si quieres, cuéntanos por qué (opcional)', type: 'textarea', attrs: 'maxlength="500"' })}
      <button class="btn btn-danger w100" type="submit"><span>Confirmar el desistimiento</span></button>
      <button class="btn btn-ghost w100" type="button" data-close style="margin-top:8px"><span>No, quiero seguir</span></button>
    </form>`;
  abrir(desDlg);
  $('#desForm', body).addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.submitter; ocupado(b, true);
    const cambios = { cancelacion: { desistimiento: true, motivo: $('#desMotivo', body).value.trim().slice(0, 500), t: Date.now(), condiciones: p.condiciones || CONFIG.condiciones } };
    if (!await guardarProyecto(p, cambios, 'Desistimiento registrado. Guarda el justificante.', b, 'El cliente desiste del contrato')) return;
    Object.assign(p, cambios);
    body.innerHTML = `<div class="exito"><div class="ok-ic">${icono('check')}</div><h3>Desistimiento registrado</h3>
      <p class="muted">Lo hemos recibido el ${new Date(cambios.cancelacion.t).toLocaleString('es-ES')}. Guarda el justificante: es tu prueba de que has desistido dentro del plazo.</p>
      <button type="button" class="btn btn-primary w100" data-justificante="${esc(p.id)}">${icono('printer')}<span>Descargar justificante</span></button>
      <button type="button" class="btn btn-ghost w100" data-close style="margin-top:8px">Cerrar</button></div>`;
    $('[data-justificante]', body).addEventListener('click', () => justificanteDesistimiento(p));
  });
}

function justificanteDesistimiento(p) {
  if (!p?.cancelacion?.desistimiento) return;
  const L = CONFIG.legal || {}, c = p.cancelacion;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Justificante de desistimiento ${refPedido(p.id)}</title>
  <style>body{font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#16161b;background:#f3f2ee;padding:24px;margin:0}.doc{max-width:720px;margin:0 auto;background:#fff;border-radius:14px;padding:40px}h1{font-size:22px;margin:0 0 4px}small{color:#6b6962}dl{display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:22px 0}dt{color:#6b6962}dd{margin:0;font-weight:600}.acc{max-width:720px;margin:0 auto 14px;text-align:right}.acc button{font:600 14px system-ui;padding:10px 18px;border-radius:99px;border:0;background:#16161b;color:#fff;cursor:pointer}@media print{body{background:#fff;padding:0}.acc{display:none}.doc{padding:0}}</style></head><body>
  <div class="acc"><button onclick="print()">Imprimir o guardar en PDF</button></div>
  <div class="doc"><h1>Justificante de desistimiento</h1><small>Derecho de desistimiento (arts. 102 a 108 del Real Decreto Legislativo 1/2007)</small>
  <dl><dt>Empresario</dt><dd>${esc(L.titular)} · NIF ${esc(L.nif)}</dd><dt>Domicilio</dt><dd>${esc(L.domicilio)}</dd><dt>Correo</dt><dd>${esc(L.email || CONFIG.email)}</dd>
  <dt>Consumidor</dt><dd>${esc(p.clienteNombre)} · ${esc(p.clienteEmail || '')}</dd><dt>Contrato</dt><dd>${esc(p.planNombre)} · pedido ${refPedido(p.id)} del ${fecha(p.createdAt)}</dd>
  <dt>Desistimiento</dt><dd>${new Date(c.t).toLocaleString('es-ES')}</dd><dt>Plazo</dt><dd>Hasta el ${fecha(finDesistimiento(p))} (dentro de plazo)</dd>${c.motivo ? `<dt>Motivo</dt><dd>${esc(c.motivo)}</dd>` : ''}</dl>
  <p>Por la presente comunico que desisto del contrato de prestación del servicio indicado. ${esc(CONFIG.marca)} devolverá los pagos recibidos sin demora indebida y, como máximo, en 14 días naturales desde esta fecha, por transferencia bancaria${p.inicioAnticipado ? ', descontando el importe proporcional a la parte del servicio ya prestada, ya que el consumidor solicitó expresamente que la prestación empezara durante el plazo de desistimiento' : ''}.</p></div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return descargar(`desistimiento-${refPedido(p.id).slice(1)}.html`, html, 'text/html');
  w.document.open(); w.document.write(html); w.document.close();
}
