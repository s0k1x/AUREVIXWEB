/* ==========================================================
   ⚙️  CONFIGURACIÓN — cambia aquí y se actualiza toda la web
   ========================================================== */
export const CONFIG = {
  marca: 'TuMarca',                         // 👈 el nombre de tu marca (cuando lo tengas)
  eslogan: 'Webs profesionales para tu negocio',
  whatsapp: '34600000000',                  // con prefijo 34, sin + ni espacios
  email: 'hola@tudominio.com',
  senal: 50,                                // % que se paga al empezar
  comision: 30,                             // % que se lleva el vendedor por cada web que venda

  // Emails que entran como PROPIETARIO (acceso total al panel)
  propietarios: ['tuemail@gmail.com'],

  /* 💶 FORMAS DE PAGO — deja en '' las que no quieras mostrar
     · bizum y transferencia: gratis, tú confirmas el pago en el panel
     · stripe: enlace de pago de Stripe (tarjeta, Apple/Google Pay y Bizum online).
       Crea el enlace con "el cliente elige el importe" (ver LEEME.md)
     · paypal: tu usuario de PayPal.Me (el importe se rellena solo) */
  pagos: {
    bizum: '600 000 000',
    iban: 'ES00 0000 0000 0000 0000 0000',
    titular: 'Tu nombre y apellidos',
    stripe: '',                             // ej: 'https://buy.stripe.com/xxxxxx'
    paypal: ''                              // ej: 'tuusuario'  (paypal.me/tuusuario)
  },

  // ⭐ Enlace a tu página de Trustpilot (déjalo en '' hasta que la tengas)
  trustpilot: '',

  // Inicio de sesión con GitHub además de Google (requiere activarlo en Firebase)
  loginGithub: false,

  // 📄 Datos legales para la página de términos y privacidad
  legal: {
    titular: 'Tu nombre y apellidos',
    nif: '00000000X',
    domicilio: 'Tu ciudad, España',
    email: 'hola@tudominio.com'
  },

  // 🔐 Firebase: pega aquí la configuración de tu proyecto para activar
  // el login con Google/email y guardar pedidos de verdad (ver LEEME.md).
  // Mientras esté en null la web funciona en MODO DEMO (datos solo en este móvil).
  firebase: null
  /* Ejemplo:
  firebase: {
    apiKey: "AIza...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  }
  */
};

/* ---------- Tipos de web y precios ---------- */
export const PLANES = [
  {
    id: 'landing', nombre: 'Landing page', precio: 149, entrega: '3–5 días', icono: 'landing',
    desc: 'Una sola página directa al grano para presentar tu servicio y conseguir contactos.',
    incluye: ['1 página con varias secciones', 'Adaptada a móvil', 'Botón de WhatsApp y formulario', 'Publicación incluida'],
    plantillas: ['lienzo', 'filo']
  },
  {
    id: 'portfolio', nombre: 'Portfolio', precio: 199, entrega: '4–6 días', icono: 'portfolio',
    desc: 'Para fotógrafos, artistas, diseñadores o profesionales que quieren enseñar su trabajo.',
    incluye: ['Galería de trabajos', 'Sobre mí y servicios', 'Formulario de contacto', 'Adaptada a móvil'],
    plantillas: ['lienzo']
  },
  {
    id: 'negocio', nombre: 'Web de negocio', precio: 349, entrega: '1 semana', icono: 'negocio', popular: true,
    desc: 'La web completa para tu negocio local: servicios, precios, galería, horarios y mapa.',
    incluye: ['Hasta 5 secciones o páginas', 'Galería, horarios y mapa', 'Instalable como app (PWA)', 'SEO básico para Google', '1 mes de cambios gratis'],
    plantillas: ['filo', 'brasa', 'calma', 'pulso']
  },
  {
    id: 'reservas', nombre: 'Web con reservas', precio: 490, entrega: '10 días', icono: 'reservas',
    desc: 'Tus clientes eligen día y hora y reservan solos. Ideal para peluquerías, clínicas o estética.',
    incluye: ['Todo lo de Web de negocio', 'Sistema de citas online', 'Aviso de cada reserva', 'Panel para ver las citas'],
    plantillas: ['calma', 'filo', 'pulso']
  },
  {
    id: 'tienda', nombre: 'Tienda online', precio: 690, entrega: '2 semanas', icono: 'tienda',
    desc: 'Vende tus productos con catálogo, carrito y pagos sin comisiones de plataformas.',
    incluye: ['Catálogo y carrito', 'Pago con tarjeta, Bizum o WhatsApp', 'Panel para gestionar productos', 'Hasta 50 productos'],
    plantillas: ['kiosko', 'brasa']
  },
  {
    id: 'medida', nombre: 'A medida', precio: 990, entrega: 'Según proyecto', icono: 'medida',
    desc: 'Plataformas, áreas de clientes, apps web… Si lo puedes imaginar, lo construimos.',
    incluye: ['Análisis de tu idea', 'Diseño 100% personalizado', 'Funciones a medida', 'Soporte prioritario'],
    plantillas: []
  }
];

/* ---------- Extras del cuestionario ---------- */
export const EXTRAS = [
  { id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60, desc: 'tunegocio.com listo y funcionando' },
  { id: 'logo', nombre: 'Diseño de logo', precio: 80, desc: '3 propuestas y archivos finales' },
  { id: 'textos', nombre: 'Redacción de textos', precio: 40, desc: 'Escribimos los textos por ti' },
  { id: 'idioma', nombre: 'Idioma extra', precio: 90, desc: 'Inglés u otro idioma' },
  { id: 'seo', nombre: 'SEO avanzado', precio: 120, desc: 'Google Business + posicionamiento local' },
  { id: 'mantenimiento', nombre: 'Mantenimiento mensual', precio: 15, mensual: true, desc: 'Cambios y copias de seguridad' }
];

export const URGENTE = 0.25; // +25% sobre el precio base si lo quieren urgente
