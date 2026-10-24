/* ==========================================================
   Diseños de ejemplo (se pintan en diseno?t=ID&n=Nombre&c=%23color)
   Fotos: Pexels (uso gratuito). Cambia los números de "img" por otras fotos de pexels.com
   Para añadir un diseño: copia un bloque y cambia textos, colores y fotos.
   ========================================================== */
import { icono } from './iconos.js';

const F = (id, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const PLANTILLAS = [
  {
    id: 'filo', dominio: 'barberiafilo.com', nombre: 'Filo', sector: 'Barbería · Peluquería',
    desc: 'Estética oscura y elegante con portada a pantalla completa, lista de precios y reserva de cita.', marca: 'Barbería Filo',
    fuentes: { d: 'Oswald', b: 'Work Sans', url: 'family=Oswald:wght@500;600;700&family=Work+Sans:wght@400;500;600' },
    c: { bg: '#0e0c0a', surface: '#181410', text: '#f3ebde', muted: '#a99a89', accent: '#c9a24a' },
    estilo: { radio: '3px', mayus: true, peso: 600 },
    tel: '600 123 456', redes: true,
    hero: { tipo: 'imagen', img: 8218487, kicker: 'Desde 2015 · Centro ciudad', titulo: 'Cortes con oficio.', texto: 'Barbería clásica en el centro. Cortes, degradados y arreglo de barba con cita previa, sin esperas.', cta: 'Reservar cita', cta2: 'Ver precios', meta: [['star', '4,9 · 230 reseñas'], ['clock', 'Hoy hasta las 20:30']] },
    cinta: ['Corte clásico', 'Degradados', 'Arreglo de barba', 'Afeitado a navaja', 'Productos premium'],
    secciones: [
      { tipo: 'lista', id: 'precios', kicker: 'Servicios', titulo: 'Precios claros, sin sorpresas', img: 897265, etiqueta: 'Toalla caliente incluida', grupos: [{ items: [['Corte clásico', '14 €', '30 min'], ['Degradado / fade', '16 €', '40 min'], ['Arreglo de barba', '10 €', '20 min'], ['Corte + barba', '22 €', '50 min'], ['Afeitado a navaja', '15 €', '30 min'], ['Corte infantil', '10 €', '25 min']] }] },
      { tipo: 'galeria', id: 'trabajos', kicker: 'Nuestro trabajo', titulo: 'Cada corte, una firma', imgs: [7518728, 1836983, 7697224, 4625648, 7518731] },
      { tipo: 'opiniones', kicker: 'Opiniones', titulo: 'Lo que dicen en Google', nota: '4,9', total: 230, items: [['Javier Molina', 'El mejor degradado que me han hecho. Ya no voy a otro sitio.'], ['Rubén Sanz', 'Trato de 10 y siempre puntuales con la cita.'], ['Álex Prieto', 'Ambiente top y precios muy justos.']] },
      { tipo: 'info', id: 'contacto', kicker: 'Dónde estamos', titulo: 'Ven a vernos', horario: [['Lunes a viernes', '10:00 – 20:30', [1, 2, 3, 4, 5], 10, 20.5], ['Sábados', '9:30 – 14:00', [6], 9.5, 14], ['Domingos', 'Cerrado', [0]]], direccion: 'Calle Mayor, 12 · Centro' },
      { tipo: 'cta', titulo: '¿Te toca corte?', texto: 'Reserva ahora y te guardamos tu hueco.', boton: 'Reservar por WhatsApp', img: 7518731 }
    ]
  },
  {
    id: 'brasa', dominio: 'brasayco.es', nombre: 'Brasa', sector: 'Restaurante · Bar',
    desc: 'Tonos cálidos, carta digital con fotos de los platos, horario y reserva de mesa.', marca: 'Brasa & Co.',
    fuentes: { d: 'Fraunces', b: 'Inter', url: 'family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600' },
    c: { bg: '#f7f0e5', surface: '#fffaf2', text: '#2a1d14', muted: '#7a6656', accent: '#c4532d' },
    estilo: { radio: '18px', mayus: false, peso: 700 },
    tel: '955 123 456', redes: true,
    hero: { tipo: 'split', img: 4344576, kicker: 'Cocina a la brasa · Producto local', titulo: 'Fuego lento, sabor de siempre.', texto: 'Carnes maduradas, verduras de temporada y postres caseros en el corazón del barrio.', cta: 'Reservar mesa', cta2: 'Ver la carta', badges: [['star', '4,8', '+500 opiniones'], ['flame', 'Brasa de encina', 'desde 1998']] },
    cinta: ['Brasa de encina', 'Producto de km 0', 'Postres caseros', 'Vinos de la tierra', 'Terraza'],
    secciones: [
      { tipo: 'ventajas', items: [['flame', 'Brasa de encina', 'Cocinamos todo al carbón vegetal.'], ['leaf', 'Km 0', 'Verdura de huertas de la zona.'], ['cake', 'Postres caseros', 'Hechos cada mañana.']] },
      { tipo: 'lista', id: 'carta', kicker: 'La carta', titulo: 'Para compartir (o no)', grupos: [
        { nombre: 'Para empezar', img: 1251208, items: [['Croquetas de jamón (6)', '8,50 €'], ['Pimientos asados con ventresca', '11 €'], ['Provoleta a la brasa', '9 €']] },
        { nombre: 'Principales', img: 1639558, items: [['Chuletón madurado (1 kg)', '48 €'], ['Secreto ibérico', '17 €'], ['Lubina a la brasa', '19 €']] },
        { nombre: 'Postres', img: 1126359, items: [['Tarta de queso', '6 €'], ['Torrija caramelizada', '6,50 €']] }
      ] },
      { tipo: 'galeria', kicker: 'Un vistazo', titulo: 'Así se come en Brasa', imgs: [7474372, 776538, 6542790, 15750726, 1639558] },
      { tipo: 'opiniones', kicker: 'Opiniones', titulo: 'Nuestros clientes repiten', nota: '4,8', total: 512, items: [['Marta Gil', 'El chuletón, espectacular. Y la tarta de queso, de otro planeta.'], ['Pedro Ruiz', 'Sitio acogedor y un trato buenísimo.'], ['Laura Vega', 'Reservamos por WhatsApp en un minuto. Volveremos.']] },
      { tipo: 'info', id: 'contacto', kicker: 'Horario', titulo: 'Te esperamos', horario: [['Martes a jueves', '13:00 – 16:00 · 20:00 – 23:30', [2, 3, 4], 13, 23.5], ['Viernes y sábado', '13:00 – 16:30 · 20:00 – 00:30', [5, 6], 13, 24.5], ['Domingo', '13:00 – 17:00', [0], 13, 17], ['Lunes', 'Cerrado', [1]]], direccion: 'Plaza del Carmen, 4' },
      { tipo: 'cta', titulo: 'Te guardamos mesa', texto: 'Reserva en un momento por WhatsApp.', boton: 'Reservar mesa', img: 776538 }
    ]
  },
  {
    id: 'kiosko', dominio: 'kiosko.shop', nombre: 'Kiosko', sector: 'Tienda online',
    desc: 'Tienda online con catálogo, carrito de compra y ventajas de envío y devolución.', marca: 'Kiosko',
    fuentes: { d: 'Space Grotesk', b: 'Inter', url: 'family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600' },
    c: { bg: '#f6f6f3', surface: '#ffffff', text: '#111111', muted: '#6b6b6b', accent: '#2f5bff' },
    estilo: { radio: '16px', mayus: false, peso: 700 },
    tel: '600 555 777', redes: true, carrito: true,
    hero: { tipo: 'split', img: 4940756, kicker: 'Nueva colección · Otoño', titulo: 'Diseño que se usa todos los días.', texto: 'Productos hechos en pequeñas tiradas. Envío en 24/48 h y devoluciones gratis.', cta: 'Ver productos', cta2: 'Novedades', badges: [['truck', 'Envío gratis', 'desde 40 €'], ['star', '4,9', '+1.200 pedidos']] },
    cinta: ['Envío 24/48 h', 'Devoluciones gratis', 'Hecho en pequeñas tiradas', 'Pago seguro', 'Nueva colección'],
    secciones: [
      { tipo: 'productos', id: 'tienda', kicker: 'Tienda', titulo: 'Lo más vendido', items: [['Sudadera Básica', '39 €', 'Nuevo', 9594679], ['Gorra Logo', '22 €', '', 1510509], ['Taza Cerámica', '14 €', '', 11075707], ['Tote Bag', '18 €', '-20%', 4068314], ['Camiseta Oversize', '25 €', '', 12039633], ['Pack Pegatinas', '6 €', '', 17567386]] },
      { tipo: 'ventajas', items: [['truck', 'Envío 24/48 h', 'Gratis a partir de 40 €.'], ['undo', 'Devoluciones', '30 días sin preguntas.'], ['lock', 'Pago seguro', 'Bizum o transferencia.']] },
      { tipo: 'opiniones', kicker: 'Opiniones', titulo: 'Clientes felices', nota: '4,9', total: 1240, items: [['Marta García', 'Calidad increíble y llegó al día siguiente.'], ['Dani Ramos', 'La sudadera es comodísima. Repetiré.'], ['Lucía Fernández', 'Todo precioso, hasta el paquete.']] },
      { tipo: 'cta', titulo: '10 % en tu primer pedido', texto: 'Escríbenos y te mandamos tu código.', boton: 'Quiero mi descuento', img: 5490969 }
    ]
  },
  {
    id: 'lienzo', dominio: 'estudiolienzo.com', nombre: 'Lienzo', sector: 'Portfolio · Profesional',
    desc: 'Diseño editorial y minimalista para mostrar proyectos a gran tamaño.', marca: 'Estudio Lienzo',
    fuentes: { d: 'Instrument Serif', b: 'Inter', url: 'family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600' },
    c: { bg: '#f1efe9', surface: '#e7e3da', text: '#161616', muted: '#6e6a62', accent: '#e4572e' },
    estilo: { radio: '0px', mayus: false, peso: 400 },
    tel: '611 222 333', redes: true,
    hero: { tipo: 'big', img: 9604191, kicker: 'Fotografía · Dirección de arte', titulo: 'Imágenes que cuentan <em>historias.</em>', texto: 'Trabajo con marcas y personas que quieren mostrar lo que hacen con calma y cuidado.', cta: 'Ver proyectos', cta2: 'Contactar' },
    cinta: ['Moda', 'Interiorismo', 'Retrato', 'Gastronomía', 'Producto'],
    secciones: [
      { tipo: 'proyectos', id: 'proyectos', kicker: 'Selección', titulo: 'Proyectos recientes', items: [['Campaña Otoño', 'Moda · 2026', 20617022], ['Casa Lumbre', 'Interiorismo · 2026', 12285892], ['Retratos de oficio', 'Personal · 2025', 20446138], ['Sabores del sur', 'Gastronomía · 2025', 7474372]] },
      { tipo: 'sobre', kicker: 'Sobre mí', titulo: 'Diez años mirando despacio', img: 19002588, texto: 'Fotografío marcas pequeñas y grandes. Me gusta la luz natural, los procesos lentos y los proyectos con alma. Si tienes una idea, cuéntamela.', datos: [['10+', 'años'], ['120', 'proyectos'], ['40', 'marcas']] },
      { tipo: 'lista', kicker: 'Servicios', titulo: 'Cómo puedo ayudarte', grupos: [{ items: [['Fotografía de producto', 'desde 250 €'], ['Retrato profesional', 'desde 120 €'], ['Dirección de arte', 'a consultar']] }] },
      { tipo: 'cta', titulo: '¿Trabajamos juntos?', texto: 'Respondo en menos de 24 horas.', boton: 'Escríbeme' }
    ]
  },
  {
    id: 'calma', dominio: 'calmaestetica.es', nombre: 'Calma', sector: 'Estética · Salud · Bienestar',
    desc: 'Diseño luminoso con lista de tratamientos, galería y reserva de cita online.', marca: 'Calma Estética',
    fuentes: { d: 'Playfair Display', b: 'DM Sans', url: 'family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=DM+Sans:wght@400;500;600' },
    c: { bg: '#f3f5f0', surface: '#ffffff', text: '#23302a', muted: '#6b7a71', accent: '#6f8f72' },
    estilo: { radio: '28px', mayus: false, peso: 500 },
    tel: '622 444 555', redes: true,
    hero: { tipo: 'split', img: 3985329, kicker: 'Centro de estética y bienestar', titulo: 'Un rato solo <em>para ti.</em>', texto: 'Tratamientos faciales y corporales en un espacio tranquilo. Reserva tu cita online cuando quieras.', cta: 'Reservar cita', cta2: 'Tratamientos', badges: [['star', '5,0', '180 opiniones'], ['calendar', 'Cita online', 'en 1 minuto']] },
    cinta: ['Limpieza facial', 'Masaje relajante', 'Manicura', 'Láser', 'Pestañas'],
    secciones: [
      { tipo: 'lista', id: 'tratamientos', kicker: 'Tratamientos', titulo: 'Cuídate como mereces', img: 6628587, etiqueta: 'Productos naturales', grupos: [{ items: [['Limpieza facial profunda', '45 €', '60 min'], ['Masaje relajante', '50 €', '60 min'], ['Manicura semipermanente', '22 €', '45 min'], ['Depilación láser (zona)', 'desde 35 €', '20 min'], ['Lifting de pestañas', '38 €', '50 min']] }] },
      { tipo: 'reserva', id: 'reserva', kicker: 'Reserva online', titulo: 'Elige día y hora' },
      { tipo: 'galeria', kicker: 'El centro', titulo: 'Un espacio para desconectar', imgs: [11774389, 19239100, 208504, 1926811, 19641836] },
      { tipo: 'opiniones', kicker: 'Opiniones', titulo: 'Lo que sienten nuestras clientas', nota: '5,0', total: 180, items: [['Elena Vidal', 'Salgo siempre como nueva. Un sitio precioso.'], ['Paula Castro', 'Muy profesionales y súper cuidadosas.'], ['Nerea López', 'Reservar online es comodísimo.']] },
      { tipo: 'info', id: 'contacto', kicker: 'Visítanos', titulo: 'Dónde estamos', horario: [['Lunes a viernes', '9:30 – 20:00', [1, 2, 3, 4, 5], 9.5, 20], ['Sábados', '10:00 – 14:00', [6], 10, 14], ['Domingos', 'Cerrado', [0]]], direccion: 'Av. de la Paz, 27, local 2' }
    ]
  },
  {
    id: 'pulso', dominio: 'pulsogym.es', nombre: 'Pulso', sector: 'Gimnasio · Deporte',
    desc: 'Diseño de alto contraste con portada a pantalla completa, instalaciones y tarifas.', marca: 'Pulso Gym',
    fuentes: { d: 'Anton', b: 'Inter', url: 'family=Anton&family=Inter:wght@400;500;600;700' },
    c: { bg: '#0a0a0a', surface: '#151515', text: '#ffffff', muted: '#9a9a9a', accent: '#ff5a1f' },
    estilo: { radio: '10px', mayus: true, peso: 400 },
    tel: '633 777 999', redes: true,
    hero: { tipo: 'imagen', img: 685531, kicker: 'Abierto de 6:00 a 23:00', titulo: 'Entrena sin excusas.', texto: 'Sala de musculación, clases dirigidas y entrenadores que se acuerdan de tu nombre.', cta: 'Prueba gratis', cta2: 'Ver tarifas', meta: [['users', '+1.500 socios'], ['dumbbell', '800 m² de sala']] },
    cinta: ['Fuerza', 'HIIT', 'Cross training', 'Boxeo', 'Yoga', 'Spinning'],
    secciones: [
      { tipo: 'sobre', kicker: 'El club', titulo: 'Más que un gimnasio', img: 3838977, texto: 'Más de 800 m² de entrenamiento, vestuarios renovados y un ambiente que engancha. Te acompañamos desde el primer día.', datos: [['800 m²', 'de sala'], ['40+', 'clases/semana'], ['12', 'entrenadores']] },
      { tipo: 'precios', id: 'tarifas', kicker: 'Tarifas', titulo: 'Elige tu plan', items: [['Básica', '29 €', ['Sala de musculación', 'Horario completo'], false], ['Total', '39 €', ['Todo lo de Básica', 'Clases ilimitadas', 'App de entreno'], true], ['Premium', '59 €', ['Todo lo de Total', '2 sesiones con entrenador', 'Nutricionista'], false]] },
      { tipo: 'galeria', kicker: 'Instalaciones', titulo: 'Donde pasa todo', imgs: [2628215, 4720813, 4162485, 14502821, 3766211] },
      { tipo: 'opiniones', kicker: 'Socios', titulo: 'Resultados reales', nota: '4,8', total: 640, items: [['Iván Torres', 'En 4 meses he cambiado por completo. Los monitores, top.'], ['Sonia Martín', 'Las clases de HIIT son adictivas.'], ['Kike Rubio', 'Abre temprano y nunca está lleno.']] },
      { tipo: 'cta', titulo: 'Tu primera semana gratis', texto: 'Sin matrícula ni permanencia.', boton: 'Quiero probar', img: 2628215 }
    ]
  }
];

export const plantillaPorId = id => PLANTILLAS.find(p => p.id === id);

/* ==========================================================
   PINTADO (diseno)
   ========================================================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexValido = h => /^#[0-9a-f]{6}$/i.test(h || '');
function tintaPara(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? '#111111' : '#ffffff';
}

/* Fotos rápidas: el navegador elige el tamaño justo para cada pantalla (srcset).
   En las miniaturas se pide una sola foto pequeña. */
let mini = false, prioridad = 0;
const ANCHOS = [480, 800, 1200, 1800];
function foto(id, { ancho = '100vw', alt = '', cls = '', primero = false } = {}) {
  if (!id) return `<div class="ph ${cls}"></div>`;
  const carga = primero || (mini && prioridad++ < 6) ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const src = mini
    ? `src="${F(id, primero ? 640 : 420)}"`
    : `src="${F(id, 800)}" srcset="${ANCHOS.map(w => `${F(id, w)} ${w}w`).join(', ')}" sizes="${ancho}"`;
  return `<div class="ph ${cls}"><img ${src} alt="${esc(alt)}" ${carga} decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></div>`;
}
const cab = (s, cls = '') => `<div class="sh ${cls}">${s.kicker ? `<span class="kick rv">${esc(s.kicker)}</span>` : ''}<h2 class="h2 parte">${s.titulo || ''}</h2></div>`;
const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('');
const num = t => { const m = String(t).match(/^([\d.]+)(.*)$/); return m ? `<b data-n="${m[1].replace('.', '')}" data-suf="${esc(m[2])}">${esc(t)}</b>` : `<b>${esc(t)}</b>`; };

const S = {
  lista: s => s.img ? `
    <section class="sec par-sec" id="${s.id || ''}">
      <div class="par-txt">${cab(s)}${listaHTML(s)}</div>
      <div class="par-img rvi">${foto(s.img, { ancho: '50vw' })}${s.etiqueta ? `<span class="etq">${icono('award')} ${esc(s.etiqueta)}</span>` : ''}</div>
    </section>` : `
    <section class="sec" id="${s.id || ''}"><div class="w">${cab(s)}${listaHTML(s)}</div></section>`,

  galeria: s => `
    <section class="sec sin-pie" id="${s.id || ''}"><div class="w">${cab(s, 'fila')}</div>
      <div class="gal">${s.imgs.map((id, i) => `<figure class="g g${i} rvi">${foto(id, { ancho: i === 0 ? '50vw' : '25vw' })}<span class="g-ic">${icono('plus')}</span></figure>`).join('')}</div>
    </section>`,

  opiniones: s => `
    <section class="sec alt"><div class="w">
      <div class="op-h">${cab(s)}
        <div class="op-sum rv"><b>${esc(s.nota)}</b><div><span class="stars">★★★★★</span><small>${s.total} reseñas en Google</small></div></div>
      </div>
      <div class="ops">${s.items.map(([n, t], i) => `
        <figure class="op rv"><span class="q">${icono('quote')}</span><blockquote>${esc(t)}</blockquote>
          <figcaption><span class="av av${i}">${esc(iniciales(n))}</span><span><b>${esc(n)}</b><small><span class="stars sm">★★★★★</span> hace ${[2, 5, 9][i]} días</small></span></figcaption></figure>`).join('')}</div>
    </div></section>`,

  info: (s, p) => `
    <section class="sec par-sec info" id="${s.id || 'contacto'}">
      <div class="par-txt">${cab(s)}
        <div class="estado rv" data-estado></div>
        <div class="horario rv">${s.horario.map(([d, h, dias = [], a, c]) => `<div data-dias="${dias.join(',')}" data-a="${a ?? ''}" data-c="${c ?? ''}"><span>${esc(d)}</span><b>${esc(h)}</b></div>`).join('')}</div>
        <p class="dir rv">${icono('pin')} ${esc(s.direccion)}</p>
        <div class="btns rv"><a class="b b1" href="#">${icono('pin')} Cómo llegar</a><a class="b b2" href="#">${icono('call')} ${esc(p.tel)}</a></div>
      </div>
      <div class="mapa rvi"><div class="calle c1"></div><div class="calle c2"></div><div class="calle c3"></div><div class="pin">${icono('pin')}</div><span class="mapa-tag">${esc(p.marca)}</span></div>
    </section>`,

  cta: s => `
    <section class="cta ${s.img ? 'conimg' : ''}">
      ${s.img ? foto(s.img, { cls: 'cta-bg par' }) : ''}
      <div class="cta-in w"><h2 class="parte">${esc(s.titulo)}</h2><p class="rv">${esc(s.texto)}</p><a class="b b1 rv" href="#">${esc(s.boton)} ${icono('arrow')}</a></div>
    </section>`,

  ventajas: s => `
    <section class="sec tight"><div class="w ventajas">
      ${s.items.map(([ic, t, d], i) => `<div class="v rv"><span class="ve">${icono(ic)}</span><div><small>0${i + 1}</small><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('')}
    </div></section>`,

  productos: s => `
    <section class="sec" id="${s.id || ''}"><div class="w">${cab(s, 'fila')}
      <div class="prods">${s.items.map(([n, p, tag, img]) => `
        <div class="prod rv"><div class="prod-img">${foto(img, { ancho: '(max-width:980px) 50vw, 25vw', alt: n })}${tag ? `<em class="tag">${esc(tag)}</em>` : ''}
            <button class="add" aria-label="Añadir ${esc(n)} al carrito">${icono('plus')}<span>Añadir</span></button></div>
          <div class="pi"><b>${esc(n)}</b><span>${esc(p)}</span></div>
        </div>`).join('')}</div>
    </div></section>`,

  proyectos: s => `
    <section class="sec sin-pie" id="${s.id || ''}"><div class="w">${cab(s, 'fila')}</div>
      <div class="proys">${s.items.map(([n, d, img], i) => `<a class="proy rvi ${i % 3 === 0 ? 'ancho' : ''}" href="#">${foto(img, { ancho: i % 3 === 0 ? '100vw' : '50vw', alt: n })}<div class="proy-i"><small>0${i + 1}</small><b>${esc(n)}</b><em>${esc(d)}</em><span>${icono('arrow')}</span></div></a>`).join('')}</div>
    </section>`,

  sobre: s => `
    <section class="sec par-sec alt sobre ${s.img ? '' : 'solo'}">
      ${s.img ? `<div class="par-img rvi">${foto(s.img, { ancho: '50vw' })}</div>` : ''}
      <div class="par-txt">${cab(s)}<p class="txt rv">${esc(s.texto)}</p>
        <div class="datos">${s.datos.map(([n, l]) => `<div class="rv">${num(n)}<span>${esc(l)}</span></div>`).join('')}</div></div>
    </section>`,

  precios: s => `
    <section class="sec" id="${s.id || ''}"><div class="w">${cab(s)}
      <div class="planes">${s.items.map(([n, p, l, dest]) => `
        <div class="plan rv ${dest ? 'dest' : ''}">${dest ? '<em class="tag">El más elegido</em>' : ''}<b>${esc(n)}</b>
          <div class="pp">${esc(p)}<small>/mes</small></div>
          <ul>${l.map(x => `<li>${icono('check')}${esc(x)}</li>`).join('')}</ul><a class="b ${dest ? 'b1' : 'b2'}" href="#">Apuntarme</a>
        </div>`).join('')}</div>
    </div></section>`,

  reserva: s => {
    const hoy = new Date();
    const dias = Array.from({ length: 6 }, (_, i) => { const d = new Date(hoy); d.setDate(hoy.getDate() + i + 1); return d; });
    const horas = ['10:00', '10:30', '11:30', '12:00', '16:00', '17:30', '18:00', '19:00'];
    const nd = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `
    <section class="sec alt" id="${s.id || 'reserva'}"><div class="w reserva-g">${cab(s)}
      <div class="reserva rv">
        <div class="dias">${dias.map((d, i) => `<button data-dia="${nd[d.getDay()]} ${d.getDate()}" class="${i === 0 ? 'on' : ''}"><small>${nd[d.getDay()]}</small><b>${d.getDate()}</b></button>`).join('')}</div>
        <div class="horas">${horas.map((h, i) => `<button data-hora="${h}" class="${i === 2 ? 'on' : ''}" ${i === 4 ? 'disabled' : ''}>${h}</button>`).join('')}</div>
        <a class="b b1 res-ok" href="#">${icono('calendar')} <span>Confirmar cita</span></a>
      </div>
    </div></section>`;
  }
};

function listaHTML(s) {
  return `<div class="lista ${s.grupos.length > 1 ? 'multi' : ''}">
    ${s.grupos.map(g => `<div class="grupo rv">${g.img ? `<div class="g-img">${foto(g.img, { ancho: '33vw', alt: g.nombre })}</div>` : ''}${g.nombre ? `<h3>${esc(g.nombre)}</h3>` : ''}
      ${g.items.map(([n, p, d]) => `<div class="li"><div><b>${esc(n)}</b>${d ? `<small>${icono('clock')} ${esc(d)}</small>` : ''}</div><i></i><span>${esc(p)}</span></div>`).join('')}
    </div>`).join('')}
  </div>`;
}

function hero(p) {
  const h = p.hero;
  const btns = `<div class="btns"><a class="b b1" href="#">${esc(h.cta)} ${icono('arrow')}</a><a class="b b2" href="#">${esc(h.cta2)}</a></div>`;
  if (h.tipo === 'imagen') return `
    <header class="hero img">
      <div class="hbg">${foto(h.img, { cls: 'kb', primero: true })}</div>
      <div class="w hc"><span class="kick">${esc(h.kicker)}</span><h1 class="parte">${h.titulo}</h1><p>${esc(h.texto)}</p>${btns}</div>
      ${h.meta ? `<div class="hstats">${h.meta.map(([i, t]) => `<span>${icono(i)} ${esc(t)}</span>`).join('')}<a class="hscroll" href="#s1" aria-label="Bajar">${icono('down')}</a></div>` : ''}
    </header>`;
  if (h.tipo === 'split') return `
    <header class="hero split">
      <div class="hc"><span class="kick">${esc(h.kicker)}</span><h1 class="parte">${h.titulo}</h1><p>${esc(h.texto)}</p>${btns}</div>
      <div class="hv">${foto(h.img, { cls: 'kb', primero: true, ancho: '(max-width:980px) 100vw, 50vw' })}
        ${(h.badges || []).map(([i, b, t], k) => `<div class="badge bd${k}">${icono(i)}<div><b>${esc(b)}</b><span>${esc(t)}</span></div></div>`).join('')}
      </div>
    </header>`;
  return `
    <header class="hero big"><div class="w">
      <span class="kick">${esc(h.kicker)}</span><h1 class="parte">${h.titulo}</h1>
      <div class="hb"><p>${esc(h.texto)}</p>${btns}</div>
    </div><div class="hv wide">${foto(h.img, { cls: 'par', primero: true })}</div></header>`;
}

export function pintarPlantilla(raiz, id, opciones = {}) {
  const p = plantillaPorId(id) || PLANTILLAS[0];
  const marca = (opciones.nombre || '').trim() || p.marca;
  const accent = hexValido(opciones.color) ? opciones.color : p.c.accent;
  mini = !!opciones.mini; prioridad = 0;
  const r = document.documentElement;
  const v = { '--bg': p.c.bg, '--surface': p.c.surface, '--text': p.c.text, '--muted': p.c.muted, '--accent': accent, '--ink': tintaPara(accent),
    '--fd': `'${p.fuentes.d}', Georgia, serif`, '--fb': `'${p.fuentes.b}', system-ui, sans-serif`, '--radius': p.estilo.radio, '--hw': p.estilo.peso, '--tt': p.estilo.mayus ? 'uppercase' : 'none' };
  Object.entries(v).forEach(([k, val]) => r.style.setProperty(k, val));
  r.dataset.tema = p.id;
  r.classList.toggle('mini', mini);
  r.style.colorScheme = tintaPara(p.c.bg) === '#ffffff' ? 'dark' : 'light';

  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${p.fuentes.url}&display=swap`;
  document.head.appendChild(l);
  document.title = marca;

  const links = p.secciones.filter(s => s.id && s.id !== 'contacto').map(s => `<a href="#${s.id}">${esc(s.kicker || s.titulo)}</a>`).join('') + '<a href="#contacto">Contacto</a>';
  const horario = p.secciones.find(s => s.tipo === 'info');

  raiz.innerHTML = `
    <nav class="nv ${p.hero.tipo === 'imagen' ? 'over' : ''}" id="nv"><div class="w">
      <a class="lg" href="#">${esc(marca)}</a>
      <div class="nl">${links}</div>
      <div class="nv-r">
        ${p.carrito ? `<button class="cart" aria-label="Carrito">${icono('bag')}<i id="cartN">0</i></button>` : ''}
        <a class="b b1 sm nv-cta" href="#">${esc(p.hero.cta)}</a>
        <button class="nv-menu" id="nvMenu" aria-label="Menú">${icono('menu')}</button>
      </div>
    </div></nav>
    <div class="mnav" id="mnav">${links}<a class="b b1" href="#">${esc(p.hero.cta)}</a></div>
    ${hero(p)}
    ${p.cinta ? `<div class="cinta" id="s1"><div class="ct">${[...p.cinta, ...p.cinta, ...p.cinta].map(w => `<span>${esc(w)}</span>`).join('')}</div></div>` : ''}
    ${p.secciones.map(s => S[s.tipo] ? S[s.tipo](s, { ...p, marca }) : '').join('')}
    <footer class="ft" id="${horario ? '' : 'contacto'}"><div class="w ft-g">
      <div><p class="ft-lema">${esc(p.hero.texto)}</p>
        ${p.redes ? `<div class="soc"><a href="#" aria-label="Instagram">${icono('instagram')}</a><a href="#" aria-label="Facebook">${icono('facebook')}</a><a href="#" aria-label="TikTok">${icono('tiktok')}</a></div>` : ''}</div>
      <div><h4>Contacto</h4><p>${icono('call')} ${esc(p.tel)}</p>${horario ? `<p>${icono('pin')} ${esc(horario.direccion)}</p>` : ''}<p>${icono('mail')} hola@${esc(p.dominio)}</p></div>
      ${horario ? `<div><h4>Horario</h4>${horario.horario.slice(0, 3).map(([d, h]) => `<p><span>${esc(d)}</span> ${esc(h)}</p>`).join('')}</div>` : `<div><h4>Enlaces</h4>${links}</div>`}
    </div>
    <div class="ft-marca" aria-hidden="true" style="--n:${Math.max(6, marca.length)}">${esc(marca)}</div>
    <div class="w ft-b"><span>© ${new Date().getFullYear()} ${esc(marca)}</span><span>Aviso legal · Privacidad · Cookies</span></div></footer>
    <a class="wa-float" href="#" aria-label="WhatsApp">${icono('wa')}</a>
    <div class="t-toast" id="tToast"></div>`;

  if (opciones.exportar) return; // al exportar se guarda tal cual y se activa al abrir el archivo
  activarPlantilla({ check: icono('check'), plus: icono('plus') });
}

/* ==========================================================
   ACTIVACIÓN (menú, carrito, reservas, horario y animaciones)
   Es independiente a propósito: se copia tal cual dentro del
   HTML que se exporta desde el panel.
   ========================================================== */
export function activarPlantilla(IC) {
  const d = document, r = d.documentElement, mini = r.classList.contains('mini');
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });
  // Navegación transparente sobre la foto y sólida al bajar
  const nv = $('#nv');
  const alBajar = () => nv.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', alBajar, { passive: true }); alBajar();
  // Menú del móvil
  const mnav = $('#mnav');
  $('#nvMenu').addEventListener('click', () => { mnav.classList.toggle('open'); nv.classList.toggle('menu'); });
  mnav.addEventListener('click', e => { if (e.target.closest('a')) { mnav.classList.remove('open'); nv.classList.remove('menu'); } });
  // Avisos
  const tt = $('#tToast'); let tTimer;
  const aviso = t => { tt.innerHTML = IC.check + ' ' + t; tt.classList.add('on'); clearTimeout(tTimer); tTimer = setTimeout(() => tt.classList.remove('on'), 1900); };
  // Carrito
  let n = 0;
  $$('.add').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); n++;
    const c = $('#cartN');
    if (c) { c.textContent = n; c.parentElement.classList.remove('bump'); void c.offsetWidth; c.parentElement.classList.add('bump'); }
    b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 1400);
    aviso('Añadido al carrito');
  }));
  // Reserva
  const res = $('.reserva');
  if (res) {
    const etiqueta = () => {
      const dd = res.querySelector('.dias .on')?.dataset.dia, h = res.querySelector('.horas .on')?.dataset.hora;
      res.querySelector('.res-ok span').textContent = `Confirmar cita · ${dd}, ${h}`;
    };
    res.addEventListener('click', e => {
      const b = e.target.closest('.dias button, .horas button');
      if (b && !b.disabled) { b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); etiqueta(); }
      if (e.target.closest('.res-ok')) { e.preventDefault(); aviso('Cita solicitada'); }
    });
    etiqueta();
  }
  // Horario: marca hoy y si está abierto
  const ahora = new Date(), dia = ahora.getDay(), hora = ahora.getHours() + ahora.getMinutes() / 60;
  let abierto = false;
  $$('.horario > div').forEach(f => {
    const dias = f.dataset.dias.split(',').filter(Boolean).map(Number);
    if (dias.includes(dia)) {
      f.classList.add('hoy');
      const a = parseFloat(f.dataset.a), c = parseFloat(f.dataset.c);
      if (!isNaN(a) && hora >= a && hora < c) abierto = true;
    }
  });
  const est = $('[data-estado]');
  if (est) est.innerHTML = `<span class="pill ${abierto ? 'si' : 'no'}"><i></i>${abierto ? 'Abierto ahora' : 'Cerrado ahora'}</span>`;

  const quieto = mini || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);
  if (quieto) { r.classList.add('sin-anim'); return; }

  // Titulares que suben palabra a palabra
  $$('.parte').forEach(h => {
    let i = 0;
    const envolver = nodo => {
      [...nodo.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = d.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(d.createTextNode(' ')); return; }
            const o = d.createElement('span'); o.className = 'pw';
            const t = d.createElement('span'); t.textContent = w; t.style.transitionDelay = `${i++ * 60}ms`;
            o.appendChild(t); frag.appendChild(o);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
          const o = d.createElement('span'); o.className = 'pw';
          ch.style.transitionDelay = `${i++ * 60}ms`;
          ch.replaceWith(o); o.appendChild(ch);
        }
      });
    };
    envolver(h);
  });
  r.classList.add('anim');
  // Aparición al hacer scroll
  const io = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    x.target.classList.add('in'); io.unobserve(x.target);
    x.target.querySelectorAll('[data-n]').forEach(contar);
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .rvi, .parte, .datos > div').forEach((el, k) => {
    if (el.classList.contains('rv')) el.style.transitionDelay = `${(k % 3) * 90}ms`;
    io.observe(el);
  });
  $$('.hero .parte').forEach(h => requestAnimationFrame(() => h.classList.add('in')));
  // Contadores
  function contar(b) {
    const fin = +b.dataset.n, suf = b.dataset.suf || '', t0 = performance.now();
    const paso = t => { const k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
      b.textContent = Math.round(fin * e).toLocaleString('es-ES') + suf; if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  // Parallax suave en las fotos grandes
  const pars = $$('.par img');
  if (pars.length) {
    let pend = false;
    const mover = () => {
      pend = false;
      pars.forEach(img => {
        const b = img.parentElement.getBoundingClientRect();
        if (b.bottom < 0 || b.top > innerHeight) return;
        const k = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = `translate3d(0, ${(-k * 60).toFixed(1)}px, 0) scale(1.14)`;
      });
    };
    addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(mover); } }, { passive: true });
    mover();
  }
}
