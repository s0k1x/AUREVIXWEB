// ==========================================================
//  CÓDIGO PARA ENTRAR · función de Supabase
//  Envía el código de 6 cifras para entrar (o crear la cuenta) por la
//  API de Brevo, la misma que ya manda las facturas, en lugar del SMTP
//  de Supabase Auth. Así, si Brevo rechaza un correo, el motivo exacto
//  queda en los registros de esta función (Edge Functions → codigo → Logs).
//  - El código lo genera Supabase Auth (admin/generate_link) y lo comprueba
//    él mismo con verifyOtp: la web nunca lo ve antes de que lo escribas.
//  - Sin nombre solo entra si la cuenta ya existe (igual que antes).
//  - Límite: un código por correo cada 45 s y 8 por IP cada 10 min.
//  - Si está TURNSTILE_SECRET, exige el anti-robots igual que el login.
//  Secretos que usa (ya existen): BREVO_API_KEY, BREVO_REMITENTE y los
//  de Supabase. Nunca van en la web.
// ==========================================================

const BREVO = Deno.env.get('BREVO_API_KEY') || '';
const REMITENTE = Deno.env.get('BREVO_REMITENTE') || '';
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TURNSTILE = Deno.env.get('TURNSTILE_SECRET') || '';
const WEB = 'https://aurevixweb.es';
const ORIGENES = ['https://aurevixweb.es', 'https://www.aurevixweb.es'];

const cabeceras = (origen: string | null) => ({
  'Access-Control-Allow-Origin': origen && ORIGENES.includes(origen) ? origen : ORIGENES[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Content-Type': 'application/json',
  Vary: 'Origin'
});

const porCorreo = new Map<string, number>();
const porIp = new Map<string, number[]>();

const admin = (ruta: string, init: RequestInit = {}) => fetch(`${SB_URL}/auth/v1/admin/${ruta}`, {
  ...init,
  headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
});

async function existe(email: string) {
  const r = await admin(`users?filter=${encodeURIComponent(email)}&per_page=50`);
  if (!r.ok) throw new Error(`admin/users ${r.status}`);
  const j = await r.json();
  return (j.users || []).some((u: { email?: string }) => String(u.email || '').toLowerCase() === email);
}

async function turnstileOk(token: string, ip: string) {
  if (!TURNSTILE) return true;
  if (typeof token !== 'string' || token.length < 10) return false;
  const datos = new FormData();
  datos.append('secret', TURNSTILE);
  datos.append('response', token);
  if (ip) datos.append('remoteip', ip);
  const j = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: datos })).json();
  return !!j.success;
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function correo(codigo: string, nombre: string, nueva: boolean) {
  const hola = nombre ? `Hola ${esc(nombre.split(/\s+/)[0])},` : 'Hola,';
  const que = nueva ? 'crear tu cuenta' : 'entrar en tu cuenta';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu código</title></head>
<body style="margin:0;padding:0;background:#f3f2ee;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16161b">
<div style="display:none;max-height:0;overflow:hidden">Tu código es ${codigo}. Caduca en 1 hora.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#0c0c0e;padding:22px 28px">
    <img src="${WEB}/icons/logo-a.png" width="32" height="32" alt="" style="vertical-align:middle;border:0">
    <span style="vertical-align:middle;margin-left:10px;color:#f3f1ea;font-size:17px;font-weight:700">AurevixWeb</span>
  </td></tr>
  <tr><td style="height:4px;background:#c8f560;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:30px 28px 10px">
    <p style="margin:0 0 12px;font-size:16px;line-height:1.5">${hola}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5">Este es tu código para ${que}:</p>
    <p style="margin:0 0 20px;font-size:36px;font-weight:700;letter-spacing:.32em;font-family:'SFMono-Regular',Menlo,Consolas,monospace;background:#f6f8ef;border-radius:12px;padding:18px 0;text-align:center">${codigo}</p>
    <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#5b5953">Escríbelo en la web. Caduca en 1 hora y solo sirve una vez.</p>
  </td></tr>
  <tr><td style="padding:16px 28px 28px">
    <p style="margin:0;padding-top:14px;border-top:1px solid #eeede8;font-size:12px;line-height:1.6;color:#86837c">Si no lo has pedido tú, ignora este correo: nadie puede entrar sin el código.<br>${WEB.replace('https://', '')}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
  const texto = `${hola.replace(/&[^;]+;/g, '')}\n\nTu código para ${que}: ${codigo}\n\nEscríbelo en la web. Caduca en 1 hora y solo sirve una vez.\nSi no lo has pedido tú, ignora este correo.\n\n${WEB}`;
  return { html, texto, asunto: `${codigo} es tu código de AurevixWeb` };
}

Deno.serve(async req => {
  const h = cabeceras(req.headers.get('origin'));
  const res = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status, headers: h });
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (req.method !== 'POST') return res({ error: 'Método no permitido' }, 405);
  if (!BREVO || !REMITENTE || !SB_URL || !SERVICIO) return res({ error: 'sin-configurar' }, 503);
  try {
    const cuerpo = await req.json().catch(() => ({}));
    const email = String(cuerpo.email || '').trim().toLowerCase();
    const nombre = String(cuerpo.nombre || '').trim().slice(0, 80);
    if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return res({ error: 'El email no es válido' }, 400);

    const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const ahora = Date.now();
    if (ahora - (porCorreo.get(email) || 0) < 45_000) return res({ error: 'Demasiados intentos. Espera un minuto y vuelve a probar.' }, 429);
    const lista = (porIp.get(ip) || []).filter(t => ahora - t < 600_000);
    if (ip && lista.length >= 8) return res({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' }, 429);
    if (!(await turnstileOk(cuerpo.captchaToken, ip))) return res({ error: 'No hemos podido comprobar que no eres un robot. Recarga la página.' }, 403);

    const ya = await existe(email);
    if (!ya && !nombre) return res({ error: 'No hay ninguna cuenta con ese email. Regístrate primero.' }, 404);
    if (!ya) {
      const c = await admin('users', { method: 'POST', body: JSON.stringify({ email, email_confirm: false, user_metadata: { name: nombre, full_name: nombre } }) });
      if (!c.ok && c.status !== 422) throw new Error(`crear usuario ${c.status}: ${(await c.text()).slice(0, 200)}`);
    }
    const g = await admin('generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email, redirect_to: WEB }) });
    if (!g.ok) throw new Error(`generate_link ${g.status}: ${(await g.text()).slice(0, 200)}`);
    const j = await g.json();
    const codigo = String(j?.properties?.email_otp || j?.email_otp || '');
    if (!/^\d{6,10}$/.test(codigo)) throw new Error('generate_link sin código');

    const { html, texto, asunto } = correo(codigo, nombre || j?.user_metadata?.name || '', !ya);
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'AurevixWeb', email: REMITENTE }, to: [{ email }], subject: asunto, htmlContent: html, textContent: texto, tags: ['codigo'] })
    });
    if (!r.ok) {
      // El motivo exacto de Brevo queda aquí (cuenta bloqueada, remitente sin verificar, sin créditos…)
      console.error('Brevo rechaza el código', r.status, (await r.text()).slice(0, 400));
      return res({ error: 'brevo' }, 502);
    }
    porCorreo.set(email, ahora);
    lista.push(ahora); if (ip) porIp.set(ip, lista);
    console.log('Código enviado por Brevo', (await r.json().catch(() => ({})))?.messageId || '');
    return res({ ok: true });
  } catch (e) {
    console.error(e);
    return res({ error: 'fallo' }, 500);
  }
});
