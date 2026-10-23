/* ==========================================================
   Página de inicio: planes, diseños, opiniones, compra y mis pedidos
   ========================================================== */
import { CONFIG, PLANES, EXTRAS, URGENTE } from '../config.js';
import { PLANTILLAS, plantillaPorId } from './plantillas.js';
import * as store from './store.js';
import {
  $, $$, esc, euros, fecha, icono, toast, abrir, cerrar, conSesion, arrancar, waLink, refPedido,
  ESTADOS, campo, desplegable, opciones, interruptor, aceptarTerminos, terminosAceptados,
  estrellas, ocupado, cargandoHTML, spinner, etiquetas
} from './ui.js';
import { botonPago, abrirPago, abrirResena, animarYPagar } from './pago.js';

await arrancar('inicio');

/* ==========================================================
   MINIATURAS VIVAS DE LAS PLANTILLAS
   ========================================================== */
const urlPlantilla = (id, nombre = '', color = '') => {
  const q = new URLSearchParams({ t: id });
  if (nombre) q.set('n', nombre);
  if (color) q.set('c', color);
  return `plantilla.html?${q}`;
};
const ro = new ResizeObserver(es => es.forEach(en => en.target.style.setProperty('--s', en.contentRect.width / 1280)));
const miniatura = (id, nombre, color, lazy = true) =>
  `<div class="thumb"><div class="thumb-load">${spinner()}</div><iframe src="${urlPlantilla(id, nombre, color)}" tabindex="-1" aria-hidden="true" ${lazy ? 'loading="lazy"' : ''} title=""></iframe></div>`;
const vigilarMiniaturas = raiz => $$('.thumb', raiz).forEach(t => ro.observe(t));
// Quitar el "cargando" cuando la miniatura termina de cargar
document.addEventListener('load', e => {
  if (e.target.tagName === 'IFRAME' && e.target.getAttribute('src')) e.target.parentElement?.querySelector('.thumb-load')?.remove();
}, true);

// Portada: abanico de 3 diseños (se cargan después de la página para que abra más rápido)
$('#heroArt').innerHTML = ['brasa', 'filo', 'calma'].map((id, i) =>
  `<div class="fan f${i}"><div class="thumb"><div class="thumb-load">${spinner()}</div><iframe data-src="${urlPlantilla(id)}" tabindex="-1" aria-hidden="true" title=""></iframe></div></div>`).join('');
vigilarMiniaturas($('#heroArt'));
const cargarPortada = () => setTimeout(() => $$('#heroArt iframe[data-src]').forEach(f => (f.src = f.dataset.src)), 250);
document.readyState === 'complete' ? cargarPortada() : addEventListener('load', cargarPortada);

/* ==========================================================
   PLANES
   ========================================================== */
$('#planes').innerHTML = PLANES.map(p => `
  <article class="plan-card reveal ${p.popular ? 'popular' : ''}">
    ${p.popular ? '<span class="tag">El más pedido</span>' : ''}
    <div class="pc-top"><span class="pc-ic">${icono(p.icono)}</span><span class="pc-time">⏱ ${esc(p.entrega)}</span></div>
    <h3>${esc(p.nombre)}</h3>
    <p class="pc-desc">${esc(p.desc)}</p>
    <div class="pc-price"><small>desde</small> ${euros(p.precio)}</div>
    <ul>${p.incluye.slice(0, 4).map(i => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>
    <button class="btn ${p.popular ? 'btn-dark' : 'btn-ghost btn-fill'} w100" data-comprar="${p.id}"><span>Comprar</span>${icono('arrow')}</button>
  </article>`).join('');

/* ==========================================================
   GALERÍA DE DISEÑOS
   ========================================================== */
$('#disenosGrid').innerHTML = PLANTILLAS.map(p => `
  <article class="dz reveal" data-ver="${p.id}" tabindex="0" role="button" aria-label="Ver diseño ${esc(p.nombre)}">
    ${miniatura(p.id)}
    <div class="dz-info">
      <div><b>${esc(p.nombre)}</b><small>${esc(p.sector)}</small></div>
      <span class="dz-dot" style="background:${p.c.accent}"></span>
    </div>
    <p>${esc(p.desc)}</p>
  </article>`).join('');
vigilarMiniaturas($('#disenosGrid'));

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
    : `<div class="empty"><div class="em">⭐</div><b>Aún no hay opiniones publicadas</b><p>Cuando entreguemos las primeras webs, aquí verás lo que opinan nuestros clientes.</p></div>`;

  $('#opActions').innerHTML = `
    ${CONFIG.trustpilot ? `<a class="btn btn-primary" href="${esc(CONFIG.trustpilot)}" target="_blank" rel="noopener">⭐ Ver opiniones en Trustpilot</a>` : ''}
    <button class="btn btn-ghost" data-mis-pedidos>¿Ya eres cliente? Deja tu opinión</button>`;
  $$('#opGrid .reveal').forEach(el => io.observe(el));
}

/* ---------- Animaciones al aparecer ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .1, rootMargin: '0px 0px -30px 0px' });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(el); });
pintarOpiniones();

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

function abrirCompra(planId, plantillaInicial = '') {
  const plan = PLANES.find(p => p.id === planId);
  if (!plan) return;
  W = { plan, paso: 0, plantilla: plantillaInicial || plan.plantillas[0] || 'cero', colorCustom: '' };
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
      <h4 class="mini-h">Cómo seguimos</h4>
      <ol class="flow">
        <li><b>Respondes unas preguntas</b><span>Sobre tu negocio, el estilo y los extras. Ves el precio final al momento.</span></li>
        <li><b>Eliges un diseño</b><span>Lo verás en vista previa con el nombre de tu negocio.</span></li>
        <li><b>Confirmas y pagas la señal</b><span>El ${CONFIG.senal} % para empezar y el resto cuando la web esté lista.</span></li>
      </ol>
    </div>

    <div class="paso" data-paso="negocio">
      <h3 class="paso-h">Cuéntanos sobre tu negocio</h3>
      ${campo({ id: 'fNegocio', name: 'negocio', label: 'Nombre del negocio', required: true, attrs: 'autocomplete="organization"' })}
      ${desplegable({ id: 'fSector', name: 'sector', label: 'Sector', opciones: SECTORES })}
      <span class="q-label">¿Qué quieres conseguir con la web?</span>
      ${opciones('objetivo', OBJETIVOS, objetivo)}
      ${campo({ id: 'fTel', name: 'telefono', label: 'WhatsApp o teléfono', type: 'tel', required: true, attrs: 'inputmode="tel" autocomplete="tel"' })}
      ${campo({ id: 'fWeb', name: 'webActual', label: 'Tu web actual (opcional)', attrs: 'inputmode="url"' })}
    </div>

    <div class="paso" data-paso="estilo">
      <h3 class="paso-h">¿Cómo te la imaginas?</h3>
      <span class="q-label">Estilo</span>
      ${opciones('estilo', ESTILOS)}
      <span class="q-label">Color principal</span>
      <div class="swatches">
        <label class="sw sw-orig" title="Los colores del diseño que elijas"><input type="radio" name="color" value="" checked><span></span><em>Original</em></label>
        ${COLORES.map(c => `<label class="sw" title="${c}"><input type="radio" name="color" value="${c}"><span style="--c:${c}"></span></label>`).join('')}
        <label class="sw-custom"><input type="color" id="colorPick" value="#ff4f8b" aria-label="Elegir otro color"> Otro</label>
      </div>
      <span class="q-label">¿Tienes logo?</span>
      ${opciones('logo', ['Sí, ya tengo', 'No, necesito uno', 'No hace falta'])}
      <span class="q-label">¿Tienes textos y fotos?</span>
      ${opciones('contenido', ['Sí, todo', 'Tengo algunos', 'No, ayudadme'], 'Tengo algunos')}
    </div>

    <div class="paso" data-paso="extras">
      <h3 class="paso-h">Extras <span class="muted">(opcional)</span></h3>
      <div class="checks">${EXTRAS.map(x => `
        <label class="check-card"><input type="checkbox" name="extra" value="${x.id}"><span class="ck-mark"></span>
          <span class="ct"><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></span>
          <span class="pr">+${euros(x.precio)}${x.mensual ? '<small>/mes</small>' : ''}</span></label>`).join('')}
      </div>
      <div style="margin-top:12px">${interruptor({ id: 'fUrg', name: 'urgente', titulo: 'Entrega urgente', texto: `La tienes antes · +${URGENTE * 100} % sobre el precio base` })}</div>
      ${campo({ id: 'fCom', name: 'comentarios', label: '¿Algo más que debamos saber?', type: 'textarea', hint: 'Secciones que quieres, webs que te gustan, ideas… (opcional)' })}
    </div>

    <div class="paso" data-paso="diseno">
      <h3 class="paso-h">Elige un diseño de partida</h3>
      <p class="muted paso-sub">Te lo enseñamos con el nombre y el color de tu negocio. Toca «Ver» para verlo en grande.</p>
      <div class="pick-grid" id="pickGrid"></div>
    </div>

    <div class="paso" data-paso="resumen"><div id="resumen"></div></div>`;

  etiquetas(form);
  irA(0);
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
  if (e.target.name === 'contenido' && e.target.value === 'No, ayudadme') marcarExtra('textos');
  actualizarTotal();
});
form.addEventListener('input', e => {
  if (e.target.id === 'colorPick') {
    W.colorCustom = e.target.value;
    $$('input[name=color]', form).forEach(r => (r.checked = false));
  }
});
form.addEventListener('submit', e => { e.preventDefault(); $('#wizNext').click(); });

/* --- Pasos --- */
function irA(i) {
  form.dataset.dir = i >= W.paso ? 'fwd' : 'back';
  W.paso = i;
  const paso = PASOS[i];
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
      <div class="pick-card cero"><div class="cero-ic">✦</div><b>Diseño desde cero</b><small>Lo creamos 100 % a tu medida a partir del cuestionario.</small></div>
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
        ${pl ? `<div class="rs-thumb">${miniatura(pl.id, r.negocio, r.color, false)}</div>` : '<div class="rs-thumb cero-mini">✦</div>'}
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
      plantilla: W.plantilla, respuestas: d.respuestas, aceptaTerminos: Date.now()
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
  $('#wizFoot').hidden = true;
  $('#wizBack').style.visibility = 'hidden';
  $('#wizStep').textContent = 'Pedido enviado';
  $('#wizBar').style.width = '100%';
  form.innerHTML = `
    <div class="paso on exito">
      <div class="ok-ic">${icono('check')}</div>
      <h3>¡Pedido recibido!</h3>
      <p class="muted">Referencia <b>${refPedido(p.id)}</b>. Te escribiremos al <b>${esc(r.telefono)}</b> en menos de 24 h.
      Paga la señal ahora para que empecemos cuanto antes.</p>
      <div class="exito-pay">${botonPago(p)}</div>
      <a class="btn btn-wa w100" href="${waLink(msg)}" target="_blank" rel="noopener">${icono('wa')} Avisar por WhatsApp</a>
      <button type="button" class="btn btn-ghost w100" id="verPedidos">Ver mis pedidos</button>
    </div>`;
  $('#verPedidos').addEventListener('click', () => { cerrar(dlg); abrirPedidos(); });
  $('[data-pagar]', form)?.addEventListener('click', e =>
    animarYPagar(e.currentTarget, () => abrirPago(p, 'senal', () => {
      const pay = $('.exito-pay', form); if (pay) pay.innerHTML = botonPago(p);
    })));
  W = null;
}

dlg.addEventListener('close', () => { W = null; });
dlg.addEventListener('cancel', e => {
  if (W && W.paso > 1 && !confirm('¿Salir? Perderás lo que has rellenado.')) e.preventDefault();
});

/* ==========================================================
   MIS PEDIDOS
   ========================================================== */
const pedDlg = $('#pedidosDlg');
const FASES = ['nuevo', 'en_curso', 'revision', 'entregado'];
let misPedidos = [];

async function abrirPedidos() {
  const u = await conSesion('Inicia sesión para ver tus pedidos.');
  if (!u) return;
  $('#pedidosList').innerHTML = cargandoHTML('Cargando tus pedidos…');
  abrir(pedDlg);
  await pintarPedidos();
}

async function pintarPedidos() {
  const list = $('#pedidosList');
  try {
    misPedidos = await store.misPedidos();
    if (!misPedidos.length) {
      list.innerHTML = `<div class="empty"><div class="em">🛍️</div><b>Aún no tienes pedidos</b><p>Elige el tipo de web que necesitas para empezar.</p><a href="#webs" class="btn btn-primary" data-close style="margin-top:18px">Ver webs y precios</a></div>`;
      return;
    }
    list.innerHTML = misPedidos.map(p => {
      const est = ESTADOS[p.estado] || ESTADOS.nuevo;
      const fase = FASES.indexOf(p.estado);
      const pl = plantillaPorId(p.plantilla);
      return `
      <article class="mp">
        <div class="mp-top">
          <div><b>${esc(p.respuestas?.negocio || p.planNombre)}</b><small>${esc(p.planNombre)} · ${pl ? 'Diseño ' + esc(pl.nombre) : 'Diseño a medida'} · ${fecha(p.createdAt)}</small></div>
          <span class="pill ${est.cls}">${est.txt}</span>
        </div>
        ${p.estado === 'cancelado' ? '' : `<div class="track">${FASES.map((f, i) => `<div class="tk ${i <= fase ? 'on' : ''}"><i></i><span>${ESTADOS[f].txt}</span></div>`).join('')}</div>`}
        <div class="mp-foot"><span>Ref. ${refPedido(p.id)}</span><b>${euros(p.total)}${p.mensual ? ` <small>+ ${euros(p.mensual)}/mes</small>` : ''}</b></div>
        <div class="mp-pay">${botonPago(p)}</div>
        ${p.asignadoNombre ? `<p class="mp-who">👩‍💻 Trabajando en ella: <b>${esc(p.asignadoNombre)}</b></p>` : ''}
        ${p.estado === 'entregado' && !p.resenada ? `<button class="btn btn-ghost w100 mp-rate" data-valorar="${esc(p.id)}">${icono('star')} Valorar mi web</button>` : ''}
      </article>`;
    }).join('');
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="empty"><b>No se pudieron cargar</b><p>${esc(e.message)}</p></div>`;
  }
}

$('#pedidosList').addEventListener('click', e => {
  const pg = e.target.closest('[data-pagar]');
  if (pg) {
    const p = misPedidos.find(x => x.id === pg.dataset.pagar);
    return animarYPagar(pg, () => abrirPago(p, pg.dataset.fase, pintarPedidos));
  }
  const v = e.target.closest('[data-valorar]');
  if (v) abrirResena(misPedidos.find(x => x.id === v.dataset.valorar), () => pintarPedidos());
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
  toast('¡Gracias por tu pago! Lo verás confirmado en «Mis pedidos»');
}
