/* ==========================================================
   CAMPO DE CÓDIGO (OTP) · 6 casillas
   Basado en «OTP Input» de konsstepnov (21st.dev), sin React:
   las casillas dibujan UN campo real que va por encima, así
   que escribir, pegar, el autorrelleno del iPhone («Desde
   Mail») y los lectores de pantalla funcionan como en
   cualquier campo.
   - Un aro se desliza a la casilla activa.
   - Cada cifra entra con un pequeño salto.
   - Código rechazado: la fila se sacude y se pone en rojo.
   - Código aceptado: las casillas se encienden en ola.
   Uso: const o = crearOtp({ alCompletar(codigo) {} });
        caja.append(o.el); o.estado('error', 'Mensaje'); o.limpiar();
   ========================================================== */
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
let n = 0;

export function crearOtp({ largo = 6, etiqueta = 'Código de verificación', alCambiar = () => {}, alCompletar = () => {} } = {}) {
  const id = `otp${++n}`;
  const el = document.createElement('div');
  el.className = 'otp';
  el.dataset.estado = 'idle';
  el.innerHTML = `
    <div class="otp-fila">
      <div class="otp-celdas" aria-hidden="true">
        ${Array.from({ length: largo }, (_, i) => `<span class="otp-celda${i === largo / 2 ? ' otp-medio' : ''}" style="--i:${i}"><b></b></span>`).join('')}
        <i class="otp-aro"></i>
      </div>
      <input id="${id}" class="otp-campo" type="text" inputmode="numeric" autocomplete="one-time-code" autocorrect="off" autocapitalize="off"
        spellcheck="false" maxlength="${largo + 4}" aria-label="${etiqueta}" aria-describedby="${id}m" enterkeyhint="done">
    </div>
    <p class="otp-msg" id="${id}m" aria-live="polite"></p>`;
  const campo = el.querySelector('input');
  const celdas = [...el.querySelectorAll('.otp-celda')];
  const aro = el.querySelector('.otp-aro');
  const msg = el.querySelector('.otp-msg');
  let anterior = '';

  const limpio = v => v.replace(/\D/g, '').slice(0, largo);
  const pintar = () => {
    const v = campo.value, foco = document.activeElement === campo;
    const ini = Math.min(campo.selectionStart ?? v.length, v.length), fin = Math.min(campo.selectionEnd ?? v.length, v.length);
    const rango = foco && fin > ini;
    const activa = Math.min(ini, largo - 1);
    celdas.forEach((c, i) => {
      const d = v[i] || '';
      const b = c.firstElementChild;
      if (b.textContent !== d) {
        b.textContent = d;
        // La cifra nueva entra con un salto (solo al escribirla, no al borrar)
        if (d && !quieto()) { c.classList.remove('entra'); void c.offsetWidth; c.classList.add('entra'); }
      }
      c.classList.toggle('llena', !!d);
      c.classList.toggle('sel', rango && i >= ini && i < fin);
      c.classList.toggle('cursor', foco && !rango && i === activa && !d);
    });
    // El aro se desliza hasta la casilla activa
    const c = celdas[activa];
    aro.style.transform = `translateX(${c.offsetLeft}px)`;
    aro.style.width = `${c.offsetWidth}px`;
    el.classList.toggle('foco', foco && !rango && el.dataset.estado !== 'ok');
  };

  campo.addEventListener('input', () => {
    const v = limpio(campo.value);
    if (v !== campo.value) { campo.value = v; campo.setSelectionRange(v.length, v.length); }
    if (el.dataset.estado === 'error') estado('idle', '');
    pintar();
    if (v === anterior) return;
    anterior = v;
    alCambiar(v);
    if (v.length === largo) alCompletar(v);
  });
  // Un código entero pegado sustituye lo escrito, esté donde esté el cursor
  campo.addEventListener('paste', e => {
    if (limpio(e.clipboardData?.getData('text') || '').length === largo) campo.setSelectionRange(0, campo.value.length);
  });
  ['focus', 'blur', 'select', 'keyup', 'click'].forEach(t => campo.addEventListener(t, () => requestAnimationFrame(pintar)));
  document.addEventListener('selectionchange', () => { if (document.activeElement === campo) pintar(); });
  addEventListener('resize', pintar);

  function estado(e, texto = '') {
    const antes = el.dataset.estado;
    el.dataset.estado = e;
    msg.textContent = texto;
    campo.readOnly = e === 'ok' || e === 'cargando';
    campo.setAttribute('aria-invalid', String(e === 'error'));
    // Una sola sacudida por cada rechazo nuevo
    if (e === 'error' && antes !== 'error' && !quieto()) {
      const f = el.querySelector('.otp-celdas');
      f.classList.remove('sacude'); void f.offsetWidth; f.classList.add('sacude');
      navigator.vibrate?.(60);
    }
    pintar();
  }

  return {
    el, campo, estado,
    get valor() { return campo.value; },
    limpiar() { campo.value = ''; anterior = ''; estado('idle', ''); },
    enfocar() { campo.focus({ preventScroll: true }); campo.setSelectionRange(campo.value.length, campo.value.length); pintar(); },
    pintar
  };
}
