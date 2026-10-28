// ==========================================================
//  ASISTENTE CON IA (Gemini) · función de Supabase
//  - modo "chat":   atención al cliente en la web
//  - modo "elegir": recomienda tipo de web y diseño
//  La clave de Gemini se guarda como secreto en Supabase
//  (GEMINI_API_KEY). Nunca va dentro de la web.
// ==========================================================

const MODELO = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const CLAVE = Deno.env.get('GEMINI_API_KEY') || '';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Mensaje = { rol: 'user' | 'model'; texto: string };
type Catalogo = {
  marca: string; senal: number; urgente: number; email: string; contacto?: string; horario?: string; respuesta?: string; aceptaPedidos?: boolean; notas?: string[];
  planes: { id: string; nombre: string; precio: number; entrega: string; desc: string; incluye: string[]; plantillas: string[] }[];
  extras: { id: string; nombre: string; precio: number; mensual?: boolean; desc: string }[];
  plantillas: { id: string; nombre: string; sector: string; desc: string }[];
};

function contexto(c: Catalogo) {
  return [
    `Trabajas para ${c.marca}, un estudio que diseña páginas web para negocios y profesionales en España.`,
    'Tipos de web y precios de partida (precios finales, IVA incluido):',
    ...c.planes.map(p => `- ${p.nombre} (id ${p.id}): desde ${p.precio} €, entrega ${p.entrega}. ${p.desc} Incluye: ${p.incluye.join(', ')}. Diseños recomendados: ${p.plantillas.join(', ') || 'a medida'}.`),
    'Extras opcionales:',
    ...c.extras.map(x => `- ${x.nombre} (id ${x.id}): ${x.precio} €${x.mensual ? '/mes' : ''}. ${x.desc}`),
    'Diseños de partida disponibles:',
    ...c.plantillas.map(t => `- ${t.nombre} (id ${t.id}): ${t.sector}. ${t.desc}`),
    `Forma de pago: ${c.senal} % al empezar y el resto al aprobar la web, solo por transferencia bancaria (los datos aparecen al pagar). Los precios llevan el IVA incluido.`,
    `Entrega urgente: +${Math.round(c.urgente * 100)} % sobre el precio base.`,
    'Proceso: pedido y cuestionario → el cliente elige dominio y envía su contenido desde «Mis proyectos» → diseño → revisión con vista previa → pago final → publicación.',
    `Contacto humano: ${c.contacto || 'solo por correo o desde el formulario de contacto de la web'}. Email: ${c.email}. ${c.respuesta || ''}.`,
    'NO hay WhatsApp ni teléfono. Nunca los menciones como forma de contacto.',
    c.aceptaPedidos === false ? 'Ahora mismo NO se aceptan pedidos nuevos: solo lista de espera.' : '',
    'Derecho de desistimiento: 14 días naturales desde la compra; si el cliente pidió empezar antes, se descuenta la parte ya hecha. Se ejerce desde su proyecto.',
    'Los clientes siguen su pedido en «Mis proyectos» (etapas, mensajes, archivos, pagos y vista previa). Las webs se pueden enseñar en aurevixweb.es/<nombre> cuando el equipo las publica.',
    ...(c.notas || [])
  ].filter(Boolean).join('\n');
}

const REGLAS_CHAT = `Eres el asistente de atención al cliente de la web.
- Responde en el idioma del cliente: español de España por defecto, o inglés si te escribe en inglés o si los datos indican que ve la web en inglés. Tono profesional, cercano y directo. Frases cortas.
- Responde solo sobre los servicios, precios, plazos, pagos y proceso descritos. Usa exclusivamente esos datos; no inventes precios, plazos, descuentos ni promesas.
- Si no sabes algo o el cliente necesita un presupuesto especial, dile que pulse «Hablar con una persona del equipo» o que escriba por correo. NUNCA menciones WhatsApp ni teléfono.
- Si más abajo aparecen «Pedidos de este cliente», úsalos para responder sobre su pedido (etapa, qué le toca hacer, fecha de entrega, pagos). No inventes nada que no esté ahí. Si no aparecen y pregunta por su pedido, dile que inicie sesión.
- Sé útil y concreto: di siempre cuál es el siguiente paso que puede dar.
- Cuando encaje, recomienda un tipo de web concreto y explica por qué en una o dos frases.
- No uses emojis ni listas largas. Máximo 110 palabras por respuesta.
- No pidas datos personales sensibles. Si preguntan por temas ajenos a la web, redirige con educación.`;

const REGLAS_ELEGIR = `Recomienda el tipo de web y el diseño de partida que mejor encajan con el negocio que describe el cliente.
- "plan" debe ser uno de los ids de tipo de web. "plantilla" debe ser uno de los ids de diseño (o "" si es a medida).
- "motivo": dos frases (en español de España, o en inglés si los datos indican que el cliente ve la web en inglés), tono profesional, sin emojis, explicando por qué encaja.
- "extras": ids de extras que de verdad le harían falta (puede estar vacío).
- "urgente": true solo si el cliente dice que tiene prisa.`;

async function gemini(cuerpo: unknown) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CLAVE },
    body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!CLAVE) return json({ error: 'Falta GEMINI_API_KEY' }, 500);

  try {
    const { modo, mensajes, catalogo, cliente } = await req.json() as { modo: string; mensajes: Mensaje[]; catalogo: Catalogo; cliente?: string };
    const datosCliente = typeof cliente === 'string' && cliente.trim() ? `\n\nPedidos de este cliente (datos reales de su cuenta):\n${cliente.slice(0, 2500)}` : '';
    if (!catalogo?.planes?.length || !Array.isArray(mensajes) || !mensajes.length) return json({ error: 'Petición incompleta' }, 400);
    // Límites para evitar abusos
    const hilo = mensajes.slice(-16).map(m => ({
      role: m.rol === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.texto || '').slice(0, 1500) }]
    }));

    if (modo === 'elegir') {
      const texto = await gemini({
        systemInstruction: { parts: [{ text: `${REGLAS_ELEGIR}\n\n${contexto(catalogo)}` }] },
        contents: hilo,
        generationConfig: {
          temperature: 0.3, maxOutputTokens: 400, responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              plan: { type: 'STRING', enum: catalogo.planes.map(p => p.id) },
              plantilla: { type: 'STRING' },
              urgente: { type: 'BOOLEAN' },
              extras: { type: 'ARRAY', items: { type: 'STRING' } },
              motivo: { type: 'STRING' }
            },
            required: ['plan', 'motivo']
          }
        }
      });
      return json({ recomendacion: JSON.parse(texto) });
    }

    const texto = await gemini({
      systemInstruction: { parts: [{ text: `${REGLAS_CHAT}\n\n${contexto(catalogo)}${datosCliente}` }] },
      contents: hilo,
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
    });
    return json({ respuesta: texto || 'Ahora mismo no puedo responder. Pulsa «Hablar con una persona del equipo» y te atendemos.' });
  } catch (e) {
    console.error(e);
    return json({ error: 'No se ha podido responder' }, 500);
  }
});
