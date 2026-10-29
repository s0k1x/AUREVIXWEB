// ==========================================================
//  WHATSAPP CON IA · función de Supabase
//  OpenWA (en el VPS, enlazado con el QR) avisa aquí de cada
//  mensaje. La IA contesta como el asistente de la web, con los
//  mismos precios, y la respuesta sale por OpenWA.
//  - Comprueba la firma de OpenWA (X-OpenWA-Signature).
//  - Solo chats individuales; nunca grupos ni estados.
//  - Solo contesta a quien escribe (no envía nada por su cuenta).
//  - «persona» → se aparta 24 h y avisa al equipo en el panel.
//  - Si el equipo contesta desde el móvil, se aparta 12 h.
//  Secretos: GEMINI_API_KEY, OPENWA_URL, OPENWA_CLAVE,
//  OPENWA_SESION, WHATSAPP_SECRETO. Nunca van en la web.
// ==========================================================

const MODELO = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const GEMINI = Deno.env.get('GEMINI_API_KEY') || '';
const OPENWA_URL = (Deno.env.get('OPENWA_URL') || '').replace(/\/+$/, '');
const OPENWA_CLAVE = Deno.env.get('OPENWA_CLAVE') || '';
const OPENWA_SESION = Deno.env.get('OPENWA_SESION') || '';
const SECRETO = Deno.env.get('WHATSAPP_SECRETO') || '';
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const MAX_DIA = 40;            // respuestas de la IA por chat y día
const ANTIGUO = 15 * 60e3;     // mensajes más viejos (reconexiones) no se contestan
const PAUSA_EQUIPO = 12 * 3600e3;
const PAUSA_PERSONA = 24 * 3600e3;

const ok = () => new Response('ok');

/* ---------- Base de datos (API REST con la clave de servicio) ---------- */
async function db(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: { apikey: SB_CLAVE, Authorization: `Bearer ${SB_CLAVE}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!r.ok && r.status !== 409) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}
const leer = async (ruta: string) => (await db(ruta)).json();
const q = encodeURIComponent;

/* ---------- Firma de OpenWA ---------- */
async function firmaValida(cuerpo: string, cabecera: string | null) {
  if (!SECRETO || !cabecera?.startsWith('sha256=')) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRETO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(cuerpo)));
  const esperado = 'sha256=' + [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (esperado.length !== cabecera.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ cabecera.charCodeAt(i);
  return dif === 0;
}

/* ---------- Catálogo (lo guarda el propietario desde el panel) ---------- */
type Catalogo = {
  marca: string; senal: number; urgente: number; email: string; horario?: string; respuesta?: string; aceptaPedidos?: boolean; notas?: string[];
  planes: { id: string; nombre: string; precio: number; entrega: string; desc: string; incluye: string[] }[];
  extras: { id: string; nombre: string; precio: number; mensual?: boolean; desc: string }[];
  plantillas: { id: string; nombre: string; sector: string; desc: string }[];
};
function contexto(c: Catalogo | null) {
  if (!c?.planes?.length) return 'Trabajas para AurevixWeb, un estudio que diseña páginas web para negocios en España. No tienes los precios a mano: invita al cliente a verlos en aurevixweb.es.';
  return [
    `Trabajas para ${c.marca}, un estudio que diseña páginas web para negocios y profesionales en España. Web: aurevixweb.es`,
    'Tipos de web y precios de partida (precios finales, IVA incluido):',
    ...c.planes.map(p => `- ${p.nombre}: desde ${p.precio} €, entrega ${p.entrega}. ${p.desc} Incluye: ${(p.incluye || []).join(', ')}.`),
    'Extras opcionales:',
    ...c.extras.map(x => `- ${x.nombre}: ${x.precio} €${x.mensual ? '/mes' : ''}. ${x.desc}`),
    'Diseños de partida:',
    ...c.plantillas.map(t => `- ${t.nombre}: ${t.sector}.`),
    `Forma de pago: ${c.senal} % al empezar y el resto al aprobar la web, solo por transferencia bancaria (los datos aparecen al pagar en la web). Precios con IVA incluido.`,
    `Entrega urgente: +${Math.round(c.urgente * 100)} % sobre el precio base.`,
    'Cómo se pide: en aurevixweb.es, botón «Empezar», se rellena un cuestionario corto y se sigue todo desde «Mis proyectos» (dominio, contenido, vista previa, pagos).',
    `Contacto: por este WhatsApp (contesta un asistente con IA; si el cliente escribe «persona», le atiende alguien del equipo) o por correo a ${c.email}. ${c.respuesta || ''}`,
    c.aceptaPedidos === false ? 'Ahora mismo NO se aceptan pedidos nuevos: solo lista de espera.' : '',
    'Derecho de desistimiento: 14 días naturales desde la compra; si el cliente pidió empezar antes, se descuenta la parte ya hecha.',
    ...(c.notas || [])
  ].filter(Boolean).join('\n');
}

const REGLAS = `Eres el asistente de WhatsApp del estudio. Atiendes a clientes y posibles clientes.
- Responde en el idioma del cliente (español de España por defecto). Tono cercano, profesional y directo. Frases cortas, como en un chat.
- Responde solo sobre los servicios, precios, plazos, pagos y proceso descritos. No inventes precios, plazos, descuentos ni promesas.
- Si más abajo aparece «Pedidos de este cliente», úsalo para contestar sobre su pedido. No inventes nada que no esté ahí. Si pregunta por un pedido y no aparece, dile que lo puede ver en «Mis proyectos» de la web o que escriba «persona».
- Si no sabes algo, necesita un presupuesto especial o está molesto, dile que escriba «persona» para hablar con alguien del equipo.
- Di siempre cuál es el siguiente paso (normalmente: pedir en aurevixweb.es).
- Formato de WhatsApp: texto plano, como mucho alguna *negrita*. Sin emojis, sin listas largas, sin enlaces en formato markdown. Máximo 90 palabras.
- Nunca pidas datos bancarios, contraseñas ni documentos. Si preguntan por temas ajenos, redirige con educación.`;

async function gemini(sistema: string, hilo: { role: string; parts: { text: string }[] }[]) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: hilo, generationConfig: { temperature: 0.4, maxOutputTokens: 350 } })
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
}

/* ---------- Pedidos del cliente (por su número) ---------- */
const ETAPAS: Record<string, string> = {
  recibido: 'Pedido recibido: el equipo lo revisa y le contacta para confirmar detalles',
  dominio: 'Dominio: le toca elegir la dirección de su web en «Mis proyectos»',
  contenido: 'Contenido: le toca enviar textos, fotos y logotipo desde «Mis proyectos»',
  diseno: 'Diseño: el equipo está diseñando la web; se le avisará cuando la vista previa esté lista',
  revision: 'Revisión: la vista previa está lista; le toca revisarla y aprobarla o pedir cambios en «Mis proyectos»',
  pago: 'Pago final: le toca abonar el importe pendiente para publicar la web',
  publicada: 'Publicada: su web ya está en internet'
};
const PAGO: Record<string, string> = { pendiente: 'sin pagar', verificando: 'pago enviado, el equipo lo está comprobando', senal: 'señal pagada', pagado: 'pagado del todo' };
function variantes(movil: string) {
  const n = movil.slice(-9);
  return [`+34 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`, n, `+34${n}`, `34${n}`, `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`, `+34 ${n}`];
}
async function pedidosDe(movil: string) {
  if (!/^34[6789]\d{8}$/.test(movil)) return '';
  const lista = variantes(movil).map(v => `"${v.replace(/"/g, '')}"`).join(',');
  const filas = await leer(`pedidos?select=datos,created_at&datos->respuestas->>telefono=in.(${q(lista)})&order=created_at.desc&limit=5`);
  return (filas as { datos: Record<string, any> }[]).map(({ datos: p }) => {
    const etapa = p.estado === 'cancelado' ? 'Cancelado' : ETAPAS[p.etapa] || (p.estado === 'entregado' ? ETAPAS.publicada : ETAPAS.recibido);
    const entrega = p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '';
    return `- «${p.respuestas?.negocio || p.planNombre}» (${p.planNombre}): ${etapa}. Pago: ${PAGO[p.pagoEstado || 'pendiente'] || 'sin pagar'}.${entrega ? ` Entrega prevista: ${entrega}.` : ''}`;
  }).join('\n');
}

/* ---------- Envío por OpenWA ---------- */
async function enviar(chatId: string, texto: string) {
  const r = await fetch(`${OPENWA_URL}/api/sessions/${q(OPENWA_SESION)}/messages/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENWA_CLAVE },
    body: JSON.stringify({ chatId, text: texto.slice(0, 4000), linkPreview: false })
  });
  if (!r.ok) throw new Error(`OpenWA ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Guarda la respuesta de la IA (antes de enviarla, para reconocerla cuando OpenWA avise de que ha salido) y la envía */
async function responder(chatId: string, texto: string) {
  texto = texto.trim().slice(0, 4000);
  await db('wa_mensajes', { method: 'POST', body: JSON.stringify({ chat_id: chatId, rol: 'ia', texto }) });
  await enviar(chatId, texto);
}

async function avisarEquipo(texto: string) {
  const duenos = await leer(`perfiles?select=id&role=eq.owner`) as { id: string }[];
  if (!duenos.length) return;
  await db('avisos', { method: 'POST', body: JSON.stringify(duenos.map(d => ({ uid: d.id, datos: { texto, pedido: '', tipo: 'cliente', t: Date.now() } }))) });
}

const PIDE_PERSONA = /\b(persona|humano|humana|agente|alguien del equipo|hablar con alguien|operador)\b/i;
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- Mensaje que entra ---------- */
async function entrante(d: Record<string, any>) {
  const chatId: string = d.chatId || d.from || '';
  if (d.fromMe || d.isGroup || (d.kind && d.kind !== 'individual') || !/@(c\.us|lid)$/.test(chatId)) return;
  const ahora = Date.now();
  const nombre = String(d.contact?.pushName || d.contact?.name || '').slice(0, 80);
  const esTexto = ['text', 'chat'].includes(d.type) && String(d.body || '').trim();
  const texto = esTexto ? String(d.body).slice(0, 2000) : `[${d.type || 'mensaje'}]`;

  // Chat (se crea la primera vez) y mensaje (el id de WhatsApp evita contestar dos veces)
  await db('wa_chats', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ chat_id: chatId, nombre: nombre || null }) });
  const [chat] = await leer(`wa_chats?chat_id=eq.${q(chatId)}&select=*`) as Record<string, any>[];
  const hoy = new Date().toISOString().slice(0, 10);
  const r = await db('wa_mensajes?on_conflict=wa_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ chat_id: chatId, wa_id: d.id, rol: 'cliente', texto })
  });
  const nuevo = await r.json();
  if (!Array.isArray(nuevo) || !nuevo.length) return; // repetido
  const cuenta = chat?.dia === hoy ? chat.respuestas_dia || 0 : 0;
  await db(`wa_chats?chat_id=eq.${q(chatId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ nombre: nombre || chat?.nombre || null, ultimo_cliente: new Date().toISOString(), sin_leer: (chat?.sin_leer || 0) + 1, dia: hoy, respuestas_dia: cuenta, actualizado: new Date().toISOString() })
  });

  // Cuándo no contesta la IA
  if ((d.timestamp || 0) * 1000 < ahora - ANTIGUO) return;
  if (chat?.pausado_hasta && Date.parse(chat.pausado_hasta) > ahora) return;
  if (cuenta >= MAX_DIA) return;
  await db(`wa_chats?chat_id=eq.${q(chatId)}`, { method: 'PATCH', body: JSON.stringify({ respuestas_dia: cuenta + 1 }) });

  const historial = (await leer(`wa_mensajes?chat_id=eq.${q(chatId)}&select=rol,texto&order=t.desc&limit=14`) as { rol: string; texto: string }[]).reverse();
  const primera = !historial.some(m => m.rol !== 'cliente');
  const intro = primera ? 'Hola, soy el asistente virtual (IA) de AurevixWeb. Si en algún momento prefieres hablar con una persona del equipo, escribe «persona».\n\n' : '';

  if (esTexto && PIDE_PERSONA.test(sinTildes(texto))) {
    await db(`wa_chats?chat_id=eq.${q(chatId)}`, { method: 'PATCH', body: JSON.stringify({ pausado_hasta: new Date(ahora + PAUSA_PERSONA).toISOString() }) });
    await responder(chatId, 'Perfecto, le paso tu mensaje al equipo y te contestará una persona por aquí lo antes posible. Si quieres, cuéntanos ya qué necesitas.');
    await avisarEquipo(`WhatsApp: ${nombre || chatId.split('@')[0]} quiere hablar con una persona`).catch(e => console.error(e));
    return;
  }
  if (!esTexto) {
    await responder(chatId, `${intro}Por ahora solo puedo leer mensajes de texto. Escríbeme tu pregunta y te ayudo, o escribe «persona» para hablar con el equipo.`);
    return;
  }

  const [aj] = await leer(`ajustes?clave=eq.ia&select=datos`) as { datos: Catalogo }[];
  const movil = String(d.senderPhone || (chatId.endsWith('@c.us') ? chatId.split('@')[0] : '')).replace(/\D/g, '');
  const pedidos = await pedidosDe(movil).catch(() => '');
  const sistema = `${REGLAS}\n\n${contexto(aj?.datos || null)}${nombre ? `\n\nEl cliente se llama ${nombre} en WhatsApp.` : ''}${pedidos ? `\n\nPedidos de este cliente (datos reales):\n${pedidos}` : ''}`;
  const hilo = historial.map(m => ({ role: m.rol === 'cliente' ? 'user' : 'model', parts: [{ text: m.texto.slice(0, 1500) }] }));
  let respuesta = '';
  try { respuesta = await gemini(sistema, hilo); } catch (e) { console.error(e); }
  await responder(chatId, intro + (respuesta || 'Ahora mismo no puedo responder. Escribe «persona» y te atiende alguien del equipo, o mira toda la información en aurevixweb.es.'));
}

/* ---------- Mensaje que sale (de la IA o del equipo desde el móvil) ---------- */
async function saliente(d: Record<string, any>) {
  const chatId: string = d.chatId || d.to || '';
  if (d.isGroup || (d.kind && d.kind !== 'individual') || !/@(c\.us|lid)$/.test(chatId)) return;
  const texto = String(d.body || '').trim();
  // ¿Es una respuesta de la IA? (se guardó justo antes de enviarla)
  const desde = new Date(Date.now() - 10 * 60e3).toISOString();
  const [mia] = await leer(`wa_mensajes?chat_id=eq.${q(chatId)}&rol=eq.ia&wa_id=is.null&t=gt.${q(desde)}&texto=eq.${q(texto)}&select=id&limit=1`) as { id: number }[];
  if (mia) { await db(`wa_mensajes?id=eq.${mia.id}`, { method: 'PATCH', body: JSON.stringify({ wa_id: d.id }) }); return; }
  // La ha escrito alguien del equipo desde el móvil: la IA se aparta de ese chat
  await db('wa_chats', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ chat_id: chatId }) });
  await db('wa_mensajes?on_conflict=wa_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ chat_id: chatId, wa_id: d.id, rol: 'equipo', texto: texto || `[${d.type || 'mensaje'}]` }) });
  await db(`wa_chats?chat_id=eq.${q(chatId)}`, { method: 'PATCH', body: JSON.stringify({ pausado_hasta: new Date(Date.now() + PAUSA_EQUIPO).toISOString(), sin_leer: 0, actualizado: new Date().toISOString() }) });
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  const cuerpo = await req.text();
  if (!(await firmaValida(cuerpo, req.headers.get('x-openwa-signature')))) return new Response('Firma no válida', { status: 401 });
  let ev: Record<string, any>;
  try { ev = JSON.parse(cuerpo); } catch { return new Response('JSON no válido', { status: 400 }); }
  if (OPENWA_SESION && ev.sessionId && ev.sessionId !== OPENWA_SESION) return ok();
  const tarea = (async () => {
    try {
      if (ev.event === 'message.received') await entrante(ev.data || {});
      else if (ev.event === 'message.sent' && ev.data?.fromMe) await saliente(ev.data || {});
    } catch (e) { console.error(e); }
  })();
  // Se contesta a OpenWA al momento; la IA trabaja en segundo plano
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(tarea); else await tarea;
  return ok();
});
