/* ==========================================================
   FIRMA EN PANTALLA
   El cliente firma con el dedo (o el ratón) al confirmar un pedido y al
   aceptar un presupuesto de cambios extra. La firma se guarda como una
   imagen pequeña (PNG transparente, unos pocos KB) junto a su nombre y
   la fecha, y aparece en el detalle del pedido y en el resumen
   imprimible. Trazo suavizado (curvas por los puntos medios) y con un
   grosor que varía un poco con la velocidad, como un bolígrafo.
   ========================================================== */
import { $, esc, icono, abrir, cerrar, toast } from './ui.js';

let dlg = null;
/** Abre el panel de firma. Devuelve la imagen (data URL) o null si se cancela. */
export function pedirFirma({ titulo = 'Firma para aceptar', texto = '', nombre = '' } = {}) {
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg dlg-firma';
    dlg.setAttribute('aria-labelledby', 'fmTit');
    document.body.append(dlg);
  }
  dlg.innerHTML = `<div class="dlg-box">
    <button class="dlg-x" type="button" data-fm="no" aria-label="Cancelar">${icono('x')}</button>
    <h2 class="dlg-h" id="fmTit">${esc(titulo)}</h2>
    ${texto ? `<p class="fm-texto">${esc(texto)}</p>` : ''}
    <div class="fm-zona"><canvas aria-label="Zona para firmar con el dedo o el ratón" role="img"></canvas><span class="fm-guia" aria-hidden="true">Firma aquí</span><i class="fm-linea" aria-hidden="true"></i></div>
    <p class="fm-pie">${nombre ? `Firmado por <b>${esc(nombre)}</b> · ` : ''}${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="fm-btns"><button type="button" class="btn btn-ghost" data-fm="borrar">${icono('undo')}<span>Borrar</span></button><button type="button" class="btn btn-primary" data-fm="si"><span>Firmar y aceptar</span></button></div>
  </div>`;
  const cv = $('canvas', dlg), zona = $('.fm-zona', dlg), ctx = cv.getContext('2d');
  let trazos = 0, ultimo = null, medio = null, ancho = 2.4;
  const ajustar = () => {
    const r = zona.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(zona).color;
  };
  const punto = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    ultimo = punto(e); medio = ultimo; ancho = 2.6;
    ctx.beginPath(); ctx.arc(ultimo.x, ultimo.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    zona.classList.add('con-firma');
  });
  cv.addEventListener('pointermove', e => {
    if (!ultimo) return;
    const p = punto(e), v = Math.hypot(p.x - ultimo.x, p.y - ultimo.y) / Math.max(1, p.t - ultimo.t);
    ancho = ancho * .7 + Math.max(1.3, Math.min(3.2, 3.4 - v * 1.6)) * .3; // más rápido, más fino
    const m = { x: (ultimo.x + p.x) / 2, y: (ultimo.y + p.y) / 2 };
    ctx.lineWidth = ancho;
    ctx.beginPath(); ctx.moveTo(medio.x, medio.y); ctx.quadraticCurveTo(ultimo.x, ultimo.y, m.x, m.y); ctx.stroke();
    ultimo = p; medio = m;
  });
  const soltar = () => { if (ultimo) trazos++; ultimo = null; };
  cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
  abrir(dlg);
  requestAnimationFrame(ajustar);
  return new Promise(ok => {
    const fin = v => { dlg.removeEventListener('click', clic); dlg.removeEventListener('close', cerrado); cerrar(dlg); ok(v); };
    const cerrado = () => fin(null);
    const clic = e => {
      const b = e.target.closest('[data-fm]');
      if (!b) return;
      if (b.dataset.fm === 'no') return fin(null);
      if (b.dataset.fm === 'borrar') { ctx.clearRect(0, 0, cv.width, cv.height); trazos = 0; zona.classList.remove('con-firma'); return; }
      if (!trazos) { zona.classList.remove('sacude'); void zona.offsetWidth; zona.classList.add('sacude'); return toast('Firma en el recuadro para aceptar', 'err'); }
      // La firma se guarda en negro sobre transparente (se ve en el panel y en el documento imprimible)
      const out = document.createElement('canvas'); out.width = 480; out.height = Math.round(480 * cv.height / cv.width);
      const o = out.getContext('2d'); o.drawImage(cv, 0, 0, out.width, out.height);
      o.globalCompositeOperation = 'source-in'; o.fillStyle = '#16161b'; o.fillRect(0, 0, out.width, out.height);
      fin(out.toDataURL('image/png'));
    };
    dlg.addEventListener('click', clic);
    dlg.addEventListener('close', cerrado);
  });
}

/** Bloque para enseñar una firma guardada ({ img, nombre, t }) */
export const firmaHTML = (f, etiqueta = 'Firma') => f?.img && /^data:image\/png;base64,/.test(f.img)
  ? `<figure class="firma-ver"><img src="${f.img}" alt="${esc(etiqueta)} de ${esc(f.nombre || 'el cliente')}"><figcaption>${esc(etiqueta)} · ${esc(f.nombre || '')} · ${new Date(f.t).toLocaleString('es-ES')}</figcaption></figure>` : '';
