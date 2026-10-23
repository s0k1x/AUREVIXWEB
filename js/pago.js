/* ==========================================================
   Pagos y reseñas del cliente
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { $, $$, esc, euros, icono, abrir, cerrar, toast, ocupado, campo, selectorEstrellas, waLink, refPedido, PAGOS, METODOS } from './ui.js';

const P = CONFIG.pagos || {};

export const importeSenal = p => Math.round((p.total || 0) * CONFIG.senal) / 100;
export const importeResto = p => Math.round(((p.total || 0) - importeSenal(p)) * 100) / 100;

/** Qué toca pagar ahora en este pedido (o null) */
export function faseDePago(p) {
  const e = p.pagoEstado || 'pendiente';
  if (p.estado === 'cancelado') return null;
  if (e === 'pendiente') return 'senal';
  if (e === 'senal' && p.estado === 'entregado') return 'resto';
  return null;
}

/** Botón animado de pagar (terminal) */
export function botonPago(p) {
  const fase = faseDePago(p);
  if (!fase) {
    const e = PAGOS[p.pagoEstado || 'pendiente'];
    return `<span class="pill ${e.cls}">${e.txt}</span>`;
  }
  const imp = fase === 'senal' ? importeSenal(p) : importeResto(p);
  return `
  <button type="button" class="pay-cta" data-pagar="${esc(p.id)}" data-fase="${fase}" aria-label="Pagar ${fase === 'senal' ? 'señal' : 'resto'} de ${euros(imp)}">
    <span class="left-side">
      <span class="pc-card"><span class="pc-card-line"></span><span class="pc-buttons"></span></span>
      <span class="pc-post"><span class="pc-post-line"></span><span class="pc-screen"><span class="pc-euro">€</span></span><span class="pc-numbers"></span><span class="pc-numbers2"></span></span>
    </span>
    <span class="right-side">
      <span><small>${fase === 'senal' ? `Pagar señal · ${CONFIG.senal} %` : 'Pagar el resto'}</small><b>${euros(imp)}</b></span>
      <svg viewBox="0 0 451.846 451.847" class="arrow" aria-hidden="true"><path d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z"/></svg>
    </span>
  </button>`;
}

/* ---------- Métodos disponibles según config.js ---------- */
function metodos() {
  const m = [];
  if (P.bizum) m.push({ id: 'bizum', nombre: 'Bizum', icono: 'phone', sub: 'Gratis · llega al momento' });
  if (P.iban) m.push({ id: 'transferencia', nombre: 'Transferencia bancaria', icono: 'bank', sub: 'Gratis · 1 día hábil' });
  if (P.stripe) m.push({ id: 'stripe', nombre: 'Tarjeta, Apple Pay o Google Pay', icono: 'card', sub: 'Pasarela segura de Stripe', tag: 'Al momento' });
  if (P.paypal) m.push({ id: 'paypal', nombre: 'PayPal', icono: 'wallet', sub: 'El importe ya va rellenado' });
  return m;
}

const fila = (k, v, copiar = v) =>
  `<div class="pay-row"><span>${esc(k)}</span><b>${esc(v)}</b>${copiar ? `<button type="button" class="icon-btn sm" data-copy="${esc(copiar)}" aria-label="Copiar ${esc(k)}">${icono('copy')}</button>` : ''}</div>`;

/* ---------- Diálogo de pago ---------- */
let dlg;
function crearDialogo() {
  dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.id = 'pagoDlg';
  dlg.innerHTML = `<div class="dlg-box pago"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="pagoBody"></div></div>`;
  document.body.appendChild(dlg);
}

export function abrirPago(p, fase = faseDePago(p), alTerminar = () => {}) {
  if (!fase) return;
  if (!dlg) crearDialogo();
  const u = store.usuarioActual();
  const imp = fase === 'senal' ? importeSenal(p) : importeResto(p);
  const ref = refPedido(p.id);
  const concepto = `${ref} ${p.respuestas?.negocio || ''}`.trim().slice(0, 35);
  const lista = metodos();
  // contenedor nuevo en cada apertura (así no se acumulan eventos)
  const body = document.createElement('div');
  $('#pagoBody', dlg).replaceChildren(body);

  body.innerHTML = `
    <h2 class="dlg-h">${fase === 'senal' ? 'Pagar la señal' : 'Pagar el resto'}</h2>
    <p class="muted pago-sub">${esc(p.planNombre)} · ${esc(p.respuestas?.negocio || '')} · ${ref}</p>
    <div class="flip-card" id="pagoCard" title="Toca para girar">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <span class="fcd-brand">${esc(CONFIG.marca)}</span>
          <span class="fcd-chip"></span>
          <svg class="fcd-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8.5 7.5a6 6 0 0 1 0 9M12 5a9.5 9.5 0 0 1 0 14M5 10a2.5 2.5 0 0 1 0 4"/></svg>
          <span class="fcd-num">•••• •••• •••• ${ref.slice(1, 5)}</span>
          <span class="fcd-name">${esc(u?.name || p.clienteNombre || '')}</span>
          <span class="fcd-amount"><small>A PAGAR</small><b>${euros(imp)}</b></span>
        </div>
        <div class="flip-card-back">
          <span class="fcd-strip"></span><span class="fcd-sign"></span><span class="fcd-cvv">${ref.slice(-3)}</span>
          <span class="fcd-secure">${icono('lock')} Nunca te pediremos los datos de tu tarjeta aquí</span>
        </div>
      </div>
    </div>
    ${lista.length ? `
    <p class="q-label">Elige cómo pagar</p>
    <div class="pay-methods" role="radiogroup">
      ${lista.map((m, i) => `
      <label class="pm">
        <span class="pm-l"><span class="pm-ic">${icono(m.icono)}</span><span class="pm-tx"><b>${esc(m.nombre)}${m.tag ? `<span class="pm-tag">${m.tag}</span>` : ''}</b><small>${esc(m.sub)}</small></span></span>
        <input type="radio" name="metodo" value="${m.id}" ${i === 0 ? 'checked' : ''}>
      </label>`).join('')}
    </div>
    <div class="pay-detail" id="pagoDetalle"></div>
    <button class="btn btn-primary w100" id="pagoOk" type="button"><span>Ya he pagado</span></button>
    <p class="muted pago-nota">Comprobamos el pago y lo verás reflejado en «Mis pedidos».</p>`
    : `<div class="empty"><b>Aún no hay formas de pago configuradas</b><p>Escríbenos y te indicamos cómo pagar.</p></div>`}`;

  const detalle = () => {
    const m = $('input[name=metodo]:checked', body)?.value;
    const d = $('#pagoDetalle', body);
    if (!d) return;
    if (m === 'bizum') d.innerHTML = `
      <p class="pay-how">Abre la app de tu banco → <b>Bizum</b> → <b>Enviar dinero</b> y usa estos datos:</p>
      ${fila('Teléfono', P.bizum, P.bizum.replace(/\s/g, ''))}${fila('Importe', euros(imp), String(imp).replace('.', ','))}${fila('Concepto', concepto)}`;
    if (m === 'transferencia') d.innerHTML = `
      <p class="pay-how">Haz una transferencia con estos datos:</p>
      ${fila('IBAN', P.iban, P.iban.replace(/\s/g, ''))}${fila('Titular', P.titular, '')}${fila('Importe', euros(imp), String(imp).replace('.', ','))}${fila('Concepto', concepto)}`;
    if (m === 'stripe') d.innerHTML = `
      <p class="pay-how">Te llevamos a la pasarela segura de Stripe. Puedes pagar con tarjeta, Apple Pay, Google Pay o Bizum online.
      Si te pide el importe, escribe <b>${euros(imp)}</b>.</p>
      <a class="btn btn-ghost w100" target="_blank" rel="noopener" data-externo
         href="${esc(P.stripe)}${P.stripe.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(p.id)}${u?.email ? `&prefilled_email=${encodeURIComponent(u.email)}` : ''}">${icono('card')} Ir a pagar ${euros(imp)}</a>`;
    if (m === 'paypal') d.innerHTML = `
      <p class="pay-how">Se abrirá PayPal con el importe ya puesto. Añade la referencia <b>${ref}</b> en la nota.</p>
      <a class="btn btn-ghost w100" target="_blank" rel="noopener" data-externo
         href="https://paypal.me/${encodeURIComponent(P.paypal)}/${imp.toFixed(2)}EUR">${icono('wallet')} Pagar ${euros(imp)} con PayPal</a>`;
    $('#pagoOk span', body).textContent = (m === 'stripe' || m === 'paypal') ? 'Ya he completado el pago' : 'Ya he hecho el pago';
  };
  body.addEventListener('change', e => { if (e.target.name === 'metodo') detalle(); });
  $('#pagoCard', body).addEventListener('click', e => e.currentTarget.classList.toggle('flipped'));
  detalle();

  $('#pagoOk', body)?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const metodo = $('input[name=metodo]:checked', body).value;
    ocupado(btn, true);
    try {
      const cambios = await store.avisarPago(p.id, { metodo, fase });
      Object.assign(p, cambios);
      const msg = `¡Hola! Acabo de pagar ${fase === 'senal' ? 'la señal' : 'el resto'} (${euros(imp)}) por ${METODOS[metodo]} del pedido ${ref} 🙌`;
      body.innerHTML = `
        <div class="exito">
          <div class="ok-ic">${icono('check')}</div>
          <h3>¡Gracias!</h3>
          <p class="muted">Hemos recibido tu aviso de pago de <b>${euros(imp)}</b> por ${METODOS[metodo]}. Lo comprobamos y lo verás en «Mis pedidos».</p>
          <a class="btn btn-wa w100" href="${waLink(msg)}" target="_blank" rel="noopener">${icono('wa')} Enviar justificante</a>
          <button class="btn btn-ghost w100" data-close type="button">Cerrar</button>
        </div>`;
      alTerminar(p);
    } catch (err) {
      toast(err.message || 'No se pudo avisar del pago', 'err');
      ocupado(btn, false);
    }
  });

  abrir(dlg);
}

/* ---------- Reseñas ---------- */
let rdlg;
export function abrirResena(p, alTerminar = () => {}) {
  if (!rdlg) {
    rdlg = document.createElement('dialog');
    rdlg.className = 'dlg dlg-sm';
    rdlg.id = 'resenaDlg';
    rdlg.innerHTML = `<div class="dlg-box"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="resenaBody"></div></div>`;
    document.body.appendChild(rdlg);
  }
  const body = $('#resenaBody', rdlg);
  body.innerHTML = `
    <h2 class="dlg-h">¿Qué tal tu web?</h2>
    <p class="muted" style="margin:-10px 0 18px;font-size:14.5px">${esc(p.respuestas?.negocio || p.planNombre)} · tu opinión ayuda a otros clientes.</p>
    <form id="resenaForm" novalidate>
      <div class="rating-wrap">${selectorEstrellas('estrellas')}</div>
      ${campo({ id: 'resTexto', name: 'texto', label: 'Cuéntanos tu experiencia', type: 'textarea', required: true, attrs: 'maxlength="400"' })}
      <button class="btn btn-primary w100" type="submit"><span>Publicar opinión</span></button>
      <p class="muted" style="font-size:12.5px;text-align:center;margin-top:10px">Se publicará en la web cuando la revisemos.</p>
    </form>`;
  abrir(rdlg);

  $('#resenaForm', body).addEventListener('submit', async e => {
    e.preventDefault();
    const est = Number($('input[name=estrellas]:checked', body)?.value || 0);
    const texto = $('#resTexto', body).value.trim();
    if (!est) return toast('Elige de 1 a 5 estrellas', 'err');
    if (texto.length < 5) { $('#resTexto', body).closest('.fc').classList.add('error'); return toast('Escribe unas palabras', 'err'); }
    const btn = $('button[type=submit]', body);
    ocupado(btn, true);
    try {
      await store.crearResena({ estrellas: est, texto, plan: p.planNombre, pedidoId: p.id });
      p.resenada = true;
      body.innerHTML = `
        <div class="exito">
          <div class="ok-ic">${icono('star')}</div>
          <h3>¡Muchas gracias!</h3>
          <p class="muted">Tu opinión se publicará en cuanto la revisemos.</p>
          ${CONFIG.trustpilot ? `<p class="muted" style="margin-bottom:14px">¿Nos ayudas también dejando tu opinión en Trustpilot? Nos ayuda mucho a crecer.</p>
          <a class="btn btn-primary w100" href="${esc(CONFIG.trustpilot)}" target="_blank" rel="noopener">${icono('star')}<span>Opinar en Trustpilot</span></a>` : ''}
          <button class="btn btn-ghost w100" data-close type="button">Cerrar</button>
        </div>`;
      alTerminar(p);
    } catch (err) {
      toast(err.message || 'No se pudo enviar', 'err');
      ocupado(btn, false);
    }
  });
}

/* Animación del botón de pago antes de abrir el diálogo */
export function animarYPagar(btn, abrirFn) {
  if (btn.classList.contains('play')) return;
  btn.classList.add('play');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => { btn.classList.remove('play'); abrirFn(); }, reducido ? 0 : 1300);
}
