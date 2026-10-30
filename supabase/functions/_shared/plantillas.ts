// ==========================================================
//  PLANTILLAS DE CORREO Y FACTURA · funciones de Supabase
//  - correoCodigo: el código de 6 cifras para entrar o crear la cuenta.
//  - correoPago:   pago confirmado, con el resumen del pedido (lleva la factura).
//  - pdfFactura:   la factura en PDF (A4) que va adjunta.
//  Diseño común en _shared/correo.ts (plantilla, boton, colores C).
//  Vista previa sin enviar nada: deno run -A scripts/vista-correos.ts
// ==========================================================
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { plantilla, boton, esc, C, WEB, MARCA } from './correo.ts';

const fechaLarga = (t = Date.now()) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const hora = (t = Date.now()) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
export const eur = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
export const ref = (id: string) => '#' + String(id).slice(-6).toUpperCase(); // igual que refPedido de la web

/* ---------- 1. Código para entrar ---------- */
export function correoCodigo(codigo: string, nombre: string, nueva: boolean, cuando = Date.now()) {
  const n = String(nombre || '').trim().split(/\s+/)[0];
  const que = nueva ? 'crear tu cuenta' : 'entrar en tu cuenta';
  const cuerpo = `
  <tr><td class="pad" style="padding:36px 36px 8px">
    <h1 class="t h1" style="margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:${C.tinta}">Tu código para ${nueva ? 'crear tu cuenta' : 'entrar'}</h1>
    <p class="x" style="margin:0 0 26px;font-size:16px;line-height:1.6;color:${C.texto}">${n ? `Hola ${esc(n)}, escribe` : 'Escribe'} este código en ${MARCA} para ${que}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="caja" align="center" style="background:${C.suave};border:1px solid #e3ecc8;border-radius:16px;padding:22px 10px 18px">
        <!-- Una casilla por cifra: nunca se parte en dos líneas, ni en pantallas estrechas ni en Gmail -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="5" style="table-layout:fixed;max-width:400px;margin:0 auto"><tr>
          ${codigo.split('').map(d => `<td class="dg" align="center" style="background:#ffffff;border:1px solid #dfe6c8;border-radius:10px;height:58px;font-family:'SF Mono','SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:30px;line-height:58px;font-weight:700;color:${C.tinta}">${d}</td>`).join('')}
        </tr></table>
        <div class="m" style="margin-top:14px;font-size:13px;line-height:1.5;color:${C.gris}">Caduca en 10 minutos<br>Solo sirve una vez</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td class="pad" style="padding:22px 36px 34px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="linea" style="border-top:1px solid ${C.borde};padding-top:20px">
        <p class="t" style="margin:0 0 6px;font-size:14px;font-weight:600;color:${C.tinta}">¿No lo has pedido tú?</p>
        <p class="m" style="margin:0;font-size:14px;line-height:1.6;color:${C.gris}">Ignora este correo: sin el código nadie puede entrar. No se lo des a nadie; en ${MARCA} nunca te lo pediremos.</p>
        <p class="m" style="margin:12px 0 0;font-size:12px;color:${C.gris}">Pedido el ${fechaLarga(cuando)} a las ${hora(cuando)} (hora de Madrid).</p>
      </td>
    </tr></table>
  </td></tr>`;
  return {
    asunto: `${codigo} es tu código de ${MARCA}`,
    html: plantilla({ titulo: 'Tu código', previa: `Tu código es ${codigo}. Caduca en 10 minutos.`, etiqueta: 'Código de acceso', cuerpo, motivo: 'Recibes este correo porque alguien ha pedido entrar en AurevixWeb con esta dirección.' }),
    texto: `${n ? `Hola ${n},\n\n` : ''}Tu código para ${que} en ${MARCA}: ${codigo}\n\nCaduca en 10 minutos y solo sirve una vez.\nSi no lo has pedido tú, ignora este correo: sin el código nadie puede entrar.\n\n${WEB}`
  };
}

/* ---------- 2. Pago confirmado (con la factura) ---------- */
export type Empresa = { marca?: string; email?: string; senal?: number; iva?: number; legal?: Record<string, string> };

export function correoPago(p: Record<string, any>, id: string, fase: string, e: Empresa, fact: Record<string, string>, numero = '') {
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
  const marca = e.marca || MARCA;
  const concepto = fase === 'senal' ? `la señal (${pctSenal} %)` : fase === 'resto' ? 'el pago final' : 'el pago completo';
  const titulo = fase === 'senal' ? 'Señal recibida' : 'Pago completado';
  const metodo = p.pagoMetodo === 'bizum' ? 'Bizum' : 'Transferencia';
  const pasos = fase === 'senal'
    ? ['Ya nos ponemos con tu web.', 'Elige el dominio y envíanos textos, fotos y logotipo desde «Mis proyectos».', `Al aprobar la web pagas el resto (${eur(pendiente)}) y la publicamos.`]
    : ['Tu proyecto está pagado del todo.', 'Publicamos tu web y te avisamos en cuanto esté en internet.'];
  const enlace = `${WEB}/#proyecto-${id}/pagos`;
  const fila = (c: string, v: string, o: { fuerte?: boolean; gris?: boolean } = {}) => `<tr>
      <td class="${o.gris ? 'm' : 'x'} linea" style="padding:11px 0;border-bottom:1px solid ${C.borde};font-size:14px;color:${o.gris ? C.gris : C.texto}">${o.fuerte ? `<b class="t" style="color:${C.tinta}">${c}</b>` : c}</td>
      <td class="${o.gris ? 'm' : 't'} linea" align="right" style="padding:11px 0;border-bottom:1px solid ${C.borde};font-size:14px;white-space:nowrap;color:${o.gris ? C.gris : C.tinta};font-variant-numeric:tabular-nums">${o.fuerte ? `<b>${v}</b>` : v}</td></tr>`;
  const dato = (k: string, v: string) => `<td class="linea" style="padding:12px 14px;border-right:1px solid ${C.borde};vertical-align:top"><div class="m" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.gris}">${k}</div><div class="t" style="margin-top:4px;font-size:14px;font-weight:600;color:${C.tinta};white-space:nowrap">${v}</div></td>`;

  const cuerpo = `
  <tr><td class="pad" style="padding:34px 36px 6px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#e9f6cf;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;color:${C.verde}">✓&nbsp; ${fase === 'senal' ? 'Señal pagada' : 'Pagado'}</td></tr></table>
    <h1 class="t h1" style="margin:16px 0 8px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:${C.tinta}">${titulo}</h1>
    <p class="x" style="margin:0 0 22px;font-size:16px;line-height:1.6;color:${C.texto}">Hola${nombre ? ` ${esc(nombre)}` : ''}, hemos recibido ${concepto} de <b>«${esc(negocio)}»</b>. Gracias por tu confianza.</p>
    <div class="t grande" style="font-size:44px;line-height:1;font-weight:700;letter-spacing:-.03em;color:${C.tinta};font-variant-numeric:tabular-nums">${eur(importe)}</div>
    <div class="m" style="margin:8px 0 24px;font-size:13px;color:${C.gris}">Recibido el ${fechaLarga()}${iva ? ' · IVA incluido' : ''}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="linea" style="border:1px solid ${C.borde};border-radius:12px;border-collapse:separate"><tr>
      ${dato('Pedido', ref(id))}${numero ? dato('Factura', esc(numero)) : ''}${dato('Método', metodo)}
      <td style="padding:12px 14px;vertical-align:top"><div class="m" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.gris}">Pendiente</div><div class="t" style="margin-top:4px;font-size:14px;font-weight:600;color:${C.tinta};white-space:nowrap">${pendiente ? eur(pendiente) : '0 €'}</div></td>
    </tr></table>
  </td></tr>
  <tr><td class="pad" style="padding:26px 36px 4px">
    <p class="m" style="margin:0 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.gris}">Resumen del pedido</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filas.map(([c, v]) => fila(esc(c), eur(v))).join('')}
      ${iva ? fila('Base imponible', eur(base), { gris: true }) + fila(`IVA (${iva} %)`, eur(total - base), { gris: true }) : ''}
      ${fila(`Total${iva ? ' (IVA incluido)' : ''}`, eur(total), { fuerte: true })}
      ${fila('Pagado hasta hoy', eur(pagado))}
    </table>
    ${mensuales.length ? `<p class="m" style="margin:10px 0 0;font-size:13px;color:${C.gris}">Cuotas mensuales aparte: ${mensuales.map((x: any) => `${esc(x.nombre)} (${eur(x.precio)}/mes)`).join(', ')}.</p>` : ''}
  </td></tr>
  <tr><td class="pad" style="padding:26px 36px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="caja" style="background:${C.suave};border:1px solid #e3ecc8;border-radius:14px;padding:18px 20px">
      <p class="t" style="margin:0 0 10px;font-size:14px;font-weight:700;color:${C.tinta}">Lo siguiente</p>
      ${pasos.map((t, i) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr>
        <td style="vertical-align:top;padding-right:10px"><div style="width:20px;height:20px;border-radius:50%;background:${C.tinta};color:${C.lima};font-size:11px;font-weight:700;line-height:20px;text-align:center">${i + 1}</div></td>
        <td class="x" style="font-size:14px;line-height:1.5;color:${C.texto}">${esc(t)}</td></tr></table>`).join('')}
    </td></tr></table>
  </td></tr>
  <tr><td class="pad" style="padding:20px 36px 34px">
    ${boton('Ver mi proyecto', enlace)}
    ${numero ? `<p class="m" style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${C.gris}">📎 La factura <b>${esc(numero)}</b> va adjunta en PDF. También la tienes en «Mis proyectos → Pagos».</p>` : ''}
  </td></tr>`;

  const pie = [
    `${esc(L.titular || marca)}${L.nif ? ` · NIF ${esc(L.nif)}` : ''}${L.domicilio ? ` · ${esc(L.domicilio)}` : ''}`,
    `Datos de facturación: ${esc([fact.razon, fact.nif].filter(Boolean).join(' · ') || 'los de tu cuenta')}`,
    `¿Dudas? Responde a este correo${L.email || e.email ? ` o escríbenos a ${esc(L.email || e.email || '')}` : ''}.`
  ].join('<br>');
  const html = plantilla({ titulo, previa: `Hemos recibido ${concepto} de «${negocio}»: ${eur(importe)}.`, etiqueta: numero ? `Factura ${esc(numero)}` : `Pedido ${ref(id)}`, cuerpo, pie, motivo: 'Recibes este correo porque tienes un proyecto con AurevixWeb.' });

  const texto = [
    `${titulo} · Pedido ${ref(id)}${numero ? ` · Factura ${numero}` : ''}`, '',
    `Hola${nombre ? ` ${nombre}` : ''}, hemos recibido ${concepto} de tu proyecto «${negocio}»: ${eur(importe)}.`, '',
    ...filas.map(([c, v]) => `${c}: ${eur(v)}`),
    `Total${iva ? ' (IVA incluido)' : ''}: ${eur(total)}`, `Pagado hasta hoy: ${eur(pagado)}`, ...(pendiente ? [`Pendiente: ${eur(pendiente)}`] : []), '',
    'Lo siguiente:', ...pasos.map((t, i) => `${i + 1}. ${t}`), '',
    `Ver mi proyecto: ${enlace}`, '',
    numero ? `La factura ${numero} va adjunta en PDF.` : 'Este correo es un justificante de pago.'
  ].join('\n');
  const asunto = `${numero ? `Factura ${numero} · ` : ''}${titulo} · «${negocio}» (${ref(id)})`;
  return { html, texto, asunto };
}

/* ---------- 3. Factura en PDF ---------- */
type Linea = { concepto: string; importe: number };
/** Correo de un cobro suelto: cuota de mantenimiento o cambio extra aceptado (lleva su factura) */
export type Cobro = { titulo: string; concepto: string; lineas: { concepto: string; importe: number }[]; pasos: string[]; metodo: string };
export function correoCobro(p: Record<string, any>, id: string, c: Cobro, e: Empresa, fact: Record<string, string>, numero = '') {
  const total = Math.round(c.lineas.reduce((s, l) => s + l.importe, 0) * 100) / 100;
  const negocio = p.respuestas?.negocio || p.planNombre || 'tu web';
  const nombre = String(p.clienteNombre || p.respuestas?.contactoNombre || '').trim().split(/\s+/)[0];
  const iva = Number(p.iva ?? e.iva) || 0;
  const base = iva ? Math.round(total / (1 + iva / 100) * 100) / 100 : total;
  const L = e.legal || {};
  const marca = e.marca || MARCA;
  const enlace = `${WEB}/#proyecto-${id}/pagos`;
  const fila = (k: string, v: string, o: { fuerte?: boolean; gris?: boolean } = {}) => `<tr>
      <td class="${o.gris ? 'm' : 'x'} linea" style="padding:11px 0;border-bottom:1px solid ${C.borde};font-size:14px;color:${o.gris ? C.gris : C.texto}">${o.fuerte ? `<b class="t" style="color:${C.tinta}">${k}</b>` : k}</td>
      <td class="${o.gris ? 'm' : 't'} linea" align="right" style="padding:11px 0;border-bottom:1px solid ${C.borde};font-size:14px;white-space:nowrap;color:${o.gris ? C.gris : C.tinta};font-variant-numeric:tabular-nums">${o.fuerte ? `<b>${v}</b>` : v}</td></tr>`;
  const cuerpo = `
  <tr><td class="pad" style="padding:34px 36px 6px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#e9f6cf;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;color:${C.verde}">✓&nbsp; Pagado</td></tr></table>
    <h1 class="t h1" style="margin:16px 0 8px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:${C.tinta}">${esc(c.titulo)}</h1>
    <p class="x" style="margin:0 0 22px;font-size:16px;line-height:1.6;color:${C.texto}">Hola${nombre ? ` ${esc(nombre)}` : ''}, hemos recibido el pago de ${esc(c.concepto)} de <b>«${esc(negocio)}»</b>. Gracias.</p>
    <div class="t grande" style="font-size:44px;line-height:1;font-weight:700;letter-spacing:-.03em;color:${C.tinta};font-variant-numeric:tabular-nums">${eur(total)}</div>
    <div class="m" style="margin:8px 0 6px;font-size:13px;color:${C.gris}">Recibido el ${fechaLarga()} por ${esc(c.metodo)}${iva ? ' · IVA incluido' : ''} · Pedido ${ref(id)}${numero ? ` · Factura ${esc(numero)}` : ''}</div>
  </td></tr>
  <tr><td class="pad" style="padding:20px 36px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${c.lineas.map(l => fila(esc(l.concepto), eur(l.importe))).join('')}
      ${iva ? fila('Base imponible', eur(base), { gris: true }) + fila(`IVA (${iva} %)`, eur(total - base), { gris: true }) : ''}
      ${fila(`Total${iva ? ' (IVA incluido)' : ''}`, eur(total), { fuerte: true })}
    </table>
  </td></tr>
  ${c.pasos.length ? `<tr><td class="pad" style="padding:22px 36px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="caja" style="background:${C.suave};border:1px solid #e3ecc8;border-radius:14px;padding:16px 20px">
      ${c.pasos.map(t => `<p class="x" style="margin:0 0 6px;font-size:14px;line-height:1.5;color:${C.texto}">${esc(t)}</p>`).join('')}
    </td></tr></table>
  </td></tr>` : ''}
  <tr><td class="pad" style="padding:20px 36px 34px">
    ${boton('Ver mi proyecto', enlace)}
    ${numero ? `<p class="m" style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${C.gris}">📎 La factura <b>${esc(numero)}</b> va adjunta en PDF.</p>` : ''}
  </td></tr>`;
  const pie = [
    `${esc(L.titular || marca)}${L.nif ? ` · NIF ${esc(L.nif)}` : ''}${L.domicilio ? ` · ${esc(L.domicilio)}` : ''}`,
    `Datos de facturación: ${esc([fact.razon, fact.nif].filter(Boolean).join(' · ') || 'los de tu cuenta')}`,
    `¿Dudas? Responde a este correo${L.email || e.email ? ` o escríbenos a ${esc(L.email || e.email || '')}` : ''}.`
  ].join('<br>');
  const html = plantilla({ titulo: c.titulo, previa: `Hemos recibido ${c.concepto}: ${eur(total)}.`, etiqueta: numero ? `Factura ${esc(numero)}` : `Pedido ${ref(id)}`, cuerpo, pie, motivo: 'Recibes este correo porque tienes un proyecto con AurevixWeb.' });
  const texto = [
    `${c.titulo} · Pedido ${ref(id)}${numero ? ` · Factura ${numero}` : ''}`, '',
    `Hola${nombre ? ` ${nombre}` : ''}, hemos recibido el pago de ${c.concepto} de «${negocio}»: ${eur(total)}.`, '',
    ...c.lineas.map(l => `${l.concepto}: ${eur(l.importe)}`), `Total${iva ? ' (IVA incluido)' : ''}: ${eur(total)}`, '',
    ...c.pasos, '', `Ver mi proyecto: ${enlace}`, '', numero ? `La factura ${numero} va adjunta en PDF.` : ''
  ].join('\n');
  return { html, texto, asunto: `${numero ? `Factura ${numero} · ` : ''}${c.titulo} · «${negocio}» (${ref(id)})` };
}

export type DatosFactura = {
  fecha: string; emisor: Record<string, string>; cliente: Record<string, string>;
  lineas: Linea[]; total: number; base: number; cuota: number; iva: number; pedido: string; metodo: string;
};

/* Helvetica de los PDF solo tiene el alfabeto latino: se quita lo demás (emojis, etc.) */
const latin = (t: unknown) => String(t ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E¡-ÿ€–—…•]/g, '');
const eurPdf = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function pdfFactura(numero: string, d: DatosFactura, logo?: Uint8Array) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Factura ${numero}`); doc.setAuthor(latin(d.emisor.titular)); doc.setCreator(MARCA); doc.setSubject(`Factura ${numero} · Pedido ${d.pedido}`);
  const A = 595.28, Al = 841.89, M = 56, W = A - M * 2;
  const pg = doc.addPage([A, Al]);
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const tinta = rgb(.086, .086, .106), texto = rgb(.24, .235, .22), gris = rgb(.486, .478, .45), borde = rgb(.906, .898, .875);
  const lima = rgb(.784, .961, .376), suave = rgb(.969, .976, .941), verde = rgb(.24, .416, .04), papel = rgb(.957, .953, .937);
  const ancho = (s: string, size: number, bold = false) => (bold ? fb : f).widthOfTextAtSize(latin(s), size);
  const txt = (t: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: any; der?: boolean; centro?: boolean } = {}) => {
    const s = latin(t), size = o.size || 10, fuente = o.bold ? fb : f;
    const w = fuente.widthOfTextAtSize(s, size);
    pg.drawText(s, { x: o.der ? x - w : o.centro ? x - w / 2 : x, y, size, font: fuente, color: o.color || tinta });
  };
  const partir = (t: string, max: number, size = 10, bold = false) => {
    const out: string[] = []; let l = '';
    for (const w of latin(t).split(/\s+/)) { const c = l ? `${l} ${w}` : w; if (ancho(c, size, bold) > max && l) { out.push(l); l = w; } else l = c; }
    if (l) out.push(l); return out;
  };
  const etiqueta = (t: string, x: number, y: number, der = false) => txt(t.toUpperCase(), x, y, { size: 7.5, bold: true, color: gris, der });

  // Franja de marca arriba
  pg.drawRectangle({ x: 0, y: Al - 5, width: A, height: 5, color: lima });
  // Cabecera: logotipo y marca · FACTURA y número
  let y = Al - 70;
  let x0 = M;
  if (logo) { try { const img = await doc.embedPng(logo); pg.drawImage(img, { x: M, y: y - 8, width: 28, height: 28 }); x0 = M + 38; } catch { /* sin logo */ } }
  txt(MARCA, x0, y, { size: 16, bold: true });
  txt('Diseño y publicación de webs', x0, y - 14, { size: 8.5, color: gris });
  txt('Factura', A - M, y + 2, { size: 24, bold: true, der: true });
  txt(numero, A - M, y - 16, { size: 11, color: texto, der: true });
  // Sello «PAGADA»
  const sello = 'PAGADA', sw = ancho(sello, 8, true) + 22;
  pg.drawRectangle({ x: A - M - sw, y: y - 42, width: sw, height: 17, color: rgb(.914, .965, .812) });
  txt(sello, A - M - sw / 2, y - 36.5, { size: 8, bold: true, color: verde, centro: true });

  // Fechas y pedido en una fila
  y -= 82;
  pg.drawLine({ start: { x: M, y: y + 20 }, end: { x: A - M, y: y + 20 }, thickness: .7, color: borde });
  const datos: [string, string][] = [['Fecha', d.fecha], ['Pedido', d.pedido], ['Forma de pago', d.metodo.charAt(0).toUpperCase() + d.metodo.slice(1)]];
  datos.forEach(([k, v], i) => { const x = M + i * (W / 3); etiqueta(k, x, y); txt(v, x, y - 14, { size: 10.5, bold: true }); });
  y -= 44;
  pg.drawLine({ start: { x: M, y }, end: { x: A - M, y }, thickness: .7, color: borde });

  // Emisor y cliente
  y -= 26;
  const col2 = M + W / 2 + 10;
  etiqueta('Emisor', M, y); etiqueta('Facturado a', col2, y);
  const bloque = (lineas: string[], x: number) => {
    let yy = y - 16;
    lineas.filter(Boolean).forEach((l, i) => partir(l, W / 2 - 24, i ? 9.5 : 10.5, !i).forEach(p => { txt(p, x, yy, { size: i ? 9.5 : 10.5, bold: !i, color: i ? texto : tinta }); yy -= i ? 13 : 15; }));
    return yy;
  };
  const e = d.emisor, c = d.cliente;
  const y1 = bloque([e.titular, e.nif && `NIF ${e.nif}`, e.domicilio, e.email], M);
  const y2 = bloque([c.nombre, c.nif && `NIF ${c.nif}`, c.direccion, [c.cp, c.ciudad].filter(Boolean).join(' '), c.email], col2);
  y = Math.min(y1, y2) - 26;

  // Tabla de conceptos
  pg.drawRectangle({ x: M, y: y - 8, width: W, height: 26, color: papel });
  txt('CONCEPTO', M + 12, y + 1, { size: 7.5, bold: true, color: gris });
  txt('IMPORTE', A - M - 12, y + 1, { size: 7.5, bold: true, color: gris, der: true });
  y -= 30;
  for (const l of d.lineas) {
    const partes = partir(l.concepto, W - 150);
    partes.forEach((p, i) => txt(p, M + 12, y - i * 14, { size: 10, color: tinta }));
    txt(eurPdf(l.importe), A - M - 12, y, { size: 10, der: true });
    y -= partes.length * 14 + 10;
    pg.drawLine({ start: { x: M, y: y + 6 }, end: { x: A - M, y: y + 6 }, thickness: .6, color: borde });
    y -= 8;
  }

  // Totales (a la derecha)
  y -= 6;
  const xT = A - M - 220;
  const fila = (a: string, b: string, o: { bold?: boolean; size?: number; color?: any } = {}) => { txt(a, xT, y, { size: o.size || 10, bold: o.bold, color: o.color || texto }); txt(b, A - M - 12, y, { size: o.size || 10, bold: o.bold, der: true, color: o.color || tinta }); y -= (o.size || 10) + 9; };
  if (d.iva) { fila('Base imponible', eurPdf(d.base)); fila(`IVA (${d.iva} %)`, eurPdf(d.cuota)); }
  y -= 16; // aire entre el IVA y la caja del total
  pg.drawRectangle({ x: xT - 12, y: y - 12, width: A - M - xT + 12, height: 34, color: suave, borderColor: rgb(.89, .925, .784), borderWidth: .7 });
  pg.drawRectangle({ x: xT - 12, y: y - 12, width: 3, height: 34, color: lima });
  txt('Total', xT, y, { size: 12, bold: true }); txt(eurPdf(d.total), A - M - 12, y, { size: 14, bold: true, der: true });
  y -= 40;

  // Nota de pago
  for (const l of [`Pagado por ${d.metodo}. Gracias por tu confianza.`, d.iva ? '' : 'Operación sin IVA.', 'Las cuotas mensuales (mantenimiento, correo) se facturan aparte cada mes.'].filter(Boolean))
    for (const p of partir(l, W, 9)) { txt(p, M, y, { size: 9, color: gris }); y -= 13; }

  // Pie
  pg.drawLine({ start: { x: M, y: 64 }, end: { x: A - M, y: 64 }, thickness: .6, color: borde });
  txt(`${latin(e.titular)}${e.nif ? ` · NIF ${e.nif}` : ''}${e.domicilio ? ` · ${e.domicilio}` : ''}`, A / 2, 46, { size: 8, color: gris, centro: true });
  txt(`${WEB.replace('https://', '')}${e.email ? ` · ${e.email}` : ''}`, A / 2, 34, { size: 8, color: gris, centro: true });

  const out = await doc.save();
  let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}
