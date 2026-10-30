/* ==========================================================
   ANTES Y DESPUÉS (portada → #cambio)
   La misma barbería con una web anticuada (dibujada aquí mismo, sin
   cargar nada) y con el diseño «Filo». Una barra deslizante enseña más
   de una o de otra: con el dedo, el ratón o el teclado (es un control
   de rango de verdad, accesible). Solo se carga al acercarse a la vista.
   ========================================================== */
const ANTES = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body{margin:0;background:#c9c9c9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23c9c9c9'/%3E%3Cpath d='M0 0h4v4H0z' fill='%23bdbdbd'/%3E%3C/svg%3E");font-family:'Times New Roman',Times,serif;color:#222}
.p{width:820px;margin:0 auto;background:#fff;border:3px ridge #888}
.cab{background:linear-gradient(#3a6fd8,#1c3f8f);color:#ff0;text-align:center;padding:22px;font:bold 46px 'Comic Sans MS','Comic Sans',cursive;text-shadow:3px 3px 0 #000}
.menu{background:#e8e8e8;border-top:2px solid #fff;border-bottom:2px solid #777;text-align:center;padding:8px;font:15px Arial}
.menu a{color:#00e;margin:0 10px;text-decoration:underline}
.cin{background:#000;color:#0f0;font:bold 15px 'Courier New',monospace;padding:6px;white-space:nowrap;overflow:hidden}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:14px}
.lat{width:190px;background:#ffffcc;border-right:2px dashed #999;font:14px Verdana}
.lat b{color:#c00}h2{color:#900;font-size:26px;margin:0 0 8px}p{font-size:17px;line-height:1.3}
.foto{width:100%;height:210px;background:repeating-linear-gradient(45deg,#ddd 0 10px,#eee 10px 20px);border:2px inset #999;display:flex;align-items:center;justify-content:center;font:italic 15px Arial;color:#777}
.cont{font:13px Arial;color:#555;text-align:center;padding:10px;border-top:1px solid #aaa}
blink{color:red;font-weight:bold}
</style></head><body><div class="p">
<div class="cab">✂ BARBERIA FILO ✂</div>
<div class="menu"><a>Inicio</a>|<a>Quienes somos</a>|<a>Precios</a>|<a>Galeria</a>|<a>Contacto</a></div>
<div class="cin">*** BIENVENIDOS A NUESTRA PAGINA WEB *** OFERTA: CORTE + BARBA 20 EUROS *** LLAMENOS ***</div>
<table><tr><td class="lat"><b>NOVEDADES</b><br><br>01/03/2016<br>Abrimos los sabados!!<br><br>12/08/2015<br>Nueva pagina web<br><br><b>VISITAS:</b><br>000137<br><br><blink>¡NUEVO!</blink></td>
<td><h2>Bienvenidos</h2><p>Somos una barberia con muchos años de experiencia. Ofrecemos cortes de pelo para caballero y niños, arreglo de barba y mucho mas. Venga a vernos sin compromiso.</p>
<div class="foto">[ foto_local_2.jpg ]</div>
<p><b>Horario:</b> L-V 10:00-20:30 · Sabados 9:30-14:00<br><b>Telefono:</b> 600 123 456</p></td></tr></table>
<div class="cont">Pagina optimizada para Internet Explorer 6.0 · Resolucion 800x600 · © 2015</div>
</div></body></html>`;

export function iniciarAntesDespues(urlDespues) {
  const raiz = document.getElementById('antesDespues');
  if (!raiz) return;
  const vista = raiz.querySelector('.ad-vista'), rango = raiz.querySelector('.ad-rango');
  const poner = v => vista.style.setProperty('--x', `${v}%`);
  poner(rango.value);
  rango.addEventListener('input', () => poner(rango.value));
  // Tamaño: la web se dibuja a 1280 px y se escala al hueco (como las miniaturas de los diseños)
  new ResizeObserver(([e]) => vista.style.setProperty('--s', e.contentRect.width / 1280)).observe(vista);
  // Solo se cargan las dos webs cuando la sección está a punto de verse
  new IntersectionObserver((es, io) => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    raiz.querySelector('.ad-antes').srcdoc = ANTES;
    raiz.querySelector('.ad-despues iframe').src = urlDespues;
    // Un pequeño gesto para que se entienda que se puede deslizar (una sola vez y sin movimiento reducido)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.movimiento !== 'reducido') {
      const t0 = performance.now();
      const paso = t => { const k = Math.min(1, (t - t0) / 1600), v = 50 + 14 * Math.sin(k * Math.PI * 2) * (1 - k); poner(v); if (k < 1 && rango.value === '50') requestAnimationFrame(paso); else poner(rango.value); };
      setTimeout(() => requestAnimationFrame(paso), 900);
    }
  }, { rootMargin: '200px 0px' }).observe(raiz);
}
