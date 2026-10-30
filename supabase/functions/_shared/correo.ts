// ==========================================================
//  ENVÍO DE CORREOS · módulo común de las funciones de Supabase
//  Todo correo de la web (códigos para entrar, facturas) sale por aquí,
//  por la API de Brevo (https://api.brevo.com/v3/smtp/email).
//  - Reintenta dos veces si Brevo falla un momento (red, 429, 5xx).
//  - Si Brevo dice que no, se sabe por qué: cada error se traduce a un
//    motivo («clave», «cuenta», «remitente», «creditos», «destinatario»…)
//    y el detalle completo queda en los registros de la función.
//  - estadoBrevo() dice si la cuenta puede enviar (sin mandar nada).
//  Secretos (Edge Functions → Secrets): BREVO_API_KEY y BREVO_REMITENTE
//  (un remitente verificado en Brevo → Senders). Nunca van en la web.
// ==========================================================

const API = 'https://api.brevo.com/v3';
const CLAVE = Deno.env.get('BREVO_API_KEY') || '';
const REMITENTE = Deno.env.get('BREVO_REMITENTE') || '';
export const WEB = 'https://aurevixweb.es';
export const MARCA = 'AurevixWeb';

export type Motivo = 'sin-configurar' | 'clave' | 'cuenta' | 'remitente' | 'creditos' | 'destinatario' | 'peticion' | 'brevo-caido';

export class FalloCorreo extends Error {
  constructor(public motivo: Motivo, mensaje: string, public detalle = '') { super(mensaje); }
}

const MENSAJES: Record<Motivo, string> = {
  'sin-configurar': 'Falta configurar Brevo (BREVO_API_KEY y BREVO_REMITENTE).',
  clave: 'La clave de la API de Brevo no es válida o está desactivada.',
  cuenta: 'La cuenta de Brevo no puede enviar correos ahora (sin activar, en revisión o bloqueada).',
  remitente: 'El remitente no está verificado en Brevo.',
  creditos: 'La cuenta de Brevo se ha quedado sin envíos.',
  destinatario: 'Ese correo no puede recibir mensajes (dirección no válida o bloqueada).',
  peticion: 'Brevo no ha aceptado el correo.',
  'brevo-caido': 'Brevo no responde ahora mismo.'
};

/** Traduce la respuesta de error de Brevo a un motivo */
function motivoDe(estado: number, cuerpo: string): Motivo {
  const t = cuerpo.toLowerCase();
  if (estado === 401 || t.includes('key not found') || t.includes('unauthorized')) return 'clave';
  if (t.includes('sender') || t.includes('remitente')) return 'remitente';
  if (estado === 402 || t.includes('credit') || t.includes('not enough')) return 'creditos';
  if (estado === 403 || t.includes('permission') || t.includes('not activated') || t.includes('suspended') || t.includes('blocked')) return 'cuenta';
  if (t.includes('email') && (t.includes('invalid') || t.includes('blacklist'))) return 'destinatario';
  if (estado === 429 || estado >= 500) return 'brevo-caido';
  return 'peticion';
}

export type Destinatario = { email: string; name?: string };
export type Correo = {
  para: Destinatario[];
  asunto: string;
  html: string;
  texto: string;
  cc?: Destinatario[];
  responderA?: Destinatario;
  adjuntos?: { name: string; content: string }[];
  etiquetas?: string[];
};

const espera = (ms: number) => new Promise(ok => setTimeout(ok, ms));

/** Envía un correo. Devuelve el identificador de Brevo o lanza FalloCorreo con el motivo. */
export async function enviarCorreo(c: Correo): Promise<string> {
  if (!CLAVE || !REMITENTE) throw new FalloCorreo('sin-configurar', MENSAJES['sin-configurar']);
  const cuerpo = JSON.stringify({
    sender: { name: MARCA, email: REMITENTE },
    to: c.para.map(d => ({ email: d.email, ...(d.name ? { name: d.name.slice(0, 80) } : {}) })),
    ...(c.cc?.length ? { cc: c.cc } : {}),
    ...(c.responderA ? { replyTo: c.responderA } : {}),
    subject: c.asunto,
    htmlContent: c.html,
    textContent: c.texto,
    ...(c.adjuntos?.length ? { attachment: c.adjuntos } : {}),
    ...(c.etiquetas?.length ? { tags: c.etiquetas } : {})
  });
  let ultimo = new FalloCorreo('brevo-caido', MENSAJES['brevo-caido']);
  for (const pausa of [0, 700, 1800]) {
    if (pausa) await espera(pausa);
    let r: Response;
    try {
      r = await fetch(`${API}/smtp/email`, {
        method: 'POST',
        headers: { 'api-key': CLAVE, 'Content-Type': 'application/json', accept: 'application/json' },
        body: cuerpo,
        signal: AbortSignal.timeout(15000)
      });
    } catch (e) {
      ultimo = new FalloCorreo('brevo-caido', MENSAJES['brevo-caido'], String(e));
      console.warn('Brevo sin respuesta, se reintenta', String(e));
      continue;
    }
    const texto = await r.text();
    if (r.ok) {
      let id = '';
      try { id = JSON.parse(texto).messageId || ''; } catch { /* sin id */ }
      console.log('Correo aceptado por Brevo', id, c.etiquetas?.join(',') || '');
      return id;
    }
    const motivo = motivoDe(r.status, texto);
    ultimo = new FalloCorreo(motivo, MENSAJES[motivo], `${r.status} ${texto.slice(0, 400)}`);
    console.error('Brevo rechaza el correo', motivo, r.status, texto.slice(0, 400));
    if (motivo !== 'brevo-caido') break; // un «no» claro no se arregla reintentando
  }
  throw ultimo;
}

/** Estado de la cuenta de Brevo, sin enviar nada (para los registros y para diagnosticar) */
export async function estadoBrevo() {
  if (!CLAVE || !REMITENTE) return { ok: false, motivo: 'sin-configurar' as Motivo };
  try {
    const r = await fetch(`${API}/account`, { headers: { 'api-key': CLAVE, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    const texto = await r.text();
    // Una clave limitada solo a envíos (lo recomendable) no puede leer la cuenta: no es un error
    if (r.status === 403 && texto.includes('not authorized for resource')) return { ok: true, nota: 'la clave solo puede enviar (no lee la cuenta)' };
    if (!r.ok) return { ok: false, motivo: motivoDe(r.status, texto), detalle: `${r.status} ${texto.slice(0, 200)}` };
    const j = JSON.parse(texto);
    const planes = (j.plan || []).map((p: { type?: string; credits?: number; creditsType?: string }) => `${p.type}:${p.credits ?? '?'} ${p.creditsType || ''}`.trim());
    let remitente = 'desconocido';
    try {
      const s = await fetch(`${API}/senders`, { headers: { 'api-key': CLAVE, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (s.ok) {
        const lista = (await s.json()).senders || [];
        const este = lista.find((x: { email?: string }) => String(x.email || '').toLowerCase() === REMITENTE.toLowerCase());
        remitente = este ? (este.active ? 'verificado' : 'sin verificar') : 'no está en Brevo';
      }
    } catch { /* sin datos del remitente */ }
    return { ok: true, planes, remitente, relay: j.relay?.enabled ?? null };
  } catch (e) {
    return { ok: false, motivo: 'brevo-caido' as Motivo, detalle: String(e) };
  }
}

export const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* ---------- Diseño común de los correos ----------
   Como los recibos de las mejores empresas de software: tarjeta blanca sobre fondo cálido, cabecera
   de marca discreta, lo importante grande, los detalles en tablas y un pie legal en gris.
   - Tablas y estilos en línea (Gmail, Outlook, Apple Mail…); ancho máximo 560 px.
   - Modo oscuro donde el programa lo permite (Apple Mail, iOS, Outlook.com): <style> con
     prefers-color-scheme. El nombre va como texto (no imagen) para que Gmail lo adapte solo.
   - Botón «a prueba de balas» (relleno en la celda, no en el enlace). */
export const C = { fondo: '#f4f3ef', tarjeta: '#ffffff', borde: '#e7e5df', tinta: '#16161b', texto: '#3d3c38', gris: '#7c7a73', suave: '#f7f9f0', lima: '#c8f560', verde: '#3d6a0a' };

export function boton(texto: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0"><tr><td class="btn" bgcolor="${C.lima}" style="border-radius:999px;background:${C.lima}">
    <a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;line-height:1;color:${C.tinta};text-decoration:none;border-radius:999px">${esc(texto)}&nbsp;&nbsp;→</a></td></tr></table>`;
}

export function plantilla({ titulo, previa, etiqueta = '', cuerpo, pie = '', motivo = '' }: { titulo: string; previa: string; etiqueta?: string; cuerpo: string; pie?: string; motivo?: string }) {
  const relleno = '&#847;&zwnj;&nbsp;'.repeat(60); // que el resumen del buzón no muestre el resto del correo
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(titulo)}</title>
<style>
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  a{color:${C.tinta}}
  @media (prefers-color-scheme: dark){
    .fondo{background:#0c0c0e!important}
    .tarjeta{background:#16161b!important;border-color:#2a2a31!important}
    .t{color:#f3f1ea!important} .x{color:#d6d4cc!important} .m{color:#a19f96!important}
    .caja{background:#1d1f17!important;border-color:#33402a!important}
    .linea{border-color:#2a2a31!important}
    .w{color:#c8f560!important} .dg{background:#26281d!important;border-color:#3a4329!important;color:#f3f1ea!important}
    a{color:#f3f1ea!important} .btn a{color:#0c0c0e!important}
  }
  @media (max-width:600px){ .pad{padding-left:24px!important;padding-right:24px!important} .h1{font-size:24px!important} .grande{font-size:34px!important} .dg{font-size:26px!important} }
  @media (max-width:360px){ .et{display:none!important} }
</style></head>
<body class="fondo" style="margin:0;padding:0;background:${C.fondo};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.tinta}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(previa)}${relleno}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fondo" style="background:${C.fondo}"><tr><td align="center" style="padding:32px 12px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td class="tarjeta" style="background:${C.tarjeta};border:1px solid ${C.borde};border-radius:20px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td class="pad" style="padding:26px 36px 22px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle"><a href="${WEB}" style="text-decoration:none">
              <img src="${WEB}/icons/logo-a.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;margin-right:10px">
              <span class="t" style="vertical-align:middle;font-size:17px;font-weight:800;letter-spacing:-.02em;color:${C.tinta}">Aurevix<span class="w" style="color:${C.verde}">Web</span></span>
            </a></td>
            ${etiqueta ? `<td align="right" class="m et" style="vertical-align:middle;font-size:12px;color:${C.gris};letter-spacing:.02em;white-space:nowrap">${etiqueta}</td>` : ''}
          </tr></table>
        </td></tr>
        <tr><td class="linea" style="border-top:1px solid ${C.borde};font-size:0;line-height:0">&nbsp;</td></tr>
        ${cuerpo}
      </table>
    </td></tr>
    <tr><td align="center" class="pad m" style="padding:26px 36px 0;font-size:12px;line-height:1.7;color:${C.gris}">
      ${pie ? `${pie}<br>` : ''}
      <a href="${WEB}" class="m" style="color:${C.gris};text-decoration:underline">${WEB.replace('https://', '')}</a> ·
      <a href="${WEB}/terminos-y-privacidad" class="m" style="color:${C.gris};text-decoration:underline">Privacidad</a>
      ${motivo ? `<br><span style="opacity:.85">${motivo}</span>` : ''}
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}
