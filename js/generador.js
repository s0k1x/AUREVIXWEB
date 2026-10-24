/* ==========================================================
   CREAR LA WEB DEL CLIENTE CON IA (solo equipo)
   Gemini (modelo avanzado, solo para esto) mira TODO lo que ha pedido
   el cliente —cuestionario, plan, extras, diseño elegido, contenido,
   mensajes, cambios— y los archivos que ha subido (fotos, logotipo,
   PDF, textos) y crea la web en un solo HTML:
     1. Plan: analiza el pedido desde muchos puntos de vista
     2. Web: escribe el HTML completo
     3. Revisión: la repasa como cliente, visitante, diseñador, redactor,
        SEO, accesibilidad, rendimiento y legal, y aplica las mejoras
   Cada versión se guarda (tabla webs_ia) y se descarga en .zip con
   las fotos del cliente ya colocadas en la carpeta img/.
   ========================================================== */
import { PLANTILLAS, plantillaPorId } from './plantillas.js';
import * as store from './store.js';
import { $, $$, esc, icono, toast, abrir, copiar, descargar, ocupado, refPedido, cargandoHTML, haceCuanto } from './ui.js';
import { reunir } from './megaprompt.js';
import { ETAPAS, etapaDe, estadoParaEtapa } from './proyecto.js';

/* ---------- Utilidades ---------- */
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'archivo';
const ext = n => (String(n).match(/\.([a-z0-9]{2,5})$/i)?.[1] || '').toLowerCase();
const esImagen = a => /^image\/(png|jpe?g|webp|gif|heic|heif|avif)/i.test(a.tipo) || /^(png|jpe?g|webp|gif|heic|heif|avif)$/.test(ext(a.nombre));
const esSvg = a => /svg/i.test(a.tipo) || ext(a.nombre) === 'svg';
const esPdf = a => /pdf/i.test(a.tipo) || ext(a.nombre) === 'pdf';
const esTexto = a => /^text\//i.test(a.tipo) || /^(txt|md|csv|json)$/.test(ext(a.nombre));
const kb = n => `${(n / 1024).toFixed(n < 10240 ? 1 : 0).replace('.', ',')} KB`;
const pexels = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

/** Copia del diseño de partida con las fotos convertidas en direcciones reales */
function plantillaParaIA(pl) {
  if (!pl) return null;
  const fotos = [];
  const pasar = v => {
    if (typeof v === 'number' && v >= 100000) { const u = pexels(v); fotos.push(u); return u; }
    if (Array.isArray(v)) return v.map(pasar);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pasar(x)]));
    return v;
  };
  return { diseno: pasar(pl), fotos: [...new Set(fotos)] };
}
function fotosEjemplo(pl) {
  if (pl) return plantillaParaIA(pl).fotos.map(url => ({ url, de: `${pl.nombre} (${pl.sector})` }));
  return PLANTILLAS.flatMap(t => plantillaParaIA(t).fotos.slice(0, 6).map(url => ({ url, de: t.sector }))).slice(0, 40);
}

function aBase64(blob) {
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = mal; r.readAsDataURL(blob); });
}
/** Reduce una foto para que la IA la vea rápido (máx. 1400 px) */
async function fotoReducida(url, max = 1400) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.84).split(',')[1];
}

/** Prepara los archivos del cliente: ruta en la web, url para la vista previa y lo que ve la IA */
async function prepararArchivos(lista) {
  let n = 0;
  return Promise.all(lista.map(async a => {
    const visual = esImagen(a) || esSvg(a);
    const ruta = visual ? `img/${++n}-${slug(a.nombre.replace(/\.[^.]+$/, ''))}.${ext(a.nombre) || 'jpg'}` : '';
    let url = '';
    try { url = await store.urlArchivo(a); } catch { /* sin acceso */ }
    return { a, ruta, url, visual, incluir: true };
  }));
}
async function paraIA(x) {
  const base = { nombre: x.a.nombre, ruta: x.ruta || undefined, mime: x.a.tipo || 'application/octet-stream' };
  if (!x.url) return base;
  try {
    if (esImagen(x.a)) {
      if (/png/i.test(x.a.tipo) && x.a.tam < 1.5e6) return { ...base, mime: 'image/png', datos: await aBase64(await (await fetch(x.url)).blob()) };
      return { ...base, mime: 'image/jpeg', datos: await fotoReducida(x.url) };
    }
    if (esPdf(x.a) && x.a.tam < 6e6) return { ...base, mime: 'application/pdf', datos: await aBase64(await (await fetch(x.url)).blob()) };
    if (esSvg(x.a) || esTexto(x.a)) return { ...base, texto: (await (await fetch(x.url)).text()).slice(0, 20000) };
  } catch (e) { console.warn('No se pudo leer', x.a.nombre, e); }
  return base;
}

const quitarVallas = t => String(t || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '').trim();
function leerJSON(t) {
  const s = quitarVallas(t);
  try { return JSON.parse(s); } catch { /* sigue */ }
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i >= 0 && j > i) return JSON.parse(s.slice(i, j + 1));
  throw new Error('La IA no ha devuelto un formato válido. Vuelve a intentarlo.');
}
function leerHTML(t) {
  const s = quitarVallas(t);
  const i = s.search(/<!doctype html|<html/i);
  const j = s.toLowerCase().lastIndexOf('</html>');
  return (i >= 0 ? s.slice(i, j > i ? j + 7 : undefined) : s).trim();
}

/** Aplica cambios {buscar, reemplazar}; si no coincide exacto, prueba ignorando espacios */
export function aplicarCambios(html, cambios = []) {
  let aplicados = 0;
  const fallidos = [];
  for (const c of cambios) {
    if (!c?.buscar || typeof c.reemplazar !== 'string' || c.buscar === c.reemplazar) continue;
    const i = html.indexOf(c.buscar);
    if (i >= 0) { html = html.slice(0, i) + c.reemplazar + html.slice(i + c.buscar.length); aplicados++; continue; }
    const re = new RegExp(c.buscar.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
    const m = html.match(re);
    if (m) { html = html.slice(0, m.index) + c.reemplazar + html.slice(m.index + m[0].length); aplicados++; }
    else fallidos.push(c.motivo || c.buscar.slice(0, 60));
  }
  return { html, aplicados, fallidos };
}

/* ---------- ZIP (sin compresión, compatible con todo) ---------- */
const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function crearZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let pos = 0;
  const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of archivos) {
    const nombre = enc.encode(f.nombre), datos = typeof f.datos === 'string' ? enc.encode(f.datos) : new Uint8Array(f.datos);
    const crc = crc32(datos);
    const loc = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, dia, 2], [14, crc, 4], [18, datos.length, 4], [22, datos.length, 4], [26, nombre.length, 2], [28, 0, 2]]
      .forEach(([o, v, n]) => (n === 4 ? loc.setUint32(o, v, true) : loc.setUint16(o, v, true)));
    partes.push(loc.buffer, nombre, datos);
    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, dia, 2], [16, crc, 4], [20, datos.length, 4], [24, datos.length, 4], [28, nombre.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
      .forEach(([o, v, n]) => (n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    central.push(cen.buffer, nombre);
    pos += 30 + nombre.length + datos.length;
  }
  const tamCentral = central.reduce((s, b) => s + (b.byteLength ?? b.length), 0);
  const fin = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, archivos.length, 2], [10, archivos.length, 2], [12, tamCentral, 4], [16, pos, 4], [20, 0, 2]]
    .forEach(([o, v, n]) => (n === 4 ? fin.setUint32(o, v, true) : fin.setUint16(o, v, true)));
  return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
}

/* ---------- Ventana ---------- */
let dlg, estado = null, cancelar = null;
const PASOS = [
  ['plan', 'Analizando todo lo que ha pedido el cliente', 'Pedido, mensajes, fotos, logotipo y documentos, desde 9 puntos de vista'],
  ['html', 'Diseñando y escribiendo la web', 'Un solo archivo HTML, móvil primero'],
  ['revisar', 'Revisión de calidad', 'Cliente, visitante, diseño, textos, SEO, accesibilidad, rendimiento y legal'],
  ['guardar', 'Aplicando mejoras y guardando la versión', '']
];
const AREAS = { general: 'General', cliente: 'Lo que pidió', movil: 'Móvil', diseno: 'Diseño', textos: 'Textos', seo: 'SEO', accesibilidad: 'Accesibilidad', rendimiento: 'Rendimiento', legal: 'Legal' };

function crearVentana() {
  dlg = document.createElement('dialog');
  dlg.className = 'dlg dlg-ancho dlg-gw';
  dlg.id = 'gwDlg';
  dlg.dataset.backdrop = 'no';
  dlg.innerHTML = `<div class="dlg-box gw"><button class="dlg-x" data-close aria-label="Cerrar">${icono('x')}</button><div id="gwBody"></div></div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => cancelar?.abort());
}
const cuerpo = () => $('#gwBody', dlg);
const cabecera = sub => `<header class="gw-h"><span class="gw-ic">${icono('sparkle')}</span><div><h2>Crear la web con IA</h2><p class="muted">${esc(sub)}</p></div></header>`;

export async function abrirGeneradorWeb(p) {
  if (!dlg) crearVentana();
  const sub = `${p.respuestas?.negocio || p.planNombre || 'Proyecto'} · ${refPedido(p.id)}`;
  cuerpo().innerHTML = cabecera(sub) + cargandoHTML('Reuniendo el pedido, los mensajes y los archivos del cliente…');
  abrir(dlg);
  try {
    const [datos, lista, versiones] = await Promise.all([
      reunir(p),
      store.listarArchivos(p.id).catch(() => []),
      store.websIA(p.id).catch(() => [])
    ]);
    const pl = plantillaPorId(p.plantilla);
    estado = { p, sub, datos, pl, archivos: await prepararArchivos(lista), versiones, actual: versiones[0] || null };
  } catch (e) {
    cuerpo().innerHTML = cabecera(sub) + `<p class="muted">No se han podido reunir los datos: ${esc(e.message)}</p>`;
    return;
  }
  estado.actual ? pintarResultado() : pintarInicio();
}

/* ---------- 1. Pantalla de inicio ---------- */
function pintarInicio() {
  const { archivos, pl, datos, versiones } = estado;
  const tipoArchivo = a => esImagen(a) ? 'Foto' : esSvg(a) ? 'Logotipo / SVG' : esPdf(a) ? 'PDF' : esTexto(a) ? 'Texto' : 'Archivo';
  cuerpo().innerHTML = `${cabecera(estado.sub)}
    <div class="gw-ini">
      <section class="gw-card">
        <h3>${icono('brain')} Lo que va a tener en cuenta</h3>
        <ul class="gw-check">
          <li>${icono('check')} Cuestionario: <b>${esc(datos.negocio.nombre || 'sin nombre')}</b>${datos.negocio.sector ? ` · ${esc(datos.negocio.sector)}` : ''}${datos.negocio.objetivo ? ` · ${esc(datos.negocio.objetivo)}` : ''}</li>
          <li>${icono('check')} Plan <b>${esc(datos.plan.nombre || '—')}</b>${datos.extras.length ? ` + ${datos.extras.length} extra${datos.extras.length > 1 ? 's' : ''}` : ''}</li>
          <li>${icono('check')} Diseño: <b>${pl ? `${esc(pl.nombre)} (predeterminado, adaptado a su marca)` : 'a medida, desde cero'}</b></li>
          <li>${icono('check')} ${datos.mensajesDelCliente.length} mensajes, ${datos.cambiosPedidos.length} cambios pedidos y ${datos.notasInternas.length} notas del equipo</li>
        </ul>
      </section>
      <section class="gw-card">
        <h3>${icono('image')} Archivos del cliente <small class="muted">(la IA los mira uno a uno)</small></h3>
        ${archivos.length ? `<div class="gw-arch">${archivos.map((x, i) => `
          <label class="gw-a">
            <input type="checkbox" data-i="${i}" ${x.incluir ? 'checked' : ''}>
            ${x.visual && x.url ? `<img src="${esc(x.url)}" alt="" loading="lazy">` : `<span class="gw-a-ic">${icono(esPdf(x.a) ? 'file' : 'paperclip')}</span>`}
            <span><b>${esc(x.a.nombre)}</b><small>${tipoArchivo(x.a)}${x.ruta ? ` · ${esc(x.ruta)}` : ''}</small></span>
          </label>`).join('')}</div>`
        : `<p class="muted">El cliente aún no ha subido archivos. La IA usará fotos de ejemplo del diseño y marcará como [PENDIENTE] lo que falte.</p>`}
      </section>
      <section class="gw-card">
        <h3>${icono('pen')} Indicaciones para la IA <small class="muted">(opcional)</small></h3>
        <textarea id="gwInd" rows="3" placeholder="Ej.: que la portada tenga vídeo de fondo, tono más juvenil, añade sección de preguntas frecuentes…"></textarea>
        <label class="gw-sw"><input type="checkbox" id="gwRev" checked><span><b>Revisión de calidad automática</b><small>La repasa desde 9 puntos de vista y aplica las mejoras (tarda un poco más)</small></span></label>
      </section>
      <div class="gw-acc">
        ${versiones.length ? `<button type="button" class="btn btn-ghost" id="gwVolver">${icono('history')}<span>Ver versiones (${versiones.length})</span></button>` : ''}
        <button type="button" class="btn btn-primary" id="gwIr" ${store.iaDisponible() ? '' : 'disabled'}>${icono('sparkle')}<span>Crear la web</span></button>
      </div>
      ${store.iaDisponible() ? `<p class="muted gw-nota">Usa el modelo avanzado de Gemini solo para crear la web. Tarda entre 2 y 6 minutos: puedes seguir en el panel, pero no cierres esta ventana.</p>`
        : `<p class="muted gw-nota">${icono('alert')} En el modo demo no hay IA. Funciona con tu Supabase y la clave de Gemini (ver LEEME, sección 19).</p>`}
    </div>`;
  $$('.gw-a input', cuerpo()).forEach(c => c.addEventListener('change', () => { estado.archivos[+c.dataset.i].incluir = c.checked; }));
  $('#gwVolver', cuerpo())?.addEventListener('click', () => { estado.actual = estado.versiones[0]; pintarResultado(); });
  $('#gwIr', cuerpo()).addEventListener('click', () => crear({ indicaciones: $('#gwInd', cuerpo()).value.trim(), revisar: $('#gwRev', cuerpo()).checked }));
}

/* ---------- 2. Progreso ---------- */
function pintarProgreso(pasos) {
  cuerpo().innerHTML = `${cabecera(estado.sub)}
    <ol class="gw-pasos">${pasos.map(([k, t, s]) => `<li data-paso="${k}"><span class="gw-p-ic"></span><div><b>${t}</b>${s ? `<small>${s}</small>` : ''}<p class="gw-vivo" aria-live="polite"></p></div></li>`).join('')}</ol>
    <div class="gw-piensa" hidden><small>${icono('brain')} Lo que está pensando la IA</small><p id="gwPiensa"></p></div>
    <div class="gw-acc"><button type="button" class="btn btn-ghost" id="gwCancelar">${icono('x')}<span>Cancelar</span></button></div>`;
  $('#gwCancelar', cuerpo()).addEventListener('click', () => cancelar?.abort());
}
function paso(k, estadoPaso, texto = '') {
  const li = $(`[data-paso="${k}"]`, cuerpo());
  if (!li) return;
  li.className = estadoPaso;
  if (texto !== null) $('.gw-vivo', li).textContent = texto;
}
let ultimoPensar = 0;
function pensando(t) {
  const caja = $('.gw-piensa', cuerpo());
  if (!caja || Date.now() - ultimoPensar < 400) return;
  ultimoPensar = Date.now();
  caja.hidden = false;
  const limpio = t.replace(/\*\*/g, '').trim();
  if (limpio) $('#gwPiensa', cuerpo()).textContent = limpio.length > 320 ? limpio.slice(0, 320) + '…' : limpio;
}

async function crear({ indicaciones = '', revisar = true } = {}) {
  const { p, datos, pl } = estado;
  cancelar = new AbortController();
  const senal = cancelar.signal;
  const pasos = PASOS.filter(([k]) => revisar || k !== 'revisar');
  pintarProgreso(pasos);
  const plantilla = plantillaParaIA(pl)?.diseno || null;
  const ejemplos = fotosEjemplo(pl);
  const elegidos = estado.archivos.filter(x => x.incluir);
  try {
    // 1. Plan
    paso('plan', 'activo', 'Preparando fotos y documentos…');
    const archivosIA = await Promise.all(elegidos.map(paraIA));
    paso('plan', 'activo', `Analizando ${elegidos.length} archivo${elegidos.length === 1 ? '' : 's'} y el pedido…`);
    const r1 = await store.iaWeb({ modo: 'web-plan', pedido: datos, plantilla, fotosEjemplo: ejemplos, archivos: archivosIA, indicaciones },
      { senal, alPensar: pensando, alTexto: (_, todo) => paso('plan', 'activo', `Escribiendo el plan · ${kb(todo.length)}`) });
    const plan = leerJSON(r1.texto);
    paso('plan', 'hecho', `${plan.secciones?.length || 0} secciones · ${plan.perspectivas?.length || 0} puntos de vista · ${plan.pendientes?.length || 0} pendientes`);

    // 2. Web
    paso('html', 'activo', 'Empezando…');
    const imagenes = (plan.imagenes?.length ? plan.imagenes : elegidos.filter(x => x.ruta).map(x => ({ ruta: x.ruta, muestra: x.a.nombre })));
    const negocio = { ...datos.negocio, dominio: datos.dominio, contenido: datos.contenido };
    const r2 = await store.iaWeb({ modo: 'web-html', plan, negocio, plantilla, imagenes, fotosEjemplo: ejemplos, indicaciones },
      { senal, alPensar: pensando, alTexto: (_, todo) => paso('html', 'activo', `Escribiendo la web · ${kb(todo.length)}`) });
    let html = leerHTML(r2.texto);
    if (!/<\/html>/i.test(html)) throw new Error('La web ha salido cortada. Vuelve a intentarlo (o quita algún archivo).');
    paso('html', 'hecho', `${kb(html.length)} · ${r2.modelo || ''}`);

    // 3. Revisión
    let revision = null, aplicados = 0, fallidos = [];
    if (revisar) {
      paso('revisar', 'activo', 'Revisando…');
      try {
        const r3 = await store.iaWeb({ modo: 'web-revisar', pedido: datos, plan, html, indicaciones },
          { senal, alPensar: pensando, alTexto: (_, todo) => paso('revisar', 'activo', `Anotando mejoras · ${kb(todo.length)}`) });
        revision = leerJSON(r3.texto);
        ({ html, aplicados, fallidos } = aplicarCambios(html, revision.cambios));
        paso('revisar', 'hecho', `Nota ${revision.notas?.general ?? '—'}/10 · ${aplicados} mejora${aplicados === 1 ? '' : 's'} aplicada${aplicados === 1 ? '' : 's'}`);
      } catch (e) {
        if (senal.aborted) throw e;
        paso('revisar', 'error', `No se pudo revisar (${e.message}). Se guarda la web sin revisar.`);
      }
    }

    // 4. Guardar
    paso('guardar', 'activo', '');
    const version = {
      html, plan, modelo: r2.modelo, indicaciones, conRevision: !!revision,
      revision: revision ? { notas: revision.notas, informe: revision.informe, pendientes: revision.pendientes, aplicados, fallidos } : null,
      imagenes: elegidos.filter(x => x.ruta).map(x => ({ ruta: x.ruta, archivo: x.a.ruta, nombre: x.a.nombre }))
    };
    let guardada;
    try { guardada = await store.guardarWebIA(p.id, version); }
    catch (e) {
      guardada = { ...version, id: 'local-' + Date.now(), createdAt: Date.now(), sinGuardar: true };
      toast('La web se ha creado pero no se ha podido guardar. ¿Has ejecutado actualizacion-v26.sql en Supabase?', 'err');
    }
    paso('guardar', 'hecho', '');
    estado.versiones = [guardada, ...estado.versiones];
    estado.actual = guardada;
    pintarResultado();
    toast('Web creada');
  } catch (e) {
    if (senal.aborted) { toast('Cancelado'); return pintarInicio(); }
    console.error(e);
    const li = $('li.activo', cuerpo());
    if (li) { li.className = 'error'; $('.gw-vivo', li).textContent = e.message; }
    $('.gw-acc', cuerpo()).innerHTML = `<button type="button" class="btn btn-ghost" id="gwAtras">${icono('undo')}<span>Volver</span></button><button type="button" class="btn btn-primary" id="gwReintentar">${icono('refresh')}<span>Reintentar</span></button>`;
    $('#gwAtras', cuerpo()).addEventListener('click', pintarInicio);
    $('#gwReintentar', cuerpo()).addEventListener('click', () => crear({ indicaciones, revisar }));
  } finally { cancelar = null; }
}

/* ---------- 3. Resultado ---------- */
let pestana = 'vista', dispositivo = 'movil';
function conFotos(html) {
  // En la vista previa, las rutas img/... apuntan a los archivos reales del cliente
  for (const x of estado.archivos) if (x.ruta && x.url) html = html.split(x.ruta).join(x.url);
  return html;
}

function pintarResultado() {
  const v = estado.actual;
  if (!v) return pintarInicio();
  const rev = v.revision;
  const pend = [...new Set([...(v.plan?.pendientes || []), ...(rev?.pendientes || [])])];
  const compartida = estado.p.webIA?.id === v.id;
  // Cambios que ha pedido el cliente desde que vio la última propuesta
  const desde = estado.p.webIA?.t || 0;
  const delCliente = (estado.p.revision?.comentarios || []).filter(c => (c.t || 0) > desde).map(c => c.texto).filter(Boolean);
  cuerpo().innerHTML = `${cabecera(estado.sub)}
    <div class="gw-barra">
      <label class="fc-select gw-ver"><span>Versión</span>
        <select id="gwVer">${estado.versiones.map((x, i) => `<option value="${i}" ${x === v ? 'selected' : ''}>v${estado.versiones.length - i} · ${x.createdAt ? haceCuanto(x.createdAt) : ''}${x.retoque ? ' · retoque' : ''}${x.sinGuardar ? ' · sin guardar' : ''}</option>`).join('')}</select></label>
      <div class="gw-botones">
        <button type="button" class="btn btn-primary" id="gwZip">${icono('download')}<span>Descargar .zip</span></button>
        <button type="button" class="btn btn-ghost" id="gwCopiar">${icono('copy')}<span>Copiar HTML</span></button>
        <button type="button" class="btn btn-ghost" id="gwAbrir">${icono('external')}<span>Abrir</span></button>
        <button type="button" class="btn btn-ghost gw-env ${compartida ? 'on' : ''}" id="gwEnviar" ${v.sinGuardar ? 'disabled' : ''}>${icono(compartida ? 'check' : 'send')}<span>${compartida ? 'Enviada al cliente' : 'Enviar al cliente'}</span></button>
      </div>
    </div>
    <nav class="gw-tabs" role="tablist">
      ${[['vista', 'Vista previa', 'eye'], ['informe', 'Informe', 'chart'], ['plan', 'Plan', 'brain'], ['codigo', 'Código', 'file']]
        .map(([k, t, ic]) => `<button type="button" role="tab" data-gwt="${k}" class="${pestana === k ? 'on' : ''}">${icono(ic)}<span>${t}</span>${k === 'informe' && rev?.notas?.general != null ? `<i class="gw-n">${Number(rev.notas.general).toLocaleString('es-ES', { maximumFractionDigits: 1 })}</i>` : ''}</button>`).join('')}
    </nav>
    <div id="gwPanel"></div>
    <section class="gw-card gw-cambios">
      <h3>${icono('pen')} Pedir cambios a la IA</h3>
      ${delCliente.length ? `<button type="button" class="gw-cli" id="gwUsarCli">${icono('message')}<span><b>El cliente ha pedido ${delCliente.length} cambio${delCliente.length > 1 ? 's' : ''}</b><small>Pulsa para pasárselos a la IA</small></span></button>` : ''}
      <textarea id="gwPeticion" rows="2" placeholder="Ej.: pon la sección de precios antes de la galería y el botón de reservar más grande"></textarea>
      <div class="gw-acc">
        <button type="button" class="btn btn-ghost" id="gwRevisar" ${store.iaDisponible() ? '' : 'disabled'}>${icono('shield')}<span>Revisar otra vez</span></button>
        <button type="button" class="btn btn-ghost" id="gwNueva">${icono('refresh')}<span>Crear de nuevo</span></button>
        <button type="button" class="btn btn-primary" id="gwRetocar" ${store.iaDisponible() ? '' : 'disabled'}>${icono('sparkle')}<span>Aplicar cambios</span></button>
      </div>
      <p class="gw-vivo" id="gwRetVivo" aria-live="polite"></p>
    </section>
    ${pend.length ? `<p class="gw-pend">${icono('alert')} <span><b>${pend.length} dato${pend.length > 1 ? 's' : ''} pendiente${pend.length > 1 ? 's' : ''}</b> que pedir al cliente: búscalos como [PENDIENTE] en la web. Están en «Informe».</span></p>` : ''}`;
  pintarPestana();
  $('#gwVer', cuerpo()).addEventListener('change', e => { estado.actual = estado.versiones[+e.target.value]; pintarResultado(); });
  $$('[data-gwt]', cuerpo()).forEach(b => b.addEventListener('click', () => { pestana = b.dataset.gwt; $$('[data-gwt]', cuerpo()).forEach(x => x.classList.toggle('on', x === b)); pintarPestana(); }));
  $('#gwZip', cuerpo()).addEventListener('click', e => bajarZip(e.currentTarget));
  $('#gwCopiar', cuerpo()).addEventListener('click', () => copiar(v.html));
  $('#gwAbrir', cuerpo()).addEventListener('click', () => {
    const w = open(URL.createObjectURL(new Blob([conFotos(v.html)], { type: 'text/html' })), '_blank');
    if (!w) toast('Permite las ventanas emergentes para abrirla', 'err');
  });
  $('#gwNueva', cuerpo()).addEventListener('click', pintarInicio);
  $('#gwUsarCli', cuerpo())?.addEventListener('click', () => {
    const t = $('#gwPeticion', cuerpo());
    t.value = `Aplica estos cambios que ha pedido el cliente:\n${delCliente.map(x => `- ${x}`).join('\n')}`;
    t.focus();
  });
  $('#gwEnviar', cuerpo()).addEventListener('click', e => enviarAlCliente(e.currentTarget));
  $('#gwRevisar', cuerpo()).addEventListener('click', e => retocar(e.currentTarget, 'revisar'));
  $('#gwRetocar', cuerpo()).addEventListener('click', e => retocar(e.currentTarget, 'retocar'));
}

function pintarPestana() {
  const v = estado.actual, caja = $('#gwPanel', cuerpo());
  if (!caja) return;
  if (pestana === 'vista') {
    caja.innerHTML = `<div class="gw-disp" role="group" aria-label="Tamaño de la vista previa">
        <button type="button" data-disp="movil" class="${dispositivo === 'movil' ? 'on' : ''}">${icono('smartphone')}<span>Móvil</span></button>
        <button type="button" data-disp="pc" class="${dispositivo === 'pc' ? 'on' : ''}">${icono('laptop')}<span>Ordenador</span></button>
      </div>
      <div class="gw-marco ${dispositivo}"><iframe title="Vista previa de la web" sandbox="allow-scripts allow-popups allow-forms" loading="lazy"></iframe></div>`;
    const marco = $('.gw-marco', caja), ifr = $('iframe', caja);
    ifr.srcdoc = conFotos(v.html);
    const ajustar = () => {
      if (dispositivo !== 'pc') { ifr.style.cssText = ''; marco.style.height = ''; return; }
      const k = Math.min(1, marco.clientWidth / 1280);
      ifr.style.cssText = `width:1280px;height:${Math.round(720 / k)}px;transform:scale(${k});transform-origin:0 0`;
      marco.style.height = '720px';
    };
    ajustar();
    $$('[data-disp]', caja).forEach(b => b.addEventListener('click', () => { dispositivo = b.dataset.disp; pintarPestana(); }));
    return;
  }
  if (pestana === 'informe') {
    const rev = v.revision;
    const pend = [...new Set([...(v.plan?.pendientes || []), ...(rev?.pendientes || [])])];
    caja.innerHTML = `
      ${rev?.notas ? `<div class="gw-notas">${Object.entries(AREAS).filter(([k]) => rev.notas[k] != null).map(([k, t]) => {
        const n = Number(rev.notas[k]);
        return `<div class="gw-nota-a ${n >= 8 ? 'bien' : n >= 6 ? 'medio' : 'mal'}"><b>${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</b><small>${t}</small></div>`;
      }).join('')}</div>` : `<p class="muted">Esta versión no tiene revisión de calidad. Pulsa «Revisar otra vez».</p>`}
      ${rev ? `<p class="muted gw-apl">${rev.aplicados || 0} ${rev.aplicados === 1 ? 'mejora aplicada' : 'mejoras aplicadas'}${rev.fallidos?.length ? ` · ${rev.fallidos.length} sin aplicar (abajo)` : ''}.</p>` : ''}
      ${pend.length ? `<h4>${icono('alert')} Pedir al cliente</h4><ul class="gw-lista">${pend.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${rev?.informe?.length ? `<h4>${icono('shield')} Lo que ha revisado</h4><ul class="gw-inf">${rev.informe.map(x => `<li><span class="gw-tag">${esc(x.perspectiva)}</span><b>${esc(x.problema)}</b>${x.solucion ? `<small>${esc(x.solucion)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${rev?.fallidos?.length ? `<h4>No aplicadas (revísalas a mano)</h4><ul class="gw-lista">${rev.fallidos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    return;
  }
  if (pestana === 'plan') {
    const pl = v.plan || {}, pal = pl.identidad?.paleta || {};
    caja.innerHTML = `
      ${pl.resumen ? `<p class="gw-res">${esc(pl.resumen)}</p>` : ''}
      <div class="gw-kv">
        ${pl.publico ? `<div><small>Público</small><span>${esc(pl.publico)}</span></div>` : ''}
        ${pl.accionPrincipal ? `<div><small>Acción principal</small><span>${esc(pl.accionPrincipal)}</span></div>` : ''}
        ${pl.identidad?.estilo ? `<div><small>Estilo</small><span>${esc(pl.identidad.estilo)}${pl.identidad.fuenteTitulos ? ` · ${esc(pl.identidad.fuenteTitulos)} / ${esc(pl.identidad.fuenteTexto || '')}` : ''}</span></div>` : ''}
      </div>
      ${Object.keys(pal).length ? `<div class="gw-paleta">${Object.entries(pal).filter(([, c]) => /^#[0-9a-f]{3,8}$/i.test(c || '')).map(([k, c]) => `<span><i style="background:${c}"></i><small>${esc(k)}<br>${esc(c)}</small></span>`).join('')}</div>` : ''}
      ${pl.perspectivas?.length ? `<h4>${icono('users')} Puntos de vista</h4><div class="gw-persp">${pl.perspectivas.map(x => `<div><b>${esc(x.rol)}</b><ul>${(x.claves || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`).join('')}</div>` : ''}
      ${pl.decisiones?.length ? `<h4>Decisiones</h4><ul class="gw-lista">${pl.decisiones.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${pl.secciones?.length ? `<h4>${icono('panel')} Secciones</h4><ol class="gw-secc">${pl.secciones.map(s => `<li><b>${esc(s.titulo)}</b>${s.objetivo ? `<small>${esc(s.objetivo)}</small>` : ''}</li>`).join('')}</ol>` : ''}`;
    return;
  }
  caja.innerHTML = `<textarea class="gw-codigo" id="gwCodigo" spellcheck="false" aria-label="Código HTML">${esc(v.html)}</textarea>
    <div class="gw-acc"><button type="button" class="btn btn-ghost" id="gwGuardarCod">${icono('check')}<span>Guardar como versión nueva</span></button></div>`;
  $('#gwGuardarCod', caja).addEventListener('click', e => nuevaVersion(e.currentTarget, { ...v, html: $('#gwCodigo', caja).value, retoque: 'Editado a mano' }));
}

async function nuevaVersion(btn, version) {
  ocupado(btn, true);
  const { id, uid, createdAt, sinGuardar, ...limpia } = version;
  let g;
  try { g = await store.guardarWebIA(estado.p.id, limpia); }
  catch { g = { ...limpia, id: 'local-' + Date.now(), createdAt: Date.now(), sinGuardar: true }; toast('No se ha podido guardar en Supabase (¿falta actualizacion-v26.sql?)', 'err'); }
  ocupado(btn, false);
  estado.versiones = [g, ...estado.versiones];
  estado.actual = g;
  pintarResultado();
  return g;
}

async function retocar(btn, tipo) {
  const v = estado.actual, vivo = $('#gwRetVivo', cuerpo());
  const peticion = $('#gwPeticion', cuerpo()).value.trim();
  if (tipo === 'retocar' && !peticion) { toast('Escribe qué quieres cambiar', 'err'); $('#gwPeticion', cuerpo()).focus(); return; }
  cancelar = new AbortController();
  ocupado(btn, true);
  $$('.gw-cambios .btn', cuerpo()).forEach(b => { if (b !== btn) b.disabled = true; });
  try {
    const r = await store.iaWeb(tipo === 'retocar'
      ? { modo: 'web-retocar', html: v.html, peticion }
      : { modo: 'web-revisar', pedido: estado.datos, plan: v.plan, html: v.html },
      { senal: cancelar.signal, alPensar: t => { vivo.textContent = 'Pensando: ' + t.replace(/\*\*/g, '').slice(0, 200); }, alTexto: (_, todo) => { vivo.textContent = `Escribiendo cambios · ${kb(todo.length)}`; } });
    const j = leerJSON(r.texto);
    const res = aplicarCambios(v.html, j.cambios);
    if (!res.aplicados) throw new Error('La IA no ha encontrado dónde aplicar los cambios. Prueba a explicarlo de otra forma.');
    const nueva = tipo === 'retocar'
      ? { ...v, html: res.html, retoque: peticion, revision: v.revision }
      : { ...v, html: res.html, conRevision: true, revision: { notas: j.notas, informe: j.informe, pendientes: j.pendientes, aplicados: res.aplicados, fallidos: res.fallidos } };
    await nuevaVersion(btn, nueva);
    toast(`${res.aplicados} cambio${res.aplicados === 1 ? '' : 's'} aplicado${res.aplicados === 1 ? '' : 's'}${res.fallidos.length ? ` · ${res.fallidos.length} sin aplicar` : ''}`);
  } catch (e) {
    vivo.textContent = '';
    toast(e.message, 'err');
    ocupado(btn, false);
    $$('.gw-cambios .btn', cuerpo()).forEach(b => { b.disabled = !store.iaDisponible() && b.id !== 'gwNueva'; });
  } finally { cancelar = null; }
}

async function bajarZip(btn) {
  const v = estado.actual;
  ocupado(btn, true);
  try {
    const nombre = slug(estado.p.respuestas?.negocio || 'web');
    const archivos = [{ nombre: `${nombre}/index.html`, datos: v.html }];
    const usados = estado.archivos.filter(x => x.ruta && x.url && v.html.includes(x.ruta));
    for (const x of usados) {
      try { archivos.push({ nombre: `${nombre}/${x.ruta}`, datos: await (await fetch(x.url)).arrayBuffer() }); }
      catch { /* sin acceso a ese archivo */ }
    }
    const pend = [...new Set([...(v.plan?.pendientes || []), ...(v.revision?.pendientes || [])])];
    archivos.push({ nombre: `${nombre}/LEEME.txt`, datos: [
      `Web de «${estado.p.respuestas?.negocio || ''}» · ${refPedido(estado.p.id)}`,
      `Creada con IA (${v.modelo || 'Gemini'}) el ${new Date(v.createdAt || Date.now()).toLocaleString('es-ES')}.`,
      '', 'Contenido:', '- index.html: la web completa (CSS y JS dentro).', '- img/: fotos y logotipo del cliente.',
      '', 'Antes de publicar:', '- Busca [PENDIENTE] en index.html y complétalo.', ...pend.map(x => `  · ${x}`),
      '- Revisa aviso legal, privacidad y cookies con los datos del titular.',
      '', 'Para publicarla, sube la carpeta tal cual (GitHub Pages, Netlify, el hosting del cliente…).'
    ].join('\n') });
    descargar(`${nombre}-web-v${estado.versiones.length - estado.versiones.indexOf(v)}.zip`, crearZip(archivos));
  } catch (e) { toast('No se ha podido crear el .zip', 'err'); }
  ocupado(btn, false);
}

/** Comparte esta versión con el cliente: la verá en «Mis proyectos» para aprobarla o pedir cambios */
async function enviarAlCliente(btn) {
  const v = estado.actual, p = estado.p;
  if (!v || v.sinGuardar) return;
  const pend = (v.html.match(/\[PENDIENTE[^\]]*\]/g) || []).length;
  if (pend && !confirm(`La web todavía tiene ${pend} dato${pend > 1 ? 's' : ''} [PENDIENTE]. ¿Enviarla igualmente al cliente?`)) return;
  ocupado(btn, true);
  try {
    const cambios = { webIA: { id: v.id, t: Date.now() } };
    const i = ETAPAS.findIndex(e => e.id === etapaDe(p)), r = ETAPAS.findIndex(e => e.id === 'revision');
    if (i < r) Object.assign(cambios, { etapa: 'revision', estado: estadoParaEtapa('revision', p.estado) });
    await store.actualizarPedido(p.id, cambios);
    Object.assign(p, cambios);
    try { await store.crearAviso(p.uid, `Ya puedes ver la propuesta de tu web «${p.respuestas?.negocio || p.planNombre || ''}»`, p.id, 'revision'); } catch { /* el aviso de etapa llega igualmente */ }
    toast('Enviada. El cliente la verá en «Mis proyectos» y recibirá un aviso.');
    document.dispatchEvent(new CustomEvent('pedido-cambiado', { detail: p.id }));
    pintarResultado();
  } catch (e) { toast(e.message || 'No se ha podido enviar', 'err'); ocupado(btn, false); }
}
