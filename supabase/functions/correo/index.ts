// ==========================================================
//  CORREOS AL CLIENTE (Brevo) · función de Supabase
//  Cuando el equipo confirma un pago en el panel («Señal
//  pagada» o «Pagado»), el panel llama aquí y el cliente
//  recibe un correo con el resumen del pedido y del pago.
//  - Solo puede llamarla alguien del equipo (se comprueba
//    con su sesión).
//  - Los importes y el destinatario se leen del pedido en la
//    base de datos, no de lo que mande el navegador.
//  Secretos: BREVO_API_KEY y BREVO_REMITENTE (correo
//  verificado en Brevo). Nunca van en la web.
// ==========================================================

const BREVO = Deno.env.get('BREVO_API_KEY') || '';
const REMITENTE = Deno.env.get('BREVO_REMITENTE') || '';
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEB = 'https://aurevixweb.es';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** ¿Quien llama es del equipo? (con su sesión, nunca con lo que diga el cuerpo) */
async function esEquipo(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || !SB_URL || !ANON) return false;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/es_equipo`, {
    method: 'POST', headers: { Authorization: auth, apikey: ANON, 'Content-Type': 'application/json' }, body: '{}'
  });
  return r.ok && (await r.json()) === true;
}
async function leer(ruta: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${ruta}`, { headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` } });
  if (!r.ok) throw new Error(`DB ${r.status}`);
  return r.json();
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const eur = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const fecha = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const ref = (id: string) => '#' + String(id).slice(-6).toUpperCase(); // igual que refPedido de la web

type Empresa = { marca?: string; email?: string; senal?: number; iva?: number; legal?: Record<string, string> };

function correoHTML(p: Record<string, any>, id: string, fase: string, e: Empresa, fact: Record<string, string>) {
  const total = p.total || 0;
  const pctSenal = Number(e.senal) || 50;
  const senal = Math.round(total * pctSenal) / 100;
  const importe = fase === 'senal' ? senal : fase === 'resto' ? total - senal : total;
  const pagado = fase === 'senal' ? senal : total;
  const pendiente = Math.max(0, total - pagado);
  const negocio = p.respuestas?.negocio || p.planNombre || 'tu web';
  const nombre = String(p.clienteNombre || p.respuestas?.contactoNombre || '').trim().split(/\s+/)[0];
  const extrasUnicos = (p.extras || []).filter((x: any) => !x.mensual);
  const filas: [string, number][] = [
    [p.planNombre, p.precioBase || 0],
    ...extrasUnicos.map((x: any) => [x.nombre, x.precio] as [string, number]),
    ...(p.urgente ? [['Entrega urgente', total - (p.precioBase || 0) - extrasUnicos.reduce((s: number, x: any) => s + x.precio, 0) + (p.descuento || 0)] as [string, number]] : []),
    ...(p.descuento ? [[`Descuento${p.cupon ? ` (${p.cupon})` : ''}`, -p.descuento] as [string, number]] : [])
  ];
  const mensuales = (p.extras || []).filter((x: any) => x.mensual);
  const iva = Number(p.iva ?? e.iva) || 0;
  const base = iva ? Math.round(total / (1 + iva / 100) * 100) / 100 : total;
  const L = e.legal || {};
  const marca = e.marca || 'AurevixWeb';
  const concepto = fase === 'senal' ? `la señal (${pctSenal} %)` : fase === 'resto' ? 'el pago final' : 'el pago completo';
  const siguiente = fase === 'senal'
    ? 'Ya nos ponemos con tu web. El siguiente paso es tuyo: elige el dominio y envíanos textos, fotos y logotipo desde «Mis proyectos».'
    : 'Tu proyecto está pagado del todo. Publicamos tu web y te avisamos en cuanto esté en internet.';
  const enlace = `${WEB}/#proyecto-${id}/pagos`;
  const fila = (c: string, v: string, fuerte = false) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eeede8;color:#3b3a36">${fuerte ? `<b>${c}</b>` : c}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #eeede8;white-space:nowrap;color:#16161b">${fuerte ? `<b>${v}</b>` : v}</td></tr>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pago confirmado</title></head>
<body style="margin:0;padding:0;background:#f3f2ee;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16161b">
<div style="display:none;max-height:0;overflow:hidden">Hemos confirmado ${concepto} de «${esc(negocio)}»: ${eur(importe)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#0c0c0e;padding:26px 32px">
    <img src="${WEB}/icons/logo-a.png" width="36" height="36" alt="" style="vertical-align:middle;border:0">
    <span style="vertical-align:middle;margin-left:10px;color:#f3f1ea;font-size:18px;font-weight:700;letter-spacing:-.01em">${esc(marca)}</span>
  </td></tr>
  <tr><td style="height:4px;background:#c8f560;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:32px 32px 8px">
    <p style="margin:0 0 6px;font-size:13px;color:#86837c">Pedido ${ref(id)} · ${fecha(Date.now())}</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;letter-spacing:-.02em">Pago confirmado</h1>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.55">Hola${nombre ? ` ${esc(nombre)}` : ''}, hemos recibido ${concepto} de tu proyecto <b>«${esc(negocio)}»</b>. Gracias por tu confianza.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;background:#f6f8ef;border-radius:12px"><tr>
      <td style="padding:16px 18px;font-size:14px;color:#3d6a0a">Importe recibido</td>
      <td align="right" style="padding:16px 18px;font-size:22px;font-weight:700;color:#16161b;white-space:nowrap">${eur(importe)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:12px 32px 4px">
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#86837c">Resumen del pedido</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">
      ${filas.map(([c, v]) => fila(esc(c), eur(v))).join('')}
      ${iva ? fila(`Base imponible`, eur(base)) + fila(`IVA (${iva} %)`, eur(total - base)) : ''}
      ${fila(`Total${iva ? ' (IVA incluido)' : ''}`, eur(total), true)}
      ${fila('Pagado hasta hoy', eur(pagado))}
      ${pendiente ? fila('Pendiente (al aprobar la web)', eur(pendiente)) : ''}
    </table>
    ${mensuales.length ? `<p style="margin:10px 0 0;font-size:13px;color:#86837c">Cuotas mensuales aparte: ${mensuales.map((x: any) => `${esc(x.nombre)} (${eur(x.precio)}/mes)`).join(', ')}.</p>` : ''}
  </td></tr>
  <tr><td style="padding:22px 32px 6px">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55">${siguiente}</p>
    <a href="${enlace}" style="display:inline-block;background:#c8f560;color:#0c0c0e;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px">Ver mi proyecto</a>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#86837c">En «Mis proyectos → Pagos» puedes descargar el recibo de cada pago.</p>
  </td></tr>
  <tr><td style="padding:26px 32px 30px">
    <p style="margin:0;padding-top:16px;border-top:1px solid #eeede8;font-size:12px;line-height:1.6;color:#86837c">
      ${esc(L.titular || marca)}${L.nif ? ` · NIF ${esc(L.nif)}` : ''}${L.domicilio ? ` · ${esc(L.domicilio)}` : ''}<br>
      Este correo es un justificante de pago y no sustituye a la factura. Datos de facturación: ${esc([fact.razon, fact.nif].filter(Boolean).join(' · ') || 'los de tu cuenta')}.<br>
      ¿Dudas? Responde a este correo o escríbenos a ${esc(L.email || e.email || '')}. Condiciones y privacidad: ${WEB}/terminos-y-privacidad
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;

  const texto = [
    `Pago confirmado · Pedido ${ref(id)}`, '',
    `Hola${nombre ? ` ${nombre}` : ''}, hemos recibido ${concepto} de tu proyecto «${negocio}»: ${eur(importe)}.`, '',
    ...filas.map(([c, v]) => `${c}: ${eur(v)}`),
    `Total${iva ? ' (IVA incluido)' : ''}: ${eur(total)}`, `Pagado hasta hoy: ${eur(pagado)}`, ...(pendiente ? [`Pendiente: ${eur(pendiente)}`] : []), '',
    siguiente, `Ver mi proyecto: ${enlace}`, '',
    'Este correo es un justificante de pago y no sustituye a la factura.'
  ].join('\n');
  const asunto = `${fase === 'senal' ? 'Señal recibida' : 'Pago completado'} · «${negocio}» (${ref(id)})`;
  return { html, texto, asunto };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!BREVO || !REMITENTE) return json({ error: 'Falta configurar Brevo (BREVO_API_KEY y BREVO_REMITENTE)' }, 503);
  try {
    if (!(await esEquipo(req))) return json({ error: 'Solo para el equipo' }, 403);
    const { pedidoId, fase, empresa, reenviar } = await req.json() as { pedidoId: string; fase: string; empresa?: Empresa; reenviar?: boolean };
    if (!/^[0-9a-f-]{36}$/i.test(String(pedidoId)) || !['senal', 'resto', 'total'].includes(fase)) return json({ error: 'Petición incompleta' }, 400);
    const [fila] = await leer(`pedidos?id=eq.${pedidoId}&select=id,uid,datos`);
    if (!fila) return json({ error: 'No existe ese pedido' }, 404);
    const p = fila.datos || {};
    // Solo se envía si el pago de esa fase está confirmado de verdad
    const confirmado = fase === 'senal' ? ['senal', 'pagado'].includes(p.pagoEstado) : p.pagoEstado === 'pagado';
    if (!confirmado) return json({ error: 'Ese pago aún no está confirmado' }, 409);
    if (p.correos?.[fase] && !reenviar) return json({ yaEnviado: true });
    const [priv] = await leer(`privado?id=eq.${fila.uid}&select=datos`).catch(() => []);
    const fact = (priv?.datos || {}) as Record<string, string>;
    const para = String(fact.emailFact || p.clienteEmail || p.respuestas?.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return json({ error: 'El cliente no tiene un correo válido' }, 422);
    const e: Empresa = { marca: String(empresa?.marca || 'AurevixWeb').slice(0, 60), email: String(empresa?.email || '').slice(0, 120), senal: Number(empresa?.senal) || 50, iva: Number(empresa?.iva) || 0, legal: empresa?.legal || {} };
    const { html, texto, asunto } = correoHTML(p, fila.id, fase, e, fact);
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: e.marca, email: REMITENTE },
        to: [{ email: para, name: String(fact.razon || p.clienteNombre || '').slice(0, 80) || undefined }],
        ...(e.email ? { replyTo: { email: e.email, name: e.marca } } : {}),
        subject: asunto, htmlContent: html, textContent: texto, tags: ['pago', fase]
      })
    });
    if (!r.ok) {
      console.error('Brevo', r.status, (await r.text()).slice(0, 300));
      return json({ error: r.status === 401 ? 'La clave de Brevo no es válida' : 'Brevo no ha podido enviar el correo' }, 502);
    }
    return json({ enviado: true, para });
  } catch (err) {
    console.error(err);
    return json({ error: 'No se ha podido enviar el correo' }, 500);
  }
});
