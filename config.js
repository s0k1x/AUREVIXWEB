/* ==========================================================
   CONFIGURACIÓN: valores iniciales de la web
   Con Supabase conectado, casi todo esto se cambia sin tocar
   código desde «Ajustes → Negocio» (solo el propietario).
   © AurevixWeb. Todos los derechos reservados.
   ========================================================== */
export const CONFIG = {
  marca: 'AurevixWeb',
  eslogan: 'Webs profesionales para tu negocio',
  email: 'aurevixweb@gmail.com',           // único canal de contacto (no hay WhatsApp)
  dominio: 'aurevixweb.es',                 // reservado; aún no apunta a la web (ver LEEME.md, punto 12)
  aviso: 'Plazas abiertas para nuevos proyectos este mes', // texto de la píldora de la portada
  anuncio: { activo: false, texto: '' },    // franja de aviso arriba del todo
  aceptarPedidos: true,                     // si es false, los botones de compra pasan a «Lista de espera»
  mensajeCerrado: 'Ahora mismo tenemos la agenda completa. Déjanos tus datos y te escribimos en cuanto haya hueco.',
  horario: 'Lunes a viernes, de 9:00 a 18:00',
  respuesta: 'Respondemos en menos de 24 horas laborables',
  senal: 50,                                // % que se paga al empezar
  comision: 30,                             // % que se lleva el vendedor por cada web que venda
  urgente: 0.25,                            // +25 % sobre el precio base si lo quieren urgente

  // Descuento de bienvenida: solo vale en la PRIMERA web de cada cliente
  bienvenida: { activo: true, codigo: 'BIENVENIDA10', pct: 10 },

  /* CREADORES DE VÍDEO: pago fijo por cada vídeo aprobado y publicado
     · precio: lo que cobra por vídeo
     · bonus: extra si el vídeo supera «visitas» visualizaciones en 14 días
     · maxMes: vídeos pagados como máximo al mes por persona
     Además cobran la comisión normal si alguien compra desde su enlace. */
  videos: { precio: 15, bonus: 25, visitas: 10000, maxMes: 12 },

  // Emails que entran como PROPIETARIO (acceso total al panel)
  propietarios: ['aurevixweb@gmail.com'],

  /* FORMAS DE PAGO: Bizum y transferencia bancaria (gratis; tú confirmas el pago en el panel)
     Deja bizum en '' para no ofrecerlo. Lo normal es cambiarlo desde Ajustes → Negocio → «Cobros y comisiones». */
  // Temporada de la web (colores y ambiente): 'auto' según la fecha, '' ninguna, o halloween, blackfriday,
  // navidad, anonuevo, sanvalentin, verano. Se cambia en Ajustes → Negocio → «Temporada».
  temporada: 'auto',
  // Suscripción a la Librería de componentes (se paga por Bizum o transferencia y se activa en Ajustes → Librería)
  libreria: { precio: 9 },
  pagos: {
    bizum: '',
    iban: 'ES00 0000 0000 0000 0000 0000',
    titular: 'Tu nombre y apellidos'
  },

  // Enlace a tu página de Trustpilot (déjalo en '' hasta que la tengas)
  trustpilot: '',

  // Redes sociales de la marca (déjalas en '' si no las tienes)
  redes: { instagram: '', tiktok: '', linkedin: '' },

  // Inicio de sesión con GitHub además de Google (actívalo también en Supabase)
  loginGithub: false,

  // Impuestos: los precios de la web llevan el IVA incluido (obligatorio mostrar el precio final al consumidor)
  iva: 21,

  /* DATOS LEGALES (aviso legal, condiciones, privacidad y recibos). Vendes como autónomo: nombre y apellidos,
     NIF y domicilio profesional. Mientras estén los de ejemplo, el panel del propietario avisa de que faltan.
     Lo normal es rellenarlos desde Ajustes → Negocio → «Datos legales». */
  legal: {
    titular: 'Tu nombre y apellidos',
    nif: '00000000X',
    domicilio: 'Tu dirección completa, código postal y ciudad',
    email: 'aurevixweb@gmail.com',
    actividad: 'Diseño y desarrollo de páginas web'
  },
  // Fecha de la versión vigente de las condiciones (se guarda en cada pedido)
  condiciones: '2026-10-28',

  // SUPABASE: login real, base de datos, archivos y asistente con IA (Gemini)
  supabase: {
    url: 'https://jmmwuiuhwxgwnyqectcb.supabase.co',
    anonKey: 'sb_publishable_FxFlpmkSWOWTxMEB-e56kQ_QdcwxAEj' // clave pública: no pasa nada por ponerla aquí
  },

  // Asistente de la web (chat de dudas y "Te ayudo a elegir")
  asistente: {
    activo: true,
    nombre: 'Asistente',
    saludo: 'Hola, soy el asistente de AurevixWeb. Puedo ayudarte con precios, plazos, tipos de web o cómo funciona el proceso. ¿Qué necesitas?'
  }
};

/* ---------- Tipos de web y precios ----------
   entrega: lo que ve el cliente · dias: plazo máximo para calcular la fecha de entrega */
export const PLANES = [
  {
    id: 'landing', nombre: 'Landing page', precio: 149, entrega: '1 semana', dias: 7, icono: 'landing',
    desc: 'Una página con varias secciones para presentar un servicio o un negocio y recibir contactos.',
    incluye: ['1 página con varias secciones', 'Adaptada a móvil', 'Formulario de contacto', 'Publicación incluida'],
    plantillas: ['lienzo', 'filo']
  },
  {
    id: 'portfolio', nombre: 'Portfolio', precio: 199, entrega: '1–2 semanas', dias: 14, icono: 'portfolio',
    desc: 'Para fotógrafos, diseñadores, artistas y profesionales que necesitan mostrar sus trabajos.',
    incluye: ['Galería de trabajos', 'Sobre mí y servicios', 'Formulario de contacto', 'Adaptada a móvil'],
    plantillas: ['lienzo']
  },
  {
    id: 'negocio', nombre: 'Web de negocio', precio: 349, entrega: '2 semanas', dias: 14, icono: 'negocio', popular: true,
    desc: 'Web completa para un negocio local: servicios y precios, galería, horario, ubicación y contacto.',
    incluye: ['Hasta 5 secciones o páginas', 'Galería, horarios y mapa', 'Instalable como app (PWA)', 'SEO básico para Google', '1 mes de cambios gratis'],
    plantillas: ['filo', 'brasa', 'calma', 'pulso']
  },
  {
    id: 'reservas', nombre: 'Web con reservas', precio: 490, entrega: '2–3 semanas', dias: 21, icono: 'reservas',
    desc: 'Incluye reserva de citas online. Pensada para peluquerías, centros de estética, clínicas y consultas.',
    incluye: ['Todo lo de Web de negocio', 'Sistema de citas online', 'Aviso de cada reserva', 'Panel para ver las citas'],
    plantillas: ['calma', 'filo', 'pulso']
  },
  {
    id: 'tienda', nombre: 'Tienda online', precio: 690, entrega: '3–4 semanas', dias: 30, icono: 'tienda',
    desc: 'Catálogo, carrito y pago online para vender tus productos sin pagar comisiones a marketplaces.',
    incluye: ['Catálogo y carrito', 'Pago por transferencia bancaria', 'Panel para gestionar productos', 'Hasta 50 productos'],
    plantillas: ['kiosko', 'brasa']
  },
  {
    id: 'medida', nombre: 'A medida', precio: 990, entrega: 'Desde 1 mes', dias: 30, icono: 'medida',
    desc: 'Proyectos con funciones específicas: áreas de clientes, aplicaciones web, integraciones. Presupuesto según alcance.',
    incluye: ['Análisis de tu idea', 'Diseño 100% personalizado', 'Funciones a medida', 'Soporte prioritario'],
    plantillas: []
  }
];

/* ---------- Comparativa de planes (tabla «Compara») ---------- */
export const COMPARATIVA = [
  ['Diseño adaptado a tu marca', ['landing', 'portfolio', 'negocio', 'reservas', 'tienda', 'medida']],
  ['Adaptada a móvil', ['landing', 'portfolio', 'negocio', 'reservas', 'tienda', 'medida']],
  ['Formulario de contacto', ['landing', 'portfolio', 'negocio', 'reservas', 'tienda', 'medida']],
  ['Varias páginas o secciones', ['portfolio', 'negocio', 'reservas', 'tienda', 'medida']],
  ['Galería de trabajos o fotos', ['portfolio', 'negocio', 'reservas', 'tienda', 'medida']],
  ['Horario y mapa', ['negocio', 'reservas', 'tienda', 'medida']],
  ['Instalable como app (PWA)', ['negocio', 'reservas', 'tienda', 'medida']],
  ['SEO básico para Google', ['negocio', 'reservas', 'tienda', 'medida']],
  ['Reserva de citas online', ['reservas', 'medida']],
  ['Catálogo, carrito y pago', ['tienda', 'medida']],
  ['Funciones a medida', ['medida']]
];

/* ---------- Extras del cuestionario ---------- */
export const EXTRAS = [
  { id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60, desc: 'Registro del dominio a tu nombre y alojamiento' },
  { id: 'correo', nombre: 'Correo con tu dominio', precio: 8, mensual: true, desc: 'Un buzón como info@tunegocio.es, configurado en tu móvil y tu ordenador' },
  { id: 'logo', nombre: 'Diseño de logo', precio: 80, desc: '3 propuestas y archivos finales' },
  { id: 'textos', nombre: 'Redacción de textos', precio: 40, desc: 'Redactamos los textos de la web' },
  { id: 'idioma', nombre: 'Idioma extra', precio: 90, desc: 'Inglés u otro idioma' },
  { id: 'seo', nombre: 'SEO avanzado', precio: 120, desc: 'Google Business + posicionamiento local' },
  { id: 'mantenimiento', nombre: 'Mantenimiento mensual', precio: 15, mensual: true, desc: 'Actualizaciones, cambios menores y copias de seguridad' }
];
