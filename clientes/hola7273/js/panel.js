/* ==========================================================
   Hola7273! · Panel de citas del negocio
   ========================================================== */
(function () {
  const C = window.HOLA, $ = id => document.getElementById(id);
  const st = { lista: [], filtro: 'proximas', q: '' };
  const pad = n => String(n).padStart(2, '0');
  const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fechaLarga = s => new Date(s + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const finHora = c => { const [h, m] = c.hora.split(':').map(Number), t = h * 60 + m + Number(c.duracion); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
  const ESTADO = { confirmada: 'Confirmada', hecha: 'Atendida', cancelada: 'Cancelada' };

  // Acceso
  if (!Citas.conBD) {
    $('loginEmailC').hidden = true;
    $('lClaveL').textContent = 'Clave del panel';
    $('loginTxt').textContent = 'Modo de prueba: las citas se guardan en este navegador. Conecta Supabase en js/config.js para verlas desde cualquier dispositivo.';
  }

  async function entrar() {
    $('pnLogin').hidden = true; $('pnApp').hidden = false; $('pnSalir').hidden = false;
    if (!Citas.conBD) { const d = $('pnDemo'); d.hidden = false; d.textContent = 'Modo de prueba: se muestran las citas reservadas desde este mismo navegador.'; }
    await cargar();
  }

  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('loginErr'); err.hidden = true;
    const b = e.target.querySelector('button'); b.disabled = true;
    try { await Citas.login($('lEmail').value.trim(), $('lClave').value); await entrar(); }
    catch (x) { err.textContent = Citas.conBD ? 'Correo o contraseña incorrectos.' : 'Clave incorrecta.'; err.hidden = false; $('lClave').focus(); }
    finally { b.disabled = false; }
  });
  $('pnSalir').addEventListener('click', () => { Citas.salir(); location.reload(); });

  async function cargar() {
    $('pnLista').innerHTML = '<p class="vacio">Cargando citas…</p>';
    try { st.lista = await Citas.listar(); pintar(); }
    catch (e) {
      if (e.status === 401) { Citas.salir(); location.reload(); return; }
      $('pnLista').innerHTML = '<p class="msg mal">No se han podido cargar las citas. Comprueba la conexión y pulsa «Actualizar».</p>';
    }
  }

  function pintar() {
    const activas = st.lista.filter(c => c.estado !== 'cancelada');
    $('kHoy').textContent = activas.filter(c => c.fecha === hoy).length;
    $('kSemana').textContent = activas.filter(c => c.fecha >= hoy && c.fecha <= enDias(6)).length;
    $('kPend').textContent = activas.filter(c => c.fecha >= hoy && c.estado === 'confirmada').length;
    $('kEur').textContent = activas.filter(c => c.fecha >= hoy && c.fecha <= enDias(6)).reduce((s, c) => s + Number(c.precio || 0), 0).toLocaleString('es-ES') + ' €';

    let l = st.lista;
    if (st.filtro === 'proximas') l = l.filter(c => c.fecha >= hoy);
    if (st.filtro === 'hoy') l = l.filter(c => c.fecha === hoy);
    if (st.filtro === 'pasadas') l = l.filter(c => c.fecha < hoy).reverse();
    if (st.q) { const q = st.q.toLowerCase(); l = l.filter(c => (c.nombre + ' ' + c.telefono + ' ' + (c.email || '')).toLowerCase().includes(q)); }

    if (!l.length) { $('pnLista').innerHTML = '<p class="vacio">No hay citas para mostrar.</p>'; return; }
    const grupos = {};
    l.forEach(c => (grupos[c.fecha] = grupos[c.fecha] || []).push(c));
    $('pnLista').innerHTML = Object.entries(grupos).map(([f, cs]) => `
      <section class="dia-g"><h2>${f === hoy ? 'Hoy · ' : ''}${fechaLarga(f)} · ${cs.filter(c => c.estado !== 'cancelada').length} citas</h2>
      ${cs.map(c => `<article class="cita ${esc(c.estado)}">
        <div class="hora">${esc(c.hora)}<small>a ${finHora(c)}</small></div>
        <h3>${esc(c.nombre)} <span class="est ${esc(c.estado)}">${ESTADO[c.estado] || esc(c.estado)}</span></h3>
        <div class="meta"><span>${esc(c.servicio)} · ${esc(c.duracion)} min · ${esc(c.precio)} €</span>
          <a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</div>
        ${c.nota ? `<p class="nota-c">${esc(c.nota)}</p>` : ''}
        <div class="acc">
          ${c.estado !== 'hecha' ? `<button type="button" data-id="${esc(c.id)}" data-e="hecha">Marcar atendida</button>` : ''}
          ${c.estado !== 'cancelada' ? `<button type="button" data-id="${esc(c.id)}" data-e="cancelada">Cancelar</button>` : `<button type="button" data-id="${esc(c.id)}" data-e="confirmada">Reactivar</button>`}
          <a href="https://wa.me/${esc(String(c.telefono).replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1'))}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, te escribimos de ${C.nombre} por tu cita del ${fechaLarga(c.fecha)} a las ${c.hora}.`)}" target="_blank" rel="noopener">WhatsApp</a>
        </div></article>`).join('')}</section>`).join('');
  }

  $('pnLista').addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    if (b.dataset.e === 'cancelada' && !confirm('¿Cancelar esta cita? El hueco quedará libre para otros clientes.')) return;
    b.disabled = true;
    try { await Citas.cambiarEstado(b.dataset.id, b.dataset.e); const c = st.lista.find(x => String(x.id) === b.dataset.id); if (c) c.estado = b.dataset.e; pintar(); }
    catch (x) { alert('No se ha podido guardar el cambio. Inténtalo de nuevo.'); b.disabled = false; }
  });

  document.querySelector('.seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st.filtro = b.dataset.f;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b));
    pintar();
  });
  $('pnBuscar').addEventListener('input', e => { st.q = e.target.value.trim(); pintar(); });
  $('pnRecargar').addEventListener('click', cargar);
  $('pnCsv').addEventListener('click', () => {
    const cols = ['fecha', 'hora', 'duracion', 'servicio', 'precio', 'nombre', 'telefono', 'email', 'nota', 'estado'];
    const csv = [cols.join(';')].concat(st.lista.map(c => cols.map(k => `"${String(c[k] == null ? '' : c[k]).replace(/"/g, '""')}"`).join(';'))).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `citas-hola7273-${hoy}.csv`; a.click();
  });
  // Refresca solo cada minuto mientras el panel esté abierto
  setInterval(() => { if (!$('pnApp').hidden && !document.hidden) Citas.listar().then(l => { st.lista = l; pintar(); }).catch(() => {}); }, 60000);

  Citas.sesion().then(ok => { if (ok) entrar(); });
})();
