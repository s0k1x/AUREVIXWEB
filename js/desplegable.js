/* ==========================================================
   DESPLEGABLES PROPIOS
   Sustituye el menú nativo del móvil (el gris del iPhone) por uno
   con el estilo de la web. El <select> original se queda en su
   sitio (muestra el valor y sigue funcionando con formularios y
   con el código que lee .value); solo cambia el menú que se abre.
   - Móvil: hoja desde abajo con fondo oscurecido.
   - Ordenador: menú flotante bajo el campo.
   Para dejar uno nativo: <select data-nativo>.
   ========================================================== */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const movil = () => matchMedia('(max-width: 640px)').matches;

let abierto = null; // { dlg, select, boton }

function etiquetaDe(select) {
  const id = select.id && document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
  const t = id?.textContent
    || select.closest('label')?.querySelector('span:not(.dd-campo), b')?.textContent
    || select.closest('.fc-select, .field')?.querySelector(':scope > span:not(.dd-campo), :scope > label')?.textContent
    || select.getAttribute('aria-label') || '';
  return t.replace(/\s+/g, ' ').trim();
}

function cerrar(volverFoco = true) {
  if (!abierto) return;
  const { dlg, boton } = abierto;
  abierto = null;
  dlg.classList.add('saliendo');
  const fin = () => { try { dlg.close(); } catch { /* ya cerrado */ } dlg.remove(); };
  matchMedia('(prefers-reduced-motion: reduce)').matches ? fin() : setTimeout(fin, 160);
  if (volverFoco) boton?.focus({ preventScroll: true });
}

function elegir(select, valor) {
  if (select.value !== valor) {
    select.value = valor;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  cerrar();
}

function opcionesHTML(select) {
  let html = '';
  const fila = (o, i) => `<button type="button" role="option" class="dd-op${o.selected ? ' on' : ''}" data-i="${i}" aria-selected="${o.selected}" ${o.disabled ? 'disabled' : ''}><span>${esc(o.textContent.trim())}</span><i>${CHECK}</i></button>`;
  const ops = [...select.options];
  [...select.children].forEach(n => {
    if (n.tagName === 'OPTGROUP') {
      html += `<div class="dd-grupo">${esc(n.label)}</div>`;
      [...n.children].forEach(o => { html += fila(o, ops.indexOf(o)); });
    } else if (n.tagName === 'OPTION' && !(n.hidden || (n.disabled && n.value === '' && !n.selected))) {
      html += fila(n, ops.indexOf(n));
    }
  });
  return html;
}

function abrir(select, boton) {
  if (abierto) cerrar(false);
  if (select.disabled) return;
  const titulo = etiquetaDe(select);
  const dlg = document.createElement('dialog');
  dlg.className = 'dd' + (movil() ? ' dd-hoja' : ' dd-flota');
  dlg.dataset.backdrop = 'no';
  dlg.setAttribute('aria-label', titulo || 'Elige una opción');
  dlg.innerHTML = `<div class="dd-caja">
      ${movil() ? `<div class="dd-tirador" aria-hidden="true"></div>${titulo ? `<div class="dd-titulo">${esc(titulo)}</div>` : ''}` : ''}
      <div class="dd-lista" role="listbox">${opcionesHTML(select)}</div>
    </div>`;
  // Dentro de un diálogo abierto, el menú va en la capa superior igualmente (showModal)
  document.body.appendChild(dlg);
  abierto = { dlg, select, boton };
  dlg.showModal();

  if (!movil()) {
    const r = select.getBoundingClientRect();
    const caja = dlg.querySelector('.dd-caja');
    const ancho = Math.max(r.width, 260);
    const alto = Math.min(caja.scrollHeight, 320);
    const abajo = innerHeight - r.bottom - 12;
    const arriba = r.top - 12;
    const y = abajo >= alto || abajo >= arriba ? r.bottom + 6 : Math.max(12, r.top - 6 - alto);
    dlg.style.left = Math.min(Math.max(12, r.left), innerWidth - ancho - 12) + 'px';
    dlg.style.top = y + 'px';
    dlg.style.width = ancho + 'px';
  }
  const on = dlg.querySelector('.dd-op.on') || dlg.querySelector('.dd-op:not([disabled])');
  on?.focus({ preventScroll: true });
  on?.scrollIntoView({ block: 'nearest' });

  dlg.addEventListener('click', e => {
    const op = e.target.closest('.dd-op');
    if (op && !op.disabled) return elegir(select, select.options[+op.dataset.i].value);
    if (e.target === dlg) cerrar();
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); cerrar(); });
  dlg.addEventListener('keydown', e => {
    const ops = [...dlg.querySelectorAll('.dd-op:not([disabled])')];
    const i = ops.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = e.key === 'ArrowDown' ? Math.min(ops.length - 1, i + 1) : Math.max(0, i - 1);
      ops[n]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); (e.key === 'Home' ? ops[0] : ops.at(-1))?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault(); cerrar();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const desde = ops.slice(i + 1).concat(ops.slice(0, i + 1));
      desde.find(b => b.textContent.trim().toLowerCase().startsWith(k))?.focus();
    }
  });
}

function mejorar(select) {
  if (select.dataset.dd || select.multiple || select.size > 1 || select.hasAttribute('data-nativo')) return;
  select.dataset.dd = '1';
  const caja = document.createElement('span');
  caja.className = 'dd-campo';
  const disp = getComputedStyle(select).display;
  if (disp.startsWith('inline')) caja.classList.add('dd-inline');
  select.replaceWith(caja);
  caja.appendChild(select);
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'dd-btn';
  boton.setAttribute('aria-haspopup', 'listbox');
  const nombre = () => `${etiquetaDe(select) || 'Opción'}: ${select.selectedOptions[0]?.textContent.trim() || 'sin elegir'}`;
  boton.setAttribute('aria-label', nombre());
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  caja.appendChild(boton);
  boton.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrir(select, boton); });
  boton.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(select, boton); }
  });
  boton.addEventListener('focus', () => { boton.setAttribute('aria-label', nombre()); caja.classList.add('foco'); });
  boton.addEventListener('blur', () => caja.classList.remove('foco'));
  const sync = () => { boton.disabled = select.disabled; boton.setAttribute('aria-label', nombre()); };
  select.addEventListener('change', sync);
  new MutationObserver(sync).observe(select, { attributes: true, attributeFilter: ['disabled'] });
  sync();
}

export function mejorarDesplegables(raiz = document) {
  raiz.querySelectorAll?.('select:not([data-dd])').forEach(mejorar);
}

let iniciado = false;
export function iniciarDesplegables() {
  if (iniciado) return;
  iniciado = true;
  mejorarDesplegables();
  let pendiente = false;
  new MutationObserver(muts => {
    if (pendiente) return;
    if (!muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.tagName === 'SELECT' || n.querySelector?.('select:not([data-dd])'))))) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; mejorarDesplegables(); });
  }).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', () => { if (abierto && !abierto.dlg.classList.contains('dd-hoja')) cerrar(false); });
}
