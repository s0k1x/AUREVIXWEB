/* ==========================================================
   Hola7273! · Formulario de contacto (llega a hola7273@gmail.com)
   ========================================================== */
(function () {
  const f = document.getElementById('contactoForm');
  if (!f) return;
  const C = window.HOLA, $ = id => document.getElementById(id);
  const estado = $('cEstado'), boton = f.querySelector('button[type=submit]');

  function error(id, txt) {
    const i = $(id), e = $(id + 'E');
    if (e) e.textContent = txt || '';
    if (i) { i.setAttribute('aria-invalid', !!txt); if (txt) i.setAttribute('aria-describedby', id + 'E'); }
    return !txt;
  }
  const mostrar = (txt, ok) => { estado.textContent = txt; estado.className = 'msg ' + (ok ? 'ok' : 'mal'); estado.hidden = false; };

  f.addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('cNombre').value.trim(), email = $('cEmail').value.trim(), msg = $('cMsg').value.trim();
    const ok = [
      error('cNombre', nombre.length < 2 ? 'Escribe tu nombre.' : ''),
      error('cEmail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Escribe un correo válido para poder responderte.' : ''),
      error('cMsg', msg.length < 5 ? 'Cuéntanos en qué podemos ayudarte.' : ''),
      error('cAcepto', !$('cAcepto').checked ? 'Necesitamos que aceptes la política de privacidad.' : '')
    ].every(Boolean);
    if (!ok) { f.querySelector('[aria-invalid=true]').focus(); return; }
    if (f.querySelector('[name=_honey]').value) return;

    boton.disabled = true; const txt = boton.innerHTML; boton.textContent = 'Enviando…';
    try {
      const r = await fetch(C.aviso.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: `Mensaje de ${nombre} desde la web`, _template: 'table', _captcha: 'false', _replyto: email,
          Nombre: nombre, email, Teléfono: $('cTel').value.trim() || '—', Mensaje: msg })
      });
      if (!r.ok) throw new Error();
      f.reset();
      mostrar('¡Gracias! Hemos recibido tu mensaje y te responderemos lo antes posible.', true);
    } catch (err) {
      mostrar(`No se ha podido enviar. Escríbenos directamente a ${C.email} o llama al ${C.telefonoVisible}.`, false);
    } finally { boton.disabled = false; boton.innerHTML = txt; }
  });
})();
