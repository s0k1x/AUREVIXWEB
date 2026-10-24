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
   v31 · Librería (/library): antes de crear la web se pueden elegir
   componentes de la librería (a mano o con «Sugerir con IA», modelo
   barato). La IA los adapta a la marca del cliente y conserva sus avisos
   de licencia; el .zip lleva LICENSES-TERCEROS.txt.
   ========================================================== */
import { PLANTILLAS, plantillaPorId } from './plantillas.js';
import * as store from './store.js';
import { $, $$, esc, icono, toast, abrir, copiar, descargar, ocupado, refPedido, cargandoHTML, haceCuanto, errorCargaHTML } from './ui.js';
import { reunir } from './megaprompt.js';
import { crearZip } from './zip.js';
/* La librería se carga solo al abrir el generador: /library/ no se guarda para usar sin conexión
   y, si no está disponible, el generador funciona igual sin componentes. */
let L = null;
const cargarLibreria = async () => (L ??= await import('../library/nucleo.js'));
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

/* ---------- ZIP: está en js/zip.js (también lo usa la librería) ---------- */
export { crearZip };

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
  await cargarLibreria().catch(e => console.warn('Librería no disponible:', e));
  try {
    const [datos, lista, versiones] = await Promise.all([
      reunir(p),
      store.listarArchivos(p.id).catch(() => []),
      store.websIA(p.id).catch(() => [])
    ]);
    const pl = plantillaPorId(p.plantilla);
    estado = { p, sub, datos, pl, archivos: await prepararArchivos(lista), versiones, actual: versiones[0] || null, presupuesto: leerPresupuesto() };
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
      <section class="gw-card gw-lib" id="gwLib" aria-live="polite"></section>
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
  pintarComponentes();
}

/* ---------- Componentes de la librería (antes de crear la web) ---------- */
const PRESUPUESTOS = [30000, 60000, 100000, 150000];
const PRECIO_ENTRADA = 0.75; // $ por millón de tokens de entrada del modelo avanzado (ver LEEME, sección 19)
function leerPresupuesto() {
  try { const n = Number(localStorage.getItem('tm_lib_presupuesto')); return PRESUPUESTOS.includes(n) ? n : 60000; } catch { return 60000; }
}
/* Las sugerencias de la IA son de cada pedido; las elegidas a mano en la librería se comparten */
const selDelPedido = pid => (L ? L.leerSeleccion().filter(x => x.origen === 'manual' || x.pedido === pid) : []);
const num = n => Math.round(n).toLocaleString('es-ES');

const MAX_COMP = 25; // componentes por web (igual que en la función «asistente»)
const leerAutoIconos = () => { try { return localStorage.getItem('tm_lib_iconos_auto') !== '0'; } catch { return true; } };

/**
 * Lo que se enviará a la IA para este pedido. Los elegidos a mano van primero
 * y nunca se recortan en silencio: si no caben, se avisa antes de gastar nada.
 */
async function recursosDelPedido() {
  estado.iconosAuto ??= leerAutoIconos();
  const ind = await L.cargarIndice();
  const sel = selDelPedido(estado.p.id);
  const compsSel = sel.filter(x => !L.esIcono(x.id)).map(x => ({ ...x, c: ind.porId.get(x.id) })).filter(x => x.c);
  const validos = compsSel.filter(x => L.paraIA(x.c)).sort((a, z) => (a.origen === 'manual' ? 0 : 1) - (z.origen === 'manual' ? 0 : 1));
  const icSel = sel.filter(x => L.esIcono(x.id));
  let iconos = [], errorIconos = '';
  if (icSel.length || estado.iconosAuto) {
    try {
      const lista = await L.cargarIconos(ind), mapa = await L.cargarMapaIconos();
      iconos = icSel.map(x => ({ ...x, c: mapa.get(x.id) })).filter(x => x.c && L.paraIA(x.c));
      if (estado.iconosAuto) {
        for (const { c, uso } of L.iconosAuto(lista, estado.datos, { max: Math.max(0, L.MAX_ICONOS - iconos.length), excluir: iconos.map(x => x.id) })) {
          iconos.push({ id: c.i, seccion: 'iconos', motivo: uso, origen: 'auto', c });
        }
      }
    } catch (e) { errorIconos = e.message || 'No se han podido leer los iconos'; }
  }
  const manuales = validos.filter(x => x.origen === 'manual');
  const tokComp = validos.reduce((t, x) => t + L.tokens(x.c), 0);
  const tokManual = manuales.reduce((t, x) => t + L.tokens(x.c), 0);
  const tokIconos = iconos.length * L.TOKENS_ICONO;
  const necesario = tokManual + tokIconos;
  // Bloqueo: lo elegido a mano no cabe (en tokens o en número). Se ofrece subir el presupuesto o quitar alguno.
  const bloqueo = manuales.length > MAX_COMP ? `Has elegido a mano ${manuales.length} componentes y el máximo por web es ${MAX_COMP}. Quita alguno.`
    : necesario > estado.presupuesto ? `Lo elegido a mano (≈ ${num(necesario)} tokens con los iconos) no cabe en el presupuesto de ${num(estado.presupuesto)} tokens. No se recorta en silencio: sube el presupuesto o quita alguno.` : '';
  const subirA = bloqueo && manuales.length <= MAX_COMP ? PRESUPUESTOS.find(n => n >= necesario) || 0 : 0;
  return { ind, compsSel, validos, manuales, iconos, errorIconos, tokComp, tokIconos, tokens: tokComp + tokIconos, bloqueo, subirA };
}

async function pintarComponentes() {
  const caja = $('#gwLib', cuerpo());
  if (!caja) return;
  const cab = `<h3>${icono('panel')} Componentes e iconos sugeridos <small class="muted">(librería · opcional)</small></h3>`;
  caja.innerHTML = cab + `<p class="muted gw-nota">Cargando la librería…</p>`;
  let r;
  try { await cargarLibreria(); r = await recursosDelPedido(); }
  catch (e) {
    caja.innerHTML = cab + errorCargaHTML(e.message, 'No se ha podido cargar la librería');
    caja.querySelector('[data-reintentar]')?.addEventListener('click', pintarComponentes, { once: true });
    return;
  }
  if (!caja.isConnected) return;
  const sel = r.compsSel;
  const coste = r.tokens / 1e6 * PRECIO_ENTRADA;
  const grupos = L.SECCIONES.map(sx => [sx, sel.filter(x => x.seccion === sx)]).filter(([, l]) => l.length);
  caja.innerHTML = `${cab}
    <p class="muted gw-nota">La IA los adapta a la marca del cliente (colores, tipografías, textos y fotos) y conserva su aviso de licencia. Solo se usan licencias permisivas o con atribución; los JSX/TSX los traduce a HTML/CSS/JS o los descarta. Los elegidos a mano van siempre primero.</p>
    ${sel.length ? grupos.map(([sx, l]) => `<div class="gw-comp-g"><h4>${esc(L.NOMBRE_SECCION[sx])}</h4><ul class="gw-comps">${l.map(x => `
      <li class="gw-comp ${L.paraIA(x.c) ? '' : 'no'}">
        <div class="gw-comp-v" data-vista="${esc(x.id)}"></div>
        <div class="gw-comp-t"><b>${esc(x.c.n)}</b>
          <small>${esc(x.c.lib.nombre)} · <span class="gw-lic ${esc(x.c.lib.clase)}">${esc(x.c.lib.spdx)}</span> · ${esc(x.c.f.join('+').toUpperCase())} · ${num(L.tokens(x.c))} tokens${x.origen === 'manual' ? ' · <b class="gw-manual">a mano</b>' : ''}</small>
          ${!L.paraIA(x.c) ? `<small class="gw-comp-m">${icono('alert')} No se enviará a la IA: su licencia o su formato no lo permiten</small>` : x.motivo ? `<small class="gw-comp-m">${esc(x.motivo)}</small>` : ''}
        </div>
        <button type="button" class="dlg-x gw-comp-x" data-quitar-comp="${esc(x.id)}" aria-label="Quitar ${esc(x.c.n)}">${icono('x')}</button>
      </li>`).join('')}</ul></div>`).join('')
      : `<p class="muted">No hay componentes elegidos. Pulsa «${store.iaDisponible() ? 'Sugerir con IA' : 'Sugerir (sin IA)'}» o añádelos desde la librería con «Usar en mi pedido».</p>`}
    <div class="gw-comp-g gw-icos" id="gwIcos"></div>
    ${r.bloqueo ? `<p class="gw-bloqueo" role="alert">${icono('alert')} <span>${esc(r.bloqueo)}</span>${r.subirA ? ` <button type="button" class="btn btn-sm btn-primary" id="gwSubir">Subir a ${num(r.subirA)} tokens</button>` : ''}</p>` : ''}
    <div class="gw-lib-pie">
      <span class="gw-coste">${r.validos.length} de ${sel.length} componentes y ${r.iconos.length} iconos se usarán · ≈ ${num(r.tokens)} tokens · ≈ ${coste.toLocaleString('es-ES', { maximumFractionDigits: 3, minimumFractionDigits: 3 })} $ de entrada${!r.bloqueo && r.tokens > estado.presupuesto ? ` · <b>pasa del presupuesto: se recortarán los sugeridos de menos prioridad (nunca los elegidos a mano)</b>` : ''}</span>
      <label class="fc-select gw-presu"><span>Presupuesto</span>
        <select id="gwPresu">${PRESUPUESTOS.map(n => `<option value="${n}" ${n === estado.presupuesto ? 'selected' : ''}>${num(n)} tokens</option>`).join('')}</select></label>
    </div>
    <div class="gw-acc">
      ${sel.length ? `<button type="button" class="btn btn-ghost" id="gwVaciar">${icono('trash')}<span>Quitar todos</span></button>` : ''}
      <a class="btn btn-ghost" href="library/#uso=1" target="_blank" rel="noopener">${icono('external')}<span>Abrir la librería</span></a>
      <button type="button" class="btn btn-ghost" id="gwSugerir">${icono('sparkle')}<span>${store.iaDisponible() ? 'Sugerir con IA' : 'Sugerir (sin IA)'}</span></button>
    </div>`;
  for (const el of $$('[data-vista]', caja)) {
    const c = r.ind.porId.get(el.dataset.vista);
    if (c) L.montarVista(el, c).catch(() => { el.innerHTML = `<span class="lbv-fmt">${esc(c.f.join(' · ').toUpperCase())}</span>`; });
  }
  pintarIconos(r);
  $$('[data-quitar-comp]', caja).forEach(b => b.addEventListener('click', () => { L.alternarSeleccion(b.dataset.quitarComp); pintarComponentes(); }));
  $('#gwVaciar', caja)?.addEventListener('click', () => { L.guardarSeleccion(L.leerSeleccion().filter(x => L.esIcono(x.id) || !selDelPedido(estado.p.id).some(y => y.id === x.id))); pintarComponentes(); });
  $('#gwSugerir', caja).addEventListener('click', e => sugerirComponentes(e.currentTarget));
  $('#gwSubir', caja)?.addEventListener('click', () => cambiarPresupuesto(r.subirA));
  $('#gwPresu', caja).addEventListener('change', e => cambiarPresupuesto(Number(e.target.value) || 60000));
}
function cambiarPresupuesto(n) {
  estado.presupuesto = n;
  try { localStorage.setItem('tm_lib_presupuesto', String(n)); } catch { /* sin almacenamiento */ }
  pintarComponentes();
}

/* Iconos: los elegidos a mano, los automáticos y un buscador (en español o en inglés) */
function pintarIconos(r) {
  const caja = $('#gwIcos', cuerpo());
  if (!caja) return;
  const chip = (x, quitar) => `<li class="gw-ico ${x.origen === 'manual' ? 'manual' : ''}" title="${esc(`${L.fichaIcono(x.c).nombre} · ${x.c.lib.nombre} ${x.c.variante} · ${x.c.lib.spdx}${x.motivo ? ` · ${x.motivo}` : ''}`)}">
      <img src="${esc(L.urlArchivo(x.c))}" alt="" width="20" height="20" loading="lazy"><span>${esc(L.fichaIcono(x.c).nombre)}</span>
      ${quitar ? `<button type="button" data-quitar-ico="${esc(x.id)}" aria-label="Quitar el icono ${esc(L.fichaIcono(x.c).nombre)}">${icono('x')}</button>` : ''}</li>`;
  const man = r.iconos.filter(x => x.origen === 'manual'), aut = r.iconos.filter(x => x.origen !== 'manual');
  caja.innerHTML = `<h4>Iconos <small class="muted">(${r.iconos.length} de máx. ${L.MAX_ICONOS} · la IA solo puede usar estos: no inventa ni dibuja iconos)</small></h4>
    ${r.errorIconos ? `<p class="muted">${icono('alert')} ${esc(r.errorIconos)}</p>` : ''}
    ${man.length ? `<ul class="gw-icos-l" aria-label="Iconos elegidos a mano">${man.map(x => chip(x, true)).join('')}</ul>` : ''}
    ${aut.length ? `<ul class="gw-icos-l auto" aria-label="Iconos automáticos">${aut.map(x => chip(x, false)).join('')}</ul>` : ''}
    <label class="gw-sw gw-sw-sm"><input type="checkbox" id="gwIcoAuto" ${estado.iconosAuto ? 'checked' : ''}><span><b>Añadir iconos automáticamente</b><small>Menú, contacto, horario y los del sector del cliente (un solo estilo: Lucide/Tabler; marcas de Simple Icons)</small></span></label>
    <div class="gw-ico-bus"><input type="search" id="gwIcoQ" placeholder="Buscar iconos: teléfono, tijeras, coche…" aria-label="Buscar iconos" value="${esc(estado.icoQ || '')}" autocomplete="off"></div>
    <ul class="gw-icos-l res" id="gwIcoRes" aria-live="polite"></ul>`;
  $('#gwIcoAuto', caja).addEventListener('change', e => {
    estado.iconosAuto = e.target.checked;
    try { localStorage.setItem('tm_lib_iconos_auto', e.target.checked ? '1' : '0'); } catch { /* sin almacenamiento */ }
    pintarComponentes();
  });
  $$('[data-quitar-ico]', caja).forEach(b => b.addEventListener('click', () => { L.alternarSeleccion(b.dataset.quitarIco); pintarComponentes(); }));
  const q = $('#gwIcoQ', caja), res = $('#gwIcoRes', caja);
  let t = 0;
  const buscar = async () => {
    estado.icoQ = q.value;
    if (!q.value.trim()) { res.innerHTML = ''; return; }
    const lista = await L.cargarIconos(r.ind).catch(() => null);
    if (!lista) { res.innerHTML = `<li class="muted">No se han podido leer los iconos</li>`; return; }
    const ya = new Set(r.iconos.map(x => x.id));
    const encontrados = L.buscarIconos(lista, q.value, { max: 24 });
    res.innerHTML = encontrados.length ? encontrados.map(c => `<li><button type="button" class="gw-ico ${ya.has(c.i) ? 'ya' : ''}" data-poner-ico="${esc(c.i)}" ${ya.has(c.i) ? 'disabled' : ''} title="${esc(`${c.lib.nombre} ${c.variante} · ${c.lib.spdx}`)}">
        <img src="${esc(L.urlArchivo(c))}" alt="" width="20" height="20" loading="lazy"><span>${esc(L.fichaIcono(c).nombre)}</span></button></li>`).join('')
      : `<li class="muted">Sin resultados. Prueba con otra palabra (en español o en inglés).</li>`;
    $$('[data-poner-ico]', res).forEach(b => b.addEventListener('click', () => {
      try { L.alternarSeleccion(b.dataset.ponerIco, { seccion: 'iconos', origen: 'manual' }); }
      catch (e) { toast(e.message, 'err'); return; }
      estado.icoFoco = true;
      pintarComponentes();
    }));
  };
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 160); });
  if (q.value.trim()) buscar();
  if (estado.icoFoco) { estado.icoFoco = false; q.focus(); }
}

/** Elige componentes: con IA (modo web-recursos, modelo barato) o, en el modo demo, por categoría y estilo */
async function sugerirComponentes(btn) {
  ocupado(btn, true);
  let aviso = '';
  try {
    await cargarLibreria();
    const ind = await L.cargarIndice();
    let elegidos;
    if (!store.iaDisponible()) elegidos = L.seleccionLocal(ind, estado.datos);
    else {
      // Los elegidos a mano no compiten con los candidatos: se quitan de la lista y se descuentan del máximo
      const aMano = new Set(L.leerSeleccion().filter(x => x.origen === 'manual').map(x => x.id));
      const max = Math.max(0, MAX_COMP - [...aMano].filter(id => !L.esIcono(id)).length);
      if (!max) throw new Error(`Ya tienes ${MAX_COMP} componentes elegidos a mano: no caben más sugerencias.`);
      const cands = L.preseleccionar(ind, estado.datos, { max: 400 }).filter(c => !aMano.has(c.i));
      try {
        const r = await store.iaWeb({ modo: 'web-recursos', pedido: estado.datos, candidatos: cands.map(c => L.fichaIA(c, ind.categorias)), max, indicaciones: $('#gwInd', cuerpo())?.value.trim() || '' });
        const j = leerJSON(r.texto);
        const validos = new Set(cands.map(c => c.i));
        elegidos = (j.elegidos || []).filter(x => validos.has(x?.id)).slice(0, max).map(x => ({ id: x.id, seccion: x.seccion, motivo: x.motivo || '', origen: 'ia' }));
        if (!elegidos.length) throw new Error('La IA no ha elegido ningún componente válido.');
      } catch (e) {
        // Si la función desplegada todavía no tiene «web-recursos» (o falla), se eligen sin IA
        console.warn('web-recursos no disponible:', e);
        elegidos = L.seleccionLocal(ind, estado.datos).filter(x => !aMano.has(x.id)).slice(0, max);
        aviso = `La IA no ha podido elegir (${e.message}). Se han elegido sin IA, por categoría y estilo.`;
      }
    }
    // Se sustituyen solo las sugerencias anteriores de este pedido; lo elegido a mano y lo de otros pedidos se queda
    const quedan = L.leerSeleccion().filter(x => (x.origen === 'manual' || x.pedido !== estado.p.id) && !elegidos.some(y => y.id === x.id));
    L.guardarSeleccion([...quedan, ...elegidos.map(x => ({ ...x, pedido: estado.p.id }))]);
    toast(aviso || `${elegidos.length} componente${elegidos.length === 1 ? '' : 's'} sugerido${elegidos.length === 1 ? '' : 's'}`, aviso ? 'err' : undefined);
  } catch (e) { toast(e.message || 'No se han podido sugerir componentes', 'err'); }
  ocupado(btn, false);
  pintarComponentes();
}
// Si se añaden componentes desde la librería en otra pestaña, se ven aquí al momento
addEventListener('storage', e => { if (e.key === 'tm_lib_sel' && dlg?.open && $('#gwLib', cuerpo())) pintarComponentes(); });

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
  // Componentes e iconos de la librería para este pedido. Si lo elegido a mano no cabe, se para ANTES de gastar nada.
  let rec = null;
  if (L) {
    rec = await recursosDelPedido().catch(e => { console.warn('Librería no disponible:', e); return null; });
    if (rec?.bloqueo) {
      toast(rec.bloqueo, 'err');
      $('#gwLib', cuerpo())?.scrollIntoView({ block: 'center' });
      return;
    }
  }
  cancelar = new AbortController();
  const senal = cancelar.signal;
  const pasos = PASOS.filter(([k]) => revisar || k !== 'revisar');
  pintarProgreso(pasos);
  const plantilla = plantillaParaIA(pl)?.diseno || null;
  const ejemplos = fotosEjemplo(pl);
  const elegidos = estado.archivos.filter(x => x.incluir);
  const ind = rec?.ind || null;
  const comps = rec?.validos || [];
  const iconos = rec?.iconos || [];
  let compLista = [], compInfo = null, icoLista = [], icoSvgs = [];
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
    paso('html', 'activo', comps.length || iconos.length ? `Leyendo ${comps.length} componente${comps.length === 1 ? '' : 's'} y ${iconos.length} icono${iconos.length === 1 ? '' : 's'} de la librería…` : 'Empezando…');
    // SVG original de cada icono (se lee ahora; la IA solo recibe id, nombre y uso)
    icoSvgs = await Promise.all(iconos.map(async x => ({ id: x.id, svg: await L.svgIcono(x.c).catch(() => null) })));
    const icoEnviar = iconos.filter((x, i) => icoSvgs[i].svg);
    const imagenes = (plan.imagenes?.length ? plan.imagenes : elegidos.filter(x => x.ruta).map(x => ({ ruta: x.ruta, muestra: x.a.nombre })));
    const negocio = { ...datos.negocio, dominio: datos.dominio, contenido: datos.contenido };
    const r2 = await store.iaWeb({ modo: 'web-html', plan, negocio, plantilla, imagenes, fotosEjemplo: ejemplos, indicaciones,
      componentes: comps.map(x => ({ id: x.id, seccion: x.seccion, motivo: x.motivo, origen: x.origen === 'manual' ? 'manual' : 'ia' })),
      iconos: icoEnviar.map(x => ({ ...L.fichaIcono(x.c, x.motivo), origen: x.origen === 'manual' ? 'manual' : 'auto' })), presupuesto: estado.presupuesto },
      { senal, alPensar: pensando, alTexto: (_, todo) => paso('html', 'activo', `Escribiendo la web · ${kb(todo.length)}`) });
    let html = leerHTML(r2.texto);
    if (!/<\/html>/i.test(html)) throw new Error('La web ha salido cortada. Vuelve a intentarlo (o quita algún archivo).');
    // Iconos: cada marcador <svg data-icono> se cambia por el SVG original; los ids inventados se quitan
    if (L && iconos.length) {
      const confirmados = r2.iconos?.enviados ? new Set(r2.iconos.enviados.map(x => x.id)) : null;
      const ri = L.rellenarIconos(html, icoSvgs.filter(x => x.svg && (!confirmados || confirmados.has(x.id))));
      html = ri.html;
      const rechazados = new Map((r2.iconos?.descartados || []).map(x => [x.id, x.motivo]));
      icoLista = [
        ...iconos.map((x, i) => ({ ...L.infoIcono(x.c), uso: x.motivo || '', eleccion: x.origen === 'manual' ? 'manual' : 'auto',
          estado: ri.usados.includes(x.id) ? 'usado' : !icoSvgs[i].svg ? 'descartado' : rechazados.has(x.id) ? 'descartado' : confirmados || r2.iconos ? 'sin usar' : 'no enviado',
          motivo: ri.usados.includes(x.id) ? '' : !icoSvgs[i].svg ? 'No se ha podido leer su SVG' : rechazados.get(x.id) || (r2.iconos ? 'La IA no lo ha usado' : 'La función «asistente» desplegada no ha recibido los iconos (falta integrar libreria.ts)') })),
        ...ri.inventados.map(id => ({ id, nombre: id.split('/').pop(), biblioteca: '', licencia: '', autor: '', origen: '', estado: 'inventado', motivo: 'La IA puso un icono que no estaba en la lista: se ha quitado' }))
      ];
    }
    // Licencias: qué componentes conservan su aviso y comentario final con la lista real
    compInfo = r2.componentes;
    const icoUsados = () => icoLista.filter(x => x.estado === 'usado');
    if (L && (compInfo || comps.length || icoLista.length)) {
      const enviados = compInfo?.usados || [];
      const av = L.avisosTerceros(html, enviados, { iconos: icoUsados() });
      html = av.html;
      compLista = [
        ...enviados.map(x => ({ ...x, estado: av.usados.includes(x.id) ? 'usado' : 'descartado', motivo: av.usados.includes(x.id) ? '' : 'La IA no lo ha usado' })),
        ...(compInfo?.descartados || []).map(x => ({ ...infoLocal(ind, x.id), estado: 'descartado', motivo: x.motivo })),
        ...(compInfo?.recortados || []).map(id => ({ ...infoLocal(ind, id), estado: 'recortado', motivo: 'No cabía en el presupuesto de tokens' })),
        ...(compInfo ? [] : comps.map(x => ({ ...infoLocal(ind, x.id), estado: 'descartado', motivo: 'La función «asistente» no ha devuelto los componentes (¿falta volver a desplegarla?)' })))
      ];
    }
    const nUsados = compLista.filter(x => x.estado === 'usado').length;
    const nIco = icoUsados().length;
    paso('html', 'hecho', `${kb(html.length)} · ${r2.modelo || ''}${comps.length ? ` · ${nUsados} de ${comps.length} componentes` : ''}${iconos.length ? ` · ${nIco} de ${iconos.length} iconos${r2.iconos ? '' : ' (la función desplegada no los ha recibido)'}` : ''}`);

    // 3. Revisión
    let revision = null, aplicados = 0, fallidos = [];
    if (revisar) {
      paso('revisar', 'activo', 'Revisando…');
      try {
        const r3 = await store.iaWeb({ modo: 'web-revisar', pedido: datos, plan, html, indicaciones,
          componentes: compLista.map(x => ({ id: x.id, nombre: x.nombre, biblioteca: x.biblioteca, licencia: x.licencia, enLaWeb: x.estado === 'usado' })),
          iconos: icoUsados().map(x => ({ id: x.id, nombre: x.nombre })) },
          { senal, alPensar: pensando, alTexto: (_, todo) => paso('revisar', 'activo', `Anotando mejoras · ${kb(todo.length)}`) });
        revision = leerJSON(r3.texto);
        ({ html, aplicados, fallidos } = aplicarCambios(html, revision.cambios));
        if (L && icoLista.length) {
          // La revisión no puede colar iconos nuevos: se vuelven a poner los originales y se quitan los desconocidos
          html = L.rellenarIconos(html, icoSvgs.filter(x => x.svg && icoLista.some(y => y.id === x.id && y.estado !== 'descartado'))).html;
          for (const x of icoLista) if (x.estado === 'usado' && !html.includes(`data-icono="${x.id}"`)) { x.estado = 'sin usar'; x.motivo = 'Quitado en la revisión'; }
        }
        if (L && (compLista.length || icoLista.length)) {
          const av2 = L.avisosTerceros(html, compLista.filter(x => x.estado === 'usado'), { iconos: icoUsados() });
          html = av2.html;
          for (const x of compLista) if (x.estado === 'usado' && av2.descartados.includes(x.id)) { x.estado = 'descartado'; x.motivo = 'Quitado en la revisión'; }
          for (const r of revision.componentes || []) {
            const x = compLista.find(y => y.id === r.id);
            if (x && x.estado === 'usado' && r.estado === 'adaptado') { x.estado = 'adaptado'; x.motivo = r.motivo || ''; }
            else if (x && x.estado === 'usado' && r.motivo) x.motivo = r.motivo;
          }
        }
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
      revision: revision ? { notas: revision.notas, informe: revision.informe, pendientes: revision.pendientes, preguntasCliente: revision.preguntasCliente, aplicados, fallidos } : null,
      imagenes: elegidos.filter(x => x.ruta).map(x => ({ ruta: x.ruta, archivo: x.a.ruta, nombre: x.a.nombre })),
      componentes: compLista.length ? { lista: compLista, tokens: compInfo?.tokens || 0, presupuesto: compInfo?.presupuesto || estado.presupuesto } : null,
      iconos: icoLista.length ? { lista: icoLista, recibidos: !!r2.iconos } : null
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
      ${preguntasHTML(v)}
      ${pend.length ? `<h4>${icono('alert')} Datos pendientes</h4><ul class="gw-lista">${pend.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${rev?.informe?.length ? `<h4>${icono('shield')} Lo que ha revisado</h4><ul class="gw-inf">${rev.informe.map(x => `<li><span class="gw-tag">${esc(x.perspectiva)}</span><b>${esc(x.problema)}</b>${x.solucion ? `<small>${esc(x.solucion)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${rev?.fallidos?.length ? `<h4>No aplicadas (revísalas a mano)</h4><ul class="gw-lista">${rev.fallidos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${informeComponentes(v)}`;
    $('#gwPreg', caja)?.addEventListener('click', e => enviarPreguntas(e.currentTarget, v));
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
      ${pl.tecnico?.length ? `<h4>${icono('shield')} Decisiones técnicas</h4><ul class="gw-inf">${pl.tecnico.map(x => `<li>${x.area ? `<span class="gw-tag">${esc(x.area)}</span>` : ''}<b>${esc(x.decision)}</b></li>`).join('')}</ul>` : ''}
      ${pl.secciones?.length ? `<h4>${icono('panel')} Secciones</h4><ol class="gw-secc">${pl.secciones.map(s => `<li><b>${esc(s.titulo)}</b>${s.objetivo ? `<small>${esc(s.objetivo)}</small>` : ''}</li>`).join('')}</ol>` : ''}`;
    return;
  }
  caja.innerHTML = `<textarea class="gw-codigo" id="gwCodigo" spellcheck="false" aria-label="Código HTML">${esc(v.html)}</textarea>
    <div class="gw-acc"><button type="button" class="btn btn-ghost" id="gwGuardarCod">${icono('check')}<span>Guardar como versión nueva</span></button></div>`;
  $('#gwGuardarCod', caja).addEventListener('click', e => nuevaVersion(e.currentTarget, { ...v, html: $('#gwCodigo', caja).value, retoque: 'Editado a mano' }));
}

/* ---------- Preguntas para el cliente (las redacta la IA en el plan y en la revisión) ---------- */
const enviadas = new Set();
function preguntasDe(v) {
  const vistas = new Set(), out = [];
  for (const q of [...(v.plan?.preguntasCliente || []), ...(v.revision?.preguntasCliente || [])]) {
    const t = String(q?.pregunta || '').trim();
    if (t && !vistas.has(t.toLowerCase())) { vistas.add(t.toLowerCase()); out.push({ pregunta: t, motivo: String(q.motivo || '').trim(), ejemplo: String(q.ejemplo || '').trim() }); }
  }
  return out.slice(0, 15);
}
function preguntasHTML(v) {
  const l = preguntasDe(v);
  if (!l.length) return '';
  const ya = enviadas.has(v.id);
  return `<h4>${icono('message')} Preguntas para el cliente <small class="muted">(las ha preparado la IA)</small></h4>
    <ol class="gw-preg">${l.map(q => `<li><b>${esc(q.pregunta)}</b>${q.motivo ? `<small>Por qué: ${esc(q.motivo)}</small>` : ''}${q.ejemplo ? `<small>Ejemplo: ${esc(q.ejemplo)}</small>` : ''}</li>`).join('')}</ol>
    <div class="gw-acc"><button type="button" class="btn ${ya ? 'btn-ghost' : 'btn-primary'}" id="gwPreg" ${ya ? 'disabled' : ''}>${icono(ya ? 'check' : 'send')}<span>${ya ? 'Enviadas al cliente' : 'Enviar las preguntas al cliente'}</span></button></div>
    <p class="muted gw-nota">Le llegan por el chat de su proyecto («Mis proyectos») con un aviso. Cuando responda, vuelve a crear la web: la IA tendrá sus respuestas.</p>`;
}
/** Texto del mensaje con las preguntas (lo lee el cliente: claro y sin tecnicismos) */
export function textoPreguntas(l) {
  return ['Hola. Para que tu web quede perfecta nos faltan algunos datos. ¿Puedes respondernos aquí mismo?', '',
    ...l.map((q, i) => `${i + 1}. ${q.pregunta}${q.ejemplo ? `\n   (Por ejemplo: ${q.ejemplo})` : ''}`),
    '', 'Si alguna no la sabes, no pasa nada: déjala en blanco. ¡Gracias!'].join('\n');
}
async function enviarPreguntas(btn, v) {
  const l = preguntasDe(v);
  if (!l.length || enviadas.has(v.id)) return;
  ocupado(btn, true);
  try {
    await store.enviarMensaje(estado.p.id, textoPreguntas(l));
    enviadas.add(v.id);
    toast('Preguntas enviadas al cliente');
    btn.className = 'btn btn-ghost'; btn.disabled = true;
    btn.innerHTML = `${icono('check')}<span>Enviadas al cliente</span>`;
  } catch (e) { toast(e.message || 'No se han podido enviar', 'err'); ocupado(btn, false); }
}

/* Componentes de terceros de esta versión: usados, adaptados y descartados, con su licencia */
const ESTADO_COMP = { usado: 'Usado', adaptado: 'Adaptado', descartado: 'Descartado', recortado: 'Recortado' };
function infoLocal(ind, id) {
  const c = ind?.porId.get(id);
  return c && L ? { id, nombre: c.n, biblioteca: c.lib.nombre, licencia: c.lib.spdx, autor: L.autorDe(c), origen: c.o || L.urlOrigen(c) } : { id, nombre: id, biblioteca: '', licencia: '', autor: '', origen: '' };
}
const ESTADO_ICO = { usado: 'Usado', 'sin usar': 'Sin usar', descartado: 'Descartado', inventado: 'Inventado', 'no enviado': 'No enviado' };
function informeComponentes(v) {
  return informeComps(v) + informeIconos(v);
}
function informeIconos(v) {
  const l = v.iconos?.lista || [];
  if (!l.length) return '';
  const n = k => l.filter(x => x.estado === k).length;
  return `<h4>${icono('star')} Iconos</h4>
    <p class="muted gw-apl">${n('usado')} de ${l.filter(x => x.estado !== 'inventado').length} usados${n('inventado') ? ` · ${n('inventado')} inventados por la IA y quitados` : ''}${v.iconos.recibidos ? '' : ' · la función «asistente» desplegada no los ha recibido (ver LEEME, sección 22)'}. Son los SVG originales de la colección, con su licencia en LICENSES-TERCEROS.txt.</p>
    <ul class="gw-inf gw-inf-ico">${l.map(x => `<li><span class="gw-tag">${ESTADO_ICO[x.estado] || esc(x.estado)}</span><b>${esc(x.nombre)}${x.biblioteca ? ` · ${esc(x.biblioteca)}` : ''}</b><small>${esc(x.licencia || '—')}${x.eleccion === 'manual' ? ' · elegido a mano' : ''}${x.uso ? ` · ${esc(x.uso)}` : ''}${x.motivo ? ` · ${esc(x.motivo)}` : ''}</small></li>`).join('')}</ul>`;
}
function informeComps(v) {
  const l = v.componentes?.lista || [];
  if (!l.length) return '';
  const n = k => l.filter(x => x.estado === k).length;
  return `<h4>${icono('panel')} Componentes de terceros</h4>
    <p class="muted gw-apl">${n('usado') + n('adaptado')} usados (${n('adaptado')} adaptados) · ${n('descartado')} descartados${n('recortado') ? ` · ${n('recortado')} recortados por el presupuesto` : ''}. Los usados llevan su aviso en el HTML y su licencia en LICENSES-TERCEROS.txt del .zip.</p>
    <ul class="gw-inf">${l.map(x => `<li><span class="gw-tag">${ESTADO_COMP[x.estado] || esc(x.estado)}</span><b>${esc(x.nombre)}${x.biblioteca ? ` · ${esc(x.biblioteca)}` : ''}</b><small>${esc(x.licencia || 'licencia desconocida')}${x.autor ? ` · ${esc(x.autor)}` : ''}${x.origen ? ` · <a href="${esc(x.origen)}" target="_blank" rel="noopener">origen</a>` : ''}${x.motivo ? ` · ${esc(x.motivo)}` : ''}</small></li>`).join('')}</ul>`;
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
    // Iconos que se pueden usar en esta versión (los mismos que recibió la IA al crearla)
    const icos = (v.iconos?.lista || []).filter(x => x.estado !== 'descartado' && x.estado !== 'inventado');
    const icoFichas = icos.map(x => ({ id: x.id, nombre: x.nombre, uso: x.uso || '' }));
    const r = await store.iaWeb(tipo === 'retocar'
      ? { modo: 'web-retocar', html: v.html, peticion, ...(icoFichas.length ? { iconos: icoFichas } : {}) }
      : { modo: 'web-revisar', pedido: estado.datos, plan: v.plan, html: v.html, componentes: (v.componentes?.lista || []).map(x => ({ id: x.id, nombre: x.nombre, biblioteca: x.biblioteca, licencia: x.licencia, enLaWeb: x.estado === 'usado' || x.estado === 'adaptado' })), ...(icoFichas.length ? { iconos: icoFichas } : {}) },
      { senal: cancelar.signal, alPensar: t => { vivo.textContent = 'Pensando: ' + t.replace(/\*\*/g, '').slice(0, 200); }, alTexto: (_, todo) => { vivo.textContent = `Escribiendo cambios · ${kb(todo.length)}`; } });
    const j = leerJSON(r.texto);
    const res = aplicarCambios(v.html, j.cambios);
    if (!res.aplicados) throw new Error('La IA no ha encontrado dónde aplicar los cambios. Prueba a explicarlo de otra forma.');
    let iconosV = v.iconos;
    if (L && icos.length) {
      // Los marcadores nuevos o cambiados se rellenan con el SVG original; los ids desconocidos se quitan
      const svgs = await Promise.all(icos.map(async x => ({ id: x.id, svg: await L.buscarElemento(x.id).then(c => c && L.svgIcono(c)).catch(() => null) })));
      const ri = L.rellenarIconos(res.html, svgs.filter(x => x.svg));
      res.html = ri.html;
      iconosV = { ...v.iconos, lista: [
        ...v.iconos.lista.filter(x => x.estado !== 'inventado').map(x => (x.estado === 'descartado' ? x : { ...x, estado: res.html.includes(`data-icono="${x.id}"`) ? 'usado' : 'sin usar', motivo: res.html.includes(`data-icono="${x.id}"`) ? '' : 'No está en esta versión' })),
        ...ri.inventados.map(id => ({ id, nombre: id.split('/').pop(), biblioteca: '', licencia: '', autor: '', origen: '', estado: 'inventado', motivo: 'La IA puso un icono que no estaba en la lista: se ha quitado' }))
      ] };
    }
    if (L && (v.componentes?.lista?.length || iconosV?.lista?.length)) {
      res.html = L.avisosTerceros(res.html, (v.componentes?.lista || []).filter(x => x.estado === 'usado' || x.estado === 'adaptado'), { iconos: (iconosV?.lista || []).filter(x => x.estado === 'usado') }).html;
    }
    const nueva = tipo === 'retocar'
      ? { ...v, html: res.html, iconos: iconosV, retoque: peticion, revision: v.revision }
      : { ...v, html: res.html, iconos: iconosV, conRevision: true, revision: { notas: j.notas, informe: j.informe, pendientes: j.pendientes, preguntasCliente: j.preguntasCliente, aplicados: res.aplicados, fallidos: res.fallidos } };
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
    const terceros = [
      ...(v.componentes?.lista || []).filter(x => (x.estado === 'usado' || x.estado === 'adaptado') && v.html.includes(x.id)),
      ...(v.iconos?.lista || []).filter(x => x.estado === 'usado' && v.html.includes(`data-icono="${x.id}"`))
    ];
    if (terceros.length) {
      const txt = await cargarLibreria().then(m => m.licenciasTerceros(terceros)).catch(() => '');
      archivos.push({ nombre: `${nombre}/LICENSES-TERCEROS.txt`, datos: txt || `Componentes de terceros usados:\n${terceros.map(x => `- ${x.nombre} · ${x.biblioteca} · ${x.licencia} · ${x.origen}`).join('\n')}\n` });
    }
    archivos.push({ nombre: `${nombre}/LEEME.txt`, datos: [
      `Web de «${estado.p.respuestas?.negocio || ''}» · ${refPedido(estado.p.id)}`,
      `Creada con IA (${v.modelo || 'Gemini'}) el ${new Date(v.createdAt || Date.now()).toLocaleString('es-ES')}.`,
      '', 'Contenido:', '- index.html: la web completa (CSS y JS dentro).', '- img/: fotos y logotipo del cliente.',
      ...(terceros.length ? ['- LICENSES-TERCEROS.txt: licencias del código de terceros que usa la web. No lo borres ni quites los avisos del código.'] : []),
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
