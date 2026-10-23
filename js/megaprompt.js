/* ==========================================================
   MEGA PROMPT DEL PROYECTO (solo equipo)
   Junta TODO lo que ha pedido el cliente (cuestionario, plan, extras,
   diseño, dominio, contenido, cambios, mensajes y notas internas) y
   Gemini lo convierte en un prompt completo para crear su web.
   Si la IA no está disponible, se genera igualmente una versión
   ordenada sin IA (también funciona en el modo demo).
   ========================================================== */
import { CONFIG, PLANES, EXTRAS } from '../config.js';
import { plantillaPorId } from './plantillas.js';
import * as store from './store.js';
import { $, esc, icono, toast, abrir, copiar, descargar, ocupado, refPedido, euros, cargandoHTML } from './ui.js';
import { catalogo } from './asistente.js';

const limpio = v => String(v ?? '').trim();

/** Reúne los datos del proyecto en un objeto compacto (lo que se envía a la IA) */
async function reunir(p) {
  const [mensajes, archivos] = await Promise.all([
    store.mensajesDe(p.id).catch(() => []),
    store.listarArchivos(p.id).catch(() => [])
  ]);
  const r = p.respuestas || {};
  const plan = PLANES.find(x => x.id === p.plan);
  const pl = plantillaPorId(p.plantilla);
  const c = p.contenido || {};
  return {
    referencia: refPedido(p.id),
    negocio: { nombre: r.negocio, sector: r.sector, objetivo: r.objetivo, webActual: r.webActual, telefonoContacto: r.telefono },
    plan: { nombre: p.planNombre, incluye: plan?.incluye || [], descripcion: plan?.desc || '', plazo: plan?.entrega || '', urgente: !!p.urgente },
    extras: (p.extras || []).map(x => x.nombre + (x.mensual ? ' (mensual)' : '')),
    diseno: { base: pl ? `${pl.nombre} (${pl.sector})` : 'A medida', estilo: r.estilo, colorPrincipal: r.color, logo: r.logo },
    contenido: { estadoSegunCuestionario: r.contenido, sobreElNegocio: c.sobre, serviciosYPrecios: c.servicios, horarioYDireccion: c.horario, redes: c.redes, enlaceFotos: c.fotos, enlaceLogo: c.logo },
    dominio: p.dominio ? `${p.dominio.nombre} (${p.dominio.tipo === 'propio' ? 'ya es del cliente' : 'registrar nuevo'})` : '',
    comentariosDelCliente: r.comentarios,
    cambiosPedidos: (p.revision?.comentarios || []).map(x => x.texto),
    mensajesDelCliente: mensajes.filter(m => m.rol === 'client' || m.uid === p.uid).slice(-25).map(m => m.texto),
    archivosSubidos: archivos.map(a => a.nombre).slice(0, 40),
    notasInternas: (p.notas || []).map(n => n.texto).slice(-15),
    vistaPrevia: p.urlVista || '',
    publicada: p.urlWeb || ''
  };
}

/** Versión sin IA: ordenada y lista para pegar */
function promptLocal(d) {
  const L = [], add = (t = '') => L.push(t);
  const linea = (k, v) => { if (limpio(v)) add(`- ${k}: ${limpio(v)}`); };
  const lista = (titulo, arr) => { const a = (arr || []).map(limpio).filter(Boolean); if (a.length) { add(`\n## ${titulo}`); a.forEach(x => add(`- ${x}`)); } };
  const pend = v => limpio(v) || '[PENDIENTE: pedir al cliente]';
  add(`# Encargo: web para «${pend(d.negocio.nombre)}» (${d.referencia})`);
  add('\nActúa como diseñador y desarrollador web senior. Crea una web profesional, moderna y rápida para este negocio, en español de España, siguiendo exactamente estos requisitos. No inventes datos del negocio (precios, direcciones, opiniones, cifras): donde falte algo, deja un marcador claro como [PENDIENTE: …].');
  add('\n## Negocio');
  linea('Nombre', pend(d.negocio.nombre)); linea('Sector', d.negocio.sector); linea('Objetivo principal de la web', d.negocio.objetivo);
  linea('Web actual (como referencia)', d.negocio.webActual); linea('Teléfono de contacto (confirmar si se publica)', d.negocio.telefonoContacto);
  add('\n## Tipo de web y alcance');
  linea('Plan', d.plan.nombre); linea('Descripción', d.plan.descripcion);
  if (d.plan.incluye.length) linea('Debe incluir', d.plan.incluye.join(', '));
  linea('Plazo', d.plan.plazo + (d.plan.urgente ? ' — URGENTE' : ''));
  lista('Extras contratados', d.extras);
  add('\n## Diseño');
  linea('Diseño de partida', d.diseno.base); linea('Estilo', d.diseno.estilo); linea('Color principal', d.diseno.colorPrincipal); linea('Logotipo', d.diseno.logo);
  add('\n## Contenido');
  linea('Estado del contenido', d.contenido.estadoSegunCuestionario);
  linea('Sobre el negocio', pend(d.contenido.sobreElNegocio)); linea('Servicios y precios', pend(d.contenido.serviciosYPrecios));
  linea('Horario y dirección', d.contenido.horarioYDireccion); linea('Redes sociales', d.contenido.redes);
  linea('Fotos (enlace)', d.contenido.enlaceFotos); linea('Logotipo (enlace)', d.contenido.enlaceLogo);
  lista('Archivos subidos por el cliente', d.archivosSubidos);
  if (limpio(d.dominio)) { add('\n## Dominio'); add(`- ${d.dominio}`); }
  if (limpio(d.comentariosDelCliente)) { add('\n## Lo que pidió el cliente con sus palabras'); add(limpio(d.comentariosDelCliente)); }
  lista('Cambios que ha pedido en la revisión', d.cambiosPedidos);
  lista('Mensajes del cliente (lo más reciente al final)', d.mensajesDelCliente);
  lista('Notas internas del equipo', d.notasInternas);
  add('\n## Requisitos técnicos');
  ['Diseño adaptado primero al móvil y perfecto en ordenador, sin desbordes laterales.',
    'Carga rápida: imágenes optimizadas (WebP, lazy-load), sin librerías innecesarias.',
    'SEO básico: título y descripción por página, encabezados ordenados, datos estructurados de negocio local si aplica, textos alternativos en imágenes.',
    'Accesibilidad: contraste suficiente, navegación con teclado, etiquetas en formularios.',
    'Legal (España/RGPD): aviso legal, política de privacidad y de cookies; casilla de aceptación en formularios.',
    'Llamadas a la acción claras según el objetivo del negocio (contactar, reservar o comprar).'
  ].forEach(x => add(`- ${x}`));
  add('\n## Entrega');
  add('- Código limpio y comentado, listo para publicar. Indica al final qué datos quedan [PENDIENTE] para pedírselos al cliente.');
  return L.join('\n');
}

/* ---------- Ventana ---------- */
let dlg;
function crear() {
  dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.id = 'mpDlg';
  dlg.innerHTML = `<div class="dlg-box mp-dlg"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="mpBody"></div></div>`;
  document.body.appendChild(dlg);
}

export async function abrirMegaPrompt(p) {
  if (!dlg) crear();
  const body = $('#mpBody', dlg);
  const titulo = `<h2 class="dlg-h">${icono('sparkle')} Mega prompt</h2><p class="muted mp-sub">${esc(p.respuestas?.negocio || p.planNombre)} · ${refPedido(p.id)}</p>`;
  body.innerHTML = titulo + cargandoHTML('Reuniendo todo lo que ha pedido el cliente…');
  abrir(dlg);
  let datos;
  try { datos = await reunir(p); } catch (e) { datos = null; }
  if (!datos) { body.innerHTML = titulo + `<p class="muted">No se han podido reunir los datos del pedido.</p>`; return; }

  const pintar = (texto, conIA, aviso = '') => {
    body.innerHTML = `${titulo}
      <p class="mp-tag ${conIA ? 'ia' : ''}">${icono(conIA ? 'sparkle' : 'file')} ${conIA ? 'Redactado por Gemini con todo lo que ha pedido el cliente' : 'Versión ordenada sin IA'}${aviso ? ` · ${esc(aviso)}` : ''}</p>
      <textarea class="mp-texto" id="mpTexto" spellcheck="false" aria-label="Mega prompt">${esc(texto)}</textarea>
      <div class="mp-btns">
        <button type="button" class="btn btn-primary" id="mpCopiar">${icono('copy')}<span>Copiar</span></button>
        <button type="button" class="btn btn-ghost" id="mpBajar">${icono('download')}<span>Descargar</span></button>
        ${store.iaDisponible() ? `<button type="button" class="btn btn-ghost" id="mpOtra">${icono('refresh')}<span>${conIA ? 'Otra versión' : 'Probar con IA'}</span></button>` : ''}
      </div>
      <p class="muted mp-nota">Puedes editar el texto antes de copiarlo. Revísalo: la IA solo usa los datos del pedido y marca como [PENDIENTE] lo que falta.</p>`;
    $('#mpCopiar', body).addEventListener('click', () => copiar($('#mpTexto', body).value));
    $('#mpBajar', body).addEventListener('click', () => descargar(`prompt-${(p.respuestas?.negocio || 'web').toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}.txt`, $('#mpTexto', body).value));
    $('#mpOtra', body)?.addEventListener('click', e => generar(e.currentTarget));
  };

  async function generar(btn) {
    if (!store.iaDisponible()) return pintar(promptLocal(datos), false, 'IA no disponible en el modo demo');
    if (btn) ocupado(btn, true); else body.innerHTML = titulo + cargandoHTML('Gemini está redactando el prompt…');
    try {
      const r = await store.preguntarIA({ modo: 'prompt', pedido: datos, catalogo: catalogo(), mensajes: [{ rol: 'user', texto: 'prompt' }] });
      if (!limpio(r?.prompt)) throw new Error('vacío');
      pintar(r.prompt, true);
    } catch (e) {
      console.warn('Mega prompt con IA no disponible', e);
      pintar(promptLocal(datos), false, 'la IA no ha respondido, revisa la función «asistente» en Supabase');
    }
  }
  generar();
}
