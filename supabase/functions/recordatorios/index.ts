// ==========================================================
//  RECORDATORIOS AUTOMÁTICOS E INFORME MENSUAL · función de Supabase
//  La llama cada día la tarea programada «aurevix-recordatorios»
//  (supabase/migraciones/v94-funciones.sql) con su firma secreta (cabecera x-cron,
//  guardada en Vault). Envía por correo (Brevo):
//  - Cuota de mantenimiento: aviso 3 días antes y, si vence, uno más.
//  - Contenido pendiente (etapa «Contenido») y web lista para revisar
//    (etapa «Revisión»): un recordatorio amable como mucho cada 7 días,
//    a partir de los 4 días en esa etapa.
//  - Día 1 de cada mes: informe en PDF a los clientes con mantenimiento
//    (visitas, contactos, dispositivos, de dónde vienen y cambios hechos).
//  Nunca repite lo mismo (tabla recordatorios_enviados) y respeta a quien
//  desactivó «Recordatorios» en Ajustes → Avisos.
// ==========================================================
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { enviarCorreo, plantilla, boton, esc, C, WEB, MARCA } from '../_shared/correo.ts';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const DIA = 864e5;
const eur = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const ref = (id: string) => '#' + String(id).slice(-6).toUpperCase(); // igual que refPedido de la web
const H = { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`, 'Content-Type': 'application/json' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });

const leer = async (ruta: string) => { const r = await fetch(`${SB_URL}/rest/v1/${ruta}`, { headers: H }); if (!r.ok) throw new Error(`DB ${r.status}`); return r.json(); };
const rpc = async (n: string, b: unknown = {}) => { const r = await fetch(`${SB_URL}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`RPC ${n} ${r.status}`); return r.json(); };
/** Apunta que algo se ha enviado; devuelve false si ya estaba (así nunca se repite) */
async function marcar(clave: string, pedido: string) {
  const r = await fetch(`${SB_URL}/rest/v1/recordatorios_enviados`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ clave, pedido }) });
  return r.ok; // 409 si ya existía
}
async function correoCuenta(uid: string) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, { headers: H });
  if (!r.ok) return '';
  const u = await r.json();
  return u?.email && (u.email_confirmed_at || u.confirmed_at) ? String(u.email) : '';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fecha = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
const periodo = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const TXT_ETAPA: Record<string, string> = { contenido: 'Contenido', revision: 'Revisión' };
/** Desde cuándo está el pedido en su etapa actual (último hito «Etapa: …» o la fecha del pedido) */
const desdeEtapa = (p: any) => Math.max(0, ...(p.historial || []).filter((h: any) => h.texto === `Etapa: ${TXT_ETAPA[p.etapa]}`).map((h: any) => h.t)) || p.createdAt || 0;

/** Correo sencillo con la plantilla común: título, párrafos, botón y pie */
function aviso({ titulo, previa, parrafos, boton: b, etiqueta }: { titulo: string; previa: string; parrafos: string[]; boton?: [string, string]; etiqueta: string }) {
  const cuerpo = `<tr><td class="pad" style="padding:34px 36px 30px">
    <h1 class="t h1" style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-.02em;color:${C.tinta}">${esc(titulo)}</h1>
    ${parrafos.map(p => `<p class="x" style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${C.texto}">${p}</p>`).join('')}
    ${b ? `<div style="margin-top:20px">${boton(b[0], b[1])}</div>` : ''}
  </td></tr>`;
  return plantilla({ titulo, previa, etiqueta, cuerpo, motivo: 'Recibes este recordatorio porque tienes un proyecto con AurevixWeb. Puedes desactivarlo en Ajustes → Avisos.' });
}

/* ---------- Informe mensual en PDF ---------- */
async function informePDF(p: any, mes: string, v: { visitas: number; contactos: number; disp: [string, number][]; origen: [string, number][]; porDia: number[] }, cambios: string[]) {
  const doc = await PDFDocument.create();
  const pg = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const tinta = rgb(.086, .086, .106), gris = rgb(.486, .478, .45), lima = rgb(.784, .961, .376), borde = rgb(.906, .898, .875), verde = rgb(.24, .416, .04);
  const latin = (t: unknown) => String(t ?? '').replace(/[^\x20-\x7E¡-ÿ€–—…•]/g, '');
  const txt = (t: string, x: number, y: number, s = 10, b = false, c = tinta) => pg.drawText(latin(t), { x, y, size: s, font: b ? fb : f, color: c });
  const M = 56, W = 595.28 - M * 2;
  pg.drawRectangle({ x: 0, y: 836.89, width: 595.28, height: 5, color: lima });
  txt(MARCA, M, 780, 16, true); txt('Informe mensual de tu web', M, 764, 9, false, gris);
  txt(latin(p.respuestas?.negocio || p.planNombre || 'Tu web'), M, 720, 22, true);
  txt(`${mes} · ${p.publica?.slug ? `aurevixweb.es/${p.publica.slug}` : p.urlWeb || ''}`, M, 702, 10, false, gris);
  // Tres cifras grandes
  const cifra = (n: string, t: string, x: number) => { txt(n, x, 640, 30, true); txt(t, x, 622, 9, false, gris); };
  cifra(String(v.visitas), 'visitas', M); cifra(String(v.contactos), 'contactos (llamar, WhatsApp, correo)', M + W / 3);
  cifra(v.visitas ? `${(Math.round(v.contactos / v.visitas * 1000) / 10).toString().replace('.', ',')} %` : '0 %', 'de las visitas contactan', M + 2 * W / 3);
  // Barras por día
  const max = Math.max(1, ...v.porDia), bw = W / Math.max(1, v.porDia.length);
  pg.drawLine({ start: { x: M, y: 520 }, end: { x: M + W, y: 520 }, thickness: .6, color: borde });
  v.porDia.forEach((n, i) => { const h = (n / max) * 70; if (h > 0) pg.drawRectangle({ x: M + i * bw + 1, y: 520, width: Math.max(1, bw - 2), height: h, color: verde }); });
  txt('Visitas por día', M, 504, 8.5, false, gris);
  // Listas
  let y = 470;
  const lista = (titulo: string, filas: [string, number][], x: number) => { let yy = y; txt(titulo, x, yy, 10, true); yy -= 18; filas.slice(0, 5).forEach(([k, n]) => { txt(k, x, yy, 10); txt(String(n), x + W / 2 - 40, yy, 10, true); yy -= 15; }); if (!filas.length) txt('Sin datos este mes', x, yy, 9.5, false, gris); };
  const NOM: Record<string, string> = { movil: 'Móvil', tablet: 'Tableta', ordenador: 'Ordenador' };
  lista('Dispositivo', v.disp.map(([k, n]) => [NOM[k] || k, n]), M);
  lista('De dónde vienen', v.origen.map(([k, n]) => [k || 'Directo / enlace', n]), M + W / 2);
  y = 340; txt('Cambios y trabajo de este mes', M, y, 10, true); y -= 18;
  (cambios.length ? cambios.slice(0, 12) : ['Sin cambios este mes: tu web sigue al día.']).forEach(c => { txt(`•  ${c.slice(0, 95)}`, M, y, 9.5, false, cambios.length ? tinta : gris); y -= 14; });
  pg.drawLine({ start: { x: M, y: 64 }, end: { x: M + W, y: 64 }, thickness: .6, color: borde });
  txt(`${WEB.replace('https://', '')} · Datos sin cookies: una visita por persona y sesión.`, M, 46, 8, false, gris);
  const out = await doc.save();
  let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    // Solo la tarea programada: su firma está en Vault y se compara con la de la petición
    const firma = req.headers.get('x-cron') || '';
    const esperada = await rpc('cron_secreto').catch(() => '');
    if (!firma || !esperada || firma !== esperada) return json({ error: 'No autorizado' }, 403);
    const ahora = Date.now(), hecho: string[] = [];
    const filas = await leer('pedidos?select=id,uid,datos');
    const perfiles = await leer('perfiles?select=id,datos');
    const quiere = (uid: string) => perfiles.find((x: any) => x.id === uid)?.datos?.notif?.recordatorios !== false;
    const enviar = async (fila: any, clave: string, asunto: string, html: string, texto: string, adjuntos?: { name: string; content: string }[]) => {
      if (!quiere(fila.uid)) return;
      const para = await correoCuenta(fila.uid);
      if (!para || !(await marcar(clave, fila.id))) return;
      await enviarCorreo({ para: [{ email: para }], asunto, html, texto, etiquetas: ['recordatorio', clave.split(':')[0]], adjuntos });
      hecho.push(clave);
    };
    for (const fila of filas) {
      const p = fila.datos || {}, negocio = p.respuestas?.negocio || p.planNombre || 'tu web', enlace = `${WEB}/#proyecto-${fila.id}`;
      if (p.estado === 'cancelado') continue;
      // 1) Cuota de mantenimiento
      const m = p.mantenimiento;
      if (m?.estado === 'activo' && m.proximo) {
        const per = periodo(m.proximo), cuota = eur((p.extras || []).filter((x: any) => x.mensual).reduce((s: number, x: any) => s + (+x.precio || 0), 0) || +p.mensual || 0);
        const concepto = `${ref(fila.id).slice(1)}-${per}`;
        if (m.proximo - ahora < 3 * DIA && m.proximo > ahora)
          await enviar(fila, `cuota-pronto:${fila.id}:${per}`, `Tu cuota de mantenimiento vence el ${fecha(m.proximo)}`,
            aviso({ titulo: 'Tu cuota de mantenimiento vence pronto', previa: `${cuota} el ${fecha(m.proximo)}`, etiqueta: `Pedido ${ref(fila.id)}`, parrafos: [`La cuota de «${esc(negocio)}» (<b>${cuota}</b>) vence el <b>${fecha(m.proximo)}</b>.`, `Puedes pagarla por Bizum o transferencia con el concepto <b>${concepto}</b>. Te enviamos la factura en cuanto la recibamos.`], boton: ['Ver cómo pagar', `${enlace}/pagos`] }),
            `Tu cuota de mantenimiento de «${negocio}» (${cuota}) vence el ${fecha(m.proximo)}. Concepto: ${concepto}. ${enlace}/pagos`);
        else if (ahora - m.proximo > 3 * DIA)
          await enviar(fila, `cuota-vencida:${fila.id}:${per}`, `Cuota de mantenimiento pendiente · «${negocio}»`,
            aviso({ titulo: 'Tienes una cuota pendiente', previa: `${cuota} desde el ${fecha(m.proximo)}`, etiqueta: `Pedido ${ref(fila.id)}`, parrafos: [`La cuota de mantenimiento de «${esc(negocio)}» (<b>${cuota}</b>) venció el ${fecha(m.proximo)}.`, `Si ya la has pagado, no hagas caso a este correo. Si no, puedes hacerlo por Bizum o transferencia con el concepto <b>${concepto}</b>.`], boton: ['Ver cómo pagar', `${enlace}/pagos`] }),
            `La cuota de mantenimiento de «${negocio}» (${cuota}) venció el ${fecha(m.proximo)}. Concepto: ${concepto}. ${enlace}/pagos`);
      }
      // 2) Contenido pendiente o web lista para revisar (a partir de 4 días, como mucho una vez por semana)
      if (TXT_ETAPA[p.etapa] && ahora - desdeEtapa(p) > 4 * DIA) {
        const semana = Math.floor((ahora - desdeEtapa(p)) / (7 * DIA));
        const cont = p.etapa === 'contenido';
        await enviar(fila, `${p.etapa}:${fila.id}:${desdeEtapa(p)}:${semana}`, cont ? `Nos falta tu contenido para seguir con «${negocio}»` : `Tu web «${negocio}» está lista para revisar`,
          aviso({ titulo: cont ? 'Nos falta tu contenido' : 'Tu web está lista para revisar', previa: cont ? 'Textos, fotos y logotipo' : 'Échale un vistazo y apruébala o pide cambios', etiqueta: `Pedido ${ref(fila.id)}`,
            parrafos: cont ? [`Para seguir con «${esc(negocio)}» necesitamos tus textos, fotos y logotipo.`, 'Puedes subirlos desde tu proyecto en un par de minutos. Si necesitas ayuda, contesta a este correo.']
              : [`La vista previa de «${esc(negocio)}» está esperando tu revisión.`, 'Puedes aprobarla o pedir los cambios que necesites desde tu proyecto.'],
            boton: [cont ? 'Subir mi contenido' : 'Revisar mi web', enlace] }),
          cont ? `Para seguir con «${negocio}» necesitamos tus textos, fotos y logotipo: ${enlace}` : `La vista previa de «${negocio}» está lista para revisar: ${enlace}`);
      }
      // 3) Día 1: informe del mes anterior a los clientes con mantenimiento y web publicada
      const hoy = new Date(ahora);
      if (hoy.getUTCDate() === 1 && m?.estado === 'activo' && p.publica?.slug) {
        const ini = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1)), fin = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
        const s = String(p.publica.slug).slice(0, 38), d0 = ini.toISOString().slice(0, 10), d1 = fin.toISOString().slice(0, 10);
        const vis = await leer(`visitas?select=dia,pagina,origen,dispositivo,visitas&pagina=in.(w-${s},c-${s})&dia=gte.${d0}&dia=lt.${d1}`).catch(() => []);
        const sum = (f: (x: any) => boolean) => vis.filter(f).reduce((a: number, x: any) => a + (x.visitas || 0), 0);
        const agrupar = (k: string) => Object.entries(vis.filter((x: any) => x.pagina.startsWith('w-')).reduce((a: any, x: any) => { a[x[k] || ''] = (a[x[k] || ''] || 0) + x.visitas; return a; }, {})).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
        const dias = Math.round((+fin - +ini) / DIA);
        const porDia = Array.from({ length: dias }, (_, i) => sum((x: any) => x.pagina.startsWith('w-') && x.dia === new Date(+ini + i * DIA).toISOString().slice(0, 10)));
        const v = { visitas: sum((x: any) => x.pagina.startsWith('w-')), contactos: sum((x: any) => x.pagina.startsWith('c-')), disp: agrupar('dispositivo'), origen: agrupar('origen'), porDia };
        const cambios = (p.historial || []).filter((h: any) => h.t >= +ini && h.t < +fin && !/^Pago|^Cuota/.test(h.texto)).map((h: any) => String(h.texto));
        const mes = `${MESES[ini.getUTCMonth()]} de ${ini.getUTCFullYear()}`;
        const pdf = await informePDF(p, mes, v, cambios);
        await enviar(fila, `informe:${fila.id}:${periodo(+ini)}`, `Informe de ${mes} · «${negocio}»`,
          aviso({ titulo: `Tu web en ${mes}`, previa: `${v.visitas} visitas y ${v.contactos} contactos`, etiqueta: 'Informe mensual',
            parrafos: [`En ${mes}, la web de «${esc(negocio)}» tuvo <b>${v.visitas} visitas</b> y <b>${v.contactos} contactos</b> (personas que tocaron llamar, WhatsApp o correo).`, cambios.length ? `Además hicimos ${cambios.length} cambio${cambios.length === 1 ? '' : 's'}. Tienes el detalle en el PDF adjunto.` : 'Tienes el detalle en el PDF adjunto.'],
            boton: ['Ver mi proyecto', enlace] }),
          `En ${mes}, tu web tuvo ${v.visitas} visitas y ${v.contactos} contactos. Informe adjunto en PDF. ${enlace}`,
          [{ name: `Informe-${periodo(+ini)}.pdf`, content: pdf }]);
      }
    }
    return json({ ok: true, enviados: hecho.length });
  } catch (err) {
    console.error(err);
    return json({ error: 'No se han podido enviar los recordatorios' }, 500);
  }
});
