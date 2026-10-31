/* ==========================================================
   ANTES Y DESPUÉS (portada → #cambio)
   La misma barbería con la web típica de hace unos años (plantilla genérica,
   dibujada aquí mismo sin cargar nada) y con el diseño «Filo». Una barra deslizante enseña más
   de una o de otra: con el dedo, el ratón o el teclado (es un control
   de rango de verdad, accesible). Solo se carga al acercarse a la vista.
   ========================================================== */
const ANTES = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
/* La web típica de un negocio de hace unos años: plantilla genérica de WordPress a 960 px, letra pequeña,
   foto de banco de imágenes, tres cajas con iconos, barra lateral y aviso de cookies. Nada roto, solo anticuado. */
body{margin:0;background:#e9e9e9;font:13px/1.55 Arial,Helvetica,sans-serif;color:#555}
.p{width:960px;margin:0 auto;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.15)}
.top{background:#333;color:#bbb;font-size:11px;padding:6px 20px;display:flex;justify-content:space-between}
.cab{display:flex;justify-content:space-between;align-items:center;padding:22px 20px;border-bottom:3px solid #2a7ab8}
.logo{font:bold 28px Georgia,serif;color:#2a7ab8}.logo small{display:block;font:italic 12px Georgia,serif;color:#999}
.menu a{font-size:12px;text-transform:uppercase;color:#444;margin-left:18px;font-weight:bold}.menu a:first-child{color:#2a7ab8}
.slider{position:relative;height:300px;background:linear-gradient(135deg,#7d6b5d,#4a3f37 60%,#6b5a4c);display:flex;align-items:center;justify-content:center;text-align:center;color:#fff}
.slider h1{font:normal 34px Georgia,serif;margin:0 0 8px;text-shadow:1px 1px 3px rgba(0,0,0,.6)}.slider p{margin:0 0 16px;font-size:14px}
.slider a{display:inline-block;background:#2a7ab8;color:#fff;padding:8px 18px;border-radius:3px;font-size:12px;text-transform:uppercase}
.dots{position:absolute;bottom:12px;left:0;right:0}.dots i{display:inline-block;width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.5);margin:0 3px}.dots i:first-child{background:#fff}
.cajas{display:flex;gap:20px;padding:26px 20px;background:#f6f6f6;border-bottom:1px solid #e3e3e3}
.caja{flex:1;text-align:center;background:#fff;border:1px solid #e3e3e3;padding:18px}
.caja i{display:inline-block;width:46px;height:46px;border-radius:50%;background:#2a7ab8;color:#fff;font:bold 20px/46px Arial;font-style:normal}
.caja h3{font-size:15px;color:#333;margin:10px 0 6px}
.cuerpo{display:flex;gap:24px;padding:26px 20px}
.main{flex:1}.main h2{font:normal 22px Georgia,serif;color:#333;margin:0 0 10px;border-bottom:1px solid #eee;padding-bottom:8px}
.lat{width:250px}.lat h4{font-size:12px;text-transform:uppercase;color:#333;border-bottom:2px solid #2a7ab8;padding-bottom:5px;margin:0 0 8px}
.lat a{display:block;color:#2a7ab8;padding:4px 0;border-bottom:1px dotted #ddd;font-size:12px}
.lat .w{margin-bottom:20px}
.pie{background:#2b2b2b;color:#999;font-size:11px;padding:16px 20px;display:flex;justify-content:space-between}
.cookies{position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);color:#ddd;font-size:12px;padding:10px;text-align:center}
.cookies b{background:#2a7ab8;color:#fff;padding:4px 10px;margin-left:8px;border-radius:2px;font-weight:normal}
</style></head><body><div class="p">
<div class="top"><span>Tel: 600 123 456 · info@barberiafilo.com</span><span>Facebook · Twitter · Google+</span></div>
<div class="cab"><div class="logo">Barbería Filo<small>Tu barbería de confianza</small></div><div class="menu"><a>Inicio</a><a>Quiénes somos</a><a>Servicios</a><a>Galería</a><a>Blog</a><a>Contacto</a></div></div>
<div class="slider"><div><h1>Bienvenidos a Barbería Filo</h1><p>Los mejores cortes de pelo de la ciudad</p><a>Leer más</a></div><div class="dots"><i></i><i></i><i></i></div></div>
<div class="cajas"><div class="caja"><i>✂</i><h3>Cortes de pelo</h3>Cortes para caballero y niño con los mejores profesionales.</div><div class="caja"><i>★</i><h3>Arreglo de barba</h3>Perfilado y arreglo de barba con navaja.</div><div class="caja"><i>☎</i><h3>Pide cita</h3>Llámanos o pásate por nuestro local sin compromiso.</div></div>
<div class="cuerpo"><div class="main"><h2>Sobre nosotros</h2><p>Somos una barbería con muchos años de experiencia en el sector. Nuestro equipo de profesionales le ofrece un servicio de calidad en un ambiente agradable. Ofrecemos cortes de pelo, arreglo de barba, afeitado clásico y mucho más.</p><p>No dude en contactar con nosotros para cualquier consulta. Estaremos encantados de atenderle.</p><p><b>Horario:</b> Lunes a viernes de 10:00 a 20:30. Sábados de 9:30 a 14:00.</p></div>
<div class="lat"><div class="w"><h4>Entradas recientes</h4><a>¡Ya abrimos los sábados!</a><a>Nuevos productos para la barba</a><a>Feliz Navidad 2016</a></div><div class="w"><h4>Categorías</h4><a>Noticias</a><a>Ofertas</a><a>Sin categoría</a></div></div></div>
<div class="pie"><span>© 2016 Barbería Filo. Todos los derechos reservados.</span><span>Tema Business Pro · Funciona con WordPress</span></div>
</div><div class="cookies">Este sitio web utiliza cookies para mejorar su experiencia. Si continúa navegando acepta su uso. <b>Aceptar</b></div></body></html>`;

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
