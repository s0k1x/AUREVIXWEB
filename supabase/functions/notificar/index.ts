// ==========================================================
//  AVISOS COMO NOTIFICACIONES PUSH · función de Supabase
//  Cada aviso nuevo de la campana (tabla «avisos») llama aquí
//  desde la base de datos (disparador «aviso_por_correo», ver
//  supabase/migraciones/v58-avisos-correo.sql) y se manda como notificación a
//  los dispositivos en los que la persona las ha activado
//  (tabla «push_subs», supabase/migraciones/v68-push.sql), igual que un WhatsApp.
//  - Desde v68 ya NO se mandan correos por avisos: el correo queda
//    solo para facturas, recibos y códigos de acceso (función «correo»).
//  - Solo si la persona tiene las notificaciones y ese tipo de aviso
//    encendidos (Ajustes → Avisos).
//  - Las del mismo proyecto y tipo se sustituyen (no se amontonan).
//  - Las suscripciones caducadas (el navegador las da de baja) se borran.
//  Solo recibe el id del aviso: todo lo demás lo lee de la base de
//  datos, así que no se puede usar para mandar notificaciones inventadas.
//  Claves VAPID: la primera vez la función las crea y las guarda en la
//  tabla privada «claves_push» (solo la lee el servidor). Nadie tiene que
//  copiarlas. GET devuelve la pública, que es la que necesita la web.
// ==========================================================
import webpush from 'npm:web-push@3.6.7';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CONTACTO = 'mailto:aurevixweb@gmail.com';
const WEB = 'https://aurevixweb.es';
const MAX_DIA = 60; // tope de seguridad por persona y día

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

/** Claves VAPID: las guardadas o, la primera vez, unas nuevas */
let claves: { publica: string; privada: string } | null = null;
async function clavesVapid() {
  if (claves) return claves;
  let [c] = await leer('claves_push?id=eq.1&select=publica,privada');
  if (!c) {
    const k = webpush.generateVAPIDKeys();
    await db('claves_push', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ id: 1, publica: k.publicKey, privada: k.privateKey }) });
    [c] = await leer('claves_push?id=eq.1&select=publica,privada'); // por si otra petición la creó a la vez
  }
  claves = c;
  webpush.setVapidDetails(CONTACTO, c.publica, c.privada);
  return c;
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info' };

/** Título y enlace de cada tipo de aviso */
function contenido(tipo: string, pedido: string | null, equipo: boolean) {
  const T: Record<string, string> = {
    etapa: 'Tu proyecto avanza',
    revision: 'Tu vista previa está lista',
    pago: equipo ? 'Hay un pago por revisar' : 'Novedades de tu pago',
    mensaje: 'Mensaje nuevo',
    soporte: equipo ? 'Consulta nueva' : 'Respuesta a tu consulta',
    pedido: 'Pedido nuevo',
    cliente: 'Un cliente ha actualizado su proyecto',
    video: 'Novedades de los vídeos'
  };
  const titulo = T[tipo] || 'AurevixWeb';
  let enlace = equipo ? `${WEB}/panel` : `${WEB}/#mis-pedidos`;
  if (tipo === 'video') enlace = equipo ? `${WEB}/panel#videos` : `${WEB}/trabaja-con-nosotros`;
  else if (tipo === 'soporte') enlace = equipo ? `${WEB}/panel#soporte` : `${WEB}/#soporte`;
  else if (pedido) enlace = equipo ? `${WEB}/panel#pedido-${pedido}` : `${WEB}/#proyecto-${pedido}${tipo === 'pago' ? '/pagos' : tipo === 'mensaje' ? '/mensajes' : '/estado'}`;
  return { titulo, enlace };
}

Deno.serve(async req => {
  // La web pide la clave pública para que el navegador se suscriba
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method === 'GET') {
    try { const c = await clavesVapid(); return new Response(JSON.stringify({ publica: c.publica }), { headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } }); }
    catch (e) { console.error(e); return new Response('{}', { status: 500, headers: CORS }); }
  }
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  try {
    await clavesVapid();
    const { aviso } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(aviso))) return new Response('Petición incompleta', { status: 400 });
    const [a] = await leer(`avisos?id=eq.${aviso}&select=id,uid,datos,created_at`) as { id: string; uid: string; datos: Record<string, any>; created_at: string }[];
    if (!a) return ok('no existe');
    const d = a.datos || {};
    if (d.push) return ok('ya enviado');
    const marcar = (valor: number | string) => db(`avisos?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ datos: { ...d, push: valor } }) });

    const [p] = await leer(`perfiles?id=eq.${a.uid}&select=role,datos`) as { role: string; datos: Record<string, any> }[];
    if (!p) { await marcar('sin perfil'); return ok('sin perfil'); }
    const notif = p.datos?.notif || {};
    const tipo = String(d.tipo || 'info');
    if (notif.push === false || notif[tipo] === false) { await marcar('desactivado'); return ok('desactivado'); }

    const subs = await leer(`push_subs?uid=eq.${a.uid}&select=endpoint,p256dh,auth`) as { endpoint: string; p256dh: string; auth: string }[];
    if (!subs.length) { await marcar('sin dispositivos'); return ok('sin dispositivos'); }

    // Tope de seguridad por persona y día (los enviados guardan la hora: empiezan por cifra)
    const ayer = new Date(Date.now() - 864e5).toISOString();
    const hoy = await leer(`avisos?uid=eq.${a.uid}&created_at=gt.${q(ayer)}&datos->>push=like.1*&select=id&limit=${MAX_DIA}`) as unknown[];
    if (hoy.length >= MAX_DIA) { await marcar('tope'); return ok('tope diario'); }

    const equipo = p.role === 'owner' || p.role === 'worker';
    const pedido = d.pedido ? String(d.pedido) : null;
    const { titulo, enlace } = contenido(tipo, pedido, equipo);
    const carga = JSON.stringify({ titulo, texto: String(d.texto || titulo).slice(0, 180), url: enlace, tag: `${tipo}-${pedido || 'general'}` });

    let enviados = 0;
    await Promise.all(subs.map(async s => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: 'high', topic: `${tipo}${pedido ? pedido.replace(/-/g, '').slice(0, 20) : ''}`.slice(0, 32) });
        enviados++;
      } catch (e: any) {
        // 404/410: el navegador ha dado de baja este dispositivo
        if (e?.statusCode === 404 || e?.statusCode === 410) await db(`push_subs?endpoint=eq.${q(s.endpoint)}`, { method: 'DELETE' }).catch(() => {});
        else console.error('push', e?.statusCode, String(e?.body || e).slice(0, 200));
      }
    }));
    await marcar(enviados ? Date.now() : 'fallo');
    return ok(`enviado a ${enviados} de ${subs.length}`);
  } catch (e) {
    console.error(e);
    return ok('error');
  }
});
