/* ==========================================================
   Hola7273! · Sistema de citas online
   Paso 1 servicio · Paso 2 día y hora · Paso 3 datos · Hecho
   ========================================================== */
(function () {
  const f = document.getElementById('reserva');
  if (!f) return;
  const C = window.HOLA, $ = id => document.getElementById(id);
  const servs = C.servicios || [];
  const st = { paso: 1, serv: null, fecha: null, hora: null, ocupadas: null, enviando: false };

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const aHora = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const fechaLarga = s => new Date(s + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const eur = n => n.toLocaleString('es-ES') + ' €';
  const vivo = t => { $('resVivo').textContent = t; };

  /* ---------- Paso 1: servicios ---------- */
  $('resServs').innerHTML = servs.map(s => `
    <label class="serv"><input type="radio" name="servicio" value="${s.id}">
      <span class="sv-i"><b>${s.nombre}</b><small>${s.min} min · ${s.desc}</small></span>
      <span class="precio">${s.id === 'color' ? 'desde ' : ''}${eur(s.precio)}</span></label>`).join('');
  f.addEventListener('change', e => {
    if (e.target.name !== 'servicio') return;
    st.serv = servs.find(s => s.id === e.target.value); st.hora = null;
    actualizarNav();
  });
  const pedido = new URLSearchParams(location.search).get('servicio');
  if (pedido) { const r = f.querySelector(`input[value="${CSS.escape(pedido)}"]`); if (r) { r.checked = true; st.serv = servs.find(s => s.id === pedido); } }

  /* ---------- Paso 2: días y horas ---------- */
  const dias = [];
  for (let i = 0, d = new Date(); i < C.diasVista; i++, d.setDate(d.getDate() + 1)) {
    const t = (C.horario[d.getDay()] || []);
    dias.push({ fecha: iso(d), d: new Date(d), abierto: t.length > 0 && !(C.festivos || []).includes(iso(d)) });
  }
  $('resDias').innerHTML = dias.map(x => `<button type="button" data-fecha="${x.fecha}" ${x.abierto ? '' : 'disabled'} aria-pressed="false"
      aria-label="${x.d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}${x.abierto ? '' : ', cerrado'}">
      <small>${x.d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</small><b>${x.d.getDate()}</b><small>${x.d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</small></button>`).join('');

  async function cargarOcupadas(forzar) {
    if (st.ocupadas && !forzar) return st.ocupadas;
    try { st.ocupadas = await Citas.ocupadas(dias[0].fecha, dias[dias.length - 1].fecha); }
    catch (e) { st.ocupadas = []; }
    return st.ocupadas;
  }

  function huecos(fecha) {
    const dur = st.serv.min, paso = C.intervalo || 15;
    const dw = new Date(fecha + 'T12:00').getDay();
    const ahora = new Date(), hoy = iso(ahora) === fecha;
    const limite = ahora.getHours() * 60 + ahora.getMinutes() + (C.margenMin || 0);
    const ocup = (st.ocupadas || []).filter(o => o.fecha === fecha).map(o => { const a = aMin(String(o.hora).slice(0, 5)); return [a, a + Number(o.duracion)]; });
    const out = [];
    (C.horario[dw] || []).forEach(([a, c]) => {
      for (let m = aMin(a); m + dur <= aMin(c); m += paso) {
        const libre = !(hoy && m < limite) && !ocup.some(([oa, of]) => m < of && m + dur > oa);
        out.push({ hora: aHora(m), libre });
      }
    });
    return out;
  }

  async function pintarHoras() {
    const box = $('resHoras');
    if (!st.fecha) { box.innerHTML = '<p class="vacio">Elige un día para ver las horas libres.</p>'; return; }
    box.innerHTML = '<p class="vacio">Buscando huecos libres…</p>';
    await cargarOcupadas();
    const hs = huecos(st.fecha);
    if (!hs.some(h => h.libre)) {
      box.innerHTML = '<p class="vacio">No quedan huecos libres este día para este servicio. Prueba con otro día.</p>';
      vivo('No quedan huecos libres este día'); return;
    }
    const grupo = (t, lista) => lista.length ? `<p class="franja">${t}</p>` + lista.map(h =>
      `<button type="button" data-hora="${h.hora}" ${h.libre ? '' : 'disabled aria-label="' + h.hora + ', ocupado"'} aria-pressed="${h.hora === st.hora}" class="${h.hora === st.hora ? 'on' : ''}">${h.hora}</button>`).join('') : '';
    box.innerHTML = grupo('Mañana', hs.filter(h => aMin(h.hora) < 15 * 60)) + grupo('Tarde', hs.filter(h => aMin(h.hora) >= 15 * 60));
    vivo(`${hs.filter(h => h.libre).length} horas libres el ${fechaLarga(st.fecha)}`);
  }

  f.addEventListener('click', e => {
    const b = e.target.closest('#resDias button, #resHoras button');
    if (!b || b.disabled) return;
    b.parentElement.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    if (b.dataset.fecha) { st.fecha = b.dataset.fecha; st.hora = null; pintarHoras(); }
    else { st.hora = b.dataset.hora; }
    actualizarNav();
  });

  /* ---------- Navegación entre pasos ---------- */
  const sig = $('resSig'), atras = $('resAtras');
  const FL = sig.querySelector('svg').outerHTML;

  function irA(n) {
    st.paso = n;
    f.querySelectorAll('.res-paso').forEach(p => p.hidden = Number(p.dataset.paso) !== n);
    f.querySelectorAll('.res-pasos span').forEach((s, i) => s.classList.toggle('on', i < Math.min(n, 3)));
    $('resNav').hidden = n === 4;
    atras.hidden = n === 1;
    if (n === 2) {
      $('resServTxt').textContent = `${st.serv.nombre} · ${st.serv.min} min · ${eur(st.serv.precio)}`;
      if (!st.fecha) {
        const primero = $('resDias').querySelector('button:not(:disabled)');
        if (primero) primero.click();
      } else pintarHoras();
    }
    if (n === 3) $('resResumen').innerHTML = resumen();
    actualizarNav();
    const p = f.querySelector(`[data-paso="${n}"]`);
    if (n > 1 || st.tocado) {
      const top = f.getBoundingClientRect().top + scrollY - 100;
      if (Math.abs(scrollY - top) > 40 && f.getBoundingClientRect().top < 60) scrollTo({ top, behavior: 'smooth' });
      const foco = n === 4 ? p : p.querySelector('legend') ? p : null;
      if (foco) { foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true }); }
    }
    st.tocado = true;
  }

  function actualizarNav() {
    if (st.paso === 1) { sig.disabled = !st.serv; sig.innerHTML = 'Elegir día y hora ' + FL; }
    if (st.paso === 2) { sig.disabled = !(st.fecha && st.hora); sig.innerHTML = st.hora ? `Continuar · ${st.hora} ${FL}` : 'Elige una hora'; }
    if (st.paso === 3) { sig.disabled = st.enviando; sig.innerHTML = st.enviando ? 'Reservando…' : 'Confirmar cita ' + FL; }
  }

  const resumen = () => `
    <div><span>Servicio</span><b>${st.serv.nombre}</b></div>
    <div><span>Día</span><b style="text-transform:capitalize">${fechaLarga(st.fecha)}</b></div>
    <div><span>Hora</span><b>${st.hora} (${st.serv.min} min)</b></div>
    <div><span>Precio</span><b>${st.serv.id === 'color' ? 'desde ' : ''}${eur(st.serv.precio)}</b></div>`;

  atras.addEventListener('click', () => irA(st.paso - 1));
  sig.addEventListener('click', () => {
    if (st.paso < 3) return irA(st.paso + 1);
    enviar();
  });
  f.addEventListener('submit', e => { e.preventDefault(); if (st.paso === 3) enviar(); });

  /* ---------- Paso 3: validar y guardar ---------- */
  function error(id, txt) {
    const i = $(id), e = $(id + 'E');
    if (e) e.textContent = txt || '';
    if (i) { i.setAttribute('aria-invalid', !!txt); if (txt) i.setAttribute('aria-describedby', id + 'E'); }
    return !txt;
  }

  async function enviar() {
    if (st.enviando) return;
    const nombre = $('rNombre').value.trim(), tel = $('rTel').value.trim(), email = $('rEmail').value.trim();
    const ok = [
      error('rNombre', nombre.length < 2 ? 'Escribe tu nombre.' : ''),
      error('rTel', tel.replace(/[^\d]/g, '').length < 9 ? 'Escribe un teléfono válido (9 cifras).' : ''),
      error('rEmail', email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Revisa el correo.' : ''),
      error('rAcepto', !$('rAcepto').checked ? 'Necesitamos que aceptes la política de privacidad.' : '')
    ].every(Boolean);
    if (!ok) { const p = f.querySelector('[aria-invalid=true]'); if (p) p.focus(); return; }
    if (f.querySelector('[name=_honey]').value) return; // robot

    st.enviando = true; actualizarNav(); $('resError').hidden = true;
    const cita = {
      fecha: st.fecha, hora: st.hora, duracion: st.serv.min,
      servicio: st.serv.nombre, precio: st.serv.precio,
      nombre, telefono: tel, email: email || null, nota: $('rNota').value.trim() || null
    };
    try {
      await cargarOcupadas(true);
      if (!huecos(st.fecha).find(h => h.hora === st.hora && h.libre)) { const e = new Error(); e.ocupada = true; throw e; }
      await Citas.crear(cita);
      st.ocupadas = null;
      $('resFinal').innerHTML = resumen() + `<div><span>A nombre de</span><b>${nombre.replace(/</g, '&lt;')}</b></div>`;
      $('resCal').href = ics(cita);
      irA(4);
      if (window.avisar) avisar('Cita reservada');
    } catch (e) {
      const m = $('resError');
      m.textContent = e.ocupada
        ? 'Vaya, alguien acaba de reservar esa hora. Elige otra, por favor.'
        : 'No hemos podido guardar la cita. Revisa tu conexión e inténtalo de nuevo, o llámanos al ' + C.telefonoVisible + '.';
      m.hidden = false;
      if (e.ocupada) { st.hora = null; setTimeout(() => irA(2), 1800); }
    } finally { st.enviando = false; actualizarNav(); }
  }

  // Archivo de calendario (.ics) para que el cliente guarde la cita
  function ics(c) {
    const [y, mo, d] = c.fecha.split('-'), ini = aMin(c.hora), fin = ini + c.duracion;
    const t = m => `${y}${mo}${d}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hola7273//Citas//ES', 'BEGIN:VEVENT',
      `UID:${Date.now()}@hola7273.es`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${t(ini)}`, `DTEND:${t(fin)}`, `SUMMARY:${c.servicio} · ${C.nombre}`,
      `DESCRIPTION:Cita en ${C.nombre}. Si no puedes venir llama al ${C.telefono}.`,
      `LOCATION:${C.direccion}${C.ciudad ? ', ' + C.ciudad : ''}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt);
  }

  $('resOtra').addEventListener('click', () => {
    f.reset(); Object.assign(st, { serv: null, fecha: null, hora: null });
    f.querySelectorAll('#resDias .on').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', false); });
    irA(1);
  });

  st.tocado = false;
  irA(1);
  cargarOcupadas();
})();
