/* ==========================================================
   DOMINIO Y CORREO
   Bloque compartido por el cuestionario del pedido y por el paso
   «Dominio» del proyecto:
   1. Dominio: nuevo (lo registramos) o el que ya tienes.
      Se lee seguido, tal cual quedará: www.tunegocio.es
   2. Correo del negocio, a elegir:
      - Gmail, gratis: tunegocio@gmail.com (lo creamos nosotros y le pasamos el acceso)
      - Con tu dominio, de pago (extra «correo»): info@tunegocio.es
   3. Resumen: tu web y tu correo.
   ========================================================== */
import { esc, euros } from './ui.js';
import { extrasActivos } from './sitio.js';

export const EXTENSIONES = ['.es', '.com', '.net', '.org', '.eu', '.shop'];
const CORREOS = ['info', 'hola', 'contacto', 'reservas', 'pedidos'];

const sinTildes = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n').replace(/ç/g, 'c');
/** Lo que se escribe en el nombre del dominio: minúsculas, sin tildes ni espacios */
export const limpiarNombre = (t, conPuntos = false) =>
  sinTildes(String(t || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
    .replace(/\s+/g, '').replace(conPuntos ? /[^a-z0-9.-]/g : /[^a-z0-9-]/g, '').slice(0, 63 + (conPuntos ? 20 : 0));
/** Nombre de dominio sugerido a partir del nombre del negocio */
export const sugerirNombre = negocio => limpiarNombre(String(negocio || '').replace(/&/g, 'y').replace(/\s+/g, '')).replace(/^-+|-+$/g, '').slice(0, 40);
/** Parte de un Gmail antes de la @: letras, números y puntos (Gmail no admite guiones) */
const limpiarGmail = t => sinTildes(String(t || '').toLowerCase().trim().replace(/@.*$/, '')).replace(/[^a-z0-9.]/g, '').slice(0, 30);
const limpiarBuzon = t => sinTildes(String(t || '').toLowerCase().trim().replace(/@.*$/, '')).replace(/[^a-z0-9._-]/g, '').slice(0, 40);

const precioCorreo = () => extrasActivos().find(x => x.id === 'correo')?.precio;

/** Campo cuyo ancho es el del texto escrito: así «www.» + nombre + «.es» se leen seguidos */
const auto = (cls, name, value, placeholder, extra = '') =>
  `<span class="dom-auto" data-v="${esc(value || placeholder)}"><input class="${cls}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" size="1" autocomplete="off" autocapitalize="off" spellcheck="false" ${extra}></span>`;

/**
 * HTML del bloque. valores: { tipo: 'nuevo'|'propio', nombre, ext, correoTipo: 'gmail'|'dominio', correo (parte antes de @), gmail, conCorreo }
 */
export function dominioHTML({ tipo = 'nuevo', nombre = '', ext = '.es', correoTipo = 'gmail', correo = 'info', gmail = '', conCorreo = true } = {}) {
  const propio = tipo === 'propio';
  const pc = precioCorreo();
  return `<div class="dom" data-dom data-tipo="${propio ? 'propio' : 'nuevo'}" data-correo-tipo="${correoTipo === 'dominio' ? 'dominio' : 'gmail'}">
    <div class="dom-sec">
      <h4 class="dom-h">Dirección de tu web</h4>
      <div class="dom-tipo" role="radiogroup" aria-label="Dominio">
        <label class="dom-op"><input type="radio" name="domTipo" value="nuevo" ${propio ? '' : 'checked'}><span><b>Quiero uno nuevo</b><small>Lo registramos a tu nombre</small></span></label>
        <label class="dom-op"><input type="radio" name="domTipo" value="propio" ${propio ? 'checked' : ''}><span><b>Ya tengo dominio</b><small>Lo conectamos a tu web</small></span></label>
      </div>
      <div class="dom-caja"><label class="dom-linea" aria-label="Nombre del dominio">
        <span class="dom-fijo" aria-hidden="true">www.</span>${auto('dom-in', 'domNombre', nombre, propio ? 'tunegocio.com' : 'tunegocio', 'inputmode="url" enterkeyhint="next" maxlength="80"')}
      </label>
      <select class="dom-ext-sel" name="domExt" aria-label="Extensión del dominio">${EXTENSIONES.map(x => `<option value="${x}"${x === ext ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
      <p class="dom-nota" data-dom-nota>${propio ? 'Escríbelo entero, con su extensión. Más adelante te diremos cómo conectarlo.' : 'Solo letras, números y guiones. Comprobamos que esté libre antes de registrarlo.'}</p>
      ${(pd => pd ? `<p class="dom-nota dom-solo-nuevo">Registrarlo con el alojamiento del primer año cuesta ${euros(pd)} y se añade a tu pedido como extra.</p>` : '')(extrasActivos().find(x => x.id === 'dominio')?.precio)}
    </div>
    ${conCorreo ? `
    <div class="dom-sec">
      <h4 class="dom-h">Correo de tu negocio</h4>
      <label class="fc-select dom-csel"><span>Tipo de correo</span><select name="domCorreoTipo">
        <option value="gmail"${correoTipo === 'dominio' ? '' : ' selected'}>Gmail · Gratis</option>
        <option value="dominio"${correoTipo === 'dominio' ? ' selected' : ''}>Con tu dominio${pc ? ` · ${euros(pc)}/mes` : ''}</option>
      </select></label>
      <p class="dom-nota dom-cor-gmail">Un Gmail para tu negocio. Lo creamos nosotros y te pasamos el usuario y la contraseña.</p>
      <p class="dom-nota dom-cor-dom">Más profesional: info@ con el nombre de tu web.</p>
      <div class="dom-cor dom-cor-gmail">
        <label class="dom-linea" aria-label="Tu Gmail">${auto('dom-gin', 'domGmail', gmail, 'tunegocio', 'inputmode="email" maxlength="30"')}<span class="dom-fijo">@gmail.com</span>
          <svg class="dom-lapiz" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></label>
        <p class="dom-nota">Elige cómo quieres que se llame. Si ese nombre ya está ocupado en Gmail, usamos el más parecido. Cuando esté creado, verás el usuario y la contraseña en tu proyecto.</p>
      </div>
      <div class="dom-cor dom-cor-dom">
        <label class="dom-linea" aria-label="Cómo empieza tu correo">${auto('dom-cin', 'domCorreo', correo, 'info', 'maxlength="40"')}<span class="dom-fijo">@<b data-dom-dominio></b></span>
          <svg class="dom-lapiz" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></label>
        <div class="dom-chips">${CORREOS.map(c => `<button type="button" class="dom-chip${c === correo ? ' on' : ''}" data-correo="${c}">${c}@</button>`).join('')}</div>
        <p class="dom-nota"><span>Lo creamos nosotros, te pasamos el usuario y la contraseña en tu proyecto y te lo dejamos configurado en el móvil y el ordenador.</span>${pc ? ` <span>Cuesta ${euros(pc)} al mes y se añade a tu pedido como cuota mensual.</span>` : ''}</p>
      </div>
    </div>` : ''}
    <div class="dom-ver" aria-live="polite"><span><small>Tu web</small><b data-dom-web></b></span>${conCorreo ? '<span><small>Tu correo</small><b data-dom-mail></b></span>' : ''}</div>
  </div>`;
}

// Valor de un desplegable o de un grupo de opciones
const valor = (d, name) => { const el = d.querySelector(`select[name=${name}]`); return el ? el.value : d.querySelector(`[name=${name}]:checked`)?.value; };

/** Lee el bloque. Devuelve { ok, motivo, campo, tipo, dominio, correoTipo, correo, correoNombre } */
export function leerDominio(raiz) {
  const d = raiz.querySelector('[data-dom]');
  if (!d) return { ok: true };
  const tipo = d.querySelector('[name=domTipo]:checked')?.value || 'nuevo';
  const crudo = d.querySelector('.dom-in').value;
  let dominio, motivo = '', campo = '';
  if (tipo === 'propio') {
    dominio = limpiarNombre(crudo, true).replace(/^\.+|\.+$/g, '');
    if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(dominio)) { motivo = 'Escribe tu dominio completo, por ejemplo tunegocio.com'; campo = '.dom-in'; }
  } else {
    const nombre = limpiarNombre(crudo);
    dominio = nombre + (valor(d, 'domExt') || '.es');
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(nombre) || nombre.length < 2) { motivo = 'Escribe un nombre para tu dominio: letras, números y guiones (sin espacios ni tildes)'; campo = '.dom-in'; }
  }
  const conCorreo = !!d.querySelector('[name=domCorreoTipo]');
  if (!conCorreo) return { ok: !motivo, motivo, campo, tipo, dominio, correoTipo: '', correo: '', correoNombre: '' };
  const correoTipo = valor(d, 'domCorreoTipo') || 'gmail';
  let correo = '', correoNombre = '';
  if (correoTipo === 'gmail') {
    correoNombre = limpiarGmail(d.querySelector('.dom-gin').value).replace(/^\.+|\.+$/g, '');
    // Gmail: de 6 a 30 caracteres, letras, números y puntos
    if (!motivo && (correoNombre.length < 6 || !/^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?$/.test(correoNombre) || correoNombre.includes('..'))) { motivo = 'Elige el nombre de tu Gmail: de 6 a 30 letras, números o puntos (lo que va antes de @gmail.com)'; campo = '.dom-gin'; }
    correo = correoNombre ? `${correoNombre}@gmail.com` : '';
  } else {
    correoNombre = limpiarBuzon(d.querySelector('.dom-cin').value).replace(/^[._-]+|[._-]+$/g, '');
    if (!motivo && !/^[a-z0-9]([a-z0-9._-]{0,38}[a-z0-9])?$/.test(correoNombre)) { motivo = 'Elige cómo empieza tu correo, por ejemplo info o hola'; campo = '.dom-cin'; }
    correo = correoNombre ? `${correoNombre}@${dominio}` : '';
  }
  return { ok: !motivo, motivo, campo, tipo, dominio, correoTipo, correoNombre, correo: motivo ? '' : correo };
}

/** Da vida al bloque: limpia lo que se escribe, cambia de opción y actualiza el resumen */
export function montarDominio(raiz, { alCambiar = () => {} } = {}) {
  const d = raiz.querySelector('[data-dom]');
  if (!d || d.dataset.montado) return;
  d.dataset.montado = '1';
  const input = d.querySelector('.dom-in'), nota = d.querySelector('[data-dom-nota]');
  const espejo = el => { el.parentElement.dataset.v = el.value || el.placeholder; };
  const pintar = () => {
    const tipo = d.querySelector('[name=domTipo]:checked')?.value || 'nuevo';
    d.dataset.tipo = tipo;
    const ext = valor(d, 'domExt') || '.es';
    const nombre = tipo === 'propio' ? limpiarNombre(input.value, true) : limpiarNombre(input.value);
    const dom = nombre ? (tipo === 'propio' ? nombre : nombre + ext) : (tipo === 'propio' ? 'tunegocio.com' : 'tunegocio' + ext);
    d.querySelector('[data-dom-web]').textContent = 'www.' + dom;
    d.querySelectorAll('[data-dom-dominio]').forEach(b => (b.textContent = dom));
    d.querySelectorAll('.dom-auto input').forEach(espejo);
    const ct = valor(d, 'domCorreoTipo');
    if (ct) {
      d.dataset.correoTipo = ct;
      const ci = d.querySelector('.dom-cin'), gi = d.querySelector('.dom-gin');
      d.querySelector('[data-dom-mail]').textContent = ct === 'gmail'
        ? `${limpiarGmail(gi.value) || 'tunegocio'}@gmail.com`
        : `${limpiarBuzon(ci.value) || 'info'}@${dom}`;
      d.querySelectorAll('.dom-chip').forEach(c => c.classList.toggle('on', c.dataset.correo === ci.value));
    }
    alCambiar(leerDominio(raiz));
  };
  const limpiarAlEscribir = (el, f) => el?.addEventListener('input', () => {
    const v = f(el.value);
    if (v !== el.value) el.value = v;
    d.classList.remove('dom-mal');
    (el.closest('.dom-caja') || el.closest('.dom-linea'))?.classList.remove('mal');
    pintar();
  });
  limpiarAlEscribir(input, v => (d.querySelector('[name=domTipo]:checked')?.value === 'propio' ? limpiarNombre(v, true) : limpiarNombre(v)));
  limpiarAlEscribir(d.querySelector('.dom-gin'), limpiarGmail);
  limpiarAlEscribir(d.querySelector('.dom-cin'), limpiarBuzon);
  d.addEventListener('change', e => {
    if (e.target.name === 'domTipo') {
      const propio = e.target.value === 'propio';
      input.placeholder = propio ? 'tunegocio.com' : 'tunegocio';
      // Al pasar de «ya tengo» a «nuevo» se quita la extensión que se hubiera escrito
      if (!propio) input.value = limpiarNombre(input.value.replace(/\.[a-z.]+$/, ''));
      else if (input.value && !input.value.includes('.')) input.value += valor(d, 'domExt') || '.es';
      nota.textContent = propio ? 'Escríbelo entero, con su extensión. Más adelante te diremos cómo conectarlo.' : 'Solo letras, números y guiones. Comprobamos que esté libre antes de registrarlo.';
    }
    if (e.target.name === 'domCorreoTipo') {
      const campo = d.querySelector(e.target.value === 'gmail' ? '.dom-gin' : '.dom-cin');
      // Gmail vacío: se propone el nombre del dominio (sin guiones, que Gmail no admite)
      if (e.target.value === 'gmail' && !campo.value) campo.value = limpiarGmail(limpiarNombre(input.value).replace(/-/g, ''));
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

/** Marca el campo que está mal (para el aviso del cuestionario) */
export function marcarError(raiz, r) {
  const el = r?.campo && raiz.querySelector(r.campo);
  if (!el) return;
  (el.closest('.dom-caja') || el.closest('.dom-linea'))?.classList.add('mal');
  el.focus();
}
