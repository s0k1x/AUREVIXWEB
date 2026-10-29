// ==========================================================
//  CORREOS AL CLIENTE (Brevo) · función de Supabase
//  Cuando el equipo confirma un pago en el panel («Señal
//  pagada» o «Pagado»), el panel llama aquí y el cliente
//  recibe un correo con el resumen del pedido y del pago.
//  - Solo puede llamarla alguien del equipo (se comprueba
//    con su sesión).
//  - Los importes y el destinatario se leen del pedido en la
//    base de datos, no de lo que mande el navegador.
//  - Va al correo verificado de la cuenta del cliente (y en copia
//    al de facturación si puso otro).
//  - Lleva la FACTURA en PDF: número correlativo por año (2026-0001…),
//    creado una sola vez por pago (tabla «facturas», ver
//    supabase/facturas-v61.sql). Al reenviar se usa la misma factura.
//  - Los datos fiscales (titular, NIF, domicilio) e IVA se leen de
//    Ajustes en la base de datos, no del navegador.
//  Secretos: BREVO_API_KEY y BREVO_REMITENTE (correo
//  verificado en Brevo). Nunca van en la web.
// ==========================================================

import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

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

/** Correo verificado de la cuenta (el de entrar con el código) */
async function correoCuenta(uid: string) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, { headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` } });
  if (!r.ok) return '';
  const u = await r.json();
  return u?.email && (u.email_confirmed_at || u.confirmed_at) ? String(u.email) : '';
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const eur = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const fecha = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const ref = (id: string) => '#' + String(id).slice(-6).toUpperCase(); // igual que refPedido de la web

async function rpc(nombre: string, cuerpo: unknown) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${nombre}`, {
    method: 'POST', headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error(`RPC ${nombre} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

type Linea = { concepto: string; importe: number };
type DatosFactura = {
  fecha: string; emisor: Record<string, string>; cliente: Record<string, string>;
  lineas: Linea[]; total: number; base: number; cuota: number; iva: number; pedido: string; metodo: string;
};

/* Lo que se factura en cada pago (IVA incluido en cada importe) */
function lineasFactura(p: Record<string, any>, fase: string, pctSenal: number): Linea[] {
  const total = p.total || 0, senal = Math.round(total * pctSenal) / 100;
  const negocio = p.respuestas?.negocio ? ` «${p.respuestas.negocio}»` : '';
  if (fase === 'senal') return [{ concepto: `Señal (${pctSenal} %) del diseño y publicación de ${p.planNombre || 'la web'}${negocio}`, importe: senal }];
  if (fase === 'resto') return [{ concepto: `Pago final (${100 - pctSenal} %) del diseño y publicación de ${p.planNombre || 'la web'}${negocio}`, importe: Math.round((total - senal) * 100) / 100 }];
  const unicos = (p.extras || []).filter((x: any) => !x.mensual);
  const urg = p.urgente ? total - (p.precioBase || 0) - unicos.reduce((s: number, x: any) => s + x.precio, 0) + (p.descuento || 0) : 0;
  return [
    { concepto: `Diseño y publicación de ${p.planNombre || 'la web'}${negocio}`, importe: p.precioBase || 0 },
    ...unicos.map((x: any) => ({ concepto: x.nombre, importe: x.precio })),
    ...(urg > 0.004 ? [{ concepto: 'Entrega urgente', importe: Math.round(urg * 100) / 100 }] : []),
    ...(p.descuento ? [{ concepto: `Descuento${p.cupon ? ` (${p.cupon})` : ''}`, importe: -p.descuento }] : [])
  ];
}

/* Helvetica de los PDF solo tiene el alfabeto latino: se quita lo demás (emojis, etc.) */
const latin = (t: unknown) => String(t ?? '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E\u00A1-\u00FF\u20AC\u2013\u2014\u2026\u2022]/g, '');
const eurPdf = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

async function pdfFactura(numero: string, d: DatosFactura) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Factura ${numero}`); doc.setAuthor(latin(d.emisor.titular)); doc.setCreator('AurevixWeb');
  const pg = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.086, 0.086, 0.106), gris = rgb(0.42, 0.41, 0.38), linea = rgb(0.87, 0.86, 0.83), lima = rgb(0.784, 0.961, 0.376);
  const M = 50, W = 595.28 - M * 2;
  const txt = (t: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: any; der?: boolean; centro?: boolean } = {}) => {
    const fuente = o.bold ? fb : f, size = o.size || 10, s = latin(t);
    const w = fuente.widthOfTextAtSize(s, size);
    pg.drawText(s, { x: o.der ? x - w : o.centro ? x - w / 2 : x, y, size, font: fuente, color: o.color || negro });
  };
  const partir = (t: string, ancho: number, size = 10, fuente = f) => {
    const out: string[] = []; let l = '';
    for (const w of latin(t).split(/\s+/)) { const c = l ? `${l} ${w}` : w; if (fuente.widthOfTextAtSize(c, size) > ancho && l) { out.push(l); l = w; } else l = c; }
    if (l) out.push(l); return out;
  };
  // Cabecera
  pg.drawRectangle({ x: 0, y: 841.89 - 6, width: 595.28, height: 6, color: lima });
  let conLogo = false;
  try {
    const png = await (await fetch(`${WEB}/icons/logo-a.png`)).arrayBuffer();
    const img = await doc.embedPng(png); pg.drawImage(img, { x: M, y: 770, width: 30, height: 30 }); conLogo = true;
  } catch { /* sin logo */ }
  txt('AurevixWeb', conLogo ? M + 40 : M, 780, { size: 16, bold: true });
  txt('FACTURA', 595.28 - M, 786, { size: 20, bold: true, der: true });
  txt(`Nº ${numero}`, 595.28 - M, 768, { size: 11, der: true });
  txt(`Fecha: ${d.fecha}`, 595.28 - M, 754, { size: 10, color: gris, der: true });
  // Emisor y cliente
  let y = 712;
  txt('EMISOR', M, y, { size: 8.5, bold: true, color: gris }); txt('CLIENTE', M + W / 2 + 10, y, { size: 8.5, bold: true, color: gris });
  const bloque = (lineas: string[], x: number) => { let yy = y - 16; for (const l of lineas.filter(Boolean)) for (const p of partir(l, W / 2 - 20)) { txt(p, x, yy); yy -= 14; } return yy; };
  const e = d.emisor, c = d.cliente;
  const y1 = bloque([e.titular, e.nif && `NIF: ${e.nif}`, e.domicilio, e.email], M);
  const y2 = bloque([c.nombre, c.nif && `NIF: ${c.nif}`, c.direccion, [c.cp, c.ciudad].filter(Boolean).join(' '), c.email], M + W / 2 + 10);
  y = Math.min(y1, y2) - 20;
  // Tabla
  pg.drawRectangle({ x: M, y: y - 6, width: W, height: 24, color: rgb(0.953, 0.949, 0.933) });
  txt('Concepto', M + 10, y + 2, { size: 9.5, bold: true }); txt('Importe (IVA incl.)', 595.28 - M - 10, y + 2, { size: 9.5, bold: true, der: true });
  y -= 28;
  for (const l of d.lineas) {
    const partes = partir(l.concepto, W - 150);
    partes.forEach((p, i) => txt(p, M + 10, y - i * 14));
    txt(eurPdf(l.importe), 595.28 - M - 10, y, { der: true });
    y -= partes.length * 14 + 8;
    pg.drawLine({ start: { x: M, y: y + 4 }, end: { x: M + W, y: y + 4 }, thickness: 0.6, color: linea });
    y -= 6;
  }
  // Totales
  y -= 8;
  const fila = (a: string, b: string, o: { bold?: boolean; size?: number } = {}) => { txt(a, 595.28 - M - 150, y, { ...o, der: false }); txt(b, 595.28 - M - 10, y, { ...o, der: true }); y -= (o.size || 10) + 8; };
  if (d.iva) { fila('Base imponible', eurPdf(d.base)); fila(`IVA (${d.iva} %)`, eurPdf(d.cuota)); }
  pg.drawLine({ start: { x: 595.28 - M - 160, y: y + 10 }, end: { x: 595.28 - M, y: y + 10 }, thickness: 0.8, color: negro });
  y -= 4;
  fila('TOTAL', eurPdf(d.total), { bold: true, size: 13 });
  // Pie
  y -= 20;
  for (const l of [
    `Pagado por ${d.metodo}. Referencia del pedido ${d.pedido}.`,
    d.iva ? '' : 'Operación sin IVA.',
    'Las cuotas mensuales (mantenimiento, correo) se facturan aparte cada mes.'
  ].filter(Boolean)) for (const p of partir(l, W, 9)) { txt(p, M, y, { size: 9, color: gris }); y -= 13; }
  txt(`${latin(e.titular)}${e.nif ? ` · NIF ${e.nif}` : ''} · ${WEB.replace('https://', '')}`, 297.64, 40, { size: 8, color: gris, centro: true });
  const out = await doc.save();
  // base64 sin desbordar la pila
  let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

type Empresa = { marca?: string; email?: string; senal?: number; iva?: number; legal?: Record<string, string> };

function correoHTML(p: Record<string, any>, id: string, fase: string, e: Empresa, fact: Record<string, string>, numero = '') {
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
    <p style="margin:0 0 6px;font-size:13px;color:#86837c">Pedido ${ref(id)}${numero ? ` · Factura ${numero}` : ''} · ${fecha(Date.now())}</p>
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
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#86837c">${numero ? `La factura ${numero} va adjunta a este correo en PDF.` : 'En «Mis proyectos → Pagos» puedes descargar el recibo de cada pago.'}</p>
  </td></tr>
  <tr><td style="padding:26px 32px 30px">
    <p style="margin:0;padding-top:16px;border-top:1px solid #eeede8;font-size:12px;line-height:1.6;color:#86837c">
      ${esc(L.titular || marca)}${L.nif ? ` · NIF ${esc(L.nif)}` : ''}${L.domicilio ? ` · ${esc(L.domicilio)}` : ''}<br>
      ${numero ? `Te adjuntamos la factura nº ${numero} en PDF.` : 'Este correo es un justificante de pago.'} Datos de facturación: ${esc([fact.razon, fact.nif].filter(Boolean).join(' · ') || 'los de tu cuenta')}.<br>
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
    numero ? `Te adjuntamos la factura nº ${numero} en PDF.` : 'Este correo es un justificante de pago.'
  ].join('\n');
  const asunto = `${numero ? `Factura ${numero} · ` : ''}${fase === 'senal' ? 'Señal recibida' : 'Pago completado'} · «${negocio}» (${ref(id)})`;
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
    const valido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
    const para = await correoCuenta(fila.uid);
    if (!valido(para)) return json({ error: 'El cliente no tiene un correo verificado' }, 422);
    const copia = String(fact.emailFact || '').trim().toLowerCase();
    const cc = valido(copia) && copia !== para.toLowerCase() ? [{ email: copia }] : [];
    // Datos fiscales y porcentajes: de Ajustes (base de datos); lo del navegador solo como respaldo
    const [aj] = await leer('ajustes?clave=eq.web&select=datos').catch(() => []);
    const w = (aj?.datos || {}) as Record<string, any>;
    const legal = { ...(empresa?.legal || {}), ...(w.legal || {}) } as Record<string, string>;
    const e: Empresa = {
      marca: String(w.marca || empresa?.marca || 'AurevixWeb').slice(0, 60), email: String(w.email || empresa?.email || '').slice(0, 120),
      senal: Number(w.senal ?? empresa?.senal) || 50, iva: Number(p.iva ?? w.iva ?? empresa?.iva ?? 21) || 0, legal
    };
    // La factura: una por pago y con número correlativo (si ya existe, la misma)
    const lineas = lineasFactura(p, fase, e.senal!);
    const totalF = Math.round(lineas.reduce((s2, l) => s2 + l.importe, 0) * 100) / 100;
    const ivaF = e.iva || 0, baseF = ivaF ? Math.round(totalF / (1 + ivaF / 100) * 100) / 100 : totalF;
    const datosF: DatosFactura = {
      fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' }),
      emisor: { titular: legal.titular || e.marca!, nif: legal.nif || '', domicilio: legal.domicilio || '', email: legal.email || e.email || '' },
      cliente: { nombre: fact.razon || p.clienteNombre || p.respuestas?.contactoNombre || '', nif: fact.nif || '', direccion: fact.direccion || '', cp: fact.cp || '', ciudad: fact.ciudad || '', email: para },
      lineas, total: totalF, base: baseF, cuota: Math.round((totalF - baseF) * 100) / 100, iva: ivaF, pedido: ref(fila.id),
      metodo: p.pagoMetodo === 'bizum' ? 'Bizum' : 'transferencia bancaria'
    };
    const fac = await rpc('crear_factura', { p_pedido: fila.id, p_uid: fila.uid, p_fase: fase, p_datos: datosF });
    const numero = String(fac.numero);
    const pdf = await pdfFactura(numero, { ...datosF, ...(fac.datos || {}) } as DatosFactura);
    const { html, texto, asunto } = correoHTML(p, fila.id, fase, e, fact, numero);
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: e.marca, email: REMITENTE },
        to: [{ email: para, name: String(fact.razon || p.clienteNombre || '').slice(0, 80) || undefined }],
        ...(cc.length ? { cc } : {}),
        ...(e.email ? { replyTo: { email: e.email, name: e.marca } } : {}),
        subject: asunto, htmlContent: html, textContent: texto, tags: ['pago', fase],
        attachment: [{ name: `Factura-${numero}.pdf`, content: pdf }]
      })
    });
    if (!r.ok) {
      console.error('Brevo', r.status, (await r.text()).slice(0, 300));
      return json({ error: r.status === 401 ? 'La clave de Brevo no es válida' : 'Brevo no ha podido enviar el correo' }, 502);
    }
    return json({ enviado: true, para, factura: numero });
  } catch (err) {
    console.error(err);
    return json({ error: 'No se ha podido enviar el correo' }, 500);
  }
});
