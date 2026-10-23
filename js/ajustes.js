/* ==========================================================
   AJUSTES
   - Todos: perfil, cuenta, avisos, apariencia, privacidad
   - Clientes: datos de facturación
   - Trabajadores: disponibilidad, objetivo y datos de cobro
   - Propietario: ajustes del negocio (precios, plazos, pagos,
     cupones, avisos de la portada, asistente…)
   ========================================================== */
import { CONFIG, PLANES, EXTRAS } from '../config.js';
import * as store from './store.js';
import { $, $$, esc, euros, icono, toast, arrancar, pedirLogin, ocupado, campo, interruptor, etiquetas, avatar, descargar, ROLES } from './ui.js';
import { leerApariencia, guardarApariencia } from './apariencia.js';
import { abrirCookies, consentimiento } from './cookies.js';
import { ORIGINAL, ajustesActuales, guardarAjustesWeb } from './sitio.js';

await arrancar('ajustes');

const nav = $('#ajNav'), body = $('#ajBody');
let U = null;
let seccion = location.hash.slice(1) || 'perfil';

const SECCIONES = u => [
  ['perfil', 'Perfil', 'user', !!u],
  ['cuenta', 'Cuenta y seguridad', 'key', !!u],
  ['facturacion', 'Facturación', 'receipt', !!u],
  ['trabajo', 'Trabajo y cobros', 'briefcase', u && u.role !== 'client'],
  ['notificaciones', 'Avisos', 'bell', !!u],
  ['apariencia', 'Apariencia', 'palette', true],
  ['privacidad', 'Privacidad y cookies', 'shield', true],
  ['negocio', 'Negocio', 'gear', u && u.role === 'owner']
].filter(x => x[3]);


function pintarNav() {
  const S = SECCIONES(U);
  if (!S.some(s => s[0] === seccion)) seccion = S[0][0];
  nav.innerHTML = `${U ? `<div class="aj-yo">${avatar(U, 'lg')}<div><b>${esc(U.name)}</b><small>${esc(U.email)}</small><span class="role-tag r-${U.role}">${ROLES[U.role]}</span></div></div>` : `<div class="aj-yo sin"><p>Inicia sesión para cambiar tu perfil, tus avisos y tus datos.</p><button class="btn btn-sm btn-primary" data-login>Entrar</button></div>`}
    ${S.map(([k, t, ic]) => `<a href="#${k}" class="${k === seccion ? 'on' : ''}">${icono(ic)}<span>${t}</span></a>`).join('')}
    ${U ? `<button class="aj-salir" data-logout>${icono('logout')}<span>Cerrar sesión</span></button>` : ''}`;
}

const bloque = (titulo, desc, contenido, id = '') => `<section class="card aj-b" ${id ? `id="${id}"` : ''}><div class="aj-bh"><h3>${titulo}</h3>${desc ? `<p class="muted">${desc}</p>` : ''}</div>${contenido}</section>`;
const guardarBtn = (id, txt = 'Guardar cambios') => `<div class="aj-acc"><button class="btn btn-primary" type="submit" id="${id}"><span>${txt}</span></button></div>`;
const texto = (name, label, value = '', attrs = '', hint = '') => campo({ id: 'f_' + name.replace(/\W/g, '_'), name, label, value, attrs, hint });

async function pintar() {
  const fn = { perfil, cuenta, facturacion, trabajo, notificaciones, apariencia, privacidad, negocio }[seccion];
  body.innerHTML = '<div class="skeleton"></div>';
  body.onchange = null;
  try { await fn(); } catch (e) { console.error(e); body.innerHTML = bloque('No se han podido cargar los ajustes', esc(e.message), ''); }
  etiquetas(body);
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Perfil ---------- */
async function perfil() {
  const priv = await store.leerPrivado().catch(() => ({}));
  body.innerHTML = bloque('Perfil', 'Así te ve el equipo y así aparece tu nombre en tus proyectos.', `
    <form id="fPerfil" novalidate>
      <div class="aj-foto">
        <span id="fotoPrev">${avatar(U, 'xl')}</span>
        <div><label class="btn btn-sm btn-ghost">${icono('camera')}<span>Cambiar foto</span><input type="file" accept="image/*" id="fotoIn" hidden></label>
        ${U.photo ? `<button type="button" class="link-btn" id="fotoQuitar">Quitar foto</button>` : ''}
        <small class="muted">JPG o PNG. Se recorta en cuadrado.</small></div>
      </div>
      <div class="row-2">${texto('name', 'Nombre y apellidos', U.name, 'required maxlength="80" autocomplete="name"')}${texto('telefono', 'Teléfono (opcional)', priv.telefono || '', 'type="tel" maxlength="20" autocomplete="tel"', 'Solo lo ve el equipo si hay algún problema')}</div>
      ${texto('empresa', 'Negocio o empresa (opcional)', priv.empresa || '', 'maxlength="80" autocomplete="organization"')}
      ${guardarBtn('gPerfil')}
    </form>`);
  let foto = U.photo;
  $('#fotoIn').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { foto = await recortarFoto(f); $('#fotoPrev').innerHTML = `<img class="avatar xl" src="${foto}" alt="">`; toast('Pulsa «Guardar cambios» para usar esta foto'); }
    catch { toast('No se ha podido leer la imagen', 'err'); }
  });
  $('#fotoQuitar')?.addEventListener('click', () => { foto = ''; $('#fotoPrev').innerHTML = avatar({ name: U.name }, 'xl'); });
  $('#fPerfil').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name')).trim();
    if (name.length < 2) return toast('Escribe tu nombre', 'err');
    const b = $('#gPerfil'); ocupado(b, true);
    try {
      await store.guardarPerfil({ name, photo: foto });
      await store.guardarPrivado({ telefono: String(f.get('telefono')).trim(), empresa: String(f.get('empresa')).trim() });
      toast('Perfil guardado', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
}
function recortarFoto(f) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), t = 192, lado = Math.min(img.width, img.height);
      c.width = c.height = t;
      c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, t, t);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = mal;
    img.src = URL.createObjectURL(f);
  });
}

/* ---------- Cuenta y seguridad ---------- */
async function cuenta() {
  const google = U.proveedor && U.proveedor !== 'email';
  body.innerHTML = bloque('Correo electrónico', google ? `Entras con ${U.proveedor === 'google' ? 'Google' : U.proveedor}. Tu correo es el de esa cuenta.` : 'Te enviaremos un enlace al correo nuevo para confirmarlo.', `
      <form id="fEmail" novalidate>${texto('email', 'Correo electrónico', U.email, `type="email" autocomplete="email" ${google || store.modoDemo ? 'disabled' : ''}`)}${google || store.modoDemo ? '' : guardarBtn('gEmail', 'Cambiar correo')}</form>`)
    + bloque('Contraseña', google ? 'Como entras con Google, no necesitas contraseña. Puedes crear una para entrar también con tu correo.' : 'Usa al menos 8 caracteres, con letras y números.', `
      <form id="fPass" novalidate><div class="row-2">${texto('pass', 'Contraseña nueva', '', 'type="password" autocomplete="new-password" minlength="8"')}${texto('pass2', 'Repite la contraseña', '', 'type="password" autocomplete="new-password"')}</div>${guardarBtn('gPass', 'Cambiar contraseña')}</form>`)
    + bloque('Sesiones', 'Si has entrado desde un móvil o un ordenador que ya no usas, cierra la sesión en todos los dispositivos.', `
      <div class="aj-acc"><button class="btn btn-ghost" id="salirTodo">${icono('power')}<span>Cerrar sesión en todos los dispositivos</span></button></div>`);
  $('#fEmail').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#f_email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Escribe un correo válido', 'err');
    if (email === U.email) return toast('Es el mismo correo');
    const b = $('#gEmail'); ocupado(b, true);
    try { await store.cambiarEmail(email); toast('Te hemos enviado un enlace para confirmar el correo nuevo', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
  $('#fPass').addEventListener('submit', async e => {
    e.preventDefault();
    const a = $('#f_pass').value, b2 = $('#f_pass2').value;
    if (a.length < 8 || !/\d/.test(a) || !/[a-z]/i.test(a)) return toast('La contraseña necesita 8 caracteres con letras y números', 'err');
    if (a !== b2) return toast('Las contraseñas no coinciden', 'err');
    const b = $('#gPass'); ocupado(b, true);
    try { await store.cambiarPass(a); toast('Contraseña cambiada', 'ok'); e.target.reset(); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
  $('#salirTodo').addEventListener('click', async () => {
    if (!confirm('¿Cerrar la sesión en todos tus dispositivos, también en este?')) return;
    await store.cerrarSesionTodas();
    location.href = 'index.html';
  });
}

/* ---------- Facturación ---------- */
async function facturacion() {
  const d = await store.leerPrivado();
  body.innerHTML = bloque('Datos de facturación', 'Aparecen en los recibos de tus pagos. Si necesitas factura a nombre de tu empresa, rellénalos antes de pagar.', `
    <form id="fFact" novalidate>
      <div class="row-2">${texto('razon', 'Nombre o razón social', d.razon || '', 'maxlength="120" autocomplete="organization"')}${texto('nif', 'NIF / CIF', d.nif || '', 'maxlength="15" autocapitalize="characters"')}</div>
      ${texto('direccion', 'Dirección', d.direccion || '', 'maxlength="160" autocomplete="street-address"')}
      <div class="row-2">${texto('cp', 'Código postal', d.cp || '', 'maxlength="10" inputmode="numeric" autocomplete="postal-code"')}${texto('ciudad', 'Ciudad y provincia', d.ciudad || '', 'maxlength="80" autocomplete="address-level2"')}</div>
      ${texto('emailFact', 'Correo para facturas (opcional)', d.emailFact || '', 'type="email" maxlength="120"', 'Si es distinto del de tu cuenta')}
      ${guardarBtn('gFact')}
    </form>`);
  $('#fFact').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, String(v).trim()]));
    if (f.nif && !/^[A-Z0-9]{8,10}$/i.test(f.nif.replace(/[\s-]/g, ''))) return toast('Revisa el NIF o CIF', 'err');
    const b = $('#gFact'); ocupado(b, true);
    try { await store.guardarPrivado(f); toast('Datos de facturación guardados', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
}

/* ---------- Trabajo y cobros (equipo) ---------- */
async function trabajo() {
  const d = await store.leerPrivado();
  const dt = U.datos || {};
  body.innerHTML = bloque('Disponibilidad', 'Si no estás disponible, el propietario lo ve antes de asignarte encargos.', `
      <form id="fDisp">${interruptor({ id: 'disp', titulo: 'Disponible para nuevos encargos', texto: dt.disponible === false ? 'Ahora mismo apareces como no disponible' : 'Apareces como disponible', checked: dt.disponible !== false })}
      ${texto('habilidades', 'En qué eres bueno (opcional)', dt.habilidades || '', 'maxlength="160"', 'Ej.: diseño, textos, redes sociales, ventas en persona')}
      <label class="aj-num"><span>Objetivo mensual de comisiones (€)</span><input type="number" min="0" step="10" name="objetivo" value="${dt.objetivo || ''}" placeholder="300"></label>
      ${guardarBtn('gDisp')}</form>`)
    + bloque('Datos de cobro', `Para pagarte las comisiones (${CONFIG.comision} % de cada web que vendas). Solo los ve el propietario.`, `
      <form id="fCobro" novalidate>
        ${texto('cobroTitular', 'Titular de la cuenta', d.cobroTitular || '', 'maxlength="120" autocomplete="name"')}
        <div class="row-2">${texto('cobroIban', 'IBAN', d.cobroIban || '', 'maxlength="34" autocapitalize="characters"')}${texto('cobroBizum', 'Bizum (opcional)', d.cobroBizum || '', 'type="tel" maxlength="15"')}</div>
        ${texto('nif', 'NIF', d.nif || '', 'maxlength="15" autocapitalize="characters"', 'Lo necesitamos para justificar los pagos')}
        ${guardarBtn('gCobro')}
      </form>`);
  $('#disp').addEventListener('change', e => (e.target.closest('.switch-row').querySelector('small').textContent = e.target.checked ? 'Apareces como disponible' : 'Ahora mismo apareces como no disponible'));
  $('#fDisp').addEventListener('submit', async e => {
    e.preventDefault();
    const b = $('#gDisp'); ocupado(b, true);
    try {
      U = await store.guardarPerfil({ datos: { disponible: $('#disp').checked, habilidades: $('#f_habilidades').value.trim(), objetivo: Math.max(0, +e.target.objetivo.value || 0) } });
      toast('Guardado', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
  $('#fCobro').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, String(v).trim()]));
    const iban = f.cobroIban.replace(/\s/g, '').toUpperCase();
    if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return toast('Revisa el IBAN', 'err');
    f.cobroIban = iban.replace(/(.{4})/g, '$1 ').trim();
    const b = $('#gCobro'); ocupado(b, true);
    try { await store.guardarPrivado(f); toast('Datos de cobro guardados', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
}

/* ---------- Avisos ---------- */
const TIPOS_AVISO = U => [
  ['etapa', 'Cambios de etapa de tus proyectos', U.role === 'client'],
  ['pago', 'Pagos (confirmados o por verificar)', true],
  ['mensaje', 'Mensajes nuevos', true],
  ['revision', 'Vista previa lista para revisar', U.role === 'client'],
  ['soporte', 'Respuestas y consultas de soporte', true],
  ['pedido', 'Pedidos nuevos', U.role === 'owner'],
  ['cliente', 'Cuando un cliente actualiza su proyecto', U.role !== 'client']
].filter(x => x[2]);
async function notificaciones() {
  const n = U.datos?.notif || {};
  const permiso = 'Notification' in window ? Notification.permission : 'no';
  body.innerHTML = bloque('Avisos en la web', 'Siempre los verás en la campana. Elige de cuáles quieres recibir también una notificación en este dispositivo.', `
    <form id="fNotif">
      ${interruptor({ id: 'navegador', titulo: 'Notificaciones en este dispositivo', texto: permiso === 'denied' ? 'Las tienes bloqueadas en el navegador. Actívalas en los ajustes del navegador.' : permiso === 'no' ? 'Tu navegador no admite notificaciones. En iPhone, instala la web como app.' : 'Te avisamos aunque tengas la web en otra pestaña', checked: !!n.navegador && permiso === 'granted' })}
      <div class="aj-sub">${TIPOS_AVISO(U).map(([k, t]) => interruptor({ id: 'n_' + k, titulo: t, checked: n[k] !== false })).join('')}</div>
      ${guardarBtn('gNotif')}
      <p class="muted aj-nota">${icono('mail')} Si necesitamos algo urgente de ti, te escribimos además a ${esc(U.email)}.</p>
    </form>`);
  $('#fNotif').addEventListener('submit', async e => {
    e.preventDefault();
    const b = $('#gNotif'); ocupado(b, true);
    let nav = $('#navegador').checked;
    if (nav && 'Notification' in window && Notification.permission !== 'granted') {
      nav = (await Notification.requestPermission()) === 'granted';
      if (!nav) toast('No has dado permiso para las notificaciones', 'err');
    }
    const notif = { navegador: nav, ...Object.fromEntries(TIPOS_AVISO(U).map(([k]) => [k, $('#n_' + k).checked])) };
    try {
      U = await store.guardarPerfil({ datos: { notif } });
      if (nav) try { new Notification('AurevixWeb', { body: 'Las notificaciones están activadas.', icon: 'icons/icon-192.png' }); } catch { /* móvil: solo desde la app */ }
      toast('Preferencias de avisos guardadas', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
}

/* ---------- Apariencia ---------- */
async function apariencia() {
  const a = leerApariencia();
  const opc = (name, val, txt, ic, sel) => `<label class="aj-op"><input type="radio" name="${name}" value="${val}" ${sel ? 'checked' : ''}><span>${ic ? icono(ic) : ''}<b>${txt}</b></span></label>`;
  body.innerHTML = bloque('Tema', 'El tema claro es más cómodo con mucha luz. «Automático» sigue el modo de tu móvil u ordenador.', `
      <div class="aj-ops tres">${opc('tema', 'oscuro', 'Oscuro', 'moon', a.tema === 'oscuro')}${opc('tema', 'claro', 'Claro', 'sun', a.tema === 'claro')}${opc('tema', 'sistema', 'Automático', 'smartphone', a.tema === 'sistema')}</div>`)
    + bloque('Tamaño de la letra', '', `
      <div class="aj-ops cuatro">${[['pequeno', 'Pequeña'], ['normal', 'Normal'], ['grande', 'Grande'], ['muygrande', 'Muy grande']].map(([v, t], i) => `<label class="aj-op"><input type="radio" name="texto" value="${v}" ${a.texto === v ? 'checked' : ''}><span><b style="font-size:${13 + i * 3}px">Aa</b><small>${t}</small></span></label>`).join('')}</div>`)
    + bloque('Accesibilidad', '', `
      ${interruptor({ id: 'movimiento', titulo: 'Reducir animaciones', texto: 'Quita movimientos y transiciones de la web', checked: a.movimiento === 'reducido' })}
      ${interruptor({ id: 'contraste', titulo: 'Más contraste', texto: 'Textos y bordes más marcados', checked: !!a.contraste })}
      ${consentimiento()?.preferencias === false ? `<p class="aj-nota muted">${icono('cookie')} Has rechazado las cookies de preferencias: estos ajustes se aplican ahora, pero no se recordarán en este navegador${U ? ' (sí en tu cuenta)' : ''}. <button class="link-btn" data-cookies>Cambiar</button></p>` : ''}`);
  const guardar = async () => {
    const nueva = guardarApariencia({
      tema: $('input[name=tema]:checked').value, texto: $('input[name=texto]:checked').value,
      movimiento: $('#movimiento').checked ? 'reducido' : 'normal', contraste: $('#contraste').checked
    });
    if (U) store.guardarPerfil({ datos: { apariencia: nueva } }).catch(() => {});
    toast('Apariencia actualizada', 'ok');
  };
  body.onchange = guardar;
}

/* ---------- Privacidad ---------- */
async function privacidad() {
  const c = consentimiento();
  body.innerHTML = bloque('Cookies', 'No usamos cookies de publicidad ni de seguimiento.', `
      <div class="kvs"><div class="kv"><span>Necesarias</span><b>Siempre activas</b></div><div class="kv"><span>Preferencias</span><b>${c ? (c.preferencias ? 'Aceptadas' : 'Rechazadas') : 'Sin elegir'}</b></div><div class="kv"><span>Estadísticas</span><b>No se usan</b></div></div>
      <div class="aj-acc"><button class="btn btn-ghost" data-cookies>${icono('cookie')}<span>Cambiar mi elección</span></button><a class="btn btn-ghost" href="terminos.html#cookies">Política de cookies</a></div>`)
    + (U ? bloque('Tus datos', 'Puedes descargar una copia de todo lo que guardamos sobre ti: cuenta, proyectos, mensajes y consultas.', `
      <div class="aj-acc"><button class="btn btn-ghost" id="exportar">${icono('download')}<span>Descargar mis datos</span></button><a class="btn btn-ghost" href="terminos.html#privacidad">Política de privacidad</a></div>`) : '')
    + bloque('Este dispositivo', 'Borra borradores del cuestionario, la conversación con el asistente y tus preferencias guardadas en este navegador.', `
      <div class="aj-acc"><button class="btn btn-ghost" id="limpiar">${icono('trash')}<span>Borrar datos de este dispositivo</span></button></div>`)
    + (U && U.role !== 'owner' ? bloque('Eliminar la cuenta', 'Borraremos tu cuenta y tus datos personales. Conservaremos solo lo que la ley nos obliga a guardar (por ejemplo, los pagos).', `
      <div class="aj-acc"><button class="btn btn-danger" id="baja">${icono('trash')}<span>Solicitar la eliminación de mi cuenta</span></button></div>`) : '');
  $('#exportar')?.addEventListener('click', async e => {
    ocupado(e.currentTarget, true);
    try { descargar(`mis-datos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await store.exportarMisDatos(), null, 2), 'application/json'); toast('Datos descargados', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(e.currentTarget, false);
  });
  $('#limpiar').addEventListener('click', () => {
    if (!confirm('¿Borrar los datos guardados en este navegador? No se borra tu cuenta ni tus proyectos.')) return;
    try {
      Object.keys(localStorage).filter(k => k.startsWith('tm_') && !['tm_cookies', 'tm_sesion'].includes(k) && !(store.modoDemo && /^tm_(users|orders|apps|resenas|mensajes|tickets|avisos|archivos|privado|ajustes|sembrado)/.test(k))).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch { /* nada */ }
    toast('Datos de este dispositivo borrados', 'ok');
  });
  $('#baja')?.addEventListener('click', async e => {
    if (!confirm('¿Seguro que quieres eliminar tu cuenta? Te escribiremos para confirmarlo.')) return;
    ocupado(e.currentTarget, true);
    try { await store.crearTicket({ tipo: 'baja', asunto: 'Solicitud de eliminación de cuenta', mensaje: `${U.name} (${U.email}) solicita eliminar su cuenta y sus datos personales.` }); toast('Solicitud enviada. Te confirmaremos la baja por correo.', 'ok'); }
    catch (err) { toast(err.message, 'err'); }
    ocupado(e.currentTarget, false);
  });
}

/* ==========================================================
   NEGOCIO (solo propietario)
   ========================================================== */
async function negocio() {
  const a = ajustesActuales();
  let cupones = [];
  try { cupones = (await store.leerAjustes('cupones'))?.lista || []; } catch { /* sin cupones */ }
  let tpCco = '';
  try { tpCco = (await store.leerAjustes('trustpilot'))?.cco || ''; } catch { /* sin dato */ }
  const pct = v => Math.round(v * 100);
  body.innerHTML = `
  <form id="fNeg" novalidate>
    ${store.modoDemo ? `<p class="aj-nota demo">${icono('flask')} Modo demo: estos ajustes se guardan solo en este navegador. Con Supabase se aplican a todos los visitantes.</p>` : ''}
    ${bloque('Portada y pedidos', 'Lo que ven los visitantes al entrar.', `
      ${texto('aviso', 'Texto de la píldora de la portada', a.aviso, 'maxlength="70"', 'Ej.: Plazas abiertas para nuevos proyectos este mes')}
      ${interruptor({ id: 'anuncioActivo', titulo: 'Mostrar franja de aviso arriba del todo', texto: 'Para ofertas, vacaciones o cambios de horario', checked: a.anuncio.activo })}
      ${texto('anuncioTexto', 'Texto de la franja', a.anuncio.texto, 'maxlength="140"')}
      ${interruptor({ id: 'aceptarPedidos', titulo: 'Aceptar pedidos nuevos', texto: 'Si lo desactivas, los botones de compra pasan a «Lista de espera»', checked: a.aceptarPedidos })}
      ${campo({ id: 'f_mensajeCerrado', name: 'mensajeCerrado', label: 'Mensaje cuando no aceptas pedidos', type: 'textarea', value: a.mensajeCerrado, attrs: 'maxlength="300"' })}`)}
    ${bloque('Contacto', 'Datos que aparecen en la web, en el asistente y en el pie.', `
      <div class="row-2">${texto('email', 'Correo de contacto', a.email, 'type="email"')}${texto('horario', 'Horario de atención', a.horario, 'maxlength="80"')}</div>
      ${texto('respuesta', 'Tiempo de respuesta', a.respuesta, 'maxlength="80"')}
      <div class="row-2">${texto('instagram', 'Instagram (enlace)', a.redes.instagram, 'type="url"')}${texto('tiktok', 'TikTok (enlace)', a.redes.tiktok, 'type="url"')}</div>
      <div class="row-2">${texto('linkedin', 'LinkedIn (enlace)', a.redes.linkedin, 'type="url"')}${texto('trustpilot', 'Trustpilot (enlace)', a.trustpilot, 'type="url"')}</div>`)}
    ${bloque('Precios y plazos', 'Precio de partida, plazo que ve el cliente y días máximos para calcular la fecha de entrega.', `
      <div class="aj-tabla"><div class="aj-tr aj-th"><span>Plan</span><span>Activo</span><span>Precio (€)</span><span>Plazo</span><span>Días</span><span>Destacado</span></div>
      ${PLANES.map(p => { const o = a.planes[p.id]; return `<div class="aj-tr" data-plan="${p.id}">
        <span><b>${esc(p.nombre)}</b><small>Original: ${euros(ORIGINAL.planes.find(x => x.id === p.id).precio)}</small></span>
        <label class="aj-ck"><input type="checkbox" data-k="activo" ${o.activo ? 'checked' : ''}><span class="ck-mark"></span></label>
        <input type="number" min="0" step="1" data-k="precio" value="${o.precio}" aria-label="Precio de ${esc(p.nombre)}">
        <input type="text" maxlength="30" data-k="entrega" value="${esc(o.entrega)}" aria-label="Plazo de ${esc(p.nombre)}">
        <input type="number" min="1" max="365" data-k="dias" value="${o.dias}" aria-label="Días de ${esc(p.nombre)}">
        <label class="aj-ck"><input type="radio" name="popular" value="${p.id}" ${o.popular ? 'checked' : ''}><span class="ck-mark redondo"></span></label>
      </div>`; }).join('')}</div>`)}
    ${bloque('Extras', 'Opciones que el cliente puede añadir en el cuestionario.', `
      <div class="aj-tabla extras"><div class="aj-tr aj-th"><span>Extra</span><span>Activo</span><span>Precio (€)</span></div>
      ${EXTRAS.map(x => { const o = a.extras[x.id]; return `<div class="aj-tr" data-extra="${x.id}">
        <span><b>${esc(x.nombre)}</b><small>${x.mensual ? 'Cuota mensual' : 'Pago único'}</small></span>
        <label class="aj-ck"><input type="checkbox" data-k="activo" ${o.activo ? 'checked' : ''}><span class="ck-mark"></span></label>
        <input type="number" min="0" step="1" data-k="precio" value="${o.precio}" aria-label="Precio de ${esc(x.nombre)}">
      </div>`; }).join('')}</div>`)}
    ${bloque('Cobros y comisiones', 'Formas de pago que ven los clientes. Deja en blanco las que no uses.', `
      <div class="aj-nums">
        <label class="aj-num"><span>Señal al empezar (%)</span><input type="number" min="0" max="100" name="senal" value="${a.senal}"></label>
        <label class="aj-num"><span>Recargo urgente (%)</span><input type="number" min="0" max="200" name="urgente" value="${pct(a.urgente)}"></label>
        <label class="aj-num"><span>Comisión vendedores (%)</span><input type="number" min="0" max="100" name="comision" value="${a.comision}"></label>
      </div>
      <div class="row-2">${texto('bizum', 'Bizum (teléfono)', a.pagos.bizum, 'type="tel"')}${texto('titular', 'Titular de la cuenta', a.pagos.titular)}</div>
      ${texto('iban', 'IBAN', a.pagos.iban, 'autocapitalize="characters"')}
      <div class="row-2">${texto('stripe', 'Enlace de pago de Stripe', a.pagos.stripe, 'type="url"', 'https://buy.stripe.com/…')}${texto('paypal', 'Usuario de PayPal.Me', a.pagos.paypal, '', 'Solo el usuario, sin paypal.me/')}</div>`)}
    ${bloque('Descuento de bienvenida', 'Se anuncia en la web y solo vale en la primera web de cada cliente (se comprueba al confirmar el pedido).', `
      ${interruptor({ id: 'bvActivo', titulo: 'Ofrecer descuento en la primera compra', checked: a.bienvenida.activo })}
      <div class="row-2">${texto('bvCodigo', 'Código', a.bienvenida.codigo, 'maxlength="30" autocapitalize="characters"')}<label class="aj-num"><span>Descuento (%)</span><input type="number" min="1" max="100" name="bvPct" value="${a.bienvenida.pct}"></label></div>`)}
    ${bloque('Creadores de vídeo', 'Pago fijo por cada vídeo aprobado y publicado. Se muestra en «Trabaja con nosotros» y en el panel de cada creador.', `
      <div class="aj-nums">
        <label class="aj-num"><span>Pago por vídeo (€)</span><input type="number" min="0" step="1" name="vPrecio" value="${a.videos.precio}"></label>
        <label class="aj-num"><span>Bonus por alcance (€)</span><input type="number" min="0" step="1" name="vBonus" value="${a.videos.bonus}"></label>
        <label class="aj-num"><span>Visualizaciones para el bonus</span><input type="number" min="0" step="500" name="vVisitas" value="${a.videos.visitas}"></label>
        <label class="aj-num"><span>Vídeos pagados al mes (máx.)</span><input type="number" min="1" max="100" name="vMax" value="${a.videos.maxMes}"></label>
      </div>`)}
    ${bloque('Cupones de descuento', 'El cliente los escribe en el resumen del pedido. La lista no es visible para nadie más.', `
      <div class="cupones" id="cupones">${cupones.map(filaCupon).join('')}</div>
      <button type="button" class="btn btn-sm btn-ghost" id="addCupon">${icono('plus')}<span>Añadir cupón</span></button>`)}
    ${bloque('Trustpilot', 'El enlace público (arriba, en Contacto) enseña tu perfil en la web. La dirección de invitaciones es privada: solo la ves tú y se usa en el botón «Pedir reseña» de cada pedido.', `
      ${texto('tpCco', 'Dirección de invitaciones de Trustpilot (CCO)', tpCco, 'type="email" autocomplete="off" autocapitalize="off"', 'aurevixweb.es+…@invite.trustpilot.com')}`)}
    ${bloque('Asistente', 'El chat de dudas de la web (con IA si está conectado Gemini).', `
      ${interruptor({ id: 'asistActivo', titulo: 'Mostrar el asistente', checked: a.asistente.activo })}
      ${campo({ id: 'f_saludo', name: 'saludo', label: 'Mensaje de bienvenida', type: 'textarea', value: a.asistente.saludo, attrs: 'maxlength="300"' })}`)}
    <div class="aj-fijo"><button type="button" class="btn btn-ghost" id="resetNeg">Restablecer valores originales</button><button class="btn btn-primary" type="submit" id="gNeg"><span>Guardar ajustes del negocio</span></button></div>
  </form>`;
  $('#addCupon').addEventListener('click', () => { $('#cupones').insertAdjacentHTML('beforeend', filaCupon({ codigo: '', pct: 10, hasta: '', activo: true })); $('#cupones .cp:last-child input').focus(); });
  $('#cupones').addEventListener('click', e => { if (e.target.closest('[data-quitar-cp]')) e.target.closest('.cp').remove(); });
  $('#cupones').addEventListener('input', e => { if (e.target.dataset.k === 'codigo') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''); });
  $('#resetNeg').addEventListener('click', async () => {
    if (!confirm('¿Volver a los precios, plazos y textos originales de config.js?')) return;
    const o = ORIGINAL.config;
    await guardar({
      aviso: o.aviso, anuncio: o.anuncio, aceptarPedidos: o.aceptarPedidos, mensajeCerrado: o.mensajeCerrado, horario: o.horario, respuesta: o.respuesta, email: o.email,
      senal: o.senal, comision: o.comision, urgente: o.urgente, pagos: o.pagos, trustpilot: o.trustpilot, bienvenida: o.bienvenida, videos: o.videos, redes: o.redes, asistente: { activo: o.asistente.activo, saludo: o.asistente.saludo },
      planes: Object.fromEntries(ORIGINAL.planes.map(p => [p.id, { precio: p.precio, entrega: p.entrega, dias: p.dias, activo: true, popular: !!p.popular }])),
      extras: Object.fromEntries(ORIGINAL.extras.map(x => [x.id, { precio: x.precio, activo: true }]))
    }, null, $('#resetNeg'));
    negocio().then(() => etiquetas(body));
  });
  $('#fNeg').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const v = k => String(f.get(k) ?? '').trim();
    const planes = Object.fromEntries($$('[data-plan]').map(r => [r.dataset.plan, {
      activo: $('[data-k=activo]', r).checked, precio: Math.max(0, +$('[data-k=precio]', r).value || 0),
      entrega: $('[data-k=entrega]', r).value.trim(), dias: Math.max(1, +$('[data-k=dias]', r).value || 1), popular: v('popular') === r.dataset.plan
    }]));
    if (!Object.values(planes).some(p => p.activo)) return toast('Deja al menos un tipo de web activo', 'err');
    const extras = Object.fromEntries($$('[data-extra]').map(r => [r.dataset.extra, { activo: $('[data-k=activo]', r).checked, precio: Math.max(0, +$('[data-k=precio]', r).value || 0) }]));
    if (v('email') && !/^\S+@\S+\.\S+$/.test(v('email'))) return toast('Revisa el correo de contacto', 'err');
    const lista = $$('#cupones .cp').map(c => ({
      codigo: $('[data-k=codigo]', c).value.trim(), pct: Math.min(100, Math.max(1, +$('[data-k=pct]', c).value || 0)),
      hasta: $('[data-k=hasta]', c).value, activo: $('[data-k=activo]', c).checked
    })).filter(c => c.codigo);
    if (new Set(lista.map(c => c.codigo)).size !== lista.length) return toast('Hay dos cupones con el mismo código', 'err');
    if (v('tpCco') && !/^\S+@\S+\.\S+$/.test(v('tpCco'))) return toast('Revisa la dirección de invitaciones de Trustpilot', 'err');
    await guardar({
      aviso: v('aviso') || ORIGINAL.config.aviso, anuncio: { activo: $('#anuncioActivo').checked, texto: v('anuncioTexto') },
      aceptarPedidos: $('#aceptarPedidos').checked, mensajeCerrado: v('mensajeCerrado'),
      email: v('email') || CONFIG.email, horario: v('horario'), respuesta: v('respuesta'),
      redes: { instagram: v('instagram'), tiktok: v('tiktok'), linkedin: v('linkedin') }, trustpilot: v('trustpilot'),
      bienvenida: { activo: $('#bvActivo').checked, codigo: v('bvCodigo').toUpperCase().replace(/[^A-Z0-9_-]/g, '') || ORIGINAL.config.bienvenida.codigo, pct: Math.min(100, Math.max(1, +v('bvPct') || 10)) },
      videos: { precio: Math.max(0, +v('vPrecio') || 0), bonus: Math.max(0, +v('vBonus') || 0), visitas: Math.max(0, +v('vVisitas') || 0), maxMes: Math.max(1, +v('vMax') || 1) },
      senal: +v('senal'), urgente: (+v('urgente')) / 100, comision: +v('comision'),
      pagos: { bizum: v('bizum'), titular: v('titular'), iban: v('iban'), stripe: v('stripe'), paypal: v('paypal').replace(/^.*paypal\.me\//i, '') },
      asistente: { activo: $('#asistActivo').checked, saludo: v('saludo') },
      planes, extras
    }, { lista }, $('#gNeg'), { cco: v('tpCco') });
  });
}
const filaCupon = c => `<div class="cp">
  <input data-k="codigo" value="${esc(c.codigo)}" placeholder="CÓDIGO" maxlength="30" aria-label="Código">
  <label><input type="number" data-k="pct" min="1" max="100" value="${c.pct}" aria-label="Descuento"><span>%</span></label>
  <label><span>hasta</span><input type="date" data-k="hasta" value="${esc(c.hasta || '')}" aria-label="Válido hasta"></label>
  <label class="aj-ck"><input type="checkbox" data-k="activo" ${c.activo !== false ? 'checked' : ''}><span class="ck-mark"></span><span>Activo</span></label>
  <button type="button" class="icon-btn sm" data-quitar-cp aria-label="Quitar cupón">${icono('trash')}</button>
</div>`;
async function guardar(web, cupones, btn, tp) {
  ocupado(btn, true);
  try {
    await guardarAjustesWeb(web);
    if (cupones) await store.guardarAjustes('cupones', cupones);
    if (tp) await store.guardarAjustes('trustpilot', tp);
    toast('Ajustes del negocio guardados. Ya se aplican en la web.', 'ok');
  } catch (err) { toast(err.message, 'err'); }
  ocupado(btn, false);
}

/* Arranque (al final: así todas las funciones ya están definidas) */
store.alCambiarUsuario(u => { U = u; pintarNav(); pintar(); });
addEventListener('hashchange', () => { seccion = location.hash.slice(1) || 'perfil'; pintarNav(); pintar(); });
