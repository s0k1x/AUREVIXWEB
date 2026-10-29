/* ==========================================================
   Hola7273! · Guardado de citas y avisos
   - Con Supabase configurado (config.js → supabase) las citas
     se guardan en la base de datos y el panel las ve desde
     cualquier dispositivo.
   - Sin Supabase funciona en modo prueba: las citas se guardan
     solo en este navegador.
   - Cada reserva envía un aviso por correo al negocio (FormSubmit).
   ========================================================== */
window.Citas = (function () {
  const C = window.HOLA || {}, SB = C.supabase || {};
  const conBD = !!(SB.url && SB.anonKey);
  const K_CITAS = 'hola7273_citas', K_SES = 'hola7273_sesion';

  const leer = k => { try { return JSON.parse(localStorage.getItem(k)) } catch (e) { return null } };
  const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
  const local = () => leer(K_CITAS) || [];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  async function sb(ruta, op = {}) {
    const ses = leer(K_SES);
    const res = await fetch(SB.url.replace(/\/$/, '') + ruta, {
      method: op.method || 'GET',
      headers: Object.assign({
        apikey: SB.anonKey,
        Authorization: 'Bearer ' + (op.token || (ses && ses.access_token) || SB.anonKey),
        'Content-Type': 'application/json'
      }, op.headers || {}),
      body: op.body ? JSON.stringify(op.body) : undefined
    });
    const txt = await res.text();
    const datos = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      const e = new Error((datos && (datos.message || datos.error_description || datos.msg)) || 'Error ' + res.status);
      e.codigo = datos && datos.code; e.status = res.status; throw e;
    }
    return datos;
  }

  /* ---------- Para la web pública ---------- */

  // Huecos ya ocupados entre dos fechas: [{fecha, hora, duracion}]
  async function ocupadas(desde, hasta) {
    if (conBD) return sb('/rest/v1/rpc/huecos_ocupados', { method: 'POST', body: { desde, hasta }, token: SB.anonKey });
    return local().filter(c => c.estado !== 'cancelada' && c.fecha >= desde && c.fecha <= hasta)
      .map(({ fecha, hora, duracion }) => ({ fecha, hora, duracion }));
  }

  async function crear(c) {
    const cita = Object.assign({ estado: 'confirmada' }, c);
    if (conBD) {
      try {
        await sb('/rest/v1/citas', { method: 'POST', body: cita, token: SB.anonKey, headers: { Prefer: 'return=minimal' } });
      } catch (e) {
        if (/ocupad/i.test(e.message)) e.ocupada = true;
        throw e;
      }
    } else {
      const todas = local();
      cita.id = uid(); cita.creada = new Date().toISOString();
      todas.push(cita); guardar(K_CITAS, todas);
    }
    avisar(cita); // el aviso no bloquea la reserva aunque falle
    return cita;
  }

  // Aviso automático por correo al negocio (y copia al cliente si deja su correo)
  function avisar(c) {
    if (!C.aviso || !C.aviso.url) return Promise.resolve();
    const fechaLarga = new Date(c.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const datos = {
      _subject: `Nueva cita: ${c.servicio} · ${fechaLarga} a las ${c.hora}`,
      _template: 'table',
      _captcha: 'false',
      Servicio: `${c.servicio} (${c.duracion} min · ${c.precio} €)`,
      Día: fechaLarga,
      Hora: c.hora,
      Cliente: c.nombre,
      Teléfono: c.telefono,
      Correo: c.email || '—',
      Comentarios: c.nota || '—',
      Panel: (C.web || '') + '/panel.html'
    };
    if (c.email) {
      datos.email = c.email;
      datos._replyto = c.email;
      datos._autoresponse = `¡Hola, ${c.nombre.split(' ')[0]}! Tu cita en ${C.nombre} está reservada: ${c.servicio} el ${fechaLarga} a las ${c.hora}. Si no puedes venir, avísanos al ${C.telefonoVisible || C.telefono}. ¡Te esperamos!`;
    }
    return fetch(C.aviso.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(datos) }).catch(() => {});
  }

  /* ---------- Para el panel del negocio ---------- */

  async function login(email, clave) {
    if (!conBD) {
      if (clave !== String(C.pinPanel)) throw new Error('Clave incorrecta');
      guardar(K_SES, { demo: true }); return true;
    }
    const s = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: clave }, token: SB.anonKey });
    s.expires_at = Date.now() + s.expires_in * 1000;
    guardar(K_SES, s); return true;
  }

  async function sesion() {
    const s = leer(K_SES);
    if (!s) return false;
    if (s.demo) return !conBD;
    if (s.expires_at - Date.now() > 60000) return true;
    try {
      const n = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token }, token: SB.anonKey });
      n.expires_at = Date.now() + n.expires_in * 1000; guardar(K_SES, n); return true;
    } catch (e) { guardar(K_SES, null); return false; }
  }

  function salir() {
    const s = leer(K_SES);
    if (conBD && s && s.access_token) sb('/auth/v1/logout', { method: 'POST' }).catch(() => {});
    guardar(K_SES, null);
  }

  async function listar() {
    const lista = conBD ? await sb('/rest/v1/citas?select=*&order=fecha.asc,hora.asc') : local();
    return lista.map(c => Object.assign(c, { hora: String(c.hora).slice(0, 5) }))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }

  async function cambiarEstado(id, estado) {
    if (conBD) return sb('/rest/v1/citas?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { estado }, headers: { Prefer: 'return=minimal' } });
    guardar(K_CITAS, local().map(c => c.id === id ? Object.assign(c, { estado }) : c));
  }

  return { conBD, ocupadas, crear, login, sesion, salir, listar, cambiarEstado };
})();
