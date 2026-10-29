/* ==========================================================
   Hola7273! · Datos del negocio
   Todo lo que cambia a menudo está aquí: servicios, precios,
   horario, avisos de reserva y conexión con la base de datos.
   ========================================================== */
window.HOLA = {
  nombre: 'Hola7273!',
  web: 'https://www.hola7273.es',
  email: 'hola7273@gmail.com',
  telefono: '+34 602 708 111',
  telefonoVisible: '602 708 111',
  whatsapp: '34602708111',
  // [FALTA] Ciudad y dirección exactas: cámbialas aquí y en los textos marcados con «[Ciudad]» en los .html
  direccion: 'Dirección pendiente de confirmar',
  ciudad: '',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Hola7273!+peluquer%C3%ADa',

  // Servicios que se pueden reservar (minutos y euros)
  servicios: [
    { id: 'corte', nombre: 'Corte de pelo', min: 30, precio: 14, desc: 'Lavado, corte a tijera o máquina y peinado.' },
    { id: 'fade', nombre: 'Degradado / fade', min: 40, precio: 16, desc: 'Degradado limpio a máquina con acabado a navaja.' },
    { id: 'barba', nombre: 'Arreglo de barba', min: 20, precio: 10, desc: 'Perfilado, rebaje y toalla caliente.' },
    { id: 'combo', nombre: 'Corte + barba', min: 50, precio: 22, desc: 'El pack completo para salir como nuevo.' },
    { id: 'navaja', nombre: 'Afeitado a navaja', min: 30, precio: 15, desc: 'Afeitado clásico con toalla caliente y bálsamo.' },
    { id: 'infantil', nombre: 'Corte infantil', min: 25, precio: 10, desc: 'Para los peques de la casa, hasta 12 años.' },
    { id: 'lavado', nombre: 'Lavado y peinado', min: 30, precio: 15, desc: 'Lavado con masaje capilar y peinado a tu gusto.' },
    { id: 'color', nombre: 'Color / mechas', min: 90, precio: 40, desc: 'Tinte, mechas o matiz. Precio desde.' }
  ],

  // Horario: 0 = domingo … 6 = sábado. Cada día, tramos [abre, cierra] en "HH:MM"
  horario: {
    1: [['10:00', '14:00'], ['16:00', '20:30']],
    2: [['10:00', '14:00'], ['16:00', '20:30']],
    3: [['10:00', '14:00'], ['16:00', '20:30']],
    4: [['10:00', '14:00'], ['16:00', '20:30']],
    5: [['10:00', '20:30']],
    6: [['09:30', '14:00']],
    0: []
  },
  festivos: [], // fechas cerradas, "AAAA-MM-DD"
  intervalo: 15,       // cada cuántos minutos empieza una cita
  diasVista: 21,       // cuántos días se pueden reservar por adelantado
  margenMin: 60,       // no se puede reservar con menos de esta antelación (minutos)

  // Aviso automático por correo de cada reserva y de cada mensaje de contacto.
  // FormSubmit pide confirmar el correo la primera vez: llega un email a hola7273@gmail.com
  // con un botón «Activate». Tras pulsarlo, los avisos llegan solos.
  aviso: { url: 'https://formsubmit.co/ajax/hola7273@gmail.com' },

  // Base de datos de citas (Supabase). Vacío = modo prueba: las citas se guardan en este navegador.
  // Instrucciones en supabase/citas.sql
  supabase: { url: '', anonKey: '' },

  // Clave del panel en modo prueba (sin Supabase). Con Supabase se entra con el correo y la contraseña del negocio.
  pinPanel: '7273'
};
