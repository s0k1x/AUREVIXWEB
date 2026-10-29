// ==========================================================
//  VERIFICACIÓN ANTI-ROBOTS (Cloudflare Turnstile) · función de Supabase
//  La web (js/verificacion.js) manda aquí el token del widget y esta
//  función lo comprueba con Cloudflare usando la clave secreta, que solo
//  vive en Supabase (Edge Functions → Secrets → TURNSTILE_SECRET).
//  Cada token solo vale una vez y caduca a los 5 minutos.
//  Sin clave secreta responde que sí (para no dejar a nadie fuera mientras
//  se configura) y lo indica con «sinComprobar».
// ==========================================================
const SECRETO = Deno.env.get('TURNSTILE_SECRET') || '';
const ORIGENES = ['https://aurevixweb.es', 'https://www.aurevixweb.es'];

const cabeceras = (origen: string | null) => ({
  'Access-Control-Allow-Origin': origen && ORIGENES.includes(origen) ? origen : ORIGENES[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Content-Type': 'application/json',
  Vary: 'Origin'
});

Deno.serve(async req => {
  const h = cabeceras(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (req.method !== 'POST') return new Response('{"ok":false}', { status: 405, headers: h });
  if (!SECRETO) return new Response('{"ok":true,"sinComprobar":true}', { headers: h });
  try {
    const { token } = await req.json();
    if (typeof token !== 'string' || token.length < 10 || token.length > 4096) return new Response('{"ok":false}', { status: 400, headers: h });
    const datos = new FormData();
    datos.append('secret', SECRETO);
    datos.append('response', token);
    const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (ip) datos.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: datos });
    const j = await r.json();
    const ok = !!j.success && (!j.hostname || /(^|\.)aurevixweb\.es$/.test(j.hostname));
    if (!ok) console.warn('Turnstile no válido', JSON.stringify(j['error-codes'] || []), j.hostname);
    return new Response(JSON.stringify({ ok }), { headers: h });
  } catch (e) {
    console.error(e);
    return new Response('{"ok":false}', { status: 500, headers: h });
  }
});
