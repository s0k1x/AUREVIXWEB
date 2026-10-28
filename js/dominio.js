/* ==========================================================
   DOMINIO Y CORREO PROFESIONAL
   Bloque compartido por el cuestionario del pedido y por el paso
   «Dominio» del proyecto:
   - ¿Dominio nuevo o ya tienes uno?
   - Nombre + extensión (botones grandes, se ve bien en el móvil)
   - Nombre del correo profesional (info@, hola@…)
   - Vista previa: www.tunegocio.es · info@tunegocio.es
   ========================================================== */
import { esc } from './ui.js';

export const EXTENSIONES = ['.es', '.com', '.net', '.org', '.eu', '.shop'];
const CORREOS = ['info', 'hola', 'contacto', 'reservas', 'pedidos'];

const sinTildes = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n').replace(/ç/g, 'c');
/** Lo que se escribe en el nombre del dominio: minúsculas, sin tildes ni espacios */
export const limpiarNombre = (t, conPuntos = false) =>
  sinTildes(String(t || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
    .replace(/\s+/g, '').replace(conPuntos ? /[^a-z0-9.-]/g : /[^a-z0-9-]/g, '').slice(0, 63 + (conPuntos ? 20 : 0));
/** Nombre de dominio sugerido a partir del nombre del negocio */
export const sugerirNombre = negocio => limpiarNombre(String(negocio || '').replace(/&/g, 'y').replace(/\s+/g, '')).replace(/^-+|-+$/g, '').slice(0, 40);

/**
 * HTML del bloque. valores: { tipo: 'nuevo'|'propio', nombre, ext, correo (parte antes de @), conCorreo }
 */
export function dominioHTML({ tipo = 'nuevo', nombre = '', ext = '.es', correo = 'info', conCorreo = true } = {}) {
  const propio = tipo === 'propio';
  return `<div class="dom" data-dom data-tipo="${propio ? 'propio' : 'nuevo'}">
    <div class="dom-tipo" role="radiogroup" aria-label="Dominio">
      <label class="dom-op"><input type="radio" name="domTipo" value="nuevo" ${propio ? '' : 'checked'}><span><b>Quiero uno nuevo</b><small>Lo registramos a tu nombre</small></span></label>
      <label class="dom-op"><input type="radio" name="domTipo" value="propio" ${propio ? 'checked' : ''}><span><b>Ya tengo dominio</b><small>Lo conectamos a tu web</small></span></label>
    </div>
    <label class="dom-campo">
      <span class="dom-www" aria-hidden="true">www.</span>
      <input class="dom-in" name="domNombre" value="${esc(nombre)}" placeholder="${propio ? 'tunegocio.com' : 'tunegocio'}" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" enterkeyhint="next" aria-label="Nombre del dominio">
      <span class="dom-suf" aria-hidden="true">${esc(ext)}</span>
    </label>
    <div class="dom-exts" role="radiogroup" aria-label="Extensión">
      ${EXTENSIONES.map(x => `<label class="dom-x"><input type="radio" name="domExt" value="${x}" ${x === ext ? 'checked' : ''}><span>${x}</span></label>`).join('')}
    </div>
    <p class="dom-nota" data-dom-nota>${propio ? 'Escríbelo entero, con su extensión. Más adelante te diremos cómo conectarlo.' : 'Solo letras, números y guiones. Comprobamos que esté libre antes de registrarlo.'}</p>
    ${conCorreo ? `
    <div class="dom-cor">
      <span class="q-label">Correo profesional</span>
      <p class="dom-nota">El correo de tu negocio, con tu dominio. Elige cómo empieza.</p>
      <label class="dom-campo dom-cor-campo">
        <input class="dom-cin" name="domCorreo" value="${esc(correo)}" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Nombre del correo">
        <span class="dom-arroba">@<b data-dom-dominio></b></span>
      </label>
      <div class="dom-chips">${CORREOS.map(c => `<button type="button" class="dom-chip${c === correo ? ' on' : ''}" data-correo="${c}">${c}@</button>`).join('')}</div>
    </div>` : ''}
    <div class="dom-ver" aria-live="polite"><span><small>Tu web</small><b data-dom-web></b></span>${conCorreo ? '<span><small>Tu correo</small><b data-dom-mail></b></span>' : ''}</div>
  </div>`;
}

// Ancho exacto del texto escrito, para que la @ vaya justo detrás
let lienzo;
function anchoTexto(input, texto) {
  lienzo ||= document.createElement('canvas').getContext('2d');
  const cs = getComputedStyle(input);
  lienzo.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return Math.ceil(lienzo.measureText(texto).width);
}

/** Lee el bloque. Devuelve { ok, motivo, tipo, dominio, correo, correoNombre } */
export function leerDominio(raiz) {
  const d = raiz.querySelector('[data-dom]');
  if (!d) return { ok: true };
  const tipo = d.querySelector('[name=domTipo]:checked')?.value || 'nuevo';
  const crudo = d.querySelector('.dom-in').value;
  let dominio, motivo = '';
  if (tipo === 'propio') {
    dominio = limpiarNombre(crudo, true).replace(/^\.+|\.+$/g, '');
    if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(dominio)) motivo = 'Escribe tu dominio completo, por ejemplo tunegocio.com';
  } else {
    const nombre = limpiarNombre(crudo);
    dominio = nombre + (d.querySelector('[name=domExt]:checked')?.value || '.es');
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(nombre) || nombre.length < 2) motivo = 'Escribe un nombre para tu dominio: letras, números y guiones (sin espacios ni tildes)';
  }
  const ci = d.querySelector('.dom-cin');
  const correoNombre = ci ? limpiarNombre(ci.value, true).replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.') : '';
  if (!motivo && ci && !/^[a-z0-9]([a-z0-9._-]{0,38}[a-z0-9])?$/.test(correoNombre)) motivo = 'Elige cómo empieza tu correo, por ejemplo info o hola';
  return { ok: !motivo, motivo, tipo, dominio, correoNombre, correo: ci && !motivo ? `${correoNombre}@${dominio}` : '' };
}

/** Da vida al bloque: limpia lo que se escribe, cambia de tipo y actualiza la vista previa */
export function montarDominio(raiz, { alCambiar = () => {} } = {}) {
  const d = raiz.querySelector('[data-dom]');
  if (!d || d.dataset.montado) return;
  d.dataset.montado = '1';
  const input = d.querySelector('.dom-in'), suf = d.querySelector('.dom-suf'), nota = d.querySelector('[data-dom-nota]');
  const pintar = () => {
    const tipo = d.querySelector('[name=domTipo]:checked')?.value || 'nuevo';
    d.dataset.tipo = tipo;
    const ext = d.querySelector('[name=domExt]:checked')?.value || '.es';
    suf.textContent = ext;
    const nombre = tipo === 'propio' ? limpiarNombre(input.value, true) : limpiarNombre(input.value);
    const dom = nombre ? (tipo === 'propio' ? nombre : nombre + ext) : (tipo === 'propio' ? 'tunegocio.com' : 'tunegocio' + ext);
    d.querySelector('[data-dom-web]').textContent = 'www.' + dom;
    d.querySelectorAll('[data-dom-dominio]').forEach(b => (b.textContent = dom));
    const ci = d.querySelector('.dom-cin');
    if (ci) {
      ci.style.width = `${anchoTexto(ci, ci.value || 'info') + 6}px`;
      d.querySelector('[data-dom-mail]').textContent = `${limpiarNombre(ci.value, true) || 'info'}@${dom}`;
      d.querySelectorAll('.dom-chip').forEach(c => c.classList.toggle('on', c.dataset.correo === ci.value));
    }
    alCambiar(leerDominio(raiz));
  };
  input.addEventListener('input', () => {
    const tipo = d.querySelector('[name=domTipo]:checked')?.value;
    const v = tipo === 'propio' ? limpiarNombre(input.value, true) : limpiarNombre(input.value);
    if (v !== input.value) input.value = v;
    d.classList.remove('dom-mal');
    pintar();
  });
  d.querySelector('.dom-cin')?.addEventListener('input', e => {
    const v = limpiarNombre(e.target.value, true);
    if (v !== e.target.value) e.target.value = v;
    pintar();
  });
  d.addEventListener('change', e => {
    if (e.target.name === 'domTipo') {
      const propio = e.target.value === 'propio';
      input.placeholder = propio ? 'tunegocio.com' : 'tunegocio';
      // Al pasar de «ya tengo» a «nuevo» se quita la extensión que se hubiera escrito
      if (!propio) input.value = limpiarNombre(input.value.replace(/\.[a-z.]+$/, ''));
      else if (input.value && !input.value.includes('.')) input.value += d.querySelector('[name=domExt]:checked')?.value || '.es';
      nota.textContent = propio ? 'Escríbelo entero, con su extensión. Más adelante te diremos cómo conectarlo.' : 'Solo letras, números y guiones. Comprobamos que esté libre antes de registrarlo.';
    }
    pintar();
  });
  d.addEventListener('click', e => {
    const c = e.target.closest('.dom-chip');
    if (!c) return;
    d.querySelector('.dom-cin').value = c.dataset.correo;
    pintar();
  });
  pintar();
}
