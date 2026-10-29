/* ==========================================================
   INTRO EN VÍDEO DE LA PORTADA (solo ordenador)
   La sección mide varias pantallas; dentro, el vídeo se queda fijo y
   avanza o retrocede con el scroll. La activa el <head> (html.mundo-ok)
   para que la página no salte al cargar; en móvil no existe.
   - El vídeo se descarga entero (Blob): así siempre se puede saltar a
     cualquier momento sin esperar a la red.
   - Mientras llega, se ven fotos fijas del vídeo según el scroll.
   - Nunca se pide otro salto mientras el anterior no ha terminado.
   ========================================================== */
const html = document.documentElement;
const sec = document.getElementById('mundo');
if (sec && html.classList.contains('mundo-ok')) iniciar();

function iniciar() {
  const v = sec.querySelector('.mundo-video');
  const foto = sec.querySelector('.mundo-foto');
  const barra = sec.querySelector('.mundo-barra i');
  // Segundo de cada foto fija (video/intro-N.webp) sobre 35 s de vídeo
  const FOTOS = [1, 5.5, 8.5, 10.5, 15, 19.5, 23.5, 28, 32];
  const LARGO = 35;
  const clamp = n => Math.min(1, Math.max(0, n));
  let objetivo = 0, actual = 0, dur = 0, listo = false, vivo = false, fotoN = 0, ultimo = -1;

  const pin = sec.querySelector('.mundo-pin');
  const progreso = () => {
    const r = sec.getBoundingClientRect();
    return clamp((pin.getBoundingClientRect().top - r.top) / Math.max(1, r.height - pin.offsetHeight));
  };
  // La cabecera se pinta desde JS: se vuelve a medir cada vez que cambia de alto
  const cab = document.getElementById('header');
  new ResizeObserver(() => sec.style.setProperty('--cab', `${cab.offsetHeight || 72}px`)).observe(cab);
  function ponerFoto(p) {
    const t = p * LARGO;
    let n = 1;
    FOTOS.forEach((s, i) => { if (t >= s - 1.5) n = i + 1; });
    if (n !== fotoN) { fotoN = n; foto.src = `video/intro-${n}.webp`; }
  }

  function cuadro() {
    if (!vivo) return;
    requestAnimationFrame(cuadro);
    objetivo = progreso();
    barra.style.transform = `scaleX(${objetivo})`;
    sec.classList.toggle('empezado', objetivo > 0.015);
    sec.classList.toggle('final', objetivo > 0.97);
    if (!listo) { ponerFoto(objetivo); return; }
    if (v.seeking) return;
    actual += (objetivo - actual) * 0.18;
    if (Math.abs(objetivo - actual) * dur < 0.008) actual = objetivo;
    const t = Math.min(actual * dur, dur - 0.05);
    if (Math.abs(t - ultimo) > 0.004) { ultimo = t; v.currentTime = t; }
  }

  // Solo se trabaja mientras la intro está en pantalla
  new IntersectionObserver(([e]) => {
    html.classList.toggle('mundo-viendo', e.isIntersecting);
    if (e.isIntersecting && !vivo) { vivo = true; requestAnimationFrame(cuadro); }
    else if (!e.isIntersecting) vivo = false;
  }).observe(sec);

  ponerFoto(progreso());
  // El resto de fotos, por detrás (pesan poco) para que no haya huecos al bajar rápido
  addEventListener('load', () => FOTOS.forEach((_, i) => { const im = new Image(); im.src = `video/intro-${i + 1}.webp`; }), { once: true });

  // El vídeo (unos 23 MB) solo se descarga cuando la persona empieza a recorrer la intro:
  // quien entra y se va, o pulsa «Saltar intro», no lo baja. Con ahorro de datos o una
  // conexión lenta se queda en fotos fijas.
  const con = navigator.connection;
  if (con?.saveData || /(^|-)2g|3g/.test(con?.effectiveType || '')) return;
  const gestos = ['scroll', 'wheel', 'touchmove', 'keydown'];
  const quiereVerla = () => {
    const r = sec.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < innerHeight * 1.5) return; // fuera de la intro o ya casi al final
    gestos.forEach(g => removeEventListener(g, quiereVerla));
    cargarVideo();
  };
  gestos.forEach(g => addEventListener(g, quiereVerla, { passive: true }));
  // Si se vuelve atrás y la página ya está a mitad de la intro, se carga directamente
  if (scrollY > 0) requestAnimationFrame(quiereVerla);

  function cargarVideo() {
    fetch('video/intro.mp4')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(b => {
        v.addEventListener('loadedmetadata', () => {
          dur = v.duration || LARGO;
          actual = progreso();
          v.addEventListener('seeked', () => { listo = true; sec.classList.add('con-video'); }, { once: true });
          v.currentTime = Math.min(actual * dur, dur - 0.05);
          // Safari pinta mejor los saltos si el vídeo se ha reproducido una vez
          v.play()?.then(() => v.pause()).catch(() => {});
        }, { once: true });
        v.preload = 'auto';
        v.src = URL.createObjectURL(b);
      })
      .catch(() => {}); // sin vídeo, la intro sigue con las fotos fijas
  }
}
