/* ==========================================================
   BRIEF DEL PROYECTO (panel del equipo)
   Reúne todo lo que ha pedido y enviado el cliente (pedido,
   cuestionario, contacto, dominio y correo, contenido, archivos,
   cambios) y:
   1. Pide a la IA un prompt detallado para crear la web
      (si la IA no está, se hace uno completo con plantilla).
   2. Genera un PDF bien estructurado con todo, logotipo y fotos
      incluidos, y el prompt al final.
   Se carga solo al pulsar «Brief con IA» en el pedido.
   ========================================================== */
import { CONFIG, PLANES } from '../../config.js';
import * as store from '../base/store.js';
import { refPedido, fecha } from '../base/ui.js';
import { plantillaPorId } from '../portada/plantillas.js';
import { MAS_CONTENIDO, fechaEntrega, ETAPAS, etapaDe } from './proyecto.js';

const eur = n => `${(Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

/* ---------- 1. Los datos, ordenados por secciones ---------- */
export function datosBrief(p, archivos = []) {
  const r = p.respuestas || {}, c = p.contenido || {}, d = p.dominio || {};
  const plan = PLANES.find(x => x.id === p.plan);
  const pl = plantillaPorId(p.plantilla);
  const kv = (k, v) => (v || v === 0 ? [k, String(v)] : null);
  const sec = (titulo, filas) => ({ titulo, filas: filas.filter(Boolean) });
  const dominio = d.nombre || r.dominio || '';
  const correo = d.correo || r.correo || '';
  const correoTipo = d.correoTipo || r.correoTipo || (/@gmail\.com$/.test(correo) ? 'gmail' : correo ? 'dominio' : '');
  return {
    negocio: r.negocio || p.planNombre || 'Proyecto',
    ref: refPedido(p.id),
    plan: p.planNombre,
    color: r.color || '',
    secciones: [
      sec('Pedido', [
        kv('Tipo de web', p.planNombre), kv('Incluye', plan?.incluye?.join(' · ')),
        kv('Diseño de partida', pl ? `${pl.nombre} (${pl.sector})` : 'Desde cero, a medida'),
        kv('Extras', (p.extras || []).map(x => `${x.nombre} (${eur(x.precio)}${x.mensual ? '/mes' : ''})`).join(' · ') || 'Ninguno'),
        p.urgente ? kv('Entrega urgente', 'Sí') : null,
        kv('Total', `${eur(p.total)} IVA incluido${p.mensual ? ` + ${eur(p.mensual)}/mes` : ''}`),
        kv('Fecha del pedido', p.createdAt ? fecha(p.createdAt) : ''), kv('Entrega prevista', fecha(fechaEntrega(p))),
        kv('Etapa actual', ETAPAS.find(e => e.id === etapaDe(p))?.txt), kv('Pago', { pendiente: 'Sin pagar', verificando: 'Por verificar', senal: 'Señal pagada', pagado: 'Pagado' }[p.pagoEstado || 'pendiente'])
      ]),
      sec('Cliente', [kv('Nombre', r.contactoNombre || p.clienteNombre), kv('Correo', r.email || p.clienteEmail), kv('Teléfono', r.telefono)]),
      sec('Negocio y objetivo', [
        kv('Nombre del negocio', r.negocio), kv('Sector', r.sector), kv('Objetivo de la web', r.objetivo), kv('Web actual', r.webActual),
        kv('Estilo', r.estilo), kv('Color principal', r.color || 'Los colores del diseño'), kv('Logotipo', r.logo), kv('Textos y fotos', r.contenido),
        kv('Comentarios del pedido', r.comentarios)
      ]),
      sec('Dominio y correo', [
        kv('Dominio', dominio ? `www.${dominio}${(d.tipo || r.dominioTipo) === 'propio' ? ' (ya es del cliente: hay que conectarlo)' : ' (registrar nuevo a nombre del cliente)'}` : 'Sin elegir todavía'),
        kv('Correo del negocio', correo ? `${correo} · ${correoTipo === 'gmail' ? 'Gmail (lo creamos nosotros y le pasamos usuario y contraseña)' : 'buzón con su dominio (crear, configurar y pasarle usuario y contraseña)'}` : 'Sin elegir todavía')
      ]),
      sec('Contenido que ha enviado', [
        kv('Sobre el negocio', c.sobre), kv('Servicios y precios', c.servicios), kv('Horario', c.horario), kv('Dirección o zona', c.zona),
        kv('Redes sociales', c.redes), kv('Contacto que se publica', c.contactoWeb), kv('Enlace a fotos', c.fotos), kv('Enlace al logotipo', c.logo)
      ]),
      sec('Más detalles', MAS_CONTENIDO.filter(([k]) => !['zona', 'contactoWeb'].includes(k)).map(([k, label]) => kv(label, c[k]))),
      sec('Cambios pedidos en la revisión', (p.revision?.comentarios || []).map((x, i) => kv(`${i + 1}.${x.hecho ? ' (hecho)' : ''}`, `${x.texto}${x.v ? ` (versión ${x.v})` : ''}`))),
      sec('Archivos del cliente', archivos.map(a => kv(a.nombre, `${a.tipo || 'archivo'} · ${Math.max(1, Math.round((a.tam || 0) / 1024))} KB`)))
    ].filter(s => s.filas.length)
  };
}

/* ---------- 2. El prompt ---------- */
/** Prompt hecho con plantilla (también es lo que recibe la IA como datos) */
export function promptPlantilla(b) {
  const lineas = [`Crea la web de «${b.negocio}» (${b.plan}) con estos datos del cliente. No inventes datos: si falta algo, deja [FALTA: …].`, ''];
  for (const s of b.secciones) {
    if (s.titulo === 'Archivos del cliente') continue;
    lineas.push(`## ${s.titulo}`, ...s.filas.map(([k, v]) => `- ${k}: ${v}`), '');
  }
  lineas.push('## Requisitos',
    '- Diseño adaptado a móvil primero, rápido y accesible (contraste, textos alternativos, foco visible).',
    '- Español de España, tono cercano y profesional. Llamadas a la acción claras según el objetivo.',
    '- SEO local: título y meta descripción con el sector y la ciudad, encabezados ordenados y datos de contacto en texto.',
    '- Formulario de contacto, aviso legal, privacidad y cookies.');
  return lineas.join('\n');
}

/** Prompt escrito por la IA a partir de los datos. Devuelve { texto, ia } */
export async function promptIA(b) {
  const base = promptPlantilla(b);
  if (!store.iaDisponible()) return { texto: base, ia: false };
  try {
    const d = await store.preguntarIA({ modo: 'brief', datos: base });
    if (d?.prompt && d.prompt.length > 200) return { texto: d.prompt, ia: true };
  } catch (e) { console.warn(e); }
  return { texto: base, ia: false };
}

/* ---------- 3. El PDF ---------- */
let cargando;
function cargarJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  cargando ||= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/jspdf.umd.min.js', import.meta.url).href;
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { cargando = null; mal(new Error('No se ha podido cargar el generador de PDF')); };
    document.head.appendChild(s);
  });
  return cargando;
}

// Las fuentes estándar del PDF no tienen todos los símbolos: se cambian por equivalentes
const limpio = t => String(t ?? '')
  .replace(/[→⇒➜]/g, '->').replace(/[←]/g, '<-').replace(/[✓✔]/g, 'Si').replace(/[•●▪]/g, '·')
  .replace(/[   ]/g, ' ').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, '');

/** Foto o logotipo del cliente, reducido a JPEG para el PDF (o null si no se puede) */
async function imagen(a, max = 1100) {
  try {
    const url = await store.urlArchivo(a);
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); // los PNG transparentes, sobre blanco
    cx.drawImage(bmp, 0, 0, cv.width, cv.height);
    return { data: cv.toDataURL('image/jpeg', 0.82), w: cv.width, h: cv.height, nombre: a.nombre };
  } catch { return null; }
}

const hexRGB = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

/** Crea el PDF y lo descarga. alProgreso(texto) para ir contando qué hace */
export async function pdfBrief(p, b, prompt, archivos = [], { alProgreso = () => {} } = {}) {
  alProgreso('Preparando el PDF…');
  const jsPDF = await cargarJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const W = 210, H = 297, M = 18, ANCHO = W - 2 * M;
  const VERDE = [79, 133, 12], TINTA = [22, 22, 27], GRIS = [110, 108, 102], LINEA = [226, 224, 216];
  let y = M;
  const nueva = () => { doc.addPage(); y = M + 6; };
  const sitio = h => { if (y + h > H - 20) nueva(); };
  const texto = (t, { size = 10, color = TINTA, bold = false, ancho = ANCHO, x = M, salto = 1.35 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    const L = doc.splitTextToSize(limpio(t), ancho);
    const alto = size * 0.3528 * salto;
    for (const l of L) { sitio(alto); doc.text(l, x, y + alto * 0.8); y += alto; }
  };

  // Portada
  doc.setFillColor(12, 12, 14); doc.rect(0, 0, W, 62, 'F');
  const col = hexRGB(b.color);
  doc.setFillColor(...(col || [200, 245, 96])); doc.rect(0, 62, W, 2.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 245, 96);
  doc.text(limpio(`${CONFIG.marca.toUpperCase()} · BRIEF DEL PROYECTO`), M, 20);
  doc.setFontSize(24); doc.setTextColor(243, 241, 234);
  doc.text(doc.splitTextToSize(limpio(b.negocio), ANCHO).slice(0, 2), M, 33);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(170, 168, 160);
  doc.text(limpio(`${b.plan} · ${b.ref} · Generado el ${fecha(Date.now())}`), M, 52);
  y = 74;

  // Logotipo y fotos (las primeras imágenes que ha subido el cliente)
  const imgs = archivos.filter(a => /^image\/(png|jpe?g|webp|gif)/i.test(a.tipo || '') || /\.(png|jpe?g|webp|gif)$/i.test(a.nombre || ''));
  const logo = imgs.find(a => /logo/i.test(a.nombre)) || null;
  const fotos = imgs.filter(a => a !== logo).slice(0, 8);
  let logoImg = null;
  if (logo) { alProgreso('Añadiendo el logotipo…'); logoImg = await imagen(logo, 900); }

  // Resumen rápido en tarjetas
  const resumen = [
    ['Tipo de web', b.plan],
    ['Dominio', b.secciones.find(s => s.titulo === 'Dominio y correo')?.filas[0]?.[1]?.split(' (')[0] || '—'],
    ['Entrega prevista', b.secciones[0].filas.find(f => f[0] === 'Entrega prevista')?.[1] || '—']
  ];
  const tw = (ANCHO - 8) / 3;
  resumen.forEach(([k, v], i) => {
    const x = M + i * (tw + 4);
    doc.setDrawColor(...LINEA); doc.setFillColor(248, 247, 243); doc.roundedRect(x, y, tw, 18, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(limpio(k), x + 4, y + 6.5);
    // El valor cabe entero: se reduce la letra y, si aun así no cabe, se corta con «…»
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...TINTA);
    let t = limpio(v), fs = 10.5;
    for (; fs > 7.5 && doc.setFontSize(fs).getTextWidth(t) > tw - 8; fs -= 0.5);
    while (t.length > 4 && doc.getTextWidth(t) > tw - 8) t = t.slice(0, -2) + '…';
    doc.text(t, x + 4, y + 13);
  });
  y += 26;
  if (logoImg) {
    const h = 26, w = Math.min(70, h * logoImg.w / logoImg.h);
    texto('Logotipo', { size: 8.5, color: GRIS, bold: true }); y += 1;
    sitio(h + 4); doc.addImage(logoImg.data, 'JPEG', M, y, w, h); y += h + 6;
  }

  // Secciones
  const tituloSec = t => {
    sitio(30); y += 3; // el título va siempre con algo debajo
    doc.setFillColor(...VERDE); doc.rect(M, y + 1, 1.4, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TINTA); doc.text(limpio(t), M + 4, y + 6);
    y += 10; doc.setDrawColor(...LINEA); doc.line(M, y, W - M, y); y += 3;
  };
  for (const s of b.secciones) {
    if (s.titulo === 'Archivos del cliente') continue;
    alProgreso(`Escribiendo «${s.titulo}»…`);
    tituloSec(s.titulo);
    for (const [k, v] of s.filas) {
      const largo = v.length > 70 || v.includes('\n');
      if (largo) {
        sitio(16); // la etiqueta nunca se queda sola al final de la página
        texto(k, { size: 9, color: GRIS, bold: true }); y += 0.5;
        texto(v, { size: 10.2, salto: 1.45 }); y += 2.5;
      } else {
        // Clave y valor en la misma línea
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.2);
        const L = doc.splitTextToSize(limpio(v), ANCHO - 52);
        const alto = Math.max(1, L.length) * 4.9 + 1.5;
        sitio(alto);
        doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(limpio(k), M, y + 4);
        doc.setFontSize(10.2); doc.setTextColor(...TINTA); doc.text(L, M + 52, y + 4);
        if (k === 'Color principal' && col) { doc.setFillColor(...col); doc.roundedRect(W - M - 10, y + 0.6, 10, 4.6, 1, 1, 'F'); }
        y += alto;
      }
    }
  }

  // Archivos: lista y fotos
  if (archivos.length) {
    tituloSec('Archivos del cliente');
    for (const a of archivos) texto(`· ${a.nombre}  (${Math.max(1, Math.round((a.tam || 0) / 1024))} KB)`, { size: 9.5 });
    if (fotos.length) {
      y += 3;
      const cel = (ANCHO - 6) / 3, alto = cel * 0.72;
      let i = 0;
      for (const f of fotos) {
        alProgreso(`Añadiendo fotos (${i + 1} de ${fotos.length})…`);
        const img = await imagen(f);
        if (!img) continue;
        const colx = i % 3;
        if (colx === 0) sitio(alto + 8);
        const x = M + colx * (cel + 3);
        const k = Math.min(cel / img.w, alto / img.h), w = img.w * k, h = img.h * k;
        doc.setFillColor(244, 243, 238); doc.rect(x, y, cel, alto, 'F');
        doc.addImage(img.data, 'JPEG', x + (cel - w) / 2, y + (alto - h) / 2, w, h);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
        doc.text(doc.splitTextToSize(limpio(f.nombre), cel)[0], x, y + alto + 4);
        if (colx === 2) y += alto + 8;
        i++;
      }
      if (i % 3) y += alto + 8;
    }
  }

  // Prompt para crear la web
  nueva();
  tituloSec(prompt.ia ? 'Prompt para crear la web (escrito por la IA)' : 'Prompt para crear la web');
  texto('Cópialo en tu herramienta de IA o úsalo como guion del proyecto.', { size: 9, color: GRIS }); y += 2;
  for (const linea of limpio(prompt.texto).split('\n')) {
    if (!linea.trim()) { y += 2; continue; }
    const tit = /^#{1,3}\s/.test(linea) || /^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ,()/-]{3,}/.test(linea);
    texto(linea.replace(/^#{1,3}\s/, '').replace(/\*\*/g, ''), { size: tit ? 11.5 : 9.8, bold: tit, salto: 1.42 });
    if (tit) y += 1;
  }

  // Pie con número de página
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 148, 140);
    doc.text(limpio(`${CONFIG.marca} · ${b.negocio} · ${b.ref}`), M, H - 10);
    doc.text(`${i} / ${n}`, W - M, H - 10, { align: 'right' });
  }
  const nombre = `brief-${b.negocio.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/^-|-$/g, '') || 'proyecto'}-${b.ref.replace(/\W/g, '')}.pdf`;
  doc.save(nombre);
  return nombre;
}
