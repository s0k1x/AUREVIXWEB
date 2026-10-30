/* ==========================================================
   RESERVAR UNA LLAMADA
   El visitante elige un hueco libre según el horario que pone el
   propietario en Ajustes → Negocio → Llamadas (días, horas, duración y
   antelación), deja sus datos y la reserva entra como consulta de tipo
   «llamada» en el panel (Soporte). Las horas se calculan en hora de
   Madrid, que es la del negocio, y se enseñan en la del visitante.
   El servidor no deja reservar dos veces la misma hora
   (supabase/funciones-v94.sql) y solo dice qué horas están ocupadas,
   nunca quién las tiene.
   Al terminar, botones para añadirla a Google Calendar o a cualquier
   calendario (archivo .ics).
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { $, esc, icono, toast, abrir, ocupado, campo, aceptarTerminos, terminosAceptados, infoDatos, descargar } from './ui.js';

const ZONA = 'Europe/Madrid';
/** Desfase (minutos) de Madrid respecto a UTC en un instante dado */
function desfase(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t) / 6e4;
}
/** Instante (ms) de una hora de reloj de Madrid */
function deMadrid(y, m, d, h, min) {
  const aprox = Date.UTC(y, m, d, h, min);
  return aprox - desfase(aprox - desfase(aprox) * 6e4) * 6e4;
}
/** Día de Madrid (año, mes, día, día de la semana) de un instante */
function diaMadrid(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day, sem: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

/** Huecos libres de los próximos días: [{ dia: Date, horas: [ms…] }] */
export function huecosLibres(ocupadas = []) {
  const L = CONFIG.llamadas, tomadas = new Set(ocupadas.map(x => new Date(x).getTime()));
  const [h0, m0] = L.desde.split(':').map(Number), [h1, m1] = L.hasta.split(':').map(Number);
  const minimo = Date.now() + L.antelacion * 36e5, dias = [];
  for (let i = 0; i < L.verDias; i++) {
    const { y, m, d, sem } = diaMadrid(Date.now() + i * 864e5);
    if (!L.dias.includes(sem)) continue;
    const horas = [];
    for (let min = h0 * 60 + m0; min + L.minutos <= h1 * 60 + m1; min += L.minutos) {
      const t = deMadrid(y, m, d, Math.floor(min / 60), min % 60);
      if (t >= minimo && !tomadas.has(t)) horas.push(t);
    }
    if (horas.length) dias.push({ dia: new Date(horas[0]), horas });
  }
  return dias;
}

const fechaLarga = t => new Date(t).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const hora = t => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const ics = (t, min, titulo, texto) => {
  const f = x => new Date(x).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AurevixWeb//Llamada//ES', 'BEGIN:VEVENT', `UID:${t}-${Math.random().toString(36).slice(2)}@aurevixweb.es`,
    `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(t)}`, `DTEND:${f(t + min * 6e4)}`, `SUMMARY:${titulo}`, `DESCRIPTION:${texto.replace(/\n/g, '\\n')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${titulo}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
};
const enlaceGoogle = (t, min, titulo, texto) => {
  const f = x => new Date(x).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: `${f(t)}/${f(t + min * 6e4)}`, details: texto })}`;
};

let dlg = null;
export async function abrirLlamada() {
  if (!CONFIG.llamadas?.activo) return toast('Ahora mismo no hay llamadas disponibles. Escríbenos y te respondemos enseguida.');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg dlg-llamada';
    dlg.setAttribute('aria-labelledby', 'llTit');
    dlg.innerHTML = `<div class="dlg-box"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="llBody"></div></div>`;
    document.body.append(dlg);
  }
  const body = $('#llBody', dlg);
  body.innerHTML = `<h2 class="dlg-h" id="llTit">Reservar una llamada</h2><p class="muted">Cargando los huecos libres…</p>`;
  abrir(dlg);
  const dias = huecosLibres(await store.huecosOcupados());
  const L = CONFIG.llamadas, u = store.usuarioActual();
  let elegida = 0;
  if (!dias.length) {
    body.innerHTML = `<h2 class="dlg-h" id="llTit">Reservar una llamada</h2><p class="muted">No quedan huecos libres en los próximos días. Escríbenos desde el formulario de contacto y te llamamos nosotros.</p>
      <a class="btn btn-primary w100" href="#contacto" data-close>Ir al formulario</a>`;
    return;
  }
  const pintarHoras = i => `<div class="ll-horas" role="radiogroup" aria-label="Hora">${dias[i].horas.map(t => `<label class="ll-hora"><input type="radio" name="llHora" value="${t}" required><span>${hora(t)}</span></label>`).join('')}</div>`;
  body.innerHTML = `
    <h2 class="dlg-h" id="llTit">Reservar una llamada</h2>
    <p class="muted ll-sub">${icono('phone')} ${L.minutos} minutos para hablar de tu web, sin compromiso. Te llamamos nosotros.</p>
    <div class="ll-dias" role="tablist" aria-label="Día">${dias.map((d, i) => `<button type="button" role="tab" class="ll-dia" data-dia="${i}" aria-selected="${i === 0}">
      <small>${d.dia.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</small><b>${d.dia.getDate()}</b><small>${d.dia.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</small></button>`).join('')}</div>
    <div id="llHoras">${pintarHoras(0)}</div>
    <form id="llForm" class="ll-form" novalidate>
      ${campo({ id: 'llNombre', label: 'Tu nombre', required: true, value: u?.name || '', attrs: 'autocomplete="name" maxlength="80"' })}
      ${campo({ id: 'llTel', label: 'Teléfono', type: 'tel', required: true, attrs: 'autocomplete="tel" maxlength="20"' })}
      ${campo({ id: 'llEmail', label: 'Correo', type: 'email', required: true, value: u?.email || '', attrs: 'autocomplete="email" maxlength="120"' })}
      ${campo({ id: 'llMotivo', label: '¿De qué quieres hablar? (opcional)', type: 'textarea', attrs: 'maxlength="500" rows="2"' })}
      ${aceptarTerminos('llTerms', 'He leído y acepto la <a href="terminos-y-privacidad#privacidad" target="_blank" rel="noopener">política de privacidad</a>')}
      ${infoDatos('llamarte a la hora reservada y responder a tu consulta')}
      <button class="btn btn-primary w100" type="submit"><span>Reservar la llamada</span></button>
    </form>`;
  body.querySelector('.ll-dias').addEventListener('click', e => {
    const b = e.target.closest('[data-dia]');
    if (!b) return;
    elegida = +b.dataset.dia;
    body.querySelectorAll('.ll-dia').forEach(x => x.setAttribute('aria-selected', x === b));
    $('#llHoras', body).innerHTML = pintarHoras(elegida);
  });
  $('#llForm', body).addEventListener('submit', async e => {
    e.preventDefault();
    const t = +(body.querySelector('input[name=llHora]:checked')?.value || 0);
    const v = id => $('#' + id, body).value.trim();
    if (!t) return toast('Elige una hora', 'err');
    if (!v('llNombre') || v('llTel').replace(/\D/g, '').length < 9 || !/^\S+@\S+\.\S+$/.test(v('llEmail'))) return toast('Revisa tu nombre, teléfono y correo', 'err');
    if (!terminosAceptados('llTerms')) return;
    const btn = e.target.querySelector('[type=submit]');
    ocupado(btn, true);
    try {
      await store.crearTicket({
        tipo: 'llamada', asunto: `Llamada · ${fechaLarga(t)} a las ${hora(t)}`, nombre: v('llNombre'), email: v('llEmail'),
        mensaje: `${v('llMotivo') || 'Quiere hablar de su web.'}\n\nTeléfono: ${v('llTel')}`,
        extra: { llamada: new Date(t).toISOString(), minutos: L.minutos, telefono: v('llTel') }
      });
      const titulo = `Llamada con ${CONFIG.marca}`, texto = `Te llamamos al ${v('llTel')}. Si necesitas cambiarla, responde a nuestro correo o escribe a ${CONFIG.email}.`;
      body.innerHTML = `<div class="exito">
        <div class="ok-ic">${icono('check')}</div>
        <h3>Llamada reservada</h3>
        <p class="muted">Te llamamos el <b>${esc(fechaLarga(t))} a las ${hora(t)}</b> al ${esc(v('llTel'))}. Si necesitas cambiarla, escríbenos a ${esc(CONFIG.email)}.</p>
        <a class="btn btn-ghost w100" href="${esc(enlaceGoogle(t, L.minutos, titulo, texto))}" target="_blank" rel="noopener">${icono('calendar')} Añadir a Google Calendar</a>
        <button class="btn btn-ghost w100" type="button" id="llIcs">${icono('download')} Añadir a otro calendario (.ics)</button>
        <button class="btn btn-primary w100" type="button" data-close>Hecho</button>
      </div>`;
      $('#llIcs', body).addEventListener('click', () => descargar('llamada-aurevixweb.ics', ics(t, L.minutos, titulo, texto), 'text/calendar'));
    } catch (err) {
      toast(err.message, 'err');
      ocupado(btn, false);
      // Si el hueco se acaba de ocupar, se vuelven a pedir los libres
      if (/reservar|hueco/i.test(err.message)) setTimeout(() => abrirLlamada(), 900);
    }
  });
}
