/* ==========================================================
   Pagos y reseñas del cliente
   ========================================================== */
import { fiesta } from './mascota.js';
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { etapaDe } from './proyecto.js';
import { $, esc, euros, icono, abrir, toast, ocupado, campo, selectorEstrellas, mailLink, refPedido, PAGOS } from './ui.js';
import { celebrar } from './efectos.js';

const P = CONFIG.pagos || {};

export const importeSenal = p => Math.round((p.total || 0) * CONFIG.senal) / 100;
export const importeResto = p => Math.round(((p.total || 0) - importeSenal(p)) * 100) / 100;

/** Qué toca pagar ahora en este pedido (o null) */
export function faseDePago(p) {
  const e = p.pagoEstado || 'pendiente';
  if (p.estado === 'cancelado') return null;
  if (e === 'pendiente') return 'senal';
  if (e === 'senal' && (p.estado === 'entregado' || ['pago', 'publicada'].includes(etapaDe(p)))) return 'resto';
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

/* ---------- Formas de pago: Bizum (si hay teléfono) y transferencia ---------- */
function metodos() {
  const m = [];
  if (P.bizum) m.push({ id: 'bizum', nombre: 'Bizum', icono: 'phone', sub: 'Al momento' });
  if (P.iban) m.push({ id: 'transferencia', nombre: 'Transferencia', icono: 'bank', sub: 'En 1 día hábil' });
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
  dlg.setAttribute('aria-labelledby', 'pagoTit');
  dlg.innerHTML = `<div class="dlg-box pago"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="pagoBody"></div></div>`;
  document.body.appendChild(dlg);
}

export function abrirPago(p, fase = faseDePago(p), alTerminar = () => {}) {
  if (!fase) return;
  if (!dlg) crearDialogo();
  const imp = fase === 'senal' ? importeSenal(p) : importeResto(p);
  const ref = refPedido(p.id);
  const concepto = `${ref} ${p.respuestas?.negocio || ''}`.trim().slice(0, 35);
  const M = metodos();
  // contenedor nuevo en cada apertura (así no se acumulan eventos)
  const body = document.createElement('div');
  $('#pagoBody', dlg).replaceChildren(body);

  body.innerHTML = `
    <h2 class="dlg-h" id="pagoTit">${fase === 'senal' ? 'Pagar la señal' : 'Pagar el resto'}</h2>
    <p class="muted pago-sub">${esc(p.planNombre)} · ${esc(p.respuestas?.negocio || '')} · ${ref}</p>
    <div class="pago-total">
      <small>${fase === 'senal' ? `Señal (${CONFIG.senal} % del total)` : 'Pago final'}</small>
      <b>${euros(imp)}</b>
      <span>IVA incluido · total del proyecto ${euros(p.total || 0)}</span>
    </div>
    ${M.length > 1 ? `<div class="pay-metodos" role="radiogroup" aria-label="Forma de pago">${M.map((x, i) => `
      <label class="pay-met"><input type="radio" name="metodo" value="${x.id}" ${i ? '' : 'checked'}><span>${icono(x.icono)}<b>${x.nombre}</b><small>${x.sub}</small></span></label>`).join('')}</div>` : ''}
    <div id="pagoDetalle"></div>`;

  const pintar = m => {
    const d = $('#pagoDetalle', body);
    if (m === 'bizum') d.innerHTML = `
      <p class="pay-how">${icono('phone')}<span>Abre la app de tu banco → <b>Bizum</b> → <b>Enviar dinero</b> y usa estos datos. Toca el botón de cada uno para copiarlo.</span></p>
      <div class="pay-detail">${fila('Teléfono', P.bizum, P.bizum.replace(/\s/g, ''))}${fila('Importe', euros(imp), String(imp).replace('.', ','))}${fila('Concepto', concepto)}</div>
      <p class="muted pago-nota">Escribe el concepto tal cual: así sabemos de quién es el pago. Bizum llega al momento y no tiene comisiones.</p>
      <button class="btn btn-primary w100" id="pagoOk" type="button" data-metodo="bizum"><span>Ya he hecho el Bizum</span></button>`;
    else if (m === 'transferencia') d.innerHTML = `
      <p class="pay-how">${icono('bank')}<span>Haz una <b>transferencia bancaria</b> desde la app o la web de tu banco con estos datos. Toca el botón de cada uno para copiarlo.</span></p>
      <div class="pay-detail">${fila('IBAN', P.iban, P.iban.replace(/\s/g, ''))}${fila('Titular', P.titular, '')}${fila('Importe', euros(imp), String(imp).replace('.', ','))}${fila('Concepto', concepto)}</div>
      <p class="muted pago-nota">Escribe el concepto tal cual: así sabemos de quién es el pago. Entre bancos españoles suele llegar en un día hábil (al momento si haces una transferencia inmediata). Sin comisiones por nuestra parte.</p>
      <button class="btn btn-primary w100" id="pagoOk" type="button" data-metodo="transferencia"><span>Ya he hecho la transferencia</span></button>`;
    else d.innerHTML = `<div class="empty"><b>Aún no tenemos los datos de pago configurados</b><p>Escríbenos y te los enviamos.</p></div>`;
  };
  pintar(M[0]?.id);
  body.addEventListener('change', e => { if (e.target.name === 'metodo') pintar(e.target.value); });

  body.addEventListener('click', async e => {
    const btn = e.target.closest('#pagoOk');
    if (!btn) return;
    const metodo = btn.dataset.metodo;
    ocupado(btn, true);
    try {
      const cambios = await store.avisarPago(p.id, { metodo, fase });
      Object.assign(p, cambios);
      const que = metodo === 'bizum' ? 'el Bizum' : 'la transferencia';
      const msg = `Hola, acabo de hacer ${que} de ${fase === 'senal' ? 'la señal' : 'el resto'} (${euros(imp)}) del pedido ${ref}. Adjunto el justificante.`;
      body.innerHTML = `
        <div class="exito">
          <div class="ok-ic">${icono('check')}</div>
          <h3>Aviso de pago recibido</h3>
          <p class="muted">Gracias. En cuanto nos llegue ${que} de <b>${euros(imp)}</b> lo confirmamos, lo verás en «Mis proyectos» y te llegará el recibo por correo.</p>
          <a class="btn btn-ghost w100" href="${mailLink(`Justificante de pago ${ref}`, msg)}">${icono('mail')} Enviar justificante por correo</a>
          <p class="muted" style="font-size:13px;margin:-4px 0 12px">También puedes subir el justificante en la pestaña «Archivos» de tu proyecto.</p>
          <button class="btn btn-ghost w100" data-close type="button">Cerrar</button>
        </div>`;
      celebrar(body.querySelector('.ok-ic'));
      fiesta('¡Aviso de pago enviado!', `Lo confirmamos en cuanto llegue ${que}`);
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
          <h3>Gracias por tu valoración</h3>
          <p class="muted">La publicaremos en la web después de revisarla.</p>
          ${CONFIG.trustpilot || CONFIG.dominio ? `<p class="muted" style="margin-bottom:14px">¿Nos ayudas un poco más? Copia tu opinión y pégala también en Trustpilot: es lo que miran otros clientes antes de decidirse.</p>
          <a class="btn btn-primary w100" href="${esc(CONFIG.dominio ? `https://es.trustpilot.com/evaluate/${CONFIG.dominio}` : CONFIG.trustpilot)}" target="_blank" rel="noopener" data-copy="${esc(texto)}">${icono('star')}<span>Opinar también en Trustpilot</span></a>` : ''}
          <button class="btn btn-ghost w100" data-close type="button">Cerrar</button>
        </div>`;
      celebrar(body.querySelector('.ok-ic'));
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
