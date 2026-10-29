// ==========================================================
//  AVISOS POR CORREO (Brevo) · función de Supabase
//  Cada aviso nuevo de la campana (tabla «avisos») llama aquí
//  desde la base de datos (disparador «aviso_por_correo», ver
//  supabase/avisos-correo-v58.sql) y se manda también por correo:
//  - Solo si la persona tiene los avisos por correo activados y
//    ese tipo de aviso encendido (Ajustes → Avisos).
//  - Como mucho un correo cada 30 minutos por proyecto y tipo:
//    el resto se ven en la campana igualmente.
//  - El cliente no recibe correo de «pago»: ya le llega el recibo.
//  - Se manda al correo con el que entra (el verificado con el
//    código), nunca al que se pueda escribir en el perfil.
//  - Como mucho MAX_DIA correos al día por persona (el cupo de
//    Brevo es el mismo que el de los códigos de acceso).
//  Solo recibe el id del aviso: todo lo demás lo lee de la base de
//  datos, así que no se puede usar para mandar correos inventados.
//  Secretos: BREVO_API_KEY y BREVO_REMITENTE (los mismos que «correo»).
// ==========================================================

const BREVO = Deno.env.get('BREVO_API_KEY') || '';
const REMITENTE = Deno.env.get('BREVO_REMITENTE') || '';
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEB = 'https://aurevixweb.es';
const AGRUPAR = 30 * 60e3;
const MAX_DIA = 15;

const ok = (motivo: string) => new Response(JSON.stringify({ ok: true, motivo }), { headers: { 'Content-Type': 'application/json' } });
const q = encodeURIComponent;

async function db(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}
const leer = async (ruta: string) => (await db(ruta)).json();

/** Correo verificado de la cuenta (el de entrar con el código) */
async function correoCuenta(uid: string) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, { headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` } });
  if (!r.ok) return '';
  const u = await r.json();
  return u?.email && (u.email_confirmed_at || u.confirmed_at) ? String(u.email) : '';
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Título, texto del botón y enlace de cada tipo de aviso */
function contenido(tipo: string, pedido: string | null, equipo: boolean) {
  const T: Record<string, [string, string]> = {
    etapa: ['Tu proyecto avanza', 'Ver mi proyecto'],
    revision: ['Tu vista previa está lista', 'Ver la vista previa'],
    pago: [equipo ? 'Hay un pago por revisar' : 'Novedades de tu pago', equipo ? 'Abrir el pedido' : 'Ver mis pagos'],
    mensaje: ['Tienes un mensaje nuevo', 'Leer el mensaje'],
    soporte: [equipo ? 'Consulta nueva' : 'Respuesta a tu consulta', equipo ? 'Abrir soporte' : 'Ver la respuesta'],
    pedido: ['Pedido nuevo', 'Abrir el pedido'],
    cliente: ['Un cliente ha actualizado su proyecto', 'Abrir el pedido'],
    video: ['Novedades de los vídeos', equipo ? 'Revisar vídeos' : 'Ver mis vídeos']
  };
  const [titulo, boton] = T[tipo] || ['Tienes un aviso nuevo', 'Abrir AurevixWeb'];
  let enlace = equipo ? `${WEB}/panel` : `${WEB}/#mis-pedidos`;
  if (tipo === 'video') enlace = equipo ? `${WEB}/panel#videos` : `${WEB}/trabaja-con-nosotros`;
  else if (tipo === 'soporte') enlace = equipo ? `${WEB}/panel#soporte` : `${WEB}/#soporte`;
  else if (pedido) enlace = equipo ? `${WEB}/panel#pedido-${pedido}` : `${WEB}/#proyecto-${pedido}${tipo === 'pago' ? '/pagos' : tipo === 'mensaje' ? '/mensajes' : '/estado'}`;
  return { titulo, boton, enlace };
}

function correoHTML(nombre: string, titulo: string, texto: string, boton: string, enlace: string, email: string) {
  const f = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#0c0c0e;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0c0c0e;font-size:1px;line-height:1px">${esc(texto)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0c0c0e" style="background:#0c0c0e"><tr><td align="center" style="padding:28px 14px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
  <tr><td bgcolor="#16161b" style="background:#16161b;border:1px solid #2a2a31;border-radius:22px;overflow:hidden">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="#0c0c0e" style="background:#0c0c0e;border-radius:21px 21px 0 0;font-size:0;line-height:0">
        <a href="${WEB}" target="_blank" style="text-decoration:none"><img src="${WEB}/icons/email-cabecera.png" width="480" height="210" alt="AurevixWeb" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:21px 21px 0 0;font-family:${f};font-size:26px;line-height:210px;font-weight:700;color:#c8f560;text-align:center"></a>
      </td></tr>
      <tr><td align="center" style="padding:36px 28px 34px">
        <h1 style="margin:0 0 12px;font-family:'Bricolage Grotesque',${f};font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-.02em;color:#f3f1ea;text-align:center">${esc(titulo)}</h1>
        <p style="margin:0 auto 28px;max-width:360px;font-family:${f};font-size:16px;line-height:1.55;color:#b7b5ac;text-align:center">${nombre ? `Hola ${esc(nombre)}, ` : ''}${esc(texto.charAt(0).toLowerCase() + texto.slice(1))}.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td align="center" bgcolor="#c8f560" style="background:#c8f560;border-radius:999px">
            <a href="${enlace}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${f};font-size:15.5px;font-weight:700;color:#0c0c0e;text-decoration:none;border-radius:999px">${esc(boton)}</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:24px 10px 0;font-family:${f};font-size:12.5px;line-height:1.7;color:#86837c;text-align:center">
    Enviado a ${esc(email)} porque tienes los avisos por correo activados.<br>
    <a href="${WEB}/ajustes#notificaciones" style="color:#b7b5ac;text-decoration:underline">Cambiar mis avisos</a> &nbsp;·&nbsp; <a href="${WEB}" style="color:#b7b5ac;text-decoration:underline">aurevixweb.es</a><br>
    AurevixWeb · Páginas web para negocios
  </td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  if (!BREVO || !REMITENTE) return ok('sin Brevo');
  try {
    const { aviso } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(aviso))) return new Response('Petición incompleta', { status: 400 });
    const [a] = await leer(`avisos?id=eq.${aviso}&select=id,uid,datos,created_at`) as { id: string; uid: string; datos: Record<string, any>; created_at: string }[];
    if (!a) return ok('no existe');
    const d = a.datos || {};
    if (d.correo) return ok('ya enviado');
    const marcar = (valor: number | string) => db(`avisos?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ datos: { ...d, correo: valor } }) });

    const [p] = await leer(`perfiles?id=eq.${a.uid}&select=name,role,datos`) as { name: string; role: string; datos: Record<string, any> }[];
    const email = await correoCuenta(a.uid);
    if (!p || !email) { await marcar('sin correo'); return ok('sin correo'); }
    const notif = p.datos?.notif || {};
    const equipo = p.role === 'owner' || p.role === 'worker';
    const tipo = String(d.tipo || 'info');
    if (notif.correo === false || notif[tipo] === false) { await marcar('desactivado'); return ok('desactivado'); }
    if (!equipo && tipo === 'pago') { await marcar('recibo'); return ok('el recibo ya avisa'); }

    // Como mucho un correo cada 30 minutos por persona, proyecto y tipo
    const desde = new Date(Date.parse(a.created_at) - AGRUPAR).toISOString();
    const pedido = d.pedido ? String(d.pedido) : null;
    const recientes = await leer(`avisos?uid=eq.${a.uid}&id=neq.${a.id}&created_at=gt.${q(desde)}&datos->>tipo=eq.${q(tipo)}&datos->>pedido=${pedido ? `eq.${pedido}` : 'is.null'}&datos->>correo=not.is.null&select=datos`) as { datos: Record<string, any> }[];
    if (recientes.some(x => typeof x.datos?.correo === 'number')) { await marcar('agrupado'); return ok('agrupado'); }
    // Tope diario por persona (los enviados guardan la hora: empiezan por cifra)
    const ayer = new Date(Date.now() - 864e5).toISOString();
    const hoy = await leer(`avisos?uid=eq.${a.uid}&created_at=gt.${q(ayer)}&datos->>correo=like.1*&select=id&limit=${MAX_DIA}`) as unknown[];
    if (hoy.length >= MAX_DIA) { await marcar('tope'); return ok('tope diario'); }

    const { titulo, boton, enlace } = contenido(tipo, pedido, equipo);
    const texto = String(d.texto || titulo).slice(0, 200);
    const nombre = String(p.name || '').trim().split(/\s+/)[0];
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'AurevixWeb', email: REMITENTE },
        to: [{ email, name: String(p.name || '').slice(0, 80) || undefined }],
        subject: texto.length > 90 ? texto.slice(0, 87) + '…' : texto,
        htmlContent: correoHTML(nombre, titulo, texto, boton, enlace, email),
        textContent: `${titulo}\n\n${nombre ? `Hola ${nombre}, ` : ''}${texto}.\n\n${boton}: ${enlace}\n\nPuedes cambiar tus avisos en ${WEB}/ajustes#notificaciones`,
        tags: ['aviso', tipo]
      })
    });
    if (!r.ok) { console.error('Brevo', r.status, (await r.text()).slice(0, 300)); return ok('Brevo falló'); }
    await marcar(Date.now());
    return ok('enviado');
  } catch (e) {
    console.error(e);
    return ok('error');
  }
});
