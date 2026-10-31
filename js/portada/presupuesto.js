/* ==========================================================
   PRESUPUESTO EN PDF (calculadora de la portada)
   Con lo que haya elegido el visitante en la calculadora se genera un
   PDF en su propio navegador (no se envía nada a ningún sitio) para que
   se lo pueda guardar, enseñar o comparar. Incluye un enlace que abre el
   pedido con ese mismo tipo de web.
   Usa jsPDF (js/vendor/jspdf.umd.min.js), el mismo que el brief del panel.
   ========================================================== */
import { CONFIG } from '../../config.js';
import { euros, ivaTexto, desgloseIVA, datosLegalesPendientes } from '../base/ui.js';

let cargando;
function cargarJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  cargando ||= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/jspdf.umd.min.js', import.meta.url).href;
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { cargando = null; mal(new Error('No se ha podido preparar el PDF. Revisa tu conexión e inténtalo de nuevo.')); };
    document.head.appendChild(s);
  });
  return cargando;
}

// Las fuentes estándar del PDF no tienen todos los símbolos: se cambian por equivalentes
const limpio = t => String(t ?? '').replace(/[−–]/g, '-').replace(/[   ]/g, ' ').replace(/[→]/g, '->');
const fechaLarga = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Logo de la web como imagen para el PDF (o null si no se puede) */
async function logo() {
  try {
    const bmp = await createImageBitmap(await (await fetch('icons/logo-a.png')).blob());
    const cv = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
    cv.getContext('2d').drawImage(bmp, 0, 0);
    return cv.toDataURL('image/png');
  } catch { return null; }
}

/**
 * e = lo que calcula la calculadora:
 * { plan, extras: [{nombre, precio, mensual}], urgente, pctUrgente, recargo, descuento, pctDescuento,
 *   total, senal, resto, mensual, entrega (Date) }
 */
export async function descargarPresupuesto(e) {
  const jsPDF = await cargarJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const W = 210, M = 18, ANCHO = W - 2 * M;
  const VERDE = [79, 133, 12], TINTA = [22, 22, 27], GRIS = [110, 108, 102], LINEA = [226, 224, 216];
  const hoy = new Date();
  const ref = `P-${hoy.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const web = (CONFIG.dominio || location.host || 'aurevixweb.es').replace(/^www\./, '');
  const enlace = `https://${web}/?comprar=${encodeURIComponent(e.plan.id)}`;
  const set = (size, color = TINTA, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color); };

  // Cabecera
  doc.setFillColor(12, 12, 14); doc.rect(0, 0, W, 50, 'F');
  doc.setFillColor(200, 245, 96); doc.rect(0, 50, W, 2, 'F');
  const img = await logo();
  if (img) doc.addImage(img, 'PNG', M, 11, 11, 11);
  set(9, [200, 245, 96], true); doc.text(limpio(`${CONFIG.marca.toUpperCase()} · PRESUPUESTO`), M + (img ? 15 : 0), 18);
  set(21, [243, 241, 234], true); doc.text(limpio(`Tu web: ${e.plan.nombre}`), M, 34);
  set(10, [170, 168, 160]); doc.text(limpio(`Nº ${ref} · Emitido el ${fechaLarga(hoy)}`), M, 42.5);
  let y = 64;

  // Conceptos
  set(8.5, GRIS, true); doc.text('CONCEPTO', M, y); doc.text('IMPORTE', W - M, y, { align: 'right' });
  y += 3; doc.setDrawColor(...LINEA); doc.line(M, y, W - M, y); y += 7;
  const fila = (t, v, { color = TINTA, bold = false } = {}) => {
    set(11, color, bold);
    const L = doc.splitTextToSize(limpio(t), ANCHO - 40);
    doc.text(L, M, y); doc.text(limpio(v), W - M, y, { align: 'right' });
    y += L.length * 5 + 3;
    doc.setDrawColor(...LINEA); doc.line(M, y - 2.5, W - M, y - 2.5); y += 3;
  };
  // El tipo de web, en negrita, con su descripción debajo en pequeño
  set(11, TINTA, true); doc.text(limpio(e.plan.nombre), M, y); doc.text(limpio(euros(e.plan.precio)), W - M, y, { align: 'right' });
  if (e.plan.desc) { set(9, GRIS); const D = doc.splitTextToSize(limpio(e.plan.desc), ANCHO - 40); doc.text(D, M, y + 5); y += D.length * 4; }
  y += 8; doc.setDrawColor(...LINEA); doc.line(M, y - 2.5, W - M, y - 2.5); y += 3;
  e.extras.filter(x => !x.mensual).forEach(x => fila(x.nombre, `+${euros(x.precio)}`));
  if (e.recargo) fila(`Entrega urgente (+${e.pctUrgente} %)`, `+${euros(e.recargo)}`);
  if (e.descuento) fila(`Descuento de bienvenida (-${e.pctDescuento} %, solo en tu primera web)`, `-${euros(e.descuento)}`, { color: VERDE });

  // Total
  y += 2;
  doc.setFillColor(244, 250, 232); doc.setDrawColor(...VERDE); doc.roundedRect(M, y, ANCHO, 24, 3, 3, 'FD');
  set(10, GRIS); doc.text('Total', M + 6, y + 9);
  set(22, TINTA, true); doc.text(limpio(euros(e.total)), W - M - 6, y + 12, { align: 'right' });
  const iva = desgloseIVA(e.total);
  set(9, GRIS); doc.text(limpio(CONFIG.iva ? `${ivaTexto()} · base ${euros(iva.base)} + IVA ${iva.pct} % ${euros(iva.cuota)}` : ivaTexto()), M + 6, y + 18.5);
  y += 30;
  if (e.mensual) {
    set(10.5, TINTA, true); doc.text('Cuotas mensuales', M, y);
    set(10.5); doc.text(limpio(`${euros(e.mensual)}/mes`), W - M, y, { align: 'right' }); y += 5;
    set(9, GRIS); doc.text(limpio(e.extras.filter(x => x.mensual).map(x => `${x.nombre} (${euros(x.precio)}/mes)`).join(' · ')), M, y, { maxWidth: ANCHO }); y += 9;
  }

  // Pago y plazo
  const caja = (x, w, titulo, valor, nota) => {
    doc.setDrawColor(...LINEA); doc.setFillColor(248, 247, 243); doc.roundedRect(x, y, w, 22, 2.5, 2.5, 'FD');
    set(8.5, GRIS); doc.text(limpio(titulo), x + 5, y + 7);
    set(13, TINTA, true); doc.text(limpio(valor), x + 5, y + 14.5);
    if (nota) { set(8, GRIS); doc.text(limpio(nota), x + 5, y + 19.5); }
  };
  const tw = (ANCHO - 8) / 3;
  caja(M, tw, `Para empezar (${CONFIG.senal} %)`, euros(e.senal), 'Al confirmar el pedido');
  caja(M + tw + 4, tw, 'Al entregarte la web', euros(e.resto), 'Cuando la hayas aprobado');
  caja(M + 2 * (tw + 4), tw, 'Entrega estimada', e.entrega.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), e.urgente ? 'Con entrega urgente' : (e.plan.entrega || ''));
  y += 29;

  // Qué incluye
  if (e.plan.incluye?.length) {
    set(12, TINTA, true); doc.text('Qué incluye', M, y); y += 6;
    set(10.5, TINTA);
    e.plan.incluye.forEach(i => { doc.setFillColor(...VERDE); doc.circle(M + 1.3, y - 1.3, 1, 'F'); doc.text(limpio(i), M + 5, y); y += 5.5; });
    y += 2;
  }

  // Condiciones
  set(12, TINTA, true); doc.text('Condiciones', M, y); y += 6;
  set(9.5, GRIS);
  const formas = CONFIG.pagos?.bizum ? 'Bizum o transferencia bancaria' : 'transferencia bancaria';
  const cond = [
    `Precio cerrado: no cambia a mitad del proyecto. Pago por ${formas}, sin comisiones.`,
    `Se paga el ${CONFIG.senal} % para empezar y el resto cuando la web está terminada y la has aprobado.`,
    'Tienes 14 días para desistir del contrato, como establece la ley.',
    `Precios vigentes a ${fechaLarga(hoy)}. El total definitivo lo ves antes de confirmar el pedido.`
  ];
  cond.forEach(t => { const L = doc.splitTextToSize(limpio(t), ANCHO); doc.text(L, M, y); y += L.length * 4.2 + 1.2; });
  y += 3;

  // Llamada a la acción
  doc.setFillColor(200, 245, 96); doc.roundedRect(M, y, ANCHO, 16, 3, 3, 'F');
  set(11.5, TINTA, true); doc.text(limpio('¿Te encaja? Pídela en un par de minutos:'), M + 6, y + 6.6);
  set(10, [40, 70, 8], true); doc.textWithLink(limpio(enlace.replace(/^https:\/\//, '')), M + 6, y + 12, { url: enlace });

  y += 16;

  // Pie: debajo de todo, en una página nueva si no cabe. Los datos legales solo si ya están rellenos en Ajustes
  if (y > 280) { doc.addPage(); y = 270; }
  const pie = Math.max(y + 8, 283);
  const L = CONFIG.legal || {};
  set(8, GRIS);
  doc.text(limpio([CONFIG.marca, web, CONFIG.email].filter(Boolean).join(' · ')), W / 2, pie, { align: 'center' });
  if (!datosLegalesPendientes().length) doc.text(limpio([L.titular, L.nif && `NIF ${L.nif}`, L.domicilio].filter(Boolean).join(' · ')), W / 2, pie + 4.5, { align: 'center', maxWidth: ANCHO });

  doc.setProperties({ title: `Presupuesto ${CONFIG.marca} · ${e.plan.nombre}`, subject: 'Presupuesto de página web', author: CONFIG.marca, creator: web });
  doc.save(`Presupuesto-${CONFIG.marca}-${e.plan.nombre.replace(/[^\wáéíóúñ]+/gi, '-')}.pdf`);
}
