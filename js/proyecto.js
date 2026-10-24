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
  return p.plantilla ? `plantilla.html?t=${encodeURIComponent(p.plantilla)}&n=${encodeURIComponent(r.negocio || '')}&c=${encodeURIComponent(r.color || '')}` : '';
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
    const url = urlVistaPrevia(p);
    return `${cab}
    <div class="ac-form" data-id="${id}">
      ${p.webIA?.id ? `<button type="button" class="btn btn-primary btn-fill" data-ver-web="${id}"><span>Ver la propuesta de tu web</span>${icono('eye')}</button>` : ''}
      ${url && !(p.webIA?.id && !p.urlVista) ? `<a class="btn btn-ghost btn-fill" href="${esc(url)}" target="_blank" rel="noopener"><span>Abrir la vista previa</span>${icono('external')}</a>` : ''}
      ${(rv.comentarios || []).length ? `<div class="ac-hist">${rv.comentarios.map(c => `<p><small>${haceCuanto(c.t)}</small>${esc(c.texto)}</p>`).join('')}</div>` : ''}
      ${rv.estado === 'cambios' ? `<p class="ac-nota">${icono('clock')} Hemos recibido tus cambios. Te avisaremos cuando estén aplicados.</p>` : ''}
      <form data-form="cambios" data-id="${id}" novalidate>
        ${campo({ id: `cambios-${id}`, name: 'texto', label: 'Cambios que quieres hacer', type: 'textarea' })}
        <div class="ac-btns">
          <button class="btn btn-primary" type="button" data-aprobar-web="${id}"><span>Aprobar la web</span>${icono('check')}</button>
          <button class="btn btn-ghost" type="submit"><span>Enviar cambios</span></button>
        </div>
      </form>
    </div>`;
  }

  if (et === 'pago') {
    return `${cab}<div class="ac-form"><div class="mp-pay">${botonPagoHTML}</div>${p.webIA?.id ? `<button type="button" class="btn btn-ghost btn-fill" data-ver-web="${id}"><span>Ver la web aprobada</span>${icono('eye')}</button>` : ''}</div>`;
  }

  if (et === 'publicada') {
    return `${cab}<div class="ac-form">
      ${p.urlWeb ? `<a class="btn btn-primary" href="${esc(p.urlWeb)}" target="_blank" rel="noopener"><span>Visitar mi web</span>${icono('external')}</a>` : ''}
      ${!p.resenada ? `<button class="btn btn-ghost mp-rate" data-valorar="${id}">${icono('star')} Valorar el servicio</button>` : '<p class="ac-nota">Gracias por tu valoración.</p>'}
    </div>`;
  }

  // recibido / diseño: información y, si toca, el pago de la señal
  const pl = plantillaPorId(p.plantilla);
  return `${cab}<div class="ac-form">
    ${et === 'recibido' ? `<div class="mp-pay">${botonPagoHTML}</div>` : ''}
    ${et === 'recibido' && (p.pagoEstado || 'pendiente') === 'pendiente' ? (p.cancelacion ? `<p class="ac-nota">${icono('clock')} Has pedido cancelar este pedido. Te confirmaremos la cancelación por correo.</p>` : `<button type="button" class="link-btn ac-cancel" data-cancelar="${id}">Solicitar la cancelación del pedido</button>`) : ''}
    ${et === 'diseno' && pl ? `<a class="btn btn-ghost" href="${esc(urlVistaPrevia(p))}" target="_blank" rel="noopener"><span>Ver el diseño de partida (${esc(pl.nombre)})</span>${icono('external')}</a>` : ''}
  </div>`;
}

/* Preguntas extra del contenido (todas opcionales): lo que más mejora una web y casi nunca se cuenta */
export const MAS_CONTENIDO = [
  ['publico', '¿A quién te diriges?', 'Edad, zona, qué buscan, por qué te eligen'],
  ['diferencia', '¿Qué te diferencia de la competencia?', 'Experiencia, especialidad, garantía, trato, precio…'],
  ['accion', '¿Qué quieres que haga quien visita tu web?', 'Llamarte, escribirte por WhatsApp, reservar, comprar, pedir presupuesto…', 'text'],
  ['contactoWeb', 'Teléfono, email y WhatsApp que se publican en la web', 'Pueden ser distintos de los del pedido', 'text'],
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
    return { revision: { estado: 'cambios', comentarios: [...(rv.comentarios || []), { texto, t: Date.now() }], t: Date.now() } };
  }
  return null;
}
export const aprobarWeb = p => ({ revision: { ...(p.revision || {}), estado: 'aprobada', t: Date.now() }, etapa: 'pago' });

/* ---------- Vista del equipo (panel) ---------- */
export function entregasCliente(p) {
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
      <div class="ent-h">${icono('eye')}<b>Revisión</b><small>${rv?.estado === 'aprobada' ? 'Aprobada' : rv?.estado === 'cambios' ? 'Pide cambios' : 'Sin respuesta'}</small></div>
      ${(rv?.comentarios || []).map(x => `<div class="ent-b"><small>${haceCuanto(x.t)}</small><p>${esc(x.texto)}</p></div>`).join('')}
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
