/* ==========================================================
   Sesión y datos
   - Con CONFIG.supabase → login real (Google / email / GitHub) y base de datos Supabase
   - Sin configurar      → MODO DEMO (todo se guarda en este navegador)
   ========================================================== */
import { CONFIG } from '../config.js';

export const modoDemo = !(CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey);

const propietarios = CONFIG.propietarios.map(e => e.toLowerCase().trim());
const rolDe = (email, guardado) =>
  propietarios.includes((email || '').toLowerCase()) ? 'owner' : (guardado || 'client');

let sb = null;
let nombrePendiente = '';
let usuario = null;
let listo = false;
let resolverListo;
const oyentes = new Set();
export const cuandoListo = new Promise(r => (resolverListo = r));

function emitir(u) {
  usuario = u;
  oyentes.forEach(cb => { try { cb(u); } catch (e) { console.error(e); } });
}
export function alCambiarUsuario(cb) {
  oyentes.add(cb);
  if (listo) cb(usuario);
  return () => oyentes.delete(cb);
}
export const usuarioActual = () => usuario;

function necesitaUsuario() {
  if (!usuario) throw new Error('Tienes que iniciar sesión');
  return usuario;
}
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- Almacenamiento local (modo demo) ---------- */
const memoria = {};
const local = {
  get(k, def) {
    try { const v = localStorage.getItem('tm_' + k); return v ? JSON.parse(v) : def; }
    catch { return k in memoria ? memoria[k] : def; }
  },
  set(k, v) {
    try { localStorage.setItem('tm_' + k, JSON.stringify(v)); }
    catch { memoria[k] = v; }
  }
};

function sembrarDemo() {
  if (local.get('sembrado_v5')) return;
  const ahora = Date.now(), dia = 864e5;
  const users = {
    u_trab: { uid: 'u_trab', name: 'Laura Ruiz', email: 'trabajador@demo.com', photo: '', role: 'worker', createdAt: ahora - 30 * dia },
    u_ana: { uid: 'u_ana', name: 'Ana Torres', email: 'ana@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 5 * dia },
    u_pepe: { uid: 'u_pepe', name: 'Pepe Gómez', email: 'pepe@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 3 * dia },
    u_carla: { uid: 'u_carla', name: 'Carla Díaz', email: 'carla@ejemplo.com', photo: '', role: 'client', createdAt: ahora - dia }
  };
  const base = { notas: [], mensual: 0 };
  const orders = [
    { ...base, id: 'o1', uid: 'u_ana', clienteNombre: 'Ana Torres', clienteEmail: 'ana@ejemplo.com', plan: 'reservas', planNombre: 'Web con reservas', precioBase: 490, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 550, ref: 'u_trab', plantilla: 'calma', respuestas: { negocio: 'Estética Ana', sector: 'Belleza y estética', objetivo: 'Reservas / citas', telefono: '600 111 222', estilo: 'Elegante', color: '#6f8f72', logo: 'Sí, ya tengo', contenido: 'Tengo algunos', comentarios: 'Me gustaría que se vieran bien los precios de los tratamientos.' }, estado: 'en_curso', etapa: 'contenido', dominio: { nombre: 'esteticaana.es', tipo: 'nuevo', t: ahora - 3 * dia }, pagoEstado: 'senal', pagoMetodo: 'transferencia', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 5 * dia },
    { ...base, id: 'o2', uid: 'u_pepe', clienteNombre: 'Pepe Gómez', clienteEmail: 'pepe@ejemplo.com', plan: 'negocio', planNombre: 'Web de negocio', precioBase: 349, extras: [{ id: 'logo', nombre: 'Diseño de logo', precio: 80 }], urgente: false, total: 429, mensual: 15, plantilla: 'filo', respuestas: { negocio: 'Barbería Pepe', sector: 'Peluquería / barbería', objetivo: 'Que me contacten', telefono: '600 333 444', estilo: 'Oscuro', color: '#c9a24a', logo: 'No, necesito uno', contenido: 'Necesito ayuda', comentarios: '' }, estado: 'nuevo', etapa: 'recibido', pagoEstado: 'verificando', pagoMetodo: 'transferencia', pagoFase: 'senal', pagoAviso: ahora - 2 * 36e5, asignado: '', asignadoNombre: '', createdAt: ahora - 3 * dia },
    { ...base, id: 'o3', uid: 'u_carla', clienteNombre: 'Carla Díaz', clienteEmail: 'carla@ejemplo.com', plan: 'tienda', planNombre: 'Tienda online', precioBase: 690, extras: [], urgente: true, total: 862.5, ref: 'u_trab', plantilla: 'kiosko', respuestas: { negocio: 'Carla Handmade', sector: 'Tienda / comercio', objetivo: 'Vender online', telefono: '600 555 666', estilo: 'Moderno', color: '#2f5bff', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: 'Vendo bisutería hecha a mano, unos 30 productos.' }, estado: 'nuevo', etapa: 'recibido', pagoEstado: 'pendiente', asignado: '', asignadoNombre: '', createdAt: ahora - dia }
    ,{ ...base, id: 'o4', uid: 'u_marta', clienteNombre: 'Marta Gil', clienteEmail: 'marta@ejemplo.com', plan: 'landing', planNombre: 'Landing page', precioBase: 149, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 209, ref: 'u_trab', plantilla: 'lienzo', respuestas: { negocio: 'Marta Fotografía', sector: 'Profesional / freelance', objetivo: 'Darme a conocer', telefono: '600 777 888', estilo: 'Minimalista', color: '', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: '' }, tareas: { diseno: true, contenido: true, desarrollo: true, revision: true, publicacion: true }, estado: 'entregado', etapa: 'publicada', urlWeb: 'https://martafotografia.es', dominio: { nombre: 'martafotografia.es', tipo: 'nuevo', t: ahora - 10 * dia }, pagoEstado: 'pagado', pagoMetodo: 'transferencia', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 12 * dia }
  ];
  const apps = [
    { id: 'a1', uid: 'u_cand1', nombre: 'Marcos Vidal', email: 'marcos@ejemplo.com', telefono: '611 222 333', puesto: 'Ventas', habilidades: ['ChatGPT / Claude', 'Vender en persona', 'Vender por WhatsApp'], experiencia: 'Bastante', portfolio: 'instagram.com/marcosv', mensaje: 'Llevo 2 años vendiendo seguros y conozco a muchos negocios del barrio.', estado: 'pendiente', createdAt: ahora - 2 * dia },
    { id: 'a2', uid: 'u_cand2', nombre: 'Sara León', email: 'sara@ejemplo.com', telefono: '622 444 555', puesto: 'Redes sociales', habilidades: ['TikTok', 'Instagram', 'Imágenes con IA', 'Canva'], experiencia: 'Algo', portfolio: 'tiktok.com/@saraleon', mensaje: 'Tengo 12.000 seguidores en TikTok y sé crear contenido que engancha.', estado: 'pendiente', createdAt: ahora - 6 * 36e5 }
  ];
  users.u_marta = { uid: 'u_marta', name: 'Marta Gil', email: 'marta@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 12 * dia };
  users.u_cand1 = { uid: 'u_cand1', name: 'Marcos Vidal', email: 'marcos@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 2 * dia };
  users.u_cand2 = { uid: 'u_cand2', name: 'Sara León', email: 'sara@ejemplo.com', photo: '', role: 'client', createdAt: ahora - dia };
  local.set('users', users);
  local.set('orders', orders);
  local.set('apps', apps);
  const resenas = [
    { id: 'r1', uid: 'u_ana', nombre: 'Ana Torres', estrellas: 5, texto: 'Me hicieron la web de mi centro de estética en 10 días y ya recibo reservas por ahí. Muy atentos en todo momento.', plan: 'Web con reservas', aprobada: true, demo: true, createdAt: ahora - 2 * dia },
    { id: 'r2', uid: 'u_x1', nombre: 'Jorge Martín', estrellas: 5, texto: 'Rápidos, claros con el precio y la web se ve genial en el móvil.', plan: 'Landing page', aprobada: true, demo: true, createdAt: ahora - 9 * dia },
    { id: 'r3', uid: 'u_x2', nombre: 'Lucía Romero', estrellas: 4, texto: 'Muy contenta con el resultado. Me ayudaron también con los textos.', plan: 'Web de negocio', aprobada: true, demo: true, createdAt: ahora - 15 * dia },
    { id: 'r4', uid: 'u_pepe', nombre: 'Pepe Gómez', estrellas: 5, texto: 'Todo perfecto, repetiría.', plan: 'Web de negocio', aprobada: false, demo: true, createdAt: ahora - 3 * 36e5 }
  ];
  local.set('resenas', resenas);
  local.set('mensajes', [
    { id: 'm1', uid: 'u_trab', pedido: 'o1', autor: 'Laura Ruiz', rol: 'worker', texto: 'Hola Ana, ya tenemos el dominio. Cuando puedas, envíanos los textos de los tratamientos.', createdAt: ahora - 2 * dia },
    { id: 'm2', uid: 'u_ana', pedido: 'o1', autor: 'Ana Torres', rol: 'client', texto: 'Perfecto, esta semana os los mando. ¿Las fotos las subo aquí?', createdAt: ahora - 2 * dia + 36e5 },
    { id: 'm3', uid: 'u_trab', pedido: 'o1', autor: 'Laura Ruiz', rol: 'worker', texto: 'Sí, en la pestaña «Archivos» de tu proyecto.', createdAt: ahora - 2 * dia + 2 * 36e5 }
  ]);
  local.set('tickets', [
    { id: 't1', uid: null, nombre: 'Rafael Prieto', email: 'rafa@ejemplo.com', tipo: 'contacto', asunto: 'Presupuesto para una academia', mensaje: 'Tengo una academia de inglés y quiero una web con matrícula online. ¿Me podéis pasar un presupuesto?', estado: 'abierto', respuestas: [], createdAt: ahora - 5 * 36e5 },
    { id: 't2', uid: 'u_marta', nombre: 'Marta Gil', email: 'marta@ejemplo.com', tipo: 'cambio', pedido: 'o4', asunto: 'Cambiar el horario', mensaje: 'Hola, en verano abro de 9 a 14. ¿Podéis cambiarlo en la web?', estado: 'abierto', respuestas: [], createdAt: ahora - dia }
  ]);
  local.set('avisos', []);
  local.set('sembrado_v5', true);
}

function usuarioLocal(uid) {
  const d = local.get('users', {})[uid];
  return d ? { uid: d.uid, name: d.name, email: d.email, photo: d.photo || '', role: rolDe(d.email, d.role), datos: d.datos || {} } : null;
}
function entrarLocal({ name, email, role = 'client' }) {
  const users = local.get('users', {});
  let u = Object.values(users).find(x => x.email.toLowerCase() === email.toLowerCase());
  if (!u) {
    u = { uid: 'u_' + nuevoId(), name, email, photo: '', role, createdAt: Date.now() };
    users[u.uid] = u;
    local.set('users', users);
  }
  local.set('sesion', u.uid);
  emitir(usuarioLocal(u.uid));
  return usuario;
}

/* ---------- Arranque ---------- */
// Cliente de Supabase (versión fija para que nada cambie sin avisar). Va alojado en la web (js/vendor/)
// y el service worker lo guarda: así la app no espera al CDN en cada arranque. El CDN queda de reserva.
const SUPABASE_JS = new URL('./vendor/supabase.js', import.meta.url).href;
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.100.1/+esm';
const cargarSupabase = () => import(SUPABASE_JS).catch(() => import(SUPABASE_CDN));

/* ---------- Conexión a prueba de cuelgues ----------
   1) Ninguna petición puede quedarse esperando para siempre: si el servidor
      no contesta a tiempo, se corta y la web enseña «Reintentar».
   2) El candado de la sesión (evita que dos pestañas renueven la sesión a la vez)
      no puede bloquear la web: si no se consigue en 4 s, se sigue sin él.
      En iPhone, al volver de otra app, a veces se quedaba pillado. */
const LENTO = 'La conexión va lenta y no ha respondido. Comprueba tu internet y pulsa «Reintentar».';
const SIN_RED = 'No hay conexión a internet. Cuando vuelva, pulsa «Reintentar».';
export function limite(promesa, ms = 20000) {
  let t;
  return Promise.race([
    Promise.resolve(promesa).finally(() => clearTimeout(t)),
    new Promise((_, mal) => { t = setTimeout(() => mal(new Error(navigator.onLine === false ? SIN_RED : LENTO)), ms); })
  ]);
}
function fetchConLimite(url, opciones = {}) {
  const grande = opciones.body instanceof Blob || opciones.body instanceof FormData || opciones.body instanceof ArrayBuffer;
  const ctrl = new AbortController();
  const ia = String(url).includes('/functions/v1/'); // la IA tarda más en redactar
  const t = setTimeout(() => ctrl.abort(), grande ? 180000 : ia ? 75000 : 20000); // subir archivos puede tardar más
  opciones.signal?.addEventListener?.('abort', () => ctrl.abort());
  return fetch(url, { ...opciones, signal: ctrl.signal })
    .catch(e => { throw e?.name === 'AbortError' && !opciones.signal?.aborted ? new Error(navigator.onLine === false ? SIN_RED : LENTO) : e; })
    .finally(() => clearTimeout(t));
}
async function candado(nombre, _espera, fn) {
  if (!navigator.locks?.request) return fn();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  let dentro = false;
  try {
    return await navigator.locks.request(nombre, { mode: 'exclusive', signal: ctrl.signal }, async () => { dentro = true; clearTimeout(t); return await fn(); });
  } catch (e) {
    if (!dentro) return fn(); // no se consiguió el candado a tiempo: seguimos igualmente
    throw e;
  } finally { clearTimeout(t); }
}

export async function iniciar() {
  if (modoDemo) {
    sembrarDemo();
    const s = local.get('sesion');
    listo = true;
    emitir(s ? usuarioLocal(s) : null);
    resolverListo(usuario);
    return;
  }
  let u = null, fallo = null;
  try {
    const { createClient } = await limite(cargarSupabase(), 15000);
    sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', lock: candado },
      global: { fetch: fetchConLimite }
    });
    const { data } = await limite(sb.auth.getSession(), 15000);
    u = data.session ? await sincronizar(data.session.user) : null;
  } catch (e) { fallo = e; }
  // Pase lo que pase, la web sigue: si falla, se entra como «sin sesión» y se avisa
  listo = true;
  emitir(u);
  resolverListo(u);
  if (sb) {
    // IMPORTANTE: este aviso NO puede esperar a Supabase dentro (bloquearía todas las consultas).
    // Por eso el trabajo se hace un instante después, fuera del aviso.
    sb.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED') return;
      if (evento === 'SIGNED_OUT' || !sesion) { setTimeout(() => emitir(null), 0); return; }
      if (evento === 'SIGNED_IN' && usuario?.uid === sesion.user.id) return; // misma persona (pasa al volver a la pestaña)
      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') setTimeout(async () => emitir(await sincronizar(sesion.user)), 0);
    });
  }
  // Al volver del login de Google/GitHub se limpia la dirección
  if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
  if (fallo) throw fallo;
}

// Perfil del usuario (tabla perfiles). Se crea solo al registrarse (ver supabase/esquema.sql).
async function sincronizar(su) {
  const meta = su.user_metadata || {};
  let perfil = null;
  try {
    const { data } = await limite(sb.from('perfiles').select('*').eq('id', su.id).maybeSingle(), 12000);
    perfil = data;
    if (!perfil) {
      const nuevo = { id: su.id, name: meta.full_name || meta.name || nombrePendiente || su.email.split('@')[0], email: su.email, photo: meta.avatar_url || '', role: 'client' };
      const r = await limite(sb.from('perfiles').insert(nuevo).select().single(), 12000);
      perfil = r.data || nuevo;
    }
  } catch (e) { console.warn(e); }
  perfil = perfil || { name: su.email.split('@')[0], role: 'client' };
  return { uid: su.id, name: perfil.name, email: su.email, photo: perfil.photo || meta.avatar_url || '', role: rolDe(su.email, perfil.role), datos: perfil.datos || {}, proveedor: su.app_metadata?.provider || 'email' };
}

/* ---------- Login ---------- */
const traducirError = e => {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese email ya tiene cuenta. Inicia sesión.';
  if (m.includes('password') && m.includes('6')) return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('email not confirmed')) return 'Confirma tu email: te hemos enviado un enlace.';
  if (m.includes('invalid') && m.includes('email')) return 'El email no es válido';
  if (m.includes('provider is not enabled')) return 'Este método de acceso no está activado en Supabase (mira el LEEME)';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  return e?.message || 'Algo ha fallado, inténtalo de nuevo';
};
const volverA = () => location.origin + location.pathname;

export async function entrarConGoogle() {
  if (modoDemo) return entrarLocal({ name: 'Usuario de Google', email: 'google@demo.com' });
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volverA(), queryParams: { prompt: 'select_account' } } });
  if (error) throw new Error(traducirError(error));
}

export async function entrarConGithub() {
  if (modoDemo) return entrarLocal({ name: 'Usuario de GitHub', email: 'github@demo.com' });
  const { error } = await sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: volverA() } });
  if (error) throw new Error(traducirError(error));
}

export async function entrarConEmail(email, pass) {
  if (modoDemo) return entrarLocal({ name: email.split('@')[0], email });
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(traducirError(error));
}

export async function registrarConEmail(nombre, email, pass) {
  if (modoDemo) return entrarLocal({ name: nombre, email });
  nombrePendiente = nombre;
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name: nombre, full_name: nombre }, emailRedirectTo: volverA() } });
  if (error) throw new Error(traducirError(error));
  if (!data.session) throw new Error('Te hemos enviado un email para confirmar la cuenta. Ábrelo y vuelve a entrar.');
}

export async function recuperarPass(email) {
  if (modoDemo) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: volverA() });
  if (error) throw new Error(traducirError(error));
}

export function entrarDemo(rol) {
  const cuentas = {
    client: { name: 'Cliente Demo', email: 'cliente@demo.com', role: 'client' },
    worker: { name: 'Laura Ruiz', email: 'trabajador@demo.com', role: 'worker' },
    owner: { name: 'AurevixWeb', email: CONFIG.propietarios[0] || 'propietario@demo.com', role: 'client' }
  };
  return entrarLocal(cuentas[rol]);
}

export async function cerrarSesion() {
  if (modoDemo) { local.set('sesion', null); emitir(null); return; }
  await sb.auth.signOut();
}

/* ---------- Ayudas para Supabase ----------
   Cada tabla guarda el documento completo en la columna "datos" (jsonb),
   así se pueden añadir campos nuevos sin tocar la base de datos. */
const recientes = arr => arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const deFila = f => ({ ...(f.datos || {}), id: f.id, uid: f.uid });
const comprobar = ({ data, error }) => { if (error) throw new Error(traducirError(error)); return data; };
// Las lecturas se reintentan una vez solas si fallan por la conexión
async function leer(tabla, filtro) {
  const consulta = () => { let q = sb.from(tabla).select('id, uid, datos'); return limite(filtro ? filtro(q) : q, 12000); };
  let r;
  try { r = await consulta(); } catch { r = await consulta(); }
  return recientes(comprobar(r).map(deFila));
}
async function insertar(tabla, doc) {
  const { uid, ...datos } = doc;
  const f = comprobar(await limite(sb.from(tabla).insert({ uid, datos }).select('id, uid, datos').single()));
  return deFila(f);
}
async function cambiar(tabla, id, cambios) {
  const actual = comprobar(await limite(sb.from(tabla).select('datos').eq('id', id).single()));
  comprobar(await limite(sb.from(tabla).update({ datos: { ...actual.datos, ...cambios } }).eq('id', id)));
}
const borrar = async (tabla, id) => comprobar(await limite(sb.from(tabla).delete().eq('id', id)));

/* ---------- Pedidos ---------- */
export async function crearPedido(datos) {
  const u = necesitaUsuario();
  const p = {
    ...datos, uid: u.uid, clienteNombre: u.name, clienteEmail: u.email,
    estado: 'nuevo', etapa: 'recibido', pagoEstado: 'pendiente', asignado: '', asignadoNombre: '', notas: [], createdAt: Date.now()
  };
  if (modoDemo) {
    p.id = nuevoId();
    local.set('orders', [p, ...local.get('orders', [])]);
    uidsPropietariosDemo().forEach(o => avisoDemo(o, `Nuevo pedido: ${p.respuestas?.negocio || p.planNombre}`, p.id, 'pedido'));
    return p;
  }
  try {
    return await insertar('pedidos', p);
  } catch (e) {
    // Si la conexión se cortó justo al enviar, puede que el pedido sí se guardara:
    // se busca por su clave única para no crear un pedido repetido.
    if (p.clave) {
      try {
        const ya = await leer('pedidos', q => q.eq('uid', u.uid).eq('datos->>clave', p.clave));
        if (ya[0]) return ya[0];
      } catch { /* sin conexión: se muestra el error original */ }
    }
    throw e;
  }
}

export async function misPedidos() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('orders', []).filter(o => o.uid === u.uid));
  return leer('pedidos', q => q.eq('uid', u.uid));
}

export async function todosLosPedidos() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('orders', []));
  return leer('pedidos');
}

export async function actualizarPedido(id, cambios) {
  necesitaUsuario();
  if (modoDemo) {
    const antes = local.get('orders', []).find(o => o.id === id);
    local.set('orders', local.get('orders', []).map(o => (o.id === id ? { ...o, ...cambios } : o)));
    if (antes) avisosDemoPedido(antes, { ...antes, ...cambios });
    return;
  }
  await cambiar('pedidos', id, cambios);
}

export async function borrarPedido(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('orders', local.get('orders', []).filter(o => o.id !== id)); return; }
  await borrar('pedidos', id);
}

/* ---------- Candidaturas (Trabaja con nosotros) ---------- */
export async function enviarCandidatura(datos) {
  const u = necesitaUsuario();
  const c = { ...datos, uid: u.uid, email: u.email, estado: 'pendiente', createdAt: Date.now() };
  if (modoDemo) {
    c.id = nuevoId();
    local.set('apps', [c, ...local.get('apps', [])]);
    return c;
  }
  return insertar('candidaturas', c);
}

export async function miCandidatura() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('apps', []).filter(a => a.uid === u.uid))[0] || null;
  return (await leer('candidaturas', q => q.eq('uid', u.uid)))[0] || null;
}

export async function todasLasCandidaturas() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('apps', []));
  return leer('candidaturas');
}

export async function actualizarCandidatura(id, cambios) {
  necesitaUsuario();
  if (modoDemo) {
    local.set('apps', local.get('apps', []).map(a => (a.id === id ? { ...a, ...cambios } : a)));
    return;
  }
  await cambiar('candidaturas', id, cambios);
}

/* ---------- Vídeos de los creadores (pago fijo por vídeo) ---------- */
export async function enviarVideo(datos) {
  const u = necesitaUsuario();
  const v = { ...datos, uid: u.uid, autor: u.name, email: u.email, estado: 'pendiente', bonus: false, createdAt: Date.now() };
  if (modoDemo) {
    v.id = nuevoId();
    local.set('videos', [v, ...local.get('videos', [])]);
    uidsPropietariosDemo().forEach(o => avisoDemo(o, `Vídeo nuevo de ${u.name} para revisar`, '', 'video'));
    return v;
  }
  return insertar('videos', v);
}
export async function misVideos() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('videos', []).filter(v => v.uid === u.uid));
  return leer('videos', q => q.eq('uid', u.uid));
}
export async function todosLosVideos() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('videos', []));
  return leer('videos');
}
export async function actualizarVideo(id, cambios) {
  necesitaUsuario();
  if (modoDemo) {
    const antes = local.get('videos', []).find(v => v.id === id);
    local.set('videos', local.get('videos', []).map(v => (v.id === id ? { ...v, ...cambios } : v)));
    if (antes && cambios.estado && cambios.estado !== antes.estado) avisoDemo(antes.uid, `Tu vídeo ha pasado a «${cambios.estado}»`, '', 'video');
    return;
  }
  await cambiar('videos', id, cambios);
}
export async function borrarVideo(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('videos', local.get('videos', []).filter(v => v.id !== id)); return; }
  await borrar('videos', id);
}

/* ---------- Usuarios y equipo ---------- */
export async function listarUsuarios() {
  necesitaUsuario();
  if (modoDemo) return Object.values(local.get('users', {})).map(u => ({ ...u, role: rolDe(u.email, u.role) }));
  const filas = comprobar(await limite(sb.from('perfiles').select('*')));
  return filas.map(u => ({ uid: u.id, name: u.name, email: u.email, photo: u.photo, datos: u.datos || {}, createdAt: Date.parse(u.created_at), role: rolDe(u.email, u.role) }));
}

export async function cambiarRol(uid, role) {
  necesitaUsuario();
  if (modoDemo) {
    const users = local.get('users', {});
    if (users[uid]) { users[uid].role = role; local.set('users', users); }
    return;
  }
  comprobar(await limite(sb.from('perfiles').update({ role }).eq('id', uid)));
}

/* ---------- Pagos ----------
   El cliente solo puede avisar de que ha pagado (pagoEstado → 'verificando').
   El propietario o un trabajador lo confirma desde el panel. */
export async function avisarPago(id, { metodo, fase }) {
  const cambios = { pagoEstado: 'verificando', pagoMetodo: metodo, pagoFase: fase, pagoAviso: Date.now() };
  await actualizarPedido(id, cambios);
  return cambios;
}

/* ---------- Reseñas ---------- */
export async function crearResena({ estrellas, texto, plan, pedidoId }) {
  const u = necesitaUsuario();
  const r = { uid: u.uid, nombre: u.name, estrellas, texto, plan, pedidoId, aprobada: false, createdAt: Date.now() };
  let creada;
  if (modoDemo) {
    creada = { ...r, id: nuevoId() };
    local.set('resenas', [creada, ...local.get('resenas', [])]);
  } else {
    creada = await insertar('resenas', r);
  }
  await actualizarPedido(pedidoId, { resenada: true });
  return creada;
}

export async function resenasPublicas() {
  if (modoDemo) return recientes(local.get('resenas', []).filter(r => r.aprobada));
  return leer('resenas', q => q.eq('datos->>aprobada', 'true'));
}

export async function todasLasResenas() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('resenas', []));
  return leer('resenas');
}

export async function actualizarResena(id, cambios) {
  necesitaUsuario();
  if (modoDemo) { local.set('resenas', local.get('resenas', []).map(r => (r.id === id ? { ...r, ...cambios } : r))); return; }
  await cambiar('resenas', id, cambios);
}

export async function borrarResena(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('resenas', local.get('resenas', []).filter(r => r.id !== id)); return; }
  await borrar('resenas', id);
}

/* ---------- Asistente con IA (Gemini a través de Supabase) ----------
   La clave de Gemini NUNCA va en la web: está guardada en Supabase
   y la usa la función "asistente" (supabase/functions/asistente). */
export const iaDisponible = () => !modoDemo;
export async function preguntarIA(cuerpo) {
  if (modoDemo) throw new Error('demo');
  const { data, error } = await limite(sb.functions.invoke('asistente', { body: cuerpo }), 40000);
  if (error) throw new Error('El asistente no está disponible ahora mismo');
  return data;
}

/* ==========================================================
   PERFIL, CUENTA Y PRIVACIDAD
   ========================================================== */
const esEquipo = () => usuario && (usuario.role === 'owner' || usuario.role === 'worker');

/** Cambia nombre, foto y datos no sensibles del perfil (disponibilidad, objetivo, preferencias…) */
export async function guardarPerfil({ name, photo, datos } = {}) {
  const u = necesitaUsuario();
  const nuevo = { name: name ?? u.name, photo: photo ?? u.photo, datos: { ...(u.datos || {}), ...(datos || {}) } };
  if (modoDemo) {
    const users = local.get('users', {});
    if (users[u.uid]) Object.assign(users[u.uid], nuevo);
    local.set('users', users);
  } else {
    comprobar(await limite(sb.from('perfiles').update(nuevo).eq('id', u.uid)));
  }
  emitir({ ...u, ...nuevo });
  return usuario;
}

/** Datos privados: teléfono, facturación, datos de cobro */
export async function leerPrivado(uid) {
  const u = necesitaUsuario();
  const id = uid || u.uid;
  if (modoDemo) return local.get('privado', {})[id] || {};
  const { data } = await limite(sb.from('privado').select('datos').eq('id', id).maybeSingle());
  return data?.datos || {};
}
export async function guardarPrivado(cambios) {
  const u = necesitaUsuario();
  const actual = await leerPrivado();
  const datos = { ...actual, ...cambios };
  if (modoDemo) { const t = local.get('privado', {}); t[u.uid] = datos; local.set('privado', t); return datos; }
  comprobar(await limite(sb.from('privado').upsert({ id: u.uid, datos, actualizado: new Date().toISOString() })));
  return datos;
}

export async function cambiarEmail(email) {
  necesitaUsuario();
  if (modoDemo) throw new Error('En el modo demo no se puede cambiar el email');
  const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: volverA() });
  if (error) throw new Error(traducirError(error));
}
export async function cambiarPass(pass) {
  necesitaUsuario();
  if (modoDemo) return;
  const { error } = await sb.auth.updateUser({ password: pass });
  if (error) throw new Error(traducirError(error));
}
export async function cerrarSesionTodas() {
  if (modoDemo) return cerrarSesion();
  await sb.auth.signOut({ scope: 'global' });
}

/** Todos tus datos en un archivo (derecho de acceso y portabilidad) */
export async function exportarMisDatos() {
  const u = necesitaUsuario();
  const pedidos = await misPedidos();
  const [privado, tickets] = await Promise.all([leerPrivado(), misTickets()]);
  const mensajes = (await Promise.all(pedidos.map(p => mensajesDe(p.id).catch(() => [])))).flat();
  return { exportado: new Date().toISOString(), cuenta: { nombre: u.name, email: u.email, rol: u.role, perfil: u.datos }, privado, pedidos, mensajes, consultas: tickets };
}

/* ==========================================================
   AJUSTES DE LA WEB (los cambia el propietario)
   ========================================================== */
export async function leerAjustes(clave) {
  if (modoDemo) return local.get('ajustes', {})[clave] || null;
  const { data, error } = await limite(sb.from('ajustes').select('datos').eq('clave', clave).maybeSingle());
  if (error) throw new Error(traducirError(error));
  return data?.datos || null;
}
export async function guardarAjustes(clave, datos) {
  necesitaUsuario();
  if (modoDemo) { const a = local.get('ajustes', {}); a[clave] = datos; local.set('ajustes', a); return; }
  comprobar(await limite(sb.from('ajustes').upsert({ clave, datos, actualizado: new Date().toISOString() })));
}
/** ¿El usuario ya tiene algún pedido (sin contar los cancelados)? Sin sesión: no */
export async function tienePedidos() {
  if (!usuario) return false;
  return (await misPedidos()).some(p => p.estado !== 'cancelado');
}
/** Devuelve el cupón si existe y está activo (sin enseñar la lista de cupones) */
export async function comprobarCupon(codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!codigo) return null;
  if (modoDemo) {
    const hoy = new Date().toISOString().slice(0, 10);
    const c = (local.get('ajustes', {}).cupones?.lista || []).find(c => c.codigo.toUpperCase() === codigo && c.activo !== false && (!c.hasta || c.hasta >= hoy));
    if (c) return c;
    const b = CONFIG.bienvenida;
    if (b?.activo && b.codigo && b.codigo.toUpperCase() === codigo && !(await tienePedidos())) return { codigo: b.codigo, pct: b.pct, primera: true };
    return null;
  }
  const { data, error } = await limite(sb.rpc('cupon', { codigo }));
  if (error) throw new Error(traducirError(error));
  return data || null;
}

/* ==========================================================
   MENSAJES DE CADA PROYECTO
   ========================================================== */
const mensajeDe = f => ({ ...(f.datos || {}), id: f.id, uid: f.uid, pedido: f.pedido, createdAt: f.datos?.createdAt || Date.parse(f.created_at) });
export async function mensajesDe(pedidoId) {
  necesitaUsuario();
  if (modoDemo) return local.get('mensajes', []).filter(m => m.pedido === pedidoId).sort((a, b) => a.createdAt - b.createdAt);
  const filas = comprobar(await limite(sb.from('mensajes').select('id, uid, pedido, datos, created_at').eq('pedido', pedidoId).order('created_at')));
  return filas.map(mensajeDe);
}
export async function enviarMensaje(pedidoId, texto, extra = {}) {
  const u = necesitaUsuario();
  const datos = { autor: u.name, rol: u.role, texto, createdAt: Date.now(), ...extra };
  if (modoDemo) {
    const m = { id: nuevoId(), uid: u.uid, pedido: pedidoId, ...datos };
    local.set('mensajes', [...local.get('mensajes', []), m]);
    const p = local.get('orders', []).find(o => o.id === pedidoId);
    if (p) {
      if (u.uid === p.uid) [p.asignado, ...uidsPropietariosDemo()].filter((x, i, a) => x && a.indexOf(x) === i).forEach(x => avisoDemo(x, `Mensaje nuevo de ${p.clienteNombre}`, p.id, 'mensaje'));
      else avisoDemo(p.uid, `Tienes un mensaje nuevo sobre «${p.respuestas?.negocio || 'tu web'}»`, p.id, 'mensaje');
    }
    return m;
  }
  const f = comprobar(await limite(sb.from('mensajes').insert({ uid: u.uid, pedido: pedidoId, datos }).select('id, uid, pedido, datos, created_at').single()));
  return mensajeDe(f);
}
/** Escucha mensajes nuevos de un pedido en tiempo real. Devuelve la función para dejar de escuchar. */
export function escucharMensajes(pedidoId, cb) {
  if (modoDemo || !sb) return () => {};
  const canal = sb.channel('men-' + pedidoId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `pedido=eq.${pedidoId}` }, ev => cb(mensajeDe(ev.new)))
    .subscribe();
  return () => sb.removeChannel(canal);
}

/* ==========================================================
   SOPORTE Y CONTACTO
   ========================================================== */
export async function crearTicket({ tipo = 'duda', asunto, mensaje, pedido = '', nombre = '', email = '' }) {
  const u = usuario;
  const t = { tipo, asunto, mensaje, pedido, nombre: u?.name || nombre, email: u?.email || email, estado: 'abierto', respuestas: [], createdAt: Date.now() };
  if (modoDemo) {
    const c = { ...t, id: nuevoId(), uid: u?.uid || null };
    local.set('tickets', [c, ...local.get('tickets', [])]);
    uidsPropietariosDemo().forEach(o => avisoDemo(o, `Nueva consulta: ${asunto}`, '', 'soporte'));
    return c;
  }
  const { error } = await limite(sb.from('tickets').insert({ uid: u?.uid || null, datos: t }));
  if (error) throw new Error(traducirError(error));
  return t;
}
export async function misTickets() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('tickets', []).filter(t => t.uid === u.uid));
  return leer('tickets', q => q.eq('uid', u.uid));
}
export async function todosLosTickets() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('tickets', []));
  return leer('tickets');
}
export async function actualizarTicket(id, cambios) {
  necesitaUsuario();
  if (modoDemo) { local.set('tickets', local.get('tickets', []).map(t => (t.id === id ? { ...t, ...cambios } : t))); return; }
  await cambiar('tickets', id, cambios);
}
export async function borrarTicket(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('tickets', local.get('tickets', []).filter(t => t.id !== id)); return; }
  await borrar('tickets', id);
}
export async function responderTicket(t, texto) {
  const u = necesitaUsuario();
  const respuestas = [...(t.respuestas || []), { autor: u.name, rol: u.role, texto, t: Date.now() }];
  const cambios = { respuestas, estado: esEquipo() ? 'respondido' : 'abierto', actualizado: Date.now() };
  await actualizarTicket(t.id, cambios);
  if (modoDemo && esEquipo() && t.uid) avisoDemo(t.uid, `Hemos respondido a tu consulta «${t.asunto}»`, '', 'soporte');
  return cambios;
}

/* ==========================================================
   AVISOS (campana)
   ========================================================== */
const avisoDeFila = f => ({ ...(f.datos || {}), id: f.id, leido: f.leido, t: f.datos?.t || Date.parse(f.created_at) });
export async function misAvisos() {
  const u = usuario;
  if (!u) return [];
  if (modoDemo) return local.get('avisos', []).filter(a => a.uid === u.uid).sort((a, b) => b.t - a.t).slice(0, 50);
  const { data, error } = await limite(sb.from('avisos').select('id, datos, leido, created_at').eq('uid', u.uid).order('created_at', { ascending: false }).limit(50));
  if (error) throw new Error(traducirError(error));
  return data.map(avisoDeFila);
}
export async function marcarAvisosLeidos() {
  const u = necesitaUsuario();
  if (modoDemo) { local.set('avisos', local.get('avisos', []).map(a => (a.uid === u.uid ? { ...a, leido: true } : a))); return; }
  await limite(sb.from('avisos').update({ leido: true }).eq('uid', u.uid).eq('leido', false));
}
export async function borrarAvisos() {
  const u = necesitaUsuario();
  if (modoDemo) { local.set('avisos', local.get('avisos', []).filter(a => a.uid !== u.uid)); return; }
  await limite(sb.from('avisos').delete().eq('uid', u.uid));
}
export function escucharAvisos(cb) {
  const u = usuario;
  if (!u) return () => {};
  if (modoDemo) {
    // En el modo demo, otra pestaña puede crear avisos: se comprueba cada pocos segundos
    let n = (local.get('avisos', []).filter(a => a.uid === u.uid)).length;
    const i = setInterval(() => {
      const L = local.get('avisos', []).filter(a => a.uid === u.uid);
      if (L.length > n) L.sort((a, b) => b.t - a.t).slice(0, L.length - n).forEach(cb);
      n = L.length;
    }, 4000);
    return () => clearInterval(i);
  }
  const canal = sb.channel('avisos-' + u.uid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos', filter: `uid=eq.${u.uid}` }, ev => cb(avisoDeFila(ev.new)))
    .subscribe();
  return () => sb.removeChannel(canal);
}
/** El equipo puede avisar a un cliente (por ejemplo, al responder) */
export async function crearAviso(uid, texto, pedido = '', tipo = 'info') {
  if (!uid) return;
  if (modoDemo) return avisoDemo(uid, texto, pedido, tipo);
  await limite(sb.from('avisos').insert({ uid, datos: { texto, pedido, tipo, t: Date.now() } }));
}

/* Avisos del modo demo (en Supabase los crea la base de datos) */
function uidsPropietariosDemo() {
  return Object.values(local.get('users', {})).filter(x => propietarios.includes((x.email || '').toLowerCase())).map(x => x.uid);
}
function avisoDemo(uid, texto, pedido, tipo) {
  if (!uid) return;
  local.set('avisos', [{ id: nuevoId(), uid, texto, pedido, tipo, leido: false, t: Date.now() }, ...local.get('avisos', [])].slice(0, 300));
}
function avisosDemoPedido(a, n) {
  const nombre = n.respuestas?.negocio || n.planNombre || 'tu web';
  if (esEquipo()) {
    if (a.etapa !== n.etapa) avisoDemo(n.uid, `Tu proyecto «${nombre}» ha pasado a una nueva etapa`, n.id, 'etapa');
    if (a.pagoEstado !== n.pagoEstado && ['senal', 'pagado'].includes(n.pagoEstado)) avisoDemo(n.uid, `Pago confirmado en «${nombre}»`, n.id, 'pago');
    if (a.urlVista !== n.urlVista && n.urlVista) avisoDemo(n.uid, `Ya puedes ver la vista previa de «${nombre}»`, n.id, 'revision');
  } else {
    const dest = [n.asignado, ...uidsPropietariosDemo()].filter((x, i, l) => x && l.indexOf(x) === i);
    if (n.pagoEstado === 'verificando' && a.pagoEstado !== 'verificando') uidsPropietariosDemo().forEach(o => avisoDemo(o, `Pago por verificar en «${nombre}»`, n.id, 'pago'));
    const J = JSON.stringify;
    if (J(a.dominio) !== J(n.dominio) || J(a.contenido) !== J(n.contenido) || J(a.revision) !== J(n.revision) || J(a.cancelacion) !== J(n.cancelacion))
      dest.forEach(x => avisoDemo(x, `El cliente ha actualizado «${nombre}»`, n.id, 'cliente'));
  }
}

/* ==========================================================
   ARCHIVOS DE CADA PROYECTO (Supabase Storage, carpeta = id del pedido)
   ========================================================== */
const limpiarNombre = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80);
export async function listarArchivos(pedidoId) {
  necesitaUsuario();
  if (modoDemo) return local.get('archivos', []).filter(a => a.pedido === pedidoId).sort((a, b) => b.t - a.t);
  const { data, error } = await limite(sb.storage.from('archivos').list(pedidoId, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }));
  if (error) throw new Error(traducirError(error));
  return data.filter(f => f.id).map(f => ({ ruta: `${pedidoId}/${f.name}`, nombre: f.name.replace(/^\d+_/, ''), tam: f.metadata?.size || 0, tipo: f.metadata?.mimetype || '', t: Date.parse(f.created_at) }));
}
export async function subirArchivo(pedidoId, archivo) {
  const u = necesitaUsuario();
  if (archivo.size > 25 * 1024 * 1024) throw new Error(`«${archivo.name}» ocupa más de 25 MB`);
  const ruta = `${pedidoId}/${Date.now()}_${limpiarNombre(archivo.name)}`;
  if (modoDemo) {
    if (archivo.size > 1.5 * 1024 * 1024) throw new Error('En el modo demo solo se pueden subir archivos de menos de 1,5 MB');
    const url = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(archivo); });
    const a = { ruta, pedido: pedidoId, nombre: archivo.name, tam: archivo.size, tipo: archivo.type, t: Date.now(), url, autor: u.name };
    try { local.set('archivos', [a, ...local.get('archivos', [])]); } catch { throw new Error('No queda espacio en este navegador'); }
    return a;
  }
  const { error } = await sb.storage.from('archivos').upload(ruta, archivo, { contentType: archivo.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(traducirError(error));
  return { ruta, nombre: archivo.name, tam: archivo.size, tipo: archivo.type, t: Date.now() };
}
export async function urlArchivo(a) {
  if (modoDemo) return a.url || local.get('archivos', []).find(x => x.ruta === a.ruta)?.url || '';
  const { data, error } = await limite(sb.storage.from('archivos').createSignedUrl(a.ruta, 3600));
  if (error) throw new Error(traducirError(error));
  return data.signedUrl;
}
export async function borrarArchivo(a) {
  necesitaUsuario();
  if (modoDemo) { local.set('archivos', local.get('archivos', []).filter(x => x.ruta !== a.ruta)); return; }
  const { error } = await limite(sb.storage.from('archivos').remove([a.ruta]));
  if (error) throw new Error(traducirError(error));
}

/* ==========================================================
   WEB DEL CLIENTE (versiones que sube el equipo)
   Cada versión es una carpeta en Storage: {pedido}/web/{versión}/…
   (la lista de «Archivos» no la enseña porque solo muestra los archivos
   sueltos de la carpeta del pedido). Los datos de cada versión van en
   el pedido (campo «webs»), así que no hace falta tocar la base de datos.
   ========================================================== */
const MAX_WEB_DEMO = 4 * 1024 * 1024;
// Cada parte de la ruta, sin caracteres raros; la ruta original se guarda aparte
const claveWeb = (pedidoId, version, ruta) => `${pedidoId}/web/${version}/${ruta.split('/').map(limpiarNombre).join('/')}`;
const aDataURL = blob => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(blob); });

/** Sube los archivos de una versión. archivos: [{ ruta, blob, tipo }]. Devuelve [{ ruta, clave, tam, tipo }] */
export async function subirWeb(pedidoId, version, archivos, { alProgreso } = {}) {
  necesitaUsuario();
  const total = archivos.reduce((s, a) => s + a.blob.size, 0);
  const hechos = [];
  let bytes = 0;
  if (modoDemo) {
    if (total > MAX_WEB_DEMO) throw new Error('En el modo demo la web puede ocupar como mucho 4 MB');
    const guardados = local.get('webfiles', {});
    for (const a of archivos) {
      const clave = claveWeb(pedidoId, version, a.ruta);
      guardados[clave] = await aDataURL(a.blob);
      hechos.push({ ruta: a.ruta, clave, tam: a.blob.size, tipo: a.tipo });
      bytes += a.blob.size; alProgreso?.(bytes, total, a.ruta);
    }
    try { local.set('webfiles', guardados); } catch { throw new Error('No queda espacio en este navegador para la web'); }
    return hechos;
  }
  // Cuatro subidas a la vez: bastante más rápido y sin saturar la conexión del móvil
  const cola = [...archivos];
  const subirUno = async () => {
    for (let a = cola.shift(); a; a = cola.shift()) {
      const clave = claveWeb(pedidoId, version, a.ruta);
      let r = await sb.storage.from('archivos').upload(clave, a.blob, { contentType: a.tipo || 'application/octet-stream', upsert: true });
      if (r.error) r = await sb.storage.from('archivos').upload(clave, a.blob, { contentType: a.tipo || 'application/octet-stream', upsert: true });
      if (r.error) throw new Error(`No se ha podido subir «${a.ruta}»: ${traducirError(r.error)}`);
      hechos.push({ ruta: a.ruta, clave, tam: a.blob.size, tipo: a.tipo });
      bytes += a.blob.size; alProgreso?.(bytes, total, a.ruta);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(4, archivos.length) }, subirUno));
  } catch (e) {
    // Si algo falla a medias no se deja una versión incompleta en Storage
    if (hechos.length) await sb.storage.from('archivos').remove(hechos.map(h => h.clave)).catch(() => {});
    throw e;
  }
  return hechos;
}

/** Contenido de un archivo de la web (Blob) */
export async function archivoWeb(a) {
  if (modoDemo) {
    const url = local.get('webfiles', {})[a.clave];
    if (!url) throw new Error(`Falta «${a.ruta}» en esta versión`);
    return (await fetch(url)).blob();
  }
  const { data, error } = await limite(sb.storage.from('archivos').download(a.clave), 30000);
  if (error) throw new Error(`No se ha podido abrir «${a.ruta}»: ${traducirError(error)}`);
  return data;
}

/** Enlaces temporales (1 h) para fotos, vídeos y fuentes de la web: Map clave → url */
export async function enlacesWeb(lista) {
  const m = new Map();
  if (!lista.length) return m;
  if (modoDemo) { const g = local.get('webfiles', {}); lista.forEach(a => g[a.clave] && m.set(a.clave, g[a.clave])); return m; }
  for (let i = 0; i < lista.length; i += 100) {
    const parte = lista.slice(i, i + 100).map(a => a.clave);
    const { data, error } = await limite(sb.storage.from('archivos').createSignedUrls(parte, 3600), 20000);
    if (error) throw new Error(traducirError(error));
    (data || []).forEach(d => d.signedUrl && m.set(d.path, d.signedUrl));
  }
  return m;
}

/** Borra todos los archivos de una versión */
export async function borrarWeb(version) {
  necesitaUsuario();
  const claves = (version.archivos || []).map(a => a.clave);
  if (modoDemo) { const g = local.get('webfiles', {}); claves.forEach(c => delete g[c]); local.set('webfiles', g); return; }
  for (let i = 0; i < claves.length; i += 100) {
    const { error } = await limite(sb.storage.from('archivos').remove(claves.slice(i, i + 100)));
    if (error) throw new Error(traducirError(error));
  }
}
