/* ==========================================================
   ASISTENTE DE LA WEB
   - Chat de dudas (atención al cliente)
   - "Te ayudo a elegir": recomienda tipo de web y diseño
   Con Supabase conectado responde Gemini (función "asistente").
   En modo demo responde con reglas sencillas a partir de config.js.
   ========================================================== */
import { CONFIG, PLANES, EXTRAS } from '../config.js';
import { PLANTILLAS } from './plantillas.js';
import * as store from './store.js';
import { esc, icono, euros, mailLink } from './ui.js';
import { planesActivos, extrasActivos } from './sitio.js';
import { enIngles } from './idioma.js';
import { mascotaHTML, estadoMascota, volar, rebote, seguirPuntero, precargar } from './mascota.js';

const ajuste = CONFIG.asistente || { activo: true, nombre: 'Asistente', saludo: '' };

/** Datos que se envían a la IA para que responda con información real */
export const catalogo = () => ({
  marca: CONFIG.marca, formasPago: CONFIG.pagos?.bizum ? 'Bizum o transferencia bancaria' : 'transferencia bancaria', senal: CONFIG.senal, urgente: CONFIG.urgente, email: CONFIG.email, contacto: 'Solo por correo electrónico o desde el formulario de contacto de la web. No hay WhatsApp ni teléfono.', horario: CONFIG.horario, respuesta: CONFIG.respuesta, aceptaPedidos: CONFIG.aceptarPedidos,
  planes: planesActivos().map(({ id, nombre, precio, entrega, desc, incluye, plantillas }) => ({ id, nombre, precio, entrega, desc, incluye, plantillas })),
  extras: extrasActivos().map(({ id, nombre, precio, mensual, desc }) => ({ id, nombre, precio, mensual: !!mensual, desc })),
  plantillas: PLANTILLAS.map(({ id, nombre, sector, desc }) => ({ id, nombre, sector, desc })),
  notas: [
    ...(enIngles ? ['IMPORTANTE: el cliente está viendo la web en inglés. Responde en inglés (inglés británico, sencillo), con los nombres de los planes en inglés: Landing page, Portfolio, Business website, Booking website, Online store, Custom.'] : []),
    CONFIG.bienvenida?.activo ? `Descuento de bienvenida: ${CONFIG.bienvenida.pct} % en la primera web de cada cliente con el código ${CONFIG.bienvenida.codigo}; se aplica al revisar el pedido.` : 'Ahora mismo no hay descuento de bienvenida.',
    `Trabaja con nosotros: comerciales con un ${CONFIG.comision} % de comisión por web vendida, y creadores de vídeo con ${CONFIG.videos?.precio ?? 15} € por vídeo aprobado (+${CONFIG.videos?.bonus ?? 25} € si supera ${CONFIG.videos?.visitas ?? 10000} visualizaciones en 14 días, máximo ${CONFIG.videos?.maxMes ?? 12} vídeos pagados al mes).`
  ]
});

const sinTildes = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plan = id => PLANES.find(p => p.id === id);

/* ---------- Recomendación ---------- */
function recomendarLocal(texto) {
  const t = sinTildes(texto);
  const tiene = (...p) => p.some(x => t.includes(x));
  let id = 'negocio', plantilla = 'filo', motivo;
  if (tiene('tienda', 'vender', 'venta', 'productos', 'catalogo', 'ecommerce', 'envio')) {
    id = 'tienda'; plantilla = 'kiosko';
    motivo = 'Necesitas mostrar productos y cobrar online, y la tienda incluye catálogo, carrito y pago. El diseño Kiosko está pensado para eso.';
  } else if (tiene('cita', 'reserva', 'turno', 'estetica', 'clinica', 'fisio', 'dentista', 'manicura', 'masaje', 'consulta')) {
    id = 'reservas'; plantilla = tiene('barber', 'pelu') ? 'filo' : 'calma';
    motivo = 'Tus clientes podrán elegir día y hora y reservar sin llamar. Es la opción más práctica para un negocio que trabaja con cita.';
  } else if (tiene('fotograf', 'portfolio', 'portafolio', 'disenador', 'artista', 'ilustr', 'arquitect', 'trabajos')) {
    id = 'portfolio'; plantilla = 'lienzo';
    motivo = 'Lo importante es enseñar tus trabajos con buena presencia. El portfolio da protagonismo a las imágenes y facilita que te contacten.';
  } else if (tiene('app', 'plataforma', 'intranet', 'area de clientes', 'login', 'a medida', 'especial', 'marketplace')) {
    id = 'medida'; plantilla = '';
    motivo = 'Lo que describes necesita funciones específicas, así que lo más adecuado es un proyecto a medida con presupuesto según el alcance.';
  } else if (tiene('una pagina', 'sencilla', 'basica', 'presentar', 'landing', 'rapido y barato', 'poco presupuesto')) {
    id = 'landing'; plantilla = 'lienzo';
    motivo = 'Una página bien estructurada es suficiente para presentar tu servicio y recibir contactos, y es la opción más económica.';
  } else {
    if (tiene('restaurante', 'bar', 'cafeteria', 'comida', 'carta', 'menu')) plantilla = 'brasa';
    else if (tiene('gimnasio', 'gym', 'entrenador', 'deporte', 'crossfit', 'yoga')) plantilla = 'pulso';
    else if (tiene('barber', 'pelu')) plantilla = 'filo';
    else if (tiene('estetica', 'belleza', 'spa')) plantilla = 'calma';
    motivo = 'Para un negocio local lo más útil es una web completa con servicios, precios, galería, horario y ubicación.';
  }
  const extras = [];
  if (tiene('no tengo dominio', 'sin dominio', 'dominio')) extras.push('dominio');
  if (tiene('logo')) extras.push('logo');
  if (tiene('google', 'posicion', 'seo', 'que me encuentren')) extras.push('seo');
  if (tiene('ingles', 'idiomas')) extras.push('idioma');
  const urgente = tiene('urgente', 'cuanto antes', 'lo antes posible', 'prisa', 'esta semana');
  return { plan: id, plantilla, extras, urgente, motivo };
}

export async function recomendar(texto) {
  if (store.iaDisponible()) {
    try {
      const d = await store.preguntarIA({ modo: 'elegir', mensajes: [{ rol: 'user', texto }], catalogo: catalogo() });
      const r = d?.recomendacion;
      if (r && plan(r.plan)) {
        if (r.plantilla && !PLANTILLAS.some(p => p.id === r.plantilla)) r.plantilla = plan(r.plan).plantillas[0] || '';
        r.extras = (r.extras || []).filter(x => EXTRAS.some(e => e.id === x));
        return { ...r, ia: true };
      }
    } catch (e) { console.warn(e); }
  }
  return { ...recomendarLocal(texto), ia: false };
}

/* ---------- Respuestas del chat sin IA (modo demo o si la IA falla) ---------- */
function respuestaLocal(texto) {
  const t = sinTildes(texto);
  const tiene = (...p) => p.some(x => t.includes(x));
  const desde = PLANES.map(p => `${p.nombre}: desde ${euros(p.precio)}`).join('; ');
  if (tiene('whatsapp', 'telefono', 'llamar', 'contacto', 'contactar', 'correo', 'email', 'hablar con')) return `No tenemos WhatsApp ni teléfono: atendemos por correo en ${CONFIG.email} y desde el formulario de contacto de la web. Si ya eres cliente, escríbenos en la pestaña «Mensajes» de tu proyecto. ${CONFIG.respuesta}.`;
  if (tiene('archivo', 'foto', 'logo', 'subir', 'enviar contenido')) return 'Desde «Mis proyectos» puedes subir fotos, logotipos y documentos en la pestaña «Archivos» de tu proyecto.';
  if (tiene('factura', 'recibo', 'justificante')) return 'En «Mis proyectos», pestaña «Pagos», puedes descargar el recibo de cada pago. Si necesitas factura a nombre de tu empresa, añade tus datos fiscales en «Ajustes → Facturación».';
  if (tiene('video', 'tiktok', 'creador', 'contenido', 'influencer')) return `Pagamos ${CONFIG.videos?.precio ?? 15} € por cada vídeo aprobado sobre nuestras webs (+${CONFIG.videos?.bonus ?? 25} € si supera las ${(CONFIG.videos?.visitas ?? 10000).toLocaleString('es-ES')} visualizaciones), y además el ${CONFIG.comision} % si alguien compra desde tu enlace. Tienes las condiciones en «Trabaja con nosotros».`;
  if (tiene('descuento', 'cupon', 'oferta', 'primera')) return CONFIG.bienvenida?.activo ? `En tu primera web tienes un ${CONFIG.bienvenida.pct} % de descuento con el código ${CONFIG.bienvenida.codigo}. Lo aplicas al revisar el pedido, antes de confirmar.` : 'Si tienes un código de descuento, lo puedes aplicar al revisar tu pedido, antes de confirmar.';
  if (tiene('trabaj', 'comercial', 'empleo', 'vacante', 'comision')) return `Buscamos comerciales con un ${CONFIG.comision} % de comisión por cada web vendida, y creadores de vídeo con pago fijo por vídeo. Tienes las condiciones y el formulario en la página «Trabaja con nosotros».`;
  if (tiene('precio', 'cuesta', 'cuanto vale', 'tarifa', 'presupuesto', 'barato', 'caro')) return `Los precios de partida son: ${desde}. En el cuestionario puedes añadir extras y ves el total antes de confirmar.`;
  if (tiene('tarda', 'plazo', 'cuando', 'dias', 'entrega', 'rapido', 'urgente')) return `Los plazos van de ${PLANES[0].entrega} para una landing page a ${plan('tienda')?.entrega || '2 semanas'} para una tienda online. Si tienes prisa, la entrega urgente añade un ${Math.round(CONFIG.urgente * 100)} % al precio base.`;
  if (tiene('pago', 'pagar', 'bizum', 'transferencia', 'tarjeta', 'paypal', 'senal')) return `Se abona el ${CONFIG.senal} % al empezar y el resto cuando apruebas la web. Se paga ${CONFIG.pagos?.bizum ? 'por Bizum o por transferencia bancaria' : 'por transferencia bancaria'} (no aceptamos tarjeta); los datos aparecen al finalizar el pedido. Los precios llevan el IVA incluido.`;
  if (tiene('dominio', 'hosting', 'alojamiento', '.com', '.es')) return `Si no tienes dominio, añade el extra «Dominio + alojamiento» (${euros(EXTRAS.find(e => e.id === 'dominio')?.precio || 60)} el primer año) y lo registramos a tu nombre. Si ya tienes uno, lo indicas en «Mis proyectos» y lo conectamos.`;
  if (tiene('cambio', 'modific', 'mantenimiento', 'actualiz')) return `Antes de publicar se incluyen las revisiones necesarias. Después puedes contratar el mantenimiento mensual (${euros(EXTRAS.find(e => e.id === 'mantenimiento')?.precio || 15)}/mes) o pedir cambios puntuales.`;
  if (tiene('seo', 'google', 'posicion', 'encuentren')) return 'Todas las webs de negocio incluyen SEO básico. Si quieres trabajar el posicionamiento local y la ficha de Google, tienes el extra «SEO avanzado».';
  if (tiene('tienda', 'vender', 'productos')) return `Para vender online te conviene la Tienda online (desde ${euros(plan('tienda').precio)}): catálogo, carrito y pago sin comisiones de marketplaces.`;
  if (tiene('reserva', 'cita')) return `La Web con reservas (desde ${euros(plan('reservas').precio)}) permite que tus clientes elijan día y hora y reserven sin llamar.`;
  if (tiene('que web', 'cual', 'conviene', 'recomiend', 'necesito')) return 'Cuéntame a qué se dedica tu negocio y qué quieres conseguir con la web, y te digo qué opción encaja mejor. También puedes usar «Ayúdame a elegir» en la sección de precios.';
  if (tiene('hola', 'buenas', 'buenos dias', 'buenas tardes')) return 'Hola. ¿En qué puedo ayudarte? Puedo informarte de precios, plazos, formas de pago o qué tipo de web te conviene.';
  if (tiene('gracias')) return 'De nada. Si quieres empezar, elige el tipo de web en la sección de precios. Estoy aquí si te surge otra duda.';
  const r = recomendarLocal(texto);
  if (r.plan !== 'negocio' || r.plantilla !== 'filo') return `Por lo que cuentas, te encajaría ${plan(r.plan).nombre} (desde ${euros(plan(r.plan).precio)}). ${r.motivo}`;
  return 'Puedo ayudarte con precios, plazos, pagos y tipos de web. Para algo más concreto, escríbenos a ' + CONFIG.email + ' o desde el formulario de contacto y te atiende una persona del equipo.';
}

/* ==========================================================
   LO QUE EL ASISTENTE SABE DE TU CUENTA
   Si has iniciado sesión, responde con tus pedidos reales (etapa,
   lo siguiente que toca, entrega, pagos, vista previa) y te deja
   botones para hacerlo desde el propio chat.
   ========================================================== */
const DIA = 864e5;
const fechaTxt = t => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(t));
// «Esperando que el cliente pague la señal» → «pagar la señal»
const aInfinitivo = t => String(t || '').replace(/^Esperando que el cliente /, '').replace(/^revise y apruebe/, 'revisar y aprobar').replace(/^pague/, 'pagar').replace(/^elija/, 'elegir').replace(/^envíe/, 'enviar').replace(/^haga/, 'hacer').replace(/^confirme/, 'confirmar').replace(/^suba/, 'subir');
const nombreDe = p => p.respuestas?.negocio || p.planNombre || 'tu web';
let cachePedidos = null;
async function pedidosDelCliente() {
  const u = store.usuarioActual();
  if (!u) return null;
  if (cachePedidos && cachePedidos.uid === u.uid && Date.now() - cachePedidos.t < 60e3) return cachePedidos.lista;
  const lista = (await store.misPedidos()).filter(p => p.uid === u.uid || u.role === 'client');
  cachePedidos = { uid: u.uid, t: Date.now(), lista };
  return lista;
}
const activos = L => L.filter(p => p.estado !== 'cancelado');

/** Una ficha corta de cada pedido (también se manda a la IA para que conteste con datos reales) */
async function fichaPedido(p) {
  const { ETAPAS, etapaDe, siguientePaso, fechaEntrega, diasRestantes, webCliente } = await import('./proyecto.js');
  const { faseDePago, importeSenal, importeResto } = await import('./pago.js');
  const et = etapaDe(p), i = ETAPAS.findIndex(e => e.id === et), info = ETAPAS[i];
  const sig = siguientePaso(p), d = diasRestantes(p), fase = faseDePago(p);
  const pago = { pendiente: 'sin pagar', verificando: 'pago avisado, pendiente de comprobar en el banco', senal: 'señal pagada', pagado: 'pagado del todo' }[p.pagoEstado || 'pendiente'];
  const debe = fase === 'senal' ? importeSenal(p) : fase === 'resto' ? importeResto(p) : 0;
  return {
    p, et, info, n: i + 1, total: ETAPAS.length, sig, d, fase, debe, pago,
    entrega: et === 'publicada' || p.estado === 'entregado' ? '' : fechaTxt(fechaEntrega(p)),
    vista: webCliente(p), publica: p.publica?.slug || '', cancelado: p.estado === 'cancelado'
  };
}
function textoFicha(f) {
  const p = f.p;
  if (f.cancelado) return `«${nombreDe(p)}» (${p.planNombre}): pedido cancelado.`;
  const lineas = [`«${nombreDe(p)}» (${p.planNombre}): etapa ${f.n} de ${f.total}, ${f.info.txt}.`];
  if (f.sig?.quien === 'cliente') lineas.push(`Te toca a ti: ${aInfinitivo(f.sig.txt)}.`);
  else if (f.et !== 'publicada') lineas.push(f.info.cliente);
  if (f.entrega) lineas.push(f.d < 0 ? `La entrega estaba prevista para el ${f.entrega}; vamos con ${-f.d} día${f.d === -1 ? '' : 's'} de retraso.` : `Entrega prevista: ${f.entrega}${f.d === 0 ? ' (hoy)' : ` (faltan ${f.d} día${f.d === 1 ? '' : 's'})`}.`);
  lineas.push(`Pagos: ${f.pago}${f.debe ? `; ahora toca pagar ${euros(f.debe)} (${f.fase === 'senal' ? 'señal' : 'pago final'})` : ''}.`);
  if (f.vista && f.et === 'revision') lineas.push('La vista previa está lista para revisarla.');
  if (f.publica) lineas.push(`Se puede ver en aurevixweb.es/${f.publica}.`);
  if (p.dominio?.nombre) lineas.push(`Dominio: ${p.dominio.nombre}.`);
  return lineas.join(' ');
}
/** Datos para pintar la tarjeta de un pedido en el chat */
function tarjetaFicha(f) {
  const p = f.p;
  return {
    nombre: nombreDe(p), plan: p.planNombre || '', n: f.n, total: f.total, etapa: f.cancelado ? 'Cancelado' : f.info.txt,
    toca: f.cancelado ? '' : f.sig?.quien === 'cliente' ? aInfinitivo(f.sig.txt) : '',
    estado: f.cancelado || f.et === 'publicada' ? '' : f.info.cliente,
    entrega: f.entrega ? (f.d < 0 ? `Prevista el ${f.entrega} (${-f.d} día${f.d === -1 ? '' : 's'} de retraso)` : `${f.entrega}${f.d === 0 ? ' (hoy)' : ` · faltan ${f.d} día${f.d === 1 ? '' : 's'}`}`) : '',
    pago: f.debe ? `Toca pagar ${euros(f.debe)}` : f.pago.charAt(0).toUpperCase() + f.pago.slice(1)
  };
}
function accionesFicha(f) {
  const p = f.p, a = [];
  if (f.cancelado) return a;
  if (f.debe) a.push({ t: `Pagar ${euros(f.debe)}`, ic: 'euro', ir: { tipo: 'pagar', id: p.id } });
  if (f.vista) a.push({ t: f.et === 'revision' ? 'Revisar la vista previa' : 'Ver la vista previa', ic: 'eye', href: `vista-previa?p=${encodeURIComponent(p.id)}&v=${encodeURIComponent(f.vista.id)}` });
  if (f.publica) a.push({ t: `aurevixweb.es/${f.publica}`, ic: 'globe', href: `/${f.publica}`, nueva: true });
  if (f.sig?.quien === 'cliente' && ['dominio', 'contenido'].includes(f.et)) a.push({ t: f.et === 'dominio' ? 'Elegir el dominio' : 'Enviar el contenido', ic: f.info.icono, ir: { tipo: 'proyecto', id: p.id, pest: 'estado' } });
  a.push({ t: 'Abrir el proyecto', ic: 'folder', ir: { tipo: 'proyecto', id: p.id, pest: 'estado' } });
  return a;
}

/* ---------- Preguntas que se contestan al momento, sin IA ---------- */
const INTENCIONES = [
  ['vista', ['vista previa', 'ver mi web', 'ver la web', 'enlace de mi web', 'link de mi web', 'aprobar la web', 'aprobar mi web']],
  ['pedido', ['mi pedido', 'mi web', 'mi proyecto', 'como va', 'como lleva', 'estado', 'cuando esta', 'cuando estara', 'cuando me la', 'cuanto falta', 'en que punto', 'novedades', 'avance', 'progreso']],
  ['pagar', ['que tengo que pagar', 'que debo', 'cuanto debo', 'cuanto me queda', 'pagar ya', 'pagar la senal', 'pagar el resto', 'quiero pagar', 'datos de pago', 'iban', 'numero de cuenta']],
  ['persona', ['hablar con', 'una persona', 'humano', 'agente', 'alguien del equipo', 'reclamacion', 'queja', 'incidencia', 'problema con']],
  ['cancelar', ['cancelar', 'desistir', 'desistimiento', 'devolucion', 'reembolso', 'anular']],
  ['factura', ['factura', 'recibo', 'justificante']],
  ['presupuesto', ['presupuesto', 'calcula', 'cuanto me costaria', 'cuanto saldria', 'precio total']],
  ['empezar', ['quiero una web', 'quiero empezar', 'hacer un pedido', 'contratar', 'comprar una web', 'como pido']]
];
const intencion = texto => { const t = sinTildes(texto); return INTENCIONES.find(([, ps]) => ps.some(x => t.includes(x)))?.[0] || ''; };

async function respuestaCuenta(tipo) {
  const u = store.usuarioActual();
  if (!u) return { texto: 'Para ver cómo va tu pedido necesito que inicies sesión con la cuenta con la que lo hiciste. En cuanto entres, pregúntamelo de nuevo y te lo digo al momento.', acciones: [{ t: 'Iniciar sesión', ic: 'user', ir: { tipo: 'login' } }] };
  if (u.role !== 'client') return { texto: 'Estás con una cuenta del equipo. Los pedidos, entregas y pagos pendientes los tienes en el panel.', acciones: [{ t: 'Abrir el panel', ic: 'panel', href: 'panel' }] };
  let L;
  try { L = await pedidosDelCliente(); } catch { return { texto: 'No he podido cargar tus pedidos ahora mismo. Prueba en un momento o ábrelos desde «Mis proyectos».', acciones: [{ t: 'Mis proyectos', ic: 'folder', ir: { tipo: 'proyectos' } }] }; }
  const vivos = activos(L);
  if (!L.length) return { texto: 'Todavía no tienes ningún pedido con esta cuenta. Si quieres, te ayudo a calcular el precio o a elegir el tipo de web.', acciones: [{ t: 'Calcular presupuesto', ic: 'euro', href: '#calcula' }, { t: 'Ver webs y precios', ic: 'laptop', href: '#webs' }] };
  const fichas = await Promise.all((vivos.length ? vivos : L).slice(0, 3).map(fichaPedido));
  if (tipo === 'pagar') {
    const deben = fichas.filter(f => f.debe);
    if (!deben.length) return { texto: `Ahora mismo no tienes ningún pago pendiente. ${fichas.map(f => `«${nombreDe(f.p)}»: ${f.pago}.`).join(' ')}`, acciones: fichas.slice(0, 1).flatMap(f => [{ t: 'Abrir el proyecto', ic: 'folder', ir: { tipo: 'proyecto', id: f.p.id, pest: 'pagos' } }]) };
    return { texto: deben.map(f => `«${nombreDe(f.p)}»: toca pagar ${euros(f.debe)} (${f.fase === 'senal' ? `señal del ${CONFIG.senal} %` : 'pago final'}). Se paga solo por transferencia; al pulsar el botón te salen el IBAN, el importe y el concepto para copiarlos.`).join('\n\n'), acciones: deben.map(f => ({ t: `Pagar ${euros(f.debe)}${deben.length > 1 ? ` · ${nombreDe(f.p)}` : ''}`, ic: 'euro', ir: { tipo: 'pagar', id: f.p.id } })) };
  }
  if (tipo === 'vista') {
    const con = fichas.filter(f => f.vista || f.publica);
    if (!con.length) return { texto: `Aún no hay vista previa de tu web. ${fichas.map(textoFicha).join('\n\n')}\n\nTe avisaremos en la campana y por mensaje en cuanto esté lista.`, acciones: fichas.slice(0, 1).map(f => ({ t: 'Abrir el proyecto', ic: 'folder', ir: { tipo: 'proyecto', id: f.p.id, pest: 'estado' } })) };
    return { texto: con.map(f => `«${nombreDe(f.p)}»: ${f.vista ? `la versión ${f.vista.n} está lista para verla en el móvil, la tableta y el ordenador.${f.et === 'revision' ? ' Desde la misma vista previa puedes aprobarla o pedir cambios.' : ''}` : ''}${f.publica ? ` También se puede ver en aurevixweb.es/${f.publica}.` : ''}`).join('\n\n'), acciones: con.flatMap(accionesFicha).filter(a => a.ic === 'eye' || a.ic === 'globe') };
  }
  if (tipo === 'factura') return { texto: 'Los recibos de cada pago los descargas en «Mis proyectos», pestaña «Pagos». Si necesitas factura a nombre de una empresa, añade tus datos fiscales en Ajustes y pídenosla por mensaje.', acciones: [{ t: 'Ver mis pagos', ic: 'receipt', ir: { tipo: 'proyecto', id: fichas[0].p.id, pest: 'pagos' } }, { t: 'Datos de facturación', ic: 'gear', href: 'ajustes' }] };
  if (tipo === 'cancelar') return { texto: `Tienes 14 días naturales desde la compra para desistir sin dar explicaciones (si pediste empezar antes, se descuenta la parte ya hecha). Se hace desde tu proyecto, en «Estado», con el botón de desistimiento; la devolución es por transferencia en 14 días como máximo.`, acciones: [{ t: 'Abrir el proyecto', ic: 'folder', ir: { tipo: 'proyecto', id: fichas[0].p.id, pest: 'estado' } }, { t: 'Condiciones', ic: 'file', href: 'terminos-y-privacidad#desistimiento' }] };
  return {
    texto: fichas.length === 1 ? 'Así va tu proyecto:' : `Tienes ${fichas.length} proyectos:`,
    tarjetas: fichas.map(tarjetaFicha),
    acciones: fichas.length === 1 ? accionesFicha(fichas[0]) : [...fichas.flatMap(f => f.debe ? [{ t: `Pagar ${euros(f.debe)} · ${nombreDe(f.p)}`, ic: 'euro', ir: { tipo: 'pagar', id: f.p.id } }] : []), ...fichas.map(f => ({ t: nombreDe(f.p), ic: 'folder', ir: { tipo: 'proyecto', id: f.p.id, pest: 'estado' } }))]
  };
}

async function respuestaRapida(texto) {
  const tipo = intencion(texto);
  if (['pedido', 'pagar', 'vista', 'factura', 'cancelar'].includes(tipo)) {
    // «¿Cómo se paga?» sin sesión es una duda general, no de un pedido
    if (tipo === 'pagar' && !store.usuarioActual() && !/(debo|queda|mi )/.test(sinTildes(texto))) return null;
    if (tipo === 'cancelar' && !store.usuarioActual()) return { texto: 'Como cliente tienes 14 días naturales desde la compra para desistir sin dar explicaciones. Si pides que empecemos antes, se descuenta la parte ya hecha. Lo tienes todo en las condiciones.', acciones: [{ t: 'Leer las condiciones', ic: 'file', href: 'terminos-y-privacidad#desistimiento' }] };
    return respuestaCuenta(tipo);
  }
  if (tipo === 'persona') return { texto: `Claro. Escríbenos y te contesta una persona del equipo (${CONFIG.respuesta.toLowerCase()}). Si ya eres cliente, también puedes escribir en «Mensajes» de tu proyecto.`, acciones: [{ t: 'Escribir al equipo', ic: 'message', ir: { tipo: 'soporte' } }, { t: 'Enviar un correo', ic: 'mail', href: mailLink('Consulta desde la web') }] };
  if (tipo === 'presupuesto') return { texto: 'En la calculadora eliges el tipo de web y los extras y ves al momento el precio final con IVA, lo que se paga al empezar y el plazo.', acciones: [{ t: 'Abrir la calculadora', ic: 'euro', href: '#calcula' }] };
  if (tipo === 'empezar') return { texto: CONFIG.aceptarPedidos ? 'Perfecto. Elige el tipo de web y en un par de minutos rellenas el cuestionario; ves el total antes de confirmar. Si no sabes cuál, cuéntame a qué te dedicas y te lo recomiendo.' : 'Ahora mismo tenemos la agenda completa, pero puedes apuntarte a la lista de espera y te avisamos en cuanto haya hueco.', acciones: [{ t: 'Ver webs y precios', ic: 'laptop', href: '#webs' }, { t: 'Ayúdame a elegir', ic: 'sparkle', ir: { tipo: 'elegir' } }] };
  return null;
}

/** Acciones que acompañan a una respuesta general (planes que se mencionan) */
function accionesDeTexto(texto) {
  const t = sinTildes(texto);
  const planes = planesActivos().filter(p => t.includes(sinTildes(p.nombre))).slice(0, 2);
  return planes.map(p => ({ t: `${CONFIG.aceptarPedidos ? 'Pedir' : 'Lista de espera:'} ${p.nombre}`, ic: p.icono || 'laptop', ir: { tipo: 'comprar', plan: p.id } }));
}

/* ---------- Chat ---------- */
const CLAVE = 'tm_chat';
const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || '[]'); } catch { return []; } };
const guardar = h => { try { sessionStorage.setItem(CLAVE, JSON.stringify(h.slice(-30))); } catch { /* sin almacenamiento */ } };
const RAPIDAS_VISITA = ['¿Qué web me conviene?', '¿Cuánto cuesta una web?', '¿Cuánto tardáis?', '¿Cómo se paga?'];
const RAPIDAS_CLIENTE = ['¿Cómo va mi pedido?', '¿Qué tengo que pagar?', 'Ver mi web', 'Hablar con una persona'];

export function iniciarChat() {
  if (!(CONFIG.asistente || ajuste).activo || document.getElementById('chat')) return;
  let hilo = leer();
  const ia = store.iaDisponible();
  const nodo = document.createElement('div');
  nodo.id = 'chat';
  nodo.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-expanded="false" aria-controls="chatPanel">
      <span class="chat-fab-ic">${mascotaHTML('feliz')}</span><span class="chat-fab-x">${icono('x')}</span>
      <span class="chat-fab-t">¿Dudas? Pregúntanos</span>
    </button>
    <section class="chat-panel" id="chatPanel" role="dialog" aria-label="${esc(ajuste.nombre)}" aria-hidden="true">
      <header class="chat-h">
        <span class="chat-av">${mascotaHTML('normal')}</span>
        <div><b>${esc(ajuste.nombre)}</b><small><i></i><span id="chatEstado">${ia ? 'Responde al momento' : 'Respuestas automáticas'}</span></small></div>
        <button class="icon-btn" id="chatBorrar" aria-label="Empezar de nuevo" title="Empezar de nuevo" hidden>${icono('refresh')}</button>
        <button class="icon-btn" id="chatCerrar" aria-label="Cerrar">${icono('x')}</button>
      </header>
      <div class="chat-msgs" id="chatMsgs" aria-live="polite"></div>
      <div class="chat-rapidas" id="chatRapidas"></div>
      <form class="chat-form" id="chatForm" autocomplete="off">
        <input id="chatIn" maxlength="600" placeholder="Escribe tu pregunta" aria-label="Tu pregunta" enterkeyhint="send">
        <button class="chat-send" aria-label="Enviar">${icono('arrow')}</button>
      </form>
      <button type="button" class="chat-wa" id="chatPersona">${icono('message')} Hablar con una persona del equipo</button>
    </section>`;
  document.body.appendChild(nodo);

  const fab = nodo.querySelector('#chatFab'), panel = nodo.querySelector('#chatPanel');
  const msgs = nodo.querySelector('#chatMsgs'), input = nodo.querySelector('#chatIn'), rapidas = nodo.querySelector('#chatRapidas');
  const borrar = nodo.querySelector('#chatBorrar');
  const boton = a => {
    const dentro = `${icono(a.ic || 'arrow')}<span>${esc(a.t)}</span>`;
    if (a.href) return `<a class="chat-acc" href="${esc(a.href)}"${a.nueva ? ' target="_blank" rel="noopener"' : ''}>${dentro}</a>`;
    return `<button type="button" class="chat-acc" data-chat-ir="${esc(JSON.stringify(a.ir))}">${dentro}</button>`;
  };
  const tarjeta = t => `<div class="chat-ped">
      <div class="chat-ped-h"><b>${esc(t.nombre)}</b><small>${esc(t.plan)}</small></div>
      <div class="chat-ped-barra" role="img" aria-label="Etapa ${t.n} de ${t.total}">${Array.from({ length: t.total }, (_, i) => `<i class="${i < t.n ? 'on' : ''}"></i>`).join('')}</div>
      <p class="chat-ped-et"><span>${esc(t.etapa)}</span><small>${t.n} de ${t.total}</small></p>
      ${t.toca ? `<p class="chat-ped-toca">Te toca: ${esc(t.toca)}</p>` : t.estado ? `<p class="chat-ped-tx">${esc(t.estado)}</p>` : ''}
      <dl>${t.entrega ? `<div><dt>Entrega</dt><dd>${esc(t.entrega)}</dd></div>` : ''}<div><dt>Pagos</dt><dd>${esc(t.pago)}</dd></div></dl>
    </div>`;
  const burbuja = (m, nuevo = false) => `<div class="msg ${m.rol === 'user' ? 'yo' : 'el'} ${nuevo ? 'nuevo' : ''}">${esc(m.texto).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>${m.tarjetas?.length ? `<div class="chat-peds">${m.tarjetas.map(tarjeta).join('')}</div>` : ''}${m.acciones?.length ? `<div class="chat-accs">${m.acciones.slice(0, 4).map(boton).join('')}</div>` : ''}`;
  const pintarRapidas = () => {
    const u = store.usuarioActual();
    const lista = u?.role === 'client' ? RAPIDAS_CLIENTE : RAPIDAS_VISITA;
    rapidas.innerHTML = lista.map(q => `<button type="button">${esc(q)}</button>`).join('');
  };
  const pintar = () => {
    const u = store.usuarioActual();
    const saludo = u?.role === 'client'
      ? `Hola${u.name ? ', ' + u.name.split(' ')[0] : ''}. Puedo decirte cómo va tu pedido, qué te toca pagar o enseñarte tu web, y resolver cualquier duda.`
      : CONFIG.asistente?.saludo || ajuste.saludo || 'Hola, ¿en qué puedo ayudarte?';
    msgs.innerHTML = burbuja({ rol: 'model', texto: saludo }) + hilo.map(m => burbuja(m)).join('');
    pintarRapidas();
    rapidas.hidden = hilo.length > 0;
    borrar.hidden = !hilo.length;
    msgs.scrollTop = msgs.scrollHeight;
  };
  /* La mascota del botón vuela hasta la cabecera del chat al abrirlo y vuelve al cerrarlo */
  const mFab = fab.querySelector('.masc'), mAv = nodo.querySelector('.chat-av .masc');
  seguirPuntero(); precargar();
  setTimeout(() => estadoMascota(mFab, 'normal'), 2400); // el saludo inicial dura un momento
  const caja = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width }; };
  let origen = null, vuelo = 0;
  const abrirChat = si => {
    if (si === nodo.classList.contains('abierto')) return;
    const mio = ++vuelo;
    let desde = null, hasta = null;
    if (si) {
      // Dónde está el botón (si está oculto o fuera de pantalla, la esquina de abajo a la derecha)
      const r = caja(mFab);
      origen = { left: Math.min(Math.max(r.left, 0), innerWidth - r.width - 8), top: Math.min(r.top, innerHeight - r.width - 12), width: r.width };
      desde = origen;
    } else if (origen) { desde = caja(mAv); hasta = origen; }
    nodo.classList.toggle('abierto', si);
    // En el móvil el chat ocupa toda la pantalla: la página de debajo no se mueve
    document.documentElement.classList.toggle('chat-abierto', si);
    fab.setAttribute('aria-expanded', si);
    panel.setAttribute('aria-hidden', !si);
    if (si) {
      pintar();
      // Dónde quedará el avatar cuando el panel termine de abrirse (se mide sin su animación y se vuelve a empezar)
      panel.style.transition = 'none'; panel.style.transform = 'none';
      hasta = caja(mAv);
      panel.style.opacity = '0'; panel.style.transform = 'translateY(16px) scale(.97)';
      void panel.offsetWidth;
      panel.style.transition = panel.style.opacity = panel.style.transform = '';
    }
    const [salta, aterriza] = si ? [mAv, mAv] : [mAv, mFab];
    if (desde && hasta) {
      salta.style.visibility = 'hidden'; aterriza.style.visibility = 'hidden';
      estadoMascota(si ? mAv : mFab, 'feliz');
      volar(desde, hasta, { ms: si ? 950 : 750 }).then(() => {
        mAv.style.visibility = mFab.style.visibility = '';
        if (mio !== vuelo) return;
        const m = si ? mAv : mFab;
        rebote(m);
        estadoMascota(m, 'feliz', 1500);
        if (si && matchMedia('(hover:hover)').matches) input.focus({ preventScroll: true });
      });
    } else if (si && matchMedia('(hover:hover)').matches) setTimeout(() => input.focus({ preventScroll: true }), 250);
  };
  fab.addEventListener('click', () => abrirChat(!nodo.classList.contains('abierto')));
  nodo.querySelector('#chatCerrar').addEventListener('click', () => abrirChat(false));
  borrar.addEventListener('click', () => { hilo = []; guardar(hilo); pintar(); });
  nodo.querySelector('#chatPersona').addEventListener('click', () => enviar('Quiero hablar con una persona'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nodo.classList.contains('abierto')) abrirChat(false); });
  document.addEventListener('click', e => { if (e.target.closest('[data-abrir-chat]')) { e.preventDefault(); abrirChat(true); } });
  // Al iniciar o cerrar sesión cambian las preguntas rápidas y el saludo
  store.alCambiarUsuario(() => { cachePedidos = null; if (nodo.classList.contains('abierto')) pintar(); });

  // Botones dentro de las respuestas
  msgs.addEventListener('click', e => {
    const a = e.target.closest('.chat-acc');
    if (!a) return;
    const enMovil = matchMedia('(max-width: 640px)').matches;
    if (a.tagName === 'A') {
      if (a.getAttribute('href').startsWith('#') || enMovil) abrirChat(false);
      return;
    }
    let ir; try { ir = JSON.parse(a.dataset.chatIr); } catch { return; }
    abrirChat(false);
    document.dispatchEvent(new CustomEvent('aurevix:abrir', { detail: ir }));
  });

  let ocupado = false;
  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || ocupado) return;
    ocupado = true;
    hilo.push({ rol: 'user', texto });
    guardar(hilo);
    pintar();
    msgs.insertAdjacentHTML('beforeend', '<div class="msg el escribiendo" aria-label="Escribiendo"><i></i><i></i><i></i></div>');
    // Se alegra al recibir tu mensaje (más si le saludas o le das las gracias) y después se pone a pensar
    clearTimeout(escuchando);
    const alegre = /\b(gracias|genial|perfecto|hola|buenas|guay|me encanta|crack)\b/i.test(texto);
    estadoMascota(mAv, 'feliz');
    const piensa = setTimeout(() => { if (ocupado) estadoMascota(mAv, 'piensa'); }, alegre ? 1100 : 650);
    msgs.scrollTop = msgs.scrollHeight;
    let r = null;
    try { r = await respuestaRapida(texto); } catch (e) { console.warn(e); }
    if (r) await new Promise(ok => setTimeout(ok, 350));
    else {
      let respuesta = '';
      if (ia) {
        try {
          // Con sesión de cliente, la IA recibe también un resumen de sus pedidos para contestar con datos reales
          let cliente = '';
          if (store.usuarioActual()?.role === 'client') {
            try { const L = await pedidosDelCliente(); cliente = (await Promise.all(L.slice(0, 3).map(fichaPedido))).map(textoFicha).join('\n'); } catch { /* sin pedidos */ }
          }
          respuesta = (await store.preguntarIA({ modo: 'chat', mensajes: hilo.map(({ rol, texto, tarjetas }) => ({ rol, texto: tarjetas?.length ? `${texto} ${tarjetas.map(t => `${t.nombre}: ${t.etapa}${t.toca ? ', le toca ' + t.toca : ''}; entrega ${t.entrega || '—'}; ${t.pago}.`).join(' ')}` : texto })), catalogo: catalogo(), cliente }))?.respuesta || '';
        } catch (e) { console.warn(e); }
      } else await new Promise(ok => setTimeout(ok, 450 + Math.random() * 300));
      if (!respuesta) respuesta = respuestaLocal(texto);
      r = { texto: respuesta, acciones: accionesDeTexto(respuesta) };
    }
    hilo.push({ rol: 'model', texto: r.texto, acciones: r.acciones || [], tarjetas: r.tarjetas || [] });
    guardar(hilo);
    pintar();
    msgs.querySelectorAll('.msg.el').forEach((m, i, todos) => i === todos.length - 1 && m.classList.add('nuevo'));
    clearTimeout(piensa);
    estadoMascota(mAv, 'habla');
    // Habla lo que dura la respuesta y termina con una sonrisa
    setTimeout(() => { if (mAv.dataset.estado === 'habla') estadoMascota(mAv, 'feliz', 900); }, Math.min(2600, 500 + r.texto.length * 14));
    ocupado = false;
  }
  // Mientras escribes te escucha: se inclina hacia ti y abre los ojos; si dejas de escribir, vuelve a su sitio
  let escuchando = 0;
  input.addEventListener('input', () => {
    if (ocupado) return;
    if (mAv.dataset.estado !== 'escucha') estadoMascota(mAv, 'escucha');
    clearTimeout(escuchando);
    escuchando = setTimeout(() => { if (mAv.dataset.estado === 'escucha') estadoMascota(mAv, 'normal'); }, input.value.trim() ? 2600 : 600);
  });
  nodo.querySelector('#chatForm').addEventListener('submit', e => { e.preventDefault(); const t = input.value; input.value = ''; enviar(t); });
  rapidas.addEventListener('click', e => { const b = e.target.closest('button'); if (b) enviar(b.textContent); });

  // Aparece con suavidad tras unos segundos de navegación
  setTimeout(() => nodo.classList.add('visible'), 1200);
}
