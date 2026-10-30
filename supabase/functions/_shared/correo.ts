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

/** Diseño común de los correos: cabecera oscura con el logotipo, franja lima y pie */
export function plantilla({ titulo, previa, cuerpo, pie = '' }: { titulo: string; previa: string; cuerpo: string; pie?: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f3f2ee;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16161b">
<div style="display:none;max-height:0;overflow:hidden">${esc(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#0c0c0e;padding:22px 28px">
    <img src="${WEB}/icons/logo-a.png" width="32" height="32" alt="" style="vertical-align:middle;border:0">
    <span style="vertical-align:middle;margin-left:10px;color:#f3f1ea;font-size:17px;font-weight:700">${MARCA}</span>
  </td></tr>
  <tr><td style="height:4px;background:#c8f560;font-size:0;line-height:0">&nbsp;</td></tr>
  ${cuerpo}
  <tr><td style="padding:16px 28px 28px">
    <p style="margin:0;padding-top:14px;border-top:1px solid #eeede8;font-size:12px;line-height:1.6;color:#86837c">${pie || WEB.replace('https://', '')}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
