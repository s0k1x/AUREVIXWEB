/* ==========================================================
   TELÉFONOS Y CORREOS QUE SEAN DE VERDAD
   Se aplica solo a todos los campos type="tel" y type="email" de
   la web (también a los que se pintan después):
   - Teléfono: un solo número. Español (9 cifras que empiezan por
     6, 7, 8 o 9, con o sin +34) o internacional (+ y de 8 a 15
     cifras). Solo deja escribir cifras, espacios y el «+» inicial,
     y lo deja bonito al salir: +34 612 345 678.
   - Correo: un solo correo, sin espacios ni comas, con dominio
     válido. Avisa de erratas típicas (gmial.com → gmail.com).
   Si un formulario se envía con un dato mal, no sale y se marca.
   ========================================================== */

const MAX_TEL = 20;

/** Valida un teléfono. Devuelve { ok, valor (formateado), motivo } */
export function telefono(texto) {
  const crudo = String(texto || '').trim();
  if (!crudo) return { ok: false, valor: '', motivo: 'Escribe un teléfono' };
  if (/[a-z]/i.test(crudo)) return { ok: false, valor: crudo, motivo: 'El teléfono solo puede llevar números' };
  if ((crudo.match(/\+/g) || []).length > 1 || /[,;/]|\by\b/.test(crudo)) return { ok: false, valor: crudo, motivo: 'Escribe un solo teléfono' };
  let d = crudo.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  // España
  let es = d.startsWith('+34') ? d.slice(3) : (!d.startsWith('+') ? d : '');
  if (es && /^\d+$/.test(es)) {
    if (es.length !== 9) return { ok: false, valor: crudo, motivo: es.length > 9 ? 'Sobran cifras: un teléfono español tiene 9. Si es de otro país, empieza por + y su prefijo' : 'Faltan cifras: un teléfono español tiene 9' };
    if (!/^[6789]/.test(es)) return { ok: false, valor: crudo, motivo: 'Un teléfono español empieza por 6, 7, 8 o 9' };
    if (/^(\d)\1{8}$/.test(es) || es === '123456789' || es === '987654321') return { ok: false, valor: crudo, motivo: 'Escribe un teléfono real' };
    return { ok: true, valor: `+34 ${es.slice(0, 3)} ${es.slice(3, 6)} ${es.slice(6)}`, motivo: '' };
  }
  // Internacional (E.164: hasta 15 cifras con el prefijo)
  const n = d.slice(1);
  if (!/^\d+$/.test(n) || n.length < 8 || n.length > 15 || n.startsWith('0')) return { ok: false, valor: crudo, motivo: 'Escribe el teléfono con su prefijo, por ejemplo +34 612 345 678' };
  return { ok: true, valor: '+' + n, motivo: '' };
}

const ERRATAS = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.es': 'gmail.com', 'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hormail.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outllok.com': 'outlook.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.e': 'yahoo.es',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'telefonica.ne': 'telefonica.net'
};
/** Valida un correo. Devuelve { ok, valor (limpio), motivo, sugerencia } */
export function correo(texto) {
  const v = String(texto || '').trim().toLowerCase();
  if (!v) return { ok: false, valor: '', motivo: 'Escribe un correo' };
  if (/[\s,;]/.test(v) || (v.match(/@/g) || []).length > 1) return { ok: false, valor: v, motivo: 'Escribe un solo correo, sin espacios' };
  if (v.length > 120) return { ok: false, valor: v, motivo: 'El correo es demasiado largo' };
  const m = v.match(/^([a-z0-9._%+-]+)@([a-z0-9-]+(\.[a-z0-9-]+)*\.([a-z]{2,24}))$/);
  if (!m || m[1].startsWith('.') || m[1].endsWith('.') || m[1].includes('..') || /(^|\.)-|-(\.|$)/.test(m[2])) return { ok: false, valor: v, motivo: 'Ese correo no es válido. Ejemplo: nombre@gmail.com' };
  // Erratas evidentes en el dominio: no se acepta, se propone el bueno
  const sugerencia = ERRATAS[m[2]] ? `${m[1]}@${ERRATAS[m[2]]}` : /\.con$/.test(m[2]) ? `${m[1]}@${m[2].replace(/\.con$/, '.com')}` : '';
  if (sugerencia) return { ok: false, valor: v, motivo: '¿Quisiste decir', sugerencia };
  return { ok: true, valor: v, motivo: '' };
}

/* ---------- Montaje automático en los campos ---------- */
const aviso = (input, texto, tipo = 'err', boton = '') => {
  const c = input.closest('.fc') || input.parentElement;
  let el = c.querySelector(':scope > .v-aviso');
  if (!texto) { el?.remove(); c.classList.remove('v-mal'); return; }
  if (!el) { el = document.createElement('small'); el.className = 'v-aviso'; el.setAttribute('aria-live', 'polite'); c.appendChild(el); }
  el.className = `v-aviso ${tipo}`;
  el.innerHTML = '';
  el.append(texto);
  if (boton) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'link-btn'; b.textContent = boton;
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', () => { input.value = boton; input.dispatchEvent(new Event('input', { bubbles: true })); aviso(input, ''); });
    el.append(' ', b, '?');
  }
  c.classList.toggle('v-mal', tipo === 'err');
};

function montarTel(input) {
  input.dataset.v = '1';
  input.setAttribute('inputmode', 'tel');
  input.setAttribute('maxlength', MAX_TEL);
  if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'tel');
  input.addEventListener('input', () => {
    // Solo cifras, espacios, guiones, paréntesis y un «+» al principio
    let v = input.value.replace(/[^\d+\s()-]/g, '');
    v = v.charAt(0) + v.slice(1).replace(/\+/g, '');
    if (v !== input.value) input.value = v;
    if (input.closest('.v-mal')) comprobar(input);
  });
  input.addEventListener('blur', () => comprobar(input));
}
function montarEmail(input) {
  input.dataset.v = '1';
  input.setAttribute('inputmode', 'email');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('spellcheck', 'false');
  if (!input.getAttribute('maxlength')) input.setAttribute('maxlength', '120');
  input.addEventListener('input', () => {
    const v = input.value.replace(/[\s,;]/g, '');
    if (v !== input.value) input.value = v;
    if (input.closest('.v-mal')) comprobar(input);
  });
  input.addEventListener('blur', () => comprobar(input));
}

/** Comprueba un campo y pinta el aviso. Devuelve true si vale (o si está vacío y no es obligatorio) */
export function comprobar(input) {
  if (input.disabled) return true;
  if (!input.value.trim()) { aviso(input, ''); input.setCustomValidity(''); return !input.required; }
  if (input.type === 'tel') {
    const r = telefono(input.value);
    if (r.ok) { input.value = r.valor; aviso(input, ''); input.setCustomValidity(''); return true; }
    aviso(input, r.motivo); input.setCustomValidity(r.motivo); return false;
  }
  if (input.type === 'email') {
    const r = correo(input.value);
    if (!r.ok) { aviso(input, r.motivo, 'err', r.sugerencia || ''); input.setCustomValidity(r.sugerencia ? `¿Quisiste decir ${r.sugerencia}?` : r.motivo); return false; }
    input.value = r.valor; input.setCustomValidity(''); aviso(input, '');
    return true;
  }
  return true;
}

/** Revisa todos los teléfonos y correos de un bloque. Devuelve el primer campo que está mal (o null) */
export function primerMal(raiz) {
  for (const i of raiz.querySelectorAll('input[type=tel], input[type=email]')) if (i.offsetParent !== null && !comprobar(i)) return i;
  return null;
}

let vigilando = false;
export function vigilarCampos() {
  if (vigilando) return;
  vigilando = true;
  const montar = raiz => raiz.querySelectorAll?.('input[type=tel]:not([data-v]), input[type=email]:not([data-v])').forEach(i => (i.type === 'tel' ? montarTel : montarEmail)(i));
  montar(document);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.('input') ? montar(n.parentElement || n) : montar(n))))).observe(document.body, { childList: true, subtree: true });
  // Un formulario con un teléfono o correo mal no se envía (se para antes que su propio código)
  document.addEventListener('submit', e => {
    const mal = primerMal(e.target);
    if (!mal) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    mal.closest('.fc')?.classList.add('error');
    mal.focus();
  }, true);
}
