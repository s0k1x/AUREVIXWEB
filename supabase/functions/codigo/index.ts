// ==========================================================
//  CÓDIGO PARA ENTRAR · función de Supabase
//  La web pide aquí el código de 6 cifras para entrar o crear la cuenta.
//  1. Supabase Auth crea el código (admin/generate_link): el mismo que
//     luego comprueba verifyOtp. La web nunca lo ve antes de que llegue.
//  2. Se envía por la API de Brevo con el módulo común (_shared/correo.ts).
//  3. Si Brevo dice que no, la respuesta lleva el motivo y el detalle
//     queda en los registros (Edge Functions → codigo → Logs).
//  Reglas:
//  - Sin nombre solo entra si la cuenta ya existe; con nombre la crea.
//  - Un código por correo cada 40 s y 10 por IP cada 10 minutos.
//  - Si hay TURNSTILE_SECRET, exige el anti-robots igual que el login.
//  - Solo responde a la web (aurevixweb.es).
// ==========================================================
import { enviarCorreo, estadoBrevo, FalloCorreo, plantilla, esc, WEB, MARCA } from '../_shared/correo.ts';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TURNSTILE = Deno.env.get('TURNSTILE_SECRET') || '';
const ORIGENES = ['https://aurevixweb.es', 'https://www.aurevixweb.es'];

const cabeceras = (origen: string | null) => ({
  'Access-Control-Allow-Origin': origen && ORIGENES.includes(origen) ? origen : ORIGENES[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Content-Type': 'application/json',
  Vary: 'Origin'
});

/* ---------- Límites (en memoria de la función: suficiente contra el abuso normal) ---------- */
const ultimoPorCorreo = new Map<string, number>();
const enviosPorIp = new Map<string, number[]>();
function limitado(email: string, ip: string, ahora: number) {
  if (ahora - (ultimoPorCorreo.get(email) || 0) < 40_000) return 'Ya te hemos enviado un código hace un momento. Espera unos segundos para pedir otro.';
  const lista = (enviosPorIp.get(ip) || []).filter(t => ahora - t < 600_000);
  enviosPorIp.set(ip, lista);
  if (ip && lista.length >= 10) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  return '';
}
function apuntar(email: string, ip: string, ahora: number) {
  ultimoPorCorreo.set(email, ahora);
  if (ip) enviosPorIp.set(ip, [...(enviosPorIp.get(ip) || []), ahora]);
}

/* ---------- Supabase Auth (con la clave de servicio, que solo vive aquí) ---------- */
async function auth(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/${ruta}`, {
    ...init,
    headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  const texto = await r.text();
  let datos: Record<string, any> = {};
  try { datos = JSON.parse(texto); } catch { /* vacío */ }
  return { ok: r.ok, estado: r.status, datos, texto };
}

async function buscarUsuario(email: string) {
  const r = await auth(`users?filter=${encodeURIComponent(email)}&per_page=100`);
  if (!r.ok) throw new Error(`buscar usuario ${r.estado}: ${r.texto.slice(0, 200)}`);
  return (r.datos.users || []).find((u: { email?: string }) => String(u.email || '').toLowerCase() === email) || null;
}

async function crearCodigo(email: string, nombre: string) {
  const usuario = await buscarUsuario(email);
  if (!usuario && !nombre) return { sinCuenta: true as const };
  if (!usuario) {
    const c = await auth('users', { method: 'POST', body: JSON.stringify({ email, email_confirm: false, user_metadata: { name: nombre, full_name: nombre } }) });
    if (!c.ok && c.estado !== 422) throw new Error(`crear usuario ${c.estado}: ${c.texto.slice(0, 200)}`);
  }
  const g = await auth('generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email, redirect_to: WEB }) });
  if (!g.ok) throw new Error(`generate_link ${g.estado}: ${g.texto.slice(0, 200)}`);
  const codigo = String(g.datos.email_otp || g.datos.properties?.email_otp || '');
  if (!/^\d{6,10}$/.test(codigo)) throw new Error('generate_link no ha devuelto el código');
  const nombreCuenta = String(nombre || usuario?.user_metadata?.name || usuario?.user_metadata?.full_name || '');
  return { codigo, nueva: !usuario, nombre: nombreCuenta };
}

async function turnstileOk(token: unknown, ip: string) {
  if (!TURNSTILE) return true;
  if (typeof token !== 'string' || token.length < 10) return false;
  const datos = new FormData();
  datos.append('secret', TURNSTILE);
  datos.append('response', token);
  if (ip) datos.append('remoteip', ip);
  try {
    const j = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: datos, signal: AbortSignal.timeout(8000) })).json();
    return !!j.success;
  } catch { return false; }
}

/* ---------- El correo ---------- */
function correoCodigo(codigo: string, nombre: string, nueva: boolean) {
  const hola = nombre ? `Hola ${nombre.trim().split(/\s+/)[0]},` : 'Hola,';
  const para = nueva ? 'crear tu cuenta' : 'entrar en tu cuenta';
  const cuerpo = `
  <tr><td style="padding:30px 28px 8px">
    <p style="margin:0 0 12px;font-size:16px;line-height:1.5">${esc(hola)}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5">Este es tu código para ${para} en ${MARCA}:</p>
    <p style="margin:0 0 20px;padding:18px 0;border-radius:12px;background:#f6f8ef;text-align:center;font-size:36px;font-weight:700;letter-spacing:.3em;font-family:'SFMono-Regular',Menlo,Consolas,monospace;color:#16161b">${codigo}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#5b5953">Escríbelo en la web. Caduca en 1 hora y solo sirve una vez.</p>
  </td></tr>`;
  return {
    asunto: `${codigo} es tu código de ${MARCA}`,
    html: plantilla({ titulo: 'Tu código', previa: `Tu código es ${codigo}. Caduca en 1 hora.`, cuerpo, pie: `Si no lo has pedido tú, ignora este correo: nadie puede entrar sin el código.<br>${WEB.replace('https://', '')}` }),
    texto: `${hola}\n\nTu código para ${para} en ${MARCA}: ${codigo}\n\nEscríbelo en la web. Caduca en 1 hora y solo sirve una vez.\nSi no lo has pedido tú, ignora este correo.\n\n${WEB}`
  };
}

/* La primera petición de cada arranque deja en los registros cómo está la cuenta de Brevo */
let revisado = false;
async function revisarBrevo() {
  if (revisado) return;
  revisado = true;
  console.log('Estado de Brevo', JSON.stringify(await estadoBrevo()));
}

Deno.serve(async req => {
  const h = cabeceras(req.headers.get('origin'));
  const responder = (datos: unknown, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: h });
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (req.method !== 'POST') return responder({ ok: false, error: 'Método no permitido' }, 405);
  if (!SB_URL || !SERVICIO) return responder({ ok: false, motivo: 'sin-configurar', error: 'Falta configuración del servidor.' }, 503);

  // Sin hacer esperar a nadie: se revisa en segundo plano
  const revision = revisarBrevo().catch(() => {});
  (globalThis as any).EdgeRuntime?.waitUntil?.(revision);
  try {
    const cuerpo = await req.json().catch(() => ({}));
    const email = String(cuerpo.email || '').trim().toLowerCase();
    const nombre = String(cuerpo.nombre || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (email.length > 254 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email)) return responder({ ok: false, error: 'El email no es válido.' }, 400);

    const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const ahora = Date.now();
    const espera = limitado(email, ip, ahora);
    if (espera) return responder({ ok: false, error: espera }, 429);
    if (!(await turnstileOk(cuerpo.captchaToken, ip))) return responder({ ok: false, motivo: 'robot', error: 'No hemos podido comprobar que no eres un robot. Recarga la página.' }, 403);

    const c = await crearCodigo(email, nombre);
    if ('sinCuenta' in c) return responder({ ok: false, error: 'No hay ninguna cuenta con ese email. Regístrate primero.' }, 404);

    const { asunto, html, texto } = correoCodigo(c.codigo, c.nombre, c.nueva);
    await enviarCorreo({ para: [{ email, name: c.nombre || undefined }], asunto, html, texto, etiquetas: ['codigo'] });
    apuntar(email, ip, ahora);
    return responder({ ok: true });
  } catch (e) {
    if (e instanceof FalloCorreo) {
      console.error('No se ha podido enviar el código', e.motivo, e.detalle);
      return responder({ ok: false, motivo: e.motivo, error: e.message }, 502);
    }
    console.error('Fallo al preparar el código', e);
    return responder({ ok: false, motivo: 'servidor', error: 'No se ha podido preparar el código.' }, 500);
  }
});
