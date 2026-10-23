/* ==========================================================
   ASISTENTE DE LA WEB
   - Chat de dudas (atención al cliente)
   - "Te ayudo a elegir": recomienda tipo de web y diseño
   Con Supabase conectado responde Gemini (función "asistente").
   En modo demo responde con reglas sencillas a partir de config.js.
   ========================================================== */
import { CONFIG, PLANES, EXTRAS, URGENTE } from '../config.js';
import { PLANTILLAS } from './plantillas.js';
import * as store from './store.js';
import { esc, icono, euros, waLink } from './ui.js';

const ajuste = CONFIG.asistente || { activo: true, nombre: 'Asistente', saludo: '' };

/** Datos que se envían a la IA para que responda con información real */
export const catalogo = () => ({
  marca: CONFIG.marca, senal: CONFIG.senal, urgente: URGENTE, whatsapp: CONFIG.whatsapp, email: CONFIG.email,
  planes: PLANES.map(({ id, nombre, precio, entrega, desc, incluye, plantillas }) => ({ id, nombre, precio, entrega, desc, incluye, plantillas })),
  extras: EXTRAS.map(({ id, nombre, precio, mensual, desc }) => ({ id, nombre, precio, mensual: !!mensual, desc })),
  plantillas: PLANTILLAS.map(({ id, nombre, sector, desc }) => ({ id, nombre, sector, desc }))
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
  if (tiene('trabaj', 'comercial', 'empleo', 'vacante', 'comision')) return `Buscamos comerciales con un ${CONFIG.comision} % de comisión por cada web vendida. Tienes las condiciones y el formulario en la página «Trabaja con nosotros».`;
  if (tiene('precio', 'cuesta', 'cuanto vale', 'tarifa', 'presupuesto', 'barato', 'caro')) return `Los precios de partida son: ${desde}. En el cuestionario puedes añadir extras y ves el total antes de confirmar.`;
  if (tiene('tarda', 'plazo', 'cuando', 'dias', 'entrega', 'rapido', 'urgente')) return `Los plazos van de ${PLANES[0].entrega} para una landing page a ${plan('tienda')?.entrega || '2 semanas'} para una tienda online. Si tienes prisa, la entrega urgente añade un ${Math.round(URGENTE * 100)} % al precio base.`;
  if (tiene('pago', 'pagar', 'bizum', 'transferencia', 'tarjeta', 'paypal', 'senal')) return `Se abona el ${CONFIG.senal} % al empezar y el resto cuando apruebas la web. Puedes pagar por Bizum, transferencia u otros métodos que aparecen al finalizar el pedido.`;
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
  return 'Puedo ayudarte con precios, plazos, pagos y tipos de web. Para algo más concreto, escríbenos por WhatsApp y te atiende una persona del equipo.';
}

/* ---------- Chat ---------- */
const CLAVE = 'tm_chat';
const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || '[]'); } catch { return []; } };
const guardar = h => { try { sessionStorage.setItem(CLAVE, JSON.stringify(h.slice(-30))); } catch { /* sin almacenamiento */ } };
const RAPIDAS = ['¿Cuánto cuesta una web?', '¿Cuánto tardáis?', '¿Cómo se paga?', '¿Qué web me conviene?'];

export function iniciarChat() {
  if (!ajuste.activo || document.getElementById('chat')) return;
  let hilo = leer();
  const ia = store.iaDisponible();
  const nodo = document.createElement('div');
  nodo.id = 'chat';
  nodo.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-expanded="false" aria-controls="chatPanel">
      <span class="chat-fab-ic">${icono('message')}</span><span class="chat-fab-x">${icono('x')}</span>
      <span class="chat-fab-t">¿Dudas? Pregúntanos</span>
    </button>
    <section class="chat-panel" id="chatPanel" role="dialog" aria-label="${esc(ajuste.nombre)}" aria-hidden="true">
      <header class="chat-h">
        <span class="chat-av">${icono('sparkle')}</span>
        <div><b>${esc(ajuste.nombre)}</b><small><i></i>${ia ? 'Respuestas con IA al momento' : 'Respuestas automáticas'}</small></div>
        <button class="icon-btn" id="chatCerrar" aria-label="Cerrar">${icono('x')}</button>
      </header>
      <div class="chat-msgs" id="chatMsgs" aria-live="polite"></div>
      <div class="chat-rapidas" id="chatRapidas">${RAPIDAS.map(q => `<button type="button">${esc(q)}</button>`).join('')}</div>
      <form class="chat-form" id="chatForm" autocomplete="off">
        <input id="chatIn" maxlength="600" placeholder="Escribe tu pregunta" aria-label="Tu pregunta">
        <button class="chat-send" aria-label="Enviar">${icono('arrow')}</button>
      </form>
      <a class="chat-wa" href="${waLink('Hola, tengo una duda sobre una web.')}" target="_blank" rel="noopener">${icono('wa')} Hablar con una persona por WhatsApp</a>
    </section>`;
  document.body.appendChild(nodo);

  const fab = nodo.querySelector('#chatFab'), panel = nodo.querySelector('#chatPanel');
  const msgs = nodo.querySelector('#chatMsgs'), input = nodo.querySelector('#chatIn'), rapidas = nodo.querySelector('#chatRapidas');
  const burbuja = (m, nuevo = false) => `<div class="msg ${m.rol === 'user' ? 'yo' : 'el'} ${nuevo ? 'nuevo' : ''}">${esc(m.texto).replace(/\n/g, '<br>')}</div>`;
  const pintar = () => {
    msgs.innerHTML = burbuja({ rol: 'model', texto: ajuste.saludo || 'Hola, ¿en qué puedo ayudarte?' }) + hilo.map(m => burbuja(m)).join('');
    rapidas.hidden = hilo.length > 0;
    msgs.scrollTop = msgs.scrollHeight;
  };
  const abrirChat = si => {
    nodo.classList.toggle('abierto', si);
    fab.setAttribute('aria-expanded', si);
    panel.setAttribute('aria-hidden', !si);
    if (si) { pintar(); setTimeout(() => input.focus({ preventScroll: true }), 250); }
  };
  fab.addEventListener('click', () => abrirChat(!nodo.classList.contains('abierto')));
  nodo.querySelector('#chatCerrar').addEventListener('click', () => abrirChat(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nodo.classList.contains('abierto')) abrirChat(false); });
  document.addEventListener('click', e => { if (e.target.closest('[data-abrir-chat]')) { e.preventDefault(); abrirChat(true); } });

  let ocupado = false;
  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || ocupado) return;
    ocupado = true;
    hilo.push({ rol: 'user', texto });
    guardar(hilo);
    pintar();
    msgs.insertAdjacentHTML('beforeend', '<div class="msg el escribiendo"><i></i><i></i><i></i></div>');
    msgs.scrollTop = msgs.scrollHeight;
    let respuesta = '';
    if (ia) {
      try { respuesta = (await store.preguntarIA({ modo: 'chat', mensajes: hilo, catalogo: catalogo() }))?.respuesta || ''; }
      catch (e) { console.warn(e); }
    } else {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    }
    if (!respuesta) respuesta = respuestaLocal(texto);
    hilo.push({ rol: 'model', texto: respuesta });
    guardar(hilo);
    pintar();
    msgs.lastElementChild?.classList.add('nuevo');
    ocupado = false;
  }
  nodo.querySelector('#chatForm').addEventListener('submit', e => { e.preventDefault(); const t = input.value; input.value = ''; enviar(t); });
  rapidas.addEventListener('click', e => { const b = e.target.closest('button'); if (b) enviar(b.textContent); });

  // Aparece con suavidad tras unos segundos de navegación
  setTimeout(() => nodo.classList.add('visible'), 1200);
}
