/* ==========================================================
   ETAPAS DEL PROYECTO
   El propietario (o el trabajador asignado) marca en qué etapa
   está cada web. El cliente ve la etapa en «Mis proyectos» y,
   cuando le toca, elige el dominio, envía el contenido, revisa
   la vista previa y paga el resto.
   ========================================================== */
import { CONFIG, PLANES } from '../config.js';
import { esc, icono, campo, euros, fecha, haceCuanto, mailLink, refPedido } from './ui.js';
import { plantillaPorId } from './plantillas.js';

export const ETAPAS = [
  { id: 'recibido', txt: 'Pedido recibido', icono: 'inbox', cliente: 'Hemos recibido tu pedido. En breve te contactamos para confirmar los detalles.' },
  { id: 'dominio', txt: 'Dominio', icono: 'link', cliente: 'Elige la dirección de tu web.', accion: true },
  { id: 'contenido', txt: 'Contenido', icono: 'folder', cliente: 'Envíanos los textos, fotos y logotipo de tu negocio.', accion: true },
  { id: 'diseno', txt: 'Diseño', icono: 'pen', cliente: 'Estamos diseñando tu web. Te avisaremos cuando la vista previa esté lista.' },
  { id: 'revision', txt: 'Revisión', icono: 'eye', cliente: 'La vista previa está lista. Revísala y apruébala o indícanos los cambios.', accion: true },
  { id: 'pago', txt: 'Pago final', icono: 'euro', cliente: 'Abona el importe pendiente para publicar la web.', accion: true },
  { id: 'publicada', txt: 'Publicada', icono: 'check', cliente: 'Tu web está publicada.' }
];
export const EXTENSIONES = ['.com', '.es', '.net', '.org', '.eu', '.shop'];

/** Etapa actual (los pedidos antiguos sin etapa se deducen del estado) */
export function etapaDe(p) {
  if (p.etapa && ETAPAS.some(e => e.id === p.etapa)) return p.etapa;
  return p.estado === 'entregado' ? 'publicada' : 'recibido';
}
export const indiceEtapa = p => ETAPAS.findIndex(e => e.id === etapaDe(p));

/** Estado del tablero que corresponde a cada etapa */
export function estadoParaEtapa(id, estadoActual) {
  if (estadoActual === 'cancelado') return 'cancelado';
  if (id === 'publicada') return 'entregado';
  if (id === 'revision' || id === 'pago') return 'revision';
  if (id === 'recibido') return estadoActual === 'nuevo' ? 'nuevo' : estadoActual;
  return 'en_curso';
}

/** Barra horizontal de etapas. Con editable, cada etapa es un botón. */
export function barraEtapas(p, { editable = false } = {}) {
  const i = indiceEtapa(p);
  return `<ol class="etapas ${editable ? 'editable' : ''}" style="--n:${ETAPAS.length};--i:${i}">
    ${ETAPAS.map((e, k) => {
      const cls = k < i ? 'hecha' : k === i ? 'actual' : '';
      const inner = `<span class="et-ic">${icono(k < i ? 'check' : e.icono)}</span><span class="et-t">${e.txt}</span>`;
      return `<li class="${cls}">${editable ? `<button type="button" data-etapa="${e.id}" aria-pressed="${k === i}">${inner}</button>` : `<span class="et-in">${inner}</span>`}</li>`;
    }).join('')}
  </ol>`;
}

const urlVistaPrevia = p => {
  if (p.urlVista) return p.urlVista;
  const r = p.respuestas || {};
  return p.plantilla ? `diseno?t=${encodeURIComponent(p.plantilla)}&n=${encodeURIComponent(r.negocio || '')}&c=${encodeURIComponent(r.color || '')}` : '';
};
const dominioTexto = d => d ? (d.tipo === 'propio' ? `${d.nombre} (ya es suyo)` : d.nombre) : '';

/* ---------- Vista del cliente ---------- */
export function accionCliente(p, botonPagoHTML) {
  const et = etapaDe(p);
  const info = ETAPAS.find(e => e.id === et);
  const r = p.respuestas || {};
  const id = esc(p.id);
  const cab = `<div class="ac-h"><span class="ac-ic">${icono(info.icono)}</span><div><b>${info.accion ? 'Te toca a ti' : 'En qué punto está'}</b><p>${esc(info.cliente)}</p></div></div>`;

  if (et === 'dominio') {
    const d = p.dominio || {};
    const base = (r.negocio || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
    const nombre = d.nombre ? d.nombre.replace(/\.[a-z.]+$/, '') : base;
    const ext = d.nombre?.match(/\.[a-z.]+$/)?.[0] || '.es';
    return `${cab}
    <form class="ac-form" data-form="dominio" data-id="${id}" novalidate>
      <div class="opts ac-tipo">
        <label class="opt"><input type="radio" name="tipo" value="nuevo" ${d.tipo !== 'propio' ? 'checked' : ''}><span><i>Quiero un dominio nuevo</i></span></label>
        <label class="opt"><input type="radio" name="tipo" value="propio" ${d.tipo === 'propio' ? 'checked' : ''}><span><i>Ya tengo dominio</i></span></label>
      </div>
      <div class="dom-fila">
        <span class="dom-www">www.</span>
        <input class="dom-in" name="nombre" value="${esc(nombre)}" placeholder="tunegocio" autocomplete="off" aria-label="Nombre del dominio" required>
        <select class="dom-ext" name="ext" aria-label="Extensión">${EXTENSIONES.map(x => `<option ${x === ext ? 'selected' : ''}>${x}</option>`).join('')}</select>
      </div>
      <p class="ac-nota" data-dom-nota>Usa solo letras, números y guiones. Comprobamos que esté libre y lo registramos a tu nombre.</p>
      <div class="ac-btns"><button class="btn btn-primary" type="submit"><span>Guardar dominio</span>${icono('arrow')}</button></div>
    </form>`;
  }

  if (et === 'contenido') {
    const c = p.contenido || {};
    return `${cab}
    <form class="ac-form ac-grid" data-form="contenido" data-id="${id}" novalidate>
      ${campo({ id: `sobre-${id}`, name: 'sobre', label: 'Sobre tu negocio', type: 'textarea', hint: 'Quiénes sois, desde cuándo, qué os diferencia', value: c.sobre || '' })}
      ${campo({ id: `serv-${id}`, name: 'servicios', label: 'Servicios y precios', type: 'textarea', value: c.servicios || '' })}
      ${campo({ id: `hor-${id}`, name: 'horario', label: 'Horario y dirección', type: 'textarea', value: c.horario || '' })}
      ${campo({ id: `redes-${id}`, name: 'redes', label: 'Redes sociales', hint: 'Instagram, Facebook, TikTok…', value: c.redes || '' })}
      ${campo({ id: `fotos-${id}`, name: 'fotos', label: 'Enlace a tus fotos (opcional)', type: 'url', hint: 'También puedes subirlas en la pestaña «Archivos»', value: c.fotos || '' })}
      ${campo({ id: `logo-${id}`, name: 'logo', label: 'Enlace al logotipo', type: 'url', hint: 'Si ya tienes uno', value: c.logo || '' })}
      <details class="ac-mas"${MAS_CONTENIDO.some(([k]) => c[k]) ? ' open' : ''}>
        <summary>${icono('sparkle')}<span><b>Más detalles para una web a tu medida</b><small>Opcional, pero cuanto más nos cuentes, mejor sale tu web (y antes)</small></span></summary>
        <div class="ac-grid">${MAS_CONTENIDO.map(([k, label, hint, type]) => campo({ id: `${k}-${id}`, name: k, label, hint, type: type || 'textarea', value: c[k] || '' })).join('')}</div>
      </details>
      <div class="ac-btns">
        <button class="btn btn-primary" type="submit"><span>Enviar contenido</span>${icono('arrow')}</button>
        <button class="btn btn-ghost" type="button" data-ir-pestana="archivos"><span>Subir fotos y logotipo</span>${icono('upload')}</button>
        <a class="btn btn-ghost" href="${mailLink(`Contenido de mi web ${refPedido(p.id)}`, `Hola, os envío el contenido de mi web «${r.negocio || p.planNombre}» (${refPedido(p.id)}).`)}"><span>Enviarlo por correo</span></a>
      </div>
    </form>`;
  }

  if (et === 'revision') {
    const rv = p.revision || {};
    const v = webCliente(p);
    const url = urlVistaPrevia(p);
    return `${cab}
    <div class="ac-form" data-id="${id}">
      ${v ? `<button type="button" class="ac-web" data-ver-web="${id}">
        <span class="ac-web-ic">${icono('eye')}</span>
        <span><b>Ver tu web · versión ${v.n}</b><small>${v.nota ? esc(v.nota) : 'Recórrela en el móvil y en el ordenador. Desde ahí mismo la apruebas o nos pides cambios.'}</small></span>
        ${icono('arrow')}</button>` : ''}
      ${url && (!v || p.urlVista) ? `<a class="btn btn-ghost btn-fill" href="${esc(url)}" target="_blank" rel="noopener"><span>${v ? 'Abrir el enlace de la vista previa' : 'Abrir la vista previa'}</span>${icono('external')}</a>` : ''}
      ${(rv.comentarios || []).length ? `<div class="ac-hist">${rv.comentarios.map(c => `<p><small>${haceCuanto(c.t)}${c.v ? ` · versión ${c.v}` : ''}${c.hecho ? ' · hecho' : ''}</small>${esc(c.texto)}</p>`).join('')}</div>` : ''}
      ${rv.estado === 'cambios' ? `<p class="ac-nota">${icono('clock')} Hemos recibido tus cambios. Te avisaremos cuando estén aplicados.</p>` : ''}
      ${v ? '' : `<form data-form="cambios" data-id="${id}" novalidate>
        ${campo({ id: `cambios-${id}`, name: 'texto', label: 'Cambios que quieres hacer', type: 'textarea' })}
        <div class="ac-btns">
          <button class="btn btn-primary" type="button" data-aprobar-web="${id}"><span>Aprobar la web</span>${icono('check')}</button>
          <button class="btn btn-ghost" type="submit"><span>Enviar cambios</span></button>
        </div>
      </form>`}
    </div>`;
  }

  if (et === 'pago') {
    return `${cab}<div class="ac-form"><div class="mp-pay">${botonPagoHTML}</div>${webCliente(p) ? `<button type="button" class="btn btn-ghost btn-fill" data-ver-web="${id}"><span>Ver la web aprobada</span>${icono('eye')}</button>` : ''}</div>`;
  }

  if (et === 'publicada') {
    return `${cab}<div class="ac-form">
      ${p.urlWeb ? `<a class="btn btn-primary" href="${esc(p.urlWeb)}" target="_blank" rel="noopener"><span>Visitar mi web</span>${icono('external')}</a>` : webCliente(p) ? `<button type="button" class="btn btn-ghost" data-ver-web="${id}"><span>Ver mi web</span>${icono('eye')}</button>` : ''}
      ${!p.resenada ? `<button class="btn btn-ghost mp-rate" data-valorar="${id}">${icono('star')} Valorar el servicio</button>` : '<p class="ac-nota">Gracias por tu valoración.</p>'}
    </div>`;
  }

  // recibido / diseño: información y, si toca, el pago de la señal
  const pl = plantillaPorId(p.plantilla);
  return `${cab}<div class="ac-form">
    ${et === 'recibido' ? `<div class="mp-pay">${botonPagoHTML}</div>` : ''}
    ${et === 'recibido' && (p.pagoEstado || 'pendiente') === 'pendiente' && !puedeDesistir(p) ? (p.cancelacion ? `<p class="ac-nota">${icono('clock')} Has pedido cancelar este pedido. Te confirmaremos la cancelación por correo.</p>` : `<button type="button" class="link-btn ac-cancel" data-cancelar="${id}">Solicitar la cancelación del pedido</button>`) : ''}
    ${et === 'diseno' && pl ? `<a class="btn btn-ghost" href="${esc(urlVistaPrevia(p))}" target="_blank" rel="noopener"><span>Ver el diseño de partida (${esc(pl.nombre)})</span>${icono('external')}</a>` : ''}
    ${et === 'diseno' && webCliente(p) ? `<button type="button" class="btn btn-ghost" data-ver-web="${id}"><span>Ver la última versión de tu web</span>${icono('eye')}</button>` : ''}
  </div>`;
}

/* ---------- Derecho de desistimiento (14 días naturales desde el pedido) ----------
   Art. 102 y siguientes del TRLGDCU y Directiva (UE) 2023/2673: función de desistimiento visible
   durante todo el plazo, con confirmación y justificante. */
export const DIAS_DESISTIMIENTO = 14;
export const finDesistimiento = p => (p.createdAt || 0) + DIAS_DESISTIMIENTO * 864e5;
export const puedeDesistir = p => !p.cancelacion && !['cancelado', 'entregado'].includes(p.estado) && etapaDe(p) !== 'publicada' && Date.now() < finDesistimiento(p);
export function desistimientoHTML(p) {
  const id = esc(p.id);
  if (p.cancelacion?.desistimiento) return `<div class="desist hecho">${icono('check')}<div><b>Has desistido del contrato</b><small>El ${fecha(p.cancelacion.t)}. Te devolveremos lo pagado por transferencia en un plazo máximo de 14 días${p.inicioAnticipado ? ', descontando la parte del trabajo ya hecha' : ''}.</small></div><button type="button" class="btn btn-sm btn-ghost" data-justificante="${id}">${icono('printer')}<span>Justificante</span></button></div>`;
  if (!puedeDesistir(p)) return '';
  return `<div class="desist">${icono('undo')}<div><b>Derecho de desistimiento</b><small>Puedes desistir de este contrato sin dar explicaciones hasta el ${fecha(finDesistimiento(p))}.</small></div><button type="button" class="btn btn-sm btn-ghost" data-desistir="${id}"><span>Desistir del contrato</span></button></div>`;
}

/* Preguntas extra del contenido (todas opcionales): lo que más mejora una web y casi nunca se cuenta */
export const MAS_CONTENIDO = [
  ['publico', '¿A quién te diriges?', 'Edad, zona, qué buscan, por qué te eligen'],
  ['diferencia', '¿Qué te diferencia de la competencia?', 'Experiencia, especialidad, garantía, trato, precio…'],
  ['accion', '¿Qué debe hacer quien te visita?', 'Llamarte, escribirte por WhatsApp, reservar, comprar, pedir presupuesto…', 'text'],
  ['contactoWeb', 'Contacto que se publica en la web', 'Teléfono, email y WhatsApp (pueden ser distintos de los del pedido)', 'text'],
  ['zona', 'Dirección exacta y zona donde trabajas', 'Calle, número, ciudad y si vas a domicilio o a qué zonas'],
  ['opiniones', 'Opiniones reales de tus clientes', 'Copia algunas (con su nombre o inicial, y con su permiso) o el enlace a tus reseñas de Google'],
  ['faq', 'Preguntas que te hacen siempre tus clientes', 'Y lo que les respondes: precios, plazos, formas de pago, aparcamiento…'],
  ['referencias', 'Webs que te gustan (y por qué)', 'De tu sector o de cualquier otro'],
  ['marca', 'Colores, tipografías o estilo de tu marca', 'Si ya los usas en tu local, cartelería o redes'],
  ['tono', '¿Cómo quieres hablar a tus clientes?', 'De tú o de usted; cercano, elegante, divertido…', 'text'],
  ['legal', 'Datos para el aviso legal', 'Nombre o razón social, NIF/CIF y dirección fiscal (obligatorios por ley)'],
  ['otros', 'Algo más que debamos saber', 'Promociones, idiomas, certificados, premios, colaboraciones…']
];

/** Valida y devuelve los cambios a guardar para cada formulario del cliente */
export function leerFormulario(form, p) {
  const f = new FormData(form);
  if (form.dataset.form === 'dominio') {
    const nombre = String(f.get('nombre') || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\.[a-z.]+$/, '');
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(nombre)) throw new Error('Escribe un nombre válido: letras, números y guiones, sin espacios.');
    return { dominio: { nombre: nombre + f.get('ext'), tipo: f.get('tipo'), t: Date.now() }, etapa: 'contenido' };
  }
  if (form.dataset.form === 'contenido') {
    const c = Object.fromEntries(['sobre', 'servicios', 'horario', 'redes', 'fotos', 'logo', ...MAS_CONTENIDO.map(([k]) => k)].map(k => [k, String(f.get(k) || '').trim().slice(0, 4000)]));
    if (!c.sobre && !c.servicios) throw new Error('Cuéntanos al menos algo sobre tu negocio o tus servicios.');
    return { contenido: { ...c, t: Date.now() }, etapa: 'diseno' };
  }
  if (form.dataset.form === 'cambios') {
    const texto = String(f.get('texto') || '').trim();
    if (!texto) throw new Error('Escribe qué cambios quieres.');
    const rv = p.revision || {};
    return pedirCambios(p, texto);
  }
  return null;
}
/** Cambios que pide el cliente (desde el formulario o desde el visor, con la versión y la página que estaba viendo) */
export function pedirCambios(p, texto, { pagina = '' } = {}) {
  const rv = p.revision || {};
  const v = webCliente(p);
  const c = { texto: String(texto).trim().slice(0, 3000), t: Date.now(), ...(v ? { v: v.n } : {}), ...(pagina ? { pagina } : {}) };
  return { revision: { ...rv, estado: 'cambios', comentarios: [...(rv.comentarios || []), c], t: Date.now() } };
}
export const aprobarWeb = p => ({ revision: { ...(p.revision || {}), estado: 'aprobada', t: Date.now(), ...(webCliente(p) ? { v: webCliente(p).n } : {}) }, etapa: 'pago' });
/** La versión de la web que el equipo ha enviado al cliente */
export const webCliente = p => (p.webs || []).find(w => w.id === p.webCliente) || null;

/* ---------- Vista del equipo (panel) ---------- */
export function entregasCliente(p, { editable = false } = {}) {
  const d = p.dominio, c = p.contenido, rv = p.revision;
  const kv = (k, v, link) => v ? `<div class="kv"><span>${esc(k)}</span><b>${link ? `<a class="link-btn" href="${esc(v)}" target="_blank" rel="noopener">abrir ${icono('external')}</a>` : esc(v)}</b></div>` : '';
  const bloque = (t, v) => v ? `<div class="ent-b"><small>${esc(t)}</small><p>${esc(v)}</p></div>` : '';
  return `
    <div class="ent">
      <div class="ent-h">${icono('link')}<b>Dominio</b>${d ? `<small>${fecha(d.t)}</small>` : '<small>Pendiente</small>'}</div>
      ${d ? `<div class="kvs">${kv('Dominio', dominioTexto(d))}${kv('Tipo', d.tipo === 'propio' ? 'Ya lo tiene el cliente' : 'Registrar nuevo')}</div>` : ''}
    </div>
    <div class="ent">
      <div class="ent-h">${icono('folder')}<b>Contenido</b>${c ? `<small>${fecha(c.t)}</small>` : '<small>Pendiente</small>'}</div>
      ${c ? `${bloque('Sobre el negocio', c.sobre)}${bloque('Servicios y precios', c.servicios)}${bloque('Horario y dirección', c.horario)}${MAS_CONTENIDO.map(([k, label]) => bloque(label, c[k])).join('')}
        ${c.redes || c.fotos || c.logo ? `<div class="kvs">${kv('Redes', c.redes)}${kv('Fotos', c.fotos, true)}${kv('Logotipo', c.logo, true)}</div>` : ''}` : ''}
    </div>
    <div class="ent">
      <div class="ent-h">${icono('eye')}<b>Revisión</b><small>${rv?.estado === 'aprobada' ? `Aprobada${rv.v ? ` (versión ${rv.v})` : ''}` : rv?.estado === 'cambios' ? 'Pide cambios' : 'Sin respuesta'}</small></div>
      ${(rv?.comentarios || []).length ? `<ul class="ent-cambios">${rv.comentarios.map((x, i) => `<li class="${x.hecho ? 'hecho' : ''}">
        <label class="tarea ${editable ? '' : 'off'}"><input type="checkbox" data-hecho="${i}" ${x.hecho ? 'checked' : ''} ${editable ? '' : 'disabled'}><span class="ck-mark"></span>
        <span><small>${haceCuanto(x.t)}${x.v ? ` · versión ${x.v}` : ''}${x.pagina ? ` · ${esc(x.pagina)}` : ''}${x.hecho ? ' · hecho' : ''}</small>${esc(x.texto)}</span></label></li>`).join('')}</ul>` : ''}
    </div>`;
}

export { urlVistaPrevia, dominioTexto };
export const importePendiente = p => (p.total || 0) * (100 - CONFIG.senal) / 100;
export const totalTexto = p => euros(p.total || 0);

/* ---------- Fecha de entrega ---------- */
const DIA = 864e5;
/** Fecha prevista de entrega: la que fija el equipo o la calculada con el plazo del plan */
export function fechaEntrega(p) {
  if (p.fechaEntrega) return p.fechaEntrega;
  const pl = PLANES.find(x => x.id === p.plan);
  const dias = Math.round((pl?.dias || 30) * (p.urgente ? 0.6 : 1));
  return (p.createdAt || Date.now()) + dias * DIA;
}
/** Días que faltan (negativo = retrasado). null si ya está terminado o cancelado. */
export function diasRestantes(p) {
  if (['entregado', 'cancelado'].includes(p.estado) || etapaDe(p) === 'publicada') return null;
  return Math.ceil((fechaEntrega(p) - Date.now()) / DIA);
}
export function plazoTexto(p) {
  const d = diasRestantes(p);
  if (d === null) return '';
  if (d < 0) return `Retrasado ${-d} día${d === -1 ? '' : 's'}`;
  if (d === 0) return 'Se entrega hoy';
  return `Faltan ${d} día${d === 1 ? '' : 's'}`;
}
export const plazoClase = p => { const d = diasRestantes(p); return d === null ? '' : d < 0 ? 'tarde' : d <= 3 ? 'pronto' : ''; };

/* ---------- Historial de cada proyecto ---------- */
/** Añade una línea al historial del pedido dentro de los cambios que se van a guardar */
export function conHistorial(p, cambios, texto, autor = '') {
  const h = [...(p.historial || []), { t: Date.now(), texto, autor }].slice(-80);
  return { ...cambios, historial: h };
}
/** Historial completo: lo guardado más los hitos que se deducen de las fechas */
export function lineaTiempo(p) {
  const L = [{ t: p.createdAt, texto: 'Pedido realizado', autor: p.clienteNombre }];
  if (p.dominio?.t) L.push({ t: p.dominio.t, texto: `Dominio elegido: ${dominioTexto(p.dominio)}`, autor: p.clienteNombre });
  if (p.contenido?.t) L.push({ t: p.contenido.t, texto: 'Contenido enviado', autor: p.clienteNombre });
  if (p.pagoAviso) L.push({ t: p.pagoAviso, texto: 'Aviso de pago enviado', autor: p.clienteNombre });
  (p.revision?.comentarios || []).forEach(c => L.push({ t: c.t, texto: 'Cambios solicitados', autor: p.clienteNombre }));
  if (p.revision?.estado === 'aprobada' && p.revision.t) L.push({ t: p.revision.t, texto: 'Web aprobada', autor: p.clienteNombre });
  (p.historial || []).forEach(h => L.push(h));
  const vistos = new Set();
  return L.filter(x => x.t && !vistos.has(x.t + x.texto) && vistos.add(x.t + x.texto)).sort((a, b) => b.t - a.t);
}
export const lineaTiempoHTML = p => `<ol class="tl-list">${lineaTiempo(p).map(h => `<li><span class="tl-dot"></span><div><b>${esc(h.texto)}</b><small>${fecha(h.t)} · ${haceCuanto(h.t)}${h.autor ? ' · ' + esc(h.autor) : ''}</small></div></li>`).join('')}</ol>`;

/* ---------- Siguiente paso de cada proyecto ----------
   Qué hay que hacer ahora y quién lo tiene que hacer (el equipo o el cliente).
   Lo usa el panel para ordenar los encargos y avisar de lo que falta. */
export function siguientePaso(p) {
  if (['entregado', 'cancelado'].includes(p.estado)) return null;
  const et = etapaDe(p), pago = p.pagoEstado || 'pendiente';
  const eq = (txt, ic, ayuda = '') => ({ quien: 'equipo', txt, ic, ayuda });
  const cli = (txt, ic) => ({ quien: 'cliente', txt: `Esperando que el cliente ${txt}`, ic });
  if (p.cancelacion?.desistimiento) return eq('El cliente ha desistido del contrato', 'alert', 'Cancela el pedido y devuélvele lo pagado por transferencia en 14 días como máximo.');
  if (p.cancelacion) return eq('El cliente pide cancelar', 'alert', 'Decide si cancelas el pedido o descartas la solicitud.');
  if (pago === 'verificando') return eq('Comprobar el pago', 'euro', 'Míralo en el banco y márcalo como pagado.');
  if (!p.asignado) return eq('Asignar el encargo', 'inbox');
  if (et === 'recibido') return pago === 'pendiente' ? cli('pague la señal', 'euro') : eq('Pasar a «Dominio»', 'link', 'La señal está pagada: ya puedes empezar.');
  if (et === 'dominio') return cli('elija el dominio', 'link');
  if (et === 'contenido') return cli('envíe textos, fotos y logotipo', 'folder');
  const vs = p.webs || [];
  const pend = (p.revision?.comentarios || []).filter(c => !c.hecho).length;
  if (et === 'diseno') {
    if (!vs.length) return eq('Subir la primera versión de la web', 'upload', 'Cuando la tengas, súbela en «Web del cliente» y envíasela.');
    return eq('Enviar la versión al cliente', 'send', 'Revísala en el visor y pulsa «Enviar».');
  }
  if (et === 'revision') {
    if (p.revision?.estado === 'cambios') return pend ? eq(`Hacer ${pend} cambio${pend === 1 ? '' : 's'} que pide el cliente`, 'pen') : eq('Subir y enviar la versión con los cambios', 'upload');
    if (!webCliente(p) && !p.urlVista) return eq('Enviar la vista previa al cliente', 'send');
    return cli('revise y apruebe la web', 'eye');
  }
  if (et === 'pago') return pago === 'pagado' ? eq('Publicar la web', 'globe', 'Pon la dirección de la web publicada y pásala a «Publicada».') : cli('haga el pago final', 'euro');
  return null;
}

/* Mensajes para recordar al cliente lo que le toca (se envían por la conversación del proyecto) */
const saludo = p => `Hola ${(p.clienteNombre || '').split(' ')[0] || ''}`.trim();
export const RECORDATORIOS = {
  recibido: p => `${saludo(p)}, ¿qué tal? Para empezar con tu web solo falta la señal. La tienes en «Mis proyectos» → «Pagos». Si tienes cualquier duda, escríbenos por aquí.`,
  dominio: p => `${saludo(p)}, para seguir con tu web necesitamos que elijas el dominio (la dirección de tu web). Lo tienes en «Mis proyectos» → «Estado». Te lleva un minuto.`,
  contenido: p => `${saludo(p)}, ¿cómo vas con el contenido? Cuando nos envíes los textos, las fotos y el logotipo empezamos con el diseño. Puedes subirlo todo en «Mis proyectos» y, si te falta algo, mándanos lo que tengas y lo vamos completando.`,
  revision: p => `${saludo(p)}, tu web está lista para revisar. Ábrela en «Mis proyectos», recórrela con calma y dinos si la apruebas o qué te gustaría cambiar.`,
  pago: p => `${saludo(p)}, ¡ya casi está! Solo falta el pago final para publicar tu web. Lo tienes en «Mis proyectos» → «Pagos».`
};

/* Todo lo que ha pedido y enviado el cliente en un texto (para tenerlo a mano mientras se hace la web) */
export function fichaTexto(p) {
  const r = p.respuestas || {}, c = p.contenido || {};
  const linea = (k, v) => (v ? `${k}: ${v}` : '');
  const bloque = (t, L) => { L = L.filter(Boolean); return L.length ? `## ${t}\n${L.join('\n')}` : ''; };
  return [
    `# ${r.negocio || p.planNombre} · ${refPedido(p.id)}`,
    bloque('Pedido', [
      linea('Tipo de web', p.planNombre), linea('Diseño de partida', plantillaPorId(p.plantilla)?.nombre || 'A medida'),
      linea('Extras', (p.extras || []).map(x => x.nombre).join(', ')), p.urgente ? 'Entrega urgente: sí' : '',
      linea('Entrega prevista', fecha(fechaEntrega(p))), linea('Dominio', dominioTexto(p.dominio))
    ]),
    bloque('Cliente', [linea('Nombre', p.clienteNombre), linea('Email', p.clienteEmail), linea('Teléfono', r.telefono)]),
    bloque('Cuestionario', [
      linea('Sector', r.sector), linea('Objetivo', r.objetivo), linea('Web actual', r.webActual), linea('Estilo', r.estilo),
      linea('Color', r.color), linea('Logotipo', r.logo), linea('Textos y fotos', r.contenido), linea('Plazo', r.plazo), linea('Comentarios', r.comentarios)
    ]),
    bloque('Contenido', [
      linea('Sobre el negocio', c.sobre), linea('Servicios y precios', c.servicios), linea('Horario y dirección', c.horario),
      linea('Redes', c.redes), linea('Fotos', c.fotos), linea('Logotipo', c.logo),
      ...MAS_CONTENIDO.map(([k, label]) => linea(label, c[k]))
    ]),
    bloque('Cambios pedidos', (p.revision?.comentarios || []).map(x => `- ${x.hecho ? '[hecho] ' : ''}${x.texto}${x.v ? ` (versión ${x.v})` : ''}`))
  ].filter(Boolean).join('\n\n');
}
