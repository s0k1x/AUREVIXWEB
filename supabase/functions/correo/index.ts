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
//    supabase/migraciones/facturas-v61.sql). Al reenviar se usa la misma factura.
//  - Los datos fiscales (titular, NIF, domicilio) e IVA se leen de
//    Ajustes en la base de datos, no del navegador.
//  El envío lo hace el módulo común _shared/correo.ts (API de Brevo, con
//  reintentos y el motivo exacto si Brevo lo rechaza).
//  Secretos: BREVO_API_KEY y BREVO_REMITENTE (correo
//  verificado en Brevo). Nunca van en la web.
// ==========================================================

import { enviarCorreo, FalloCorreo } from '../_shared/correo.ts';
import { correoPago, correoCobro, pdfFactura, ref, type Cobro, type DatosFactura, type Empresa } from '../_shared/plantillas.ts';

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


async function rpc(nombre: string, cuerpo: unknown) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${nombre}`, {
    method: 'POST', headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error(`RPC ${nombre} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

type Linea = { concepto: string; importe: number };

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

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/* Cobros sueltos: cuota de mantenimiento «cuota-AAAA-MM» o cambio extra «extra-<id>».
   Solo si consta pagado en el pedido (lo marca el propietario). Devuelve null si no procede. */
function cobroSuelto(p: Record<string, any>, fase: string): (Cobro & { metodoId: string }) | null {
  const negocio = p.respuestas?.negocio ? ` «${p.respuestas.negocio}»` : '';
  const cu = /^cuota-(\d{4})-(\d{2})$/.exec(fase);
  if (cu) {
    const c = (p.mantenimiento?.cuotas || []).find((x: any) => x.periodo === `${cu[1]}-${cu[2]}`);
    if (!c || !(Number(c.importe) > 0)) return null;
    const mes = `${MESES[Number(cu[2]) - 1]} de ${cu[1]}`;
    const conceptos = (p.extras || []).filter((x: any) => x.mensual).map((x: any) => x.nombre).join(', ') || 'Mantenimiento';
    return { titulo: 'Cuota mensual pagada', concepto: `la cuota de ${mes}`, metodo: c.metodo === 'bizum' ? 'Bizum' : 'transferencia bancaria', metodoId: c.metodo,
      lineas: [{ concepto: `${conceptos} de${negocio || ' tu web'} · ${mes}`, importe: Math.round(Number(c.importe) * 100) / 100 }],
      pasos: p.mantenimiento?.proximo ? [`Tu próxima cuota será el ${new Date(p.mantenimiento.proximo).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })}.`] : [] };
  }
  const ex = /^extra-([a-z0-9]{4,24})$/.exec(fase);
  if (ex) {
    const x = (p.cambiosExtra || []).find((y: any) => y.id === ex[1]);
    if (!x || x.estado !== 'pagado' || !(Number(x.importe) > 0)) return null;
    return { titulo: 'Cambio extra pagado', concepto: `«${x.concepto}»`, metodo: p.pagoMetodo === 'bizum' ? 'Bizum' : 'transferencia bancaria', metodoId: p.pagoMetodo,
      lineas: [{ concepto: `${x.concepto} (cambio extra${negocio ? ` de${negocio}` : ''}, aceptado el ${x.acuerdo?.t ? new Date(x.acuerdo.t).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }) : 'online'})`, importe: Math.round(Number(x.importe) * 100) / 100 }],
      pasos: ['Empezamos con el cambio y te avisamos en tu proyecto cuando esté listo.'] };
  }
  return null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    if (!(await esEquipo(req))) return json({ error: 'Solo para el equipo' }, 403);
    const { pedidoId, fase, empresa, reenviar } = await req.json() as { pedidoId: string; fase: string; empresa?: Empresa; reenviar?: boolean };
    const suelto = /^(cuota-\d{4}-\d{2}|extra-[a-z0-9]{4,24})$/.test(String(fase));
    if (!/^[0-9a-f-]{36}$/i.test(String(pedidoId)) || !(['senal', 'resto', 'total'].includes(fase) || suelto)) return json({ error: 'Petición incompleta' }, 400);
    const [fila] = await leer(`pedidos?id=eq.${pedidoId}&select=id,uid,datos`);
    if (!fila) return json({ error: 'No existe ese pedido' }, 404);
    const p = fila.datos || {};
    // Solo se envía si el pago de esa fase está confirmado de verdad
    const cobro = suelto ? cobroSuelto(p, fase) : null;
    const confirmado = suelto ? !!cobro : fase === 'senal' ? ['senal', 'pagado'].includes(p.pagoEstado) : p.pagoEstado === 'pagado';
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
    const lineas = cobro ? cobro.lineas : lineasFactura(p, fase, e.senal!);
    const totalF = Math.round(lineas.reduce((s2, l) => s2 + l.importe, 0) * 100) / 100;
    const ivaF = e.iva || 0, baseF = ivaF ? Math.round(totalF / (1 + ivaF / 100) * 100) / 100 : totalF;
    const datosF: DatosFactura = {
      fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' }),
      emisor: { titular: legal.titular || e.marca!, nif: legal.nif || '', domicilio: legal.domicilio || '', email: legal.email || e.email || '' },
      cliente: { nombre: fact.razon || p.clienteNombre || p.respuestas?.contactoNombre || '', nif: fact.nif || '', direccion: fact.direccion || '', cp: fact.cp || '', ciudad: fact.ciudad || '', email: para },
      lineas, total: totalF, base: baseF, cuota: Math.round((totalF - baseF) * 100) / 100, iva: ivaF, pedido: ref(fila.id),
      metodo: (cobro ? cobro.metodoId : p.pagoMetodo) === 'bizum' ? 'Bizum' : 'transferencia bancaria'
    };
    const fac = await rpc('crear_factura', { p_pedido: fila.id, p_uid: fila.uid, p_fase: fase, p_datos: datosF });
    const numero = String(fac.numero);
    const logo = await fetch(`${WEB}/icons/logo-a.png`).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && new Uint8Array(b)).catch(() => null);
    const pdf = await pdfFactura(numero, { ...datosF, ...(fac.datos || {}) } as DatosFactura, logo || undefined);
    const { html, texto, asunto } = cobro ? correoCobro(p, fila.id, cobro, e, fact, numero) : correoPago(p, fila.id, fase, e, fact, numero);
    await enviarCorreo({
      para: [{ email: para, name: String(fact.razon || p.clienteNombre || '').slice(0, 80) || undefined }],
      cc,
      responderA: e.email ? { email: e.email, name: e.marca } : undefined,
      asunto, html, texto, etiquetas: ['pago', suelto ? fase.split('-')[0] : fase],
      adjuntos: [{ name: `Factura-${numero}.pdf`, content: pdf }]
    });
    return json({ enviado: true, para, factura: numero });
  } catch (err) {
    if (err instanceof FalloCorreo) return json({ error: err.message, motivo: err.motivo }, err.motivo === 'sin-configurar' ? 503 : 502);
    console.error(err);
    return json({ error: 'No se ha podido enviar el correo' }, 500);
  }
});
