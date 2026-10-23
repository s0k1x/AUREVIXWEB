/* ==========================================================
   Plantillas de webs predeterminadas
   Cada una se pinta en plantilla.html?t=ID&n=Nombre&c=%23color
   Para añadir una nueva: copia un bloque y cambia textos/colores
   ========================================================== */

export const PLANTILLAS = [
  {
    id: 'filo', nombre: 'Filo', sector: 'Barbería · Peluquería', desc: 'Oscuro y elegante, con lista de precios y reservas.',
    marca: 'Barbería Filo',
    fuentes: { d: 'Oswald', b: 'Work Sans', url: 'family=Oswald:wght@500;600;700&family=Work+Sans:wght@400;500;600' },
    c: { bg: '#0f0d0b', surface: '#1a1612', text: '#f1e9dc', muted: '#a8998a', accent: '#c9a24a' },
    estilo: { radio: '2px', mayus: true, peso: 600 },
    hero: { tipo: 'center', kicker: 'Desde 2015 · Centro ciudad', titulo: 'Cortes con oficio.', texto: 'Barbería clásica con técnica moderna. Pide tu cita en un minuto y olvídate de esperar.', cta: 'Reservar cita', cta2: 'Ver precios' },
    secciones: [
      { tipo: 'lista', id: 'precios', titulo: 'Servicios y precios', grupos: [{ items: [['Corte clásico', '14 €', '30 min'], ['Degradado / fade', '16 €', '40 min'], ['Arreglo de barba', '10 €', '20 min'], ['Corte + barba', '22 €', '50 min'], ['Afeitado a navaja', '15 €', '30 min'], ['Corte infantil', '10 €', '25 min']] }] },
      { tipo: 'galeria', titulo: 'Nuestro trabajo' },
      { tipo: 'opiniones', titulo: 'Lo que dicen', items: [['Javier M.', 'El mejor degradado que me han hecho. Ya no voy a otro sitio.'], ['Rubén S.', 'Trato de 10 y siempre puntuales con la cita.'], ['Álex P.', 'Ambiente top y precios muy justos.']] },
      { tipo: 'info', titulo: 'Ven a vernos', horario: [['Lunes a viernes', '10:00 – 20:30'], ['Sábados', '9:30 – 14:00'], ['Domingos', 'Cerrado']], direccion: 'Calle Mayor, 12 · Centro' },
      { tipo: 'cta', titulo: '¿Te toca corte?', texto: 'Reserva ahora y te guardamos tu hueco.', boton: 'Reservar por WhatsApp' }
    ]
  },
  {
    id: 'brasa', nombre: 'Brasa', sector: 'Restaurante · Bar', desc: 'Cálido y cercano, con carta digital y reservas.',
    marca: 'Brasa & Co.',
    fuentes: { d: 'Fraunces', b: 'Inter', url: 'family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600' },
    c: { bg: '#f6efe4', surface: '#fffaf2', text: '#2a1d14', muted: '#7a6656', accent: '#c4532d' },
    estilo: { radio: '16px', mayus: false, peso: 700 },
    hero: { tipo: 'split', kicker: 'Cocina a la brasa · Producto local', titulo: 'Fuego lento, sabor de siempre.', texto: 'Carnes, verduras de temporada y postres caseros en el corazón del barrio.', cta: 'Reservar mesa', cta2: 'Ver la carta' },
    secciones: [
      { tipo: 'ventajas', items: [['🔥', 'Brasa de encina', 'Cocinamos todo al carbón vegetal.'], ['🥬', 'Km 0', 'Verdura de huertas de la zona.'], ['🍰', 'Postres caseros', 'Hechos cada mañana.']] },
      { tipo: 'lista', id: 'carta', titulo: 'La carta', grupos: [
        { nombre: 'Para empezar', items: [['Croquetas de jamón (6)', '8,50 €'], ['Pimientos asados con ventresca', '11 €'], ['Provoleta a la brasa', '9 €']] },
        { nombre: 'Principales', items: [['Chuletón de vaca madurada (1 kg)', '48 €'], ['Secreto ibérico', '17 €'], ['Lubina a la brasa', '19 €']] },
        { nombre: 'Postres', items: [['Tarta de queso', '6 €'], ['Torrija caramelizada', '6,50 €']] }
      ] },
      { tipo: 'galeria', titulo: 'Un vistazo' },
      { tipo: 'info', titulo: 'Horario y ubicación', horario: [['Martes a jueves', '13:00 – 16:00 · 20:00 – 23:30'], ['Viernes y sábado', '13:00 – 16:30 · 20:00 – 00:30'], ['Domingo', '13:00 – 17:00'], ['Lunes', 'Cerrado']], direccion: 'Plaza del Carmen, 4' },
      { tipo: 'cta', titulo: 'Te guardamos mesa', texto: 'Reserva en un momento por WhatsApp.', boton: 'Reservar mesa' }
    ]
  },
  {
    id: 'kiosko', nombre: 'Kiosko', sector: 'Tienda online', desc: 'Limpio y moderno, con catálogo y carrito.',
    marca: 'Kiosko',
    fuentes: { d: 'Space Grotesk', b: 'Inter', url: 'family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600' },
    c: { bg: '#f7f7f5', surface: '#ffffff', text: '#111111', muted: '#6b6b6b', accent: '#2f5bff' },
    estilo: { radio: '14px', mayus: false, peso: 700 },
    hero: { tipo: 'split', kicker: 'Nueva colección', titulo: 'Diseño que se usa todos los días.', texto: 'Productos hechos en pequeñas tiradas. Envío en 24/48 h y devoluciones gratis.', cta: 'Ver productos', cta2: 'Novedades' },
    secciones: [
      { tipo: 'productos', id: 'tienda', titulo: 'Lo más vendido', items: [['Sudadera Básica', '39 €', 'Nuevo'], ['Gorra Logo', '22 €', ''], ['Taza Cerámica', '14 €', ''], ['Tote Bag', '18 €', '-20%'], ['Camiseta Oversize', '25 €', ''], ['Pack Pegatinas', '6 €', '']] },
      { tipo: 'ventajas', items: [['🚚', 'Envío 24/48 h', 'Gratis a partir de 40 €.'], ['↩️', 'Devoluciones', '30 días sin preguntas.'], ['🔒', 'Pago seguro', 'Tarjeta, Bizum o PayPal.']] },
      { tipo: 'opiniones', titulo: 'Clientes felices', items: [['Marta G.', 'Calidad increíble y llegó al día siguiente.'], ['Dani R.', 'La sudadera es comodísima. Repetiré.'], ['Lucía F.', 'Todo precioso, hasta el paquete.']] },
      { tipo: 'cta', titulo: '10% en tu primer pedido', texto: 'Escríbenos y te mandamos tu código.', boton: 'Quiero mi descuento' }
    ]
  },
  {
    id: 'lienzo', nombre: 'Lienzo', sector: 'Portfolio · Profesional', desc: 'Minimalista, tipografía grande y trabajos destacados.',
    marca: 'Estudio Lienzo',
    fuentes: { d: 'Instrument Serif', b: 'Inter', url: 'family=Instrument+Serif&family=Inter:wght@400;500;600' },
    c: { bg: '#f1efe9', surface: '#e8e5dd', text: '#161616', muted: '#6e6a62', accent: '#e4572e' },
    estilo: { radio: '0px', mayus: false, peso: 400 },
    hero: { tipo: 'big', kicker: 'Fotografía · Dirección de arte', titulo: 'Imágenes que cuentan historias.', texto: 'Trabajo con marcas y personas que quieren mostrar lo que hacen con calma y cuidado.', cta: 'Ver proyectos', cta2: 'Contactar' },
    secciones: [
      { tipo: 'proyectos', id: 'proyectos', titulo: 'Proyectos', items: [['Campaña Otoño', 'Moda · 2026'], ['Casa Lumbre', 'Interiorismo · 2026'], ['Retratos de oficio', 'Personal · 2025'], ['Sabores del sur', 'Gastronomía · 2025']] },
      { tipo: 'sobre', titulo: 'Sobre mí', texto: 'Llevo diez años fotografiando marcas pequeñas y grandes. Me gusta la luz natural, los procesos lentos y los proyectos con alma. Si tienes una idea, cuéntamela.', datos: [['10+', 'años'], ['120', 'proyectos'], ['40', 'marcas']] },
      { tipo: 'lista', titulo: 'Servicios', grupos: [{ items: [['Fotografía de producto', 'desde 250 €'], ['Retrato profesional', 'desde 120 €'], ['Dirección de arte', 'a consultar']] }] },
      { tipo: 'cta', titulo: '¿Trabajamos juntos?', texto: 'Respondo en menos de 24 horas.', boton: 'Escríbeme' }
    ]
  },
  {
    id: 'calma', nombre: 'Calma', sector: 'Estética · Salud · Bienestar', desc: 'Suave y relajante, con reserva de citas.',
    marca: 'Calma Estética',
    fuentes: { d: 'Playfair Display', b: 'DM Sans', url: 'family=Playfair+Display:wght@500;600&family=DM+Sans:wght@400;500;600' },
    c: { bg: '#f3f5f0', surface: '#ffffff', text: '#23302a', muted: '#6b7a71', accent: '#6f8f72' },
    estilo: { radio: '26px', mayus: false, peso: 500 },
    hero: { tipo: 'split', kicker: 'Centro de estética y bienestar', titulo: 'Un rato solo para ti.', texto: 'Tratamientos faciales y corporales en un espacio tranquilo. Reserva tu cita online cuando quieras.', cta: 'Reservar cita', cta2: 'Tratamientos' },
    secciones: [
      { tipo: 'lista', id: 'tratamientos', titulo: 'Tratamientos', grupos: [{ items: [['Limpieza facial profunda', '45 €', '60 min'], ['Masaje relajante', '50 €', '60 min'], ['Manicura semipermanente', '22 €', '45 min'], ['Depilación láser (zona)', 'desde 35 €', '20 min'], ['Lifting de pestañas', '38 €', '50 min']] }] },
      { tipo: 'reserva', titulo: 'Reserva tu cita' },
      { tipo: 'opiniones', titulo: 'Opiniones', items: [['Elena V.', 'Salgo siempre como nueva. Un sitio precioso.'], ['Paula C.', 'Muy profesionales y súper cuidadosas.'], ['Nerea L.', 'Reservar online es comodísimo.']] },
      { tipo: 'info', titulo: 'Dónde estamos', horario: [['Lunes a viernes', '9:30 – 20:00'], ['Sábados', '10:00 – 14:00']], direccion: 'Av. de la Paz, 27, local 2' }
    ]
  },
  {
    id: 'pulso', nombre: 'Pulso', sector: 'Gimnasio · Deporte', desc: 'Enérgico y potente, con clases y tarifas.',
    marca: 'Pulso Gym',
    fuentes: { d: 'Anton', b: 'Inter', url: 'family=Anton&family=Inter:wght@400;500;600;700' },
    c: { bg: '#0b0b0b', surface: '#171717', text: '#ffffff', muted: '#9a9a9a', accent: '#ff5a1f' },
    estilo: { radio: '8px', mayus: true, peso: 400 },
    hero: { tipo: 'big', kicker: 'Abierto 6:00 – 23:00', titulo: 'Entrena sin excusas.', texto: 'Sala de musculación, clases dirigidas y entrenadores que se acuerdan de tu nombre.', cta: 'Prueba gratis', cta2: 'Ver tarifas' },
    secciones: [
      { tipo: 'sobre', titulo: 'Más que un gimnasio', texto: 'Más de 800 m² de entrenamiento, vestuarios renovados y un ambiente que engancha.', datos: [['800 m²', 'de sala'], ['40+', 'clases/semana'], ['12', 'entrenadores']] },
      { tipo: 'precios', id: 'tarifas', titulo: 'Tarifas', items: [['Básica', '29 €', ['Sala de musculación', 'Horario completo'], false], ['Total', '39 €', ['Todo lo de Básica', 'Clases ilimitadas', 'App de entreno'], true], ['Premium', '59 €', ['Todo lo de Total', '2 sesiones de entrenador', 'Nutricionista'], false]] },
      { tipo: 'galeria', titulo: 'Las instalaciones' },
      { tipo: 'opiniones', titulo: 'Socios', items: [['Iván T.', 'En 4 meses he cambiado por completo. Los monitores, top.'], ['Sonia M.', 'Las clases de HIIT son adictivas.'], ['Kike R.', 'Abre temprano y nunca está lleno.']] },
      { tipo: 'cta', titulo: 'Tu primera semana gratis', texto: 'Sin matrícula ni permanencia.', boton: 'Quiero probar' }
    ]
  }
];

export const plantillaPorId = id => PLANTILLAS.find(p => p.id === id);

/* ==========================================================
   Pintado de la plantilla (solo se usa en plantilla.html)
   ========================================================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function hexValido(h) { return /^#[0-9a-f]{6}$/i.test(h || ''); }
function tintaPara(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.6 ? '#111111' : '#ffffff';
}

const foto = (i, etiqueta = '') =>
  `<div class="ph ph${i % 6}">${etiqueta ? `<span>${esc(etiqueta)}</span>` : ''}</div>`;

const S = {
  lista: s => `
    <section class="sec" id="${s.id || ''}">
      <div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="lista ${s.grupos.length > 1 ? 'multi' : ''}">
        ${s.grupos.map(g => `<div class="grupo">${g.nombre ? `<h3>${esc(g.nombre)}</h3>` : ''}
          ${g.items.map(([n, p, d]) => `<div class="li"><div><b>${esc(n)}</b>${d ? `<small>${esc(d)}</small>` : ''}</div><i></i><span>${esc(p)}</span></div>`).join('')}
        </div>`).join('')}
      </div></div>
    </section>`,

  galeria: s => `
    <section class="sec"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="galeria">${[0, 1, 2, 3, 4].map(i => foto(i)).join('')}</div>
    </div></section>`,

  opiniones: s => `
    <section class="sec alt"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="ops">${s.items.map(([n, t]) => `<figure class="op"><div class="stars">★★★★★</div><blockquote>“${esc(t)}”</blockquote><figcaption>${esc(n)}</figcaption></figure>`).join('')}</div>
    </div></section>`,

  info: s => `
    <section class="sec" id="contacto"><div class="w info">
      <div><h2 class="h2">${esc(s.titulo)}</h2>
        <div class="horario">${s.horario.map(([d, h]) => `<div><span>${esc(d)}</span><b>${esc(h)}</b></div>`).join('')}</div>
        <p class="dir">📍 ${esc(s.direccion)}</p>
      </div>
      <div class="mapa"><div class="pin"></div></div>
    </div></section>`,

  cta: s => `
    <section class="sec"><div class="w"><div class="cta">
      <h2>${esc(s.titulo)}</h2><p>${esc(s.texto)}</p>
      <a class="b b1" href="#">${esc(s.boton)}</a>
    </div></div></section>`,

  ventajas: s => `
    <section class="sec tight"><div class="w ventajas">
      ${s.items.map(([e, t, d]) => `<div class="v"><span class="ve">${e}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('')}
    </div></section>`,

  productos: s => `
    <section class="sec" id="${s.id || ''}"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="prods">${s.items.map(([n, p, tag], i) => `
        <div class="prod">${foto(i)}${tag ? `<em class="tag">${esc(tag)}</em>` : ''}
          <div class="pi"><div><b>${esc(n)}</b><span>${esc(p)}</span></div><button class="add" aria-label="Añadir">+</button></div>
        </div>`).join('')}</div>
    </div></section>`,

  proyectos: s => `
    <section class="sec" id="${s.id || ''}"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="proys">${s.items.map(([n, d], i) => `<a class="proy" href="#">${foto(i + 1)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div></a>`).join('')}</div>
    </div></section>`,

  sobre: s => `
    <section class="sec alt"><div class="w sobre">
      <div><h2 class="h2">${esc(s.titulo)}</h2><p class="txt">${esc(s.texto)}</p></div>
      <div class="datos">${s.datos.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    </div></section>`,

  precios: s => `
    <section class="sec" id="${s.id || ''}"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="planes">${s.items.map(([n, p, l, dest]) => `
        <div class="plan ${dest ? 'dest' : ''}">${dest ? '<em class="tag">Popular</em>' : ''}<b>${esc(n)}</b>
          <div class="pp">${esc(p)}<small>/mes</small></div>
          <ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul><a class="b ${dest ? 'b1' : 'b2'}" href="#">Apuntarme</a>
        </div>`).join('')}</div>
    </div></section>`,

  reserva: s => {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const horas = ['10:00', '10:30', '11:30', '12:00', '16:00', '17:30', '18:00', '19:00'];
    return `
    <section class="sec alt" id="reserva"><div class="w"><h2 class="h2">${esc(s.titulo)}</h2>
      <div class="reserva">
        <div class="dias">${dias.map((d, i) => `<button class="${i === 1 ? 'on' : ''}"><small>${d}</small><b>${12 + i}</b></button>`).join('')}</div>
        <div class="horas">${horas.map((h, i) => `<button class="${i === 2 ? 'on' : ''} ${i === 4 ? 'off' : ''}">${h}</button>`).join('')}</div>
        <a class="b b1" href="#">Confirmar cita · Mar 13, 11:30</a>
      </div>
    </div></section>`;
  }
};

function hero(p, marca) {
  const h = p.hero;
  const botones = `<div class="btns"><a class="b b1" href="#">${esc(h.cta)}</a><a class="b b2" href="#">${esc(h.cta2)}</a></div>`;
  if (h.tipo === 'split') return `
    <header class="hero split"><div class="w">
      <div class="hc"><span class="kick">${esc(h.kicker)}</span><h1>${esc(h.titulo)}</h1><p>${esc(h.texto)}</p>${botones}</div>
      <div class="hv">${foto(0)}<div class="badge"><b>4,9 ★</b><span>+200 opiniones</span></div></div>
    </div></header>`;
  if (h.tipo === 'big') return `
    <header class="hero big"><div class="w">
      <span class="kick">${esc(h.kicker)}</span><h1>${esc(h.titulo)}</h1>
      <div class="hb"><p>${esc(h.texto)}</p>${botones}</div>
      <div class="hv wide">${foto(3)}</div>
    </div></header>`;
  return `
    <header class="hero center"><div class="hbg">${foto(2)}</div><div class="w">
      <span class="kick">${esc(h.kicker)}</span><h1>${esc(h.titulo)}</h1><p>${esc(h.texto)}</p>${botones}
    </div></header>`;
}

export function pintarPlantilla(raiz, id, opciones = {}) {
  const p = plantillaPorId(id) || PLANTILLAS[0];
  const marca = (opciones.nombre || '').trim() || p.marca;
  const accent = hexValido(opciones.color) ? opciones.color : p.c.accent;
  const r = document.documentElement.style;
  r.setProperty('--bg', p.c.bg);
  r.setProperty('--surface', p.c.surface);
  r.setProperty('--text', p.c.text);
  r.setProperty('--muted', p.c.muted);
  r.setProperty('--accent', accent);
  r.setProperty('--ink', tintaPara(accent));
  r.setProperty('--fd', `'${p.fuentes.d}', Georgia, serif`);
  r.setProperty('--fb', `'${p.fuentes.b}', system-ui, sans-serif`);
  r.setProperty('--radius', p.estilo.radio);
  r.setProperty('--hw', p.estilo.peso);
  r.setProperty('--tt', p.estilo.mayus ? 'uppercase' : 'none');
  document.documentElement.dataset.tema = p.id;
  document.documentElement.style.colorScheme = tintaPara(p.c.bg) === '#ffffff' ? 'dark' : 'light';

  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${p.fuentes.url}&display=swap`;
  document.head.appendChild(l);
  document.title = `${marca} · Vista previa`;

  const links = p.secciones.filter(s => s.id).map(s => `<a href="#${s.id}">${esc(s.titulo)}</a>`).join('');
  raiz.innerHTML = `
    <nav class="nv"><div class="w">
      <a class="lg" href="#">${esc(marca)}</a>
      <div class="nl">${links}<a href="#contacto">Contacto</a></div>
      <a class="b b1 sm" href="#">${esc(p.hero.cta)}</a>
    </div></nav>
    ${hero(p, marca)}
    ${p.secciones.map(s => S[s.tipo] ? S[s.tipo](s) : '').join('')}
    <footer class="ft"><div class="w"><b>${esc(marca)}</b><span>© ${new Date().getFullYear()} · Todos los derechos reservados</span></div></footer>
    <a class="wa-float" href="#" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg></a>`;

  raiz.addEventListener('click', e => {
    const a = e.target.closest('a[href="#"], button');
    if (a) e.preventDefault();
  });
}
