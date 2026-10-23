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
  if (local.get('sembrado_v4')) return;
  const ahora = Date.now(), dia = 864e5;
  const users = {
    u_trab: { uid: 'u_trab', name: 'Laura Ruiz', email: 'trabajador@demo.com', photo: '', role: 'worker', createdAt: ahora - 30 * dia },
    u_ana: { uid: 'u_ana', name: 'Ana Torres', email: 'ana@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 5 * dia },
    u_pepe: { uid: 'u_pepe', name: 'Pepe Gómez', email: 'pepe@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 3 * dia },
    u_carla: { uid: 'u_carla', name: 'Carla Díaz', email: 'carla@ejemplo.com', photo: '', role: 'client', createdAt: ahora - dia }
  };
  const base = { notas: [], mensual: 0 };
  const orders = [
    { ...base, id: 'o1', uid: 'u_ana', clienteNombre: 'Ana Torres', clienteEmail: 'ana@ejemplo.com', plan: 'reservas', planNombre: 'Web con reservas', precioBase: 490, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 550, ref: 'u_trab', plantilla: 'calma', respuestas: { negocio: 'Estética Ana', sector: 'Belleza y estética', objetivo: 'Reservas / citas', telefono: '600 111 222', estilo: 'Elegante', color: '#6f8f72', logo: 'Sí, ya tengo', contenido: 'Tengo algunos', comentarios: 'Me gustaría que se vieran bien los precios de los tratamientos.' }, estado: 'en_curso', etapa: 'contenido', dominio: { nombre: 'esteticaana.es', tipo: 'nuevo', t: ahora - 3 * dia }, pagoEstado: 'senal', pagoMetodo: 'bizum', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 5 * dia },
    { ...base, id: 'o2', uid: 'u_pepe', clienteNombre: 'Pepe Gómez', clienteEmail: 'pepe@ejemplo.com', plan: 'negocio', planNombre: 'Web de negocio', precioBase: 349, extras: [{ id: 'logo', nombre: 'Diseño de logo', precio: 80 }], urgente: false, total: 429, mensual: 15, plantilla: 'filo', respuestas: { negocio: 'Barbería Pepe', sector: 'Peluquería / barbería', objetivo: 'Que me contacten', telefono: '600 333 444', estilo: 'Oscuro', color: '#c9a24a', logo: 'No, necesito uno', contenido: 'Necesito ayuda', comentarios: '' }, estado: 'nuevo', etapa: 'recibido', pagoEstado: 'verificando', pagoMetodo: 'transferencia', pagoFase: 'senal', pagoAviso: ahora - 2 * 36e5, asignado: '', asignadoNombre: '', createdAt: ahora - 3 * dia },
    { ...base, id: 'o3', uid: 'u_carla', clienteNombre: 'Carla Díaz', clienteEmail: 'carla@ejemplo.com', plan: 'tienda', planNombre: 'Tienda online', precioBase: 690, extras: [], urgente: true, total: 862.5, ref: 'u_trab', plantilla: 'kiosko', respuestas: { negocio: 'Carla Handmade', sector: 'Tienda / comercio', objetivo: 'Vender online', telefono: '600 555 666', estilo: 'Moderno', color: '#2f5bff', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: 'Vendo bisutería hecha a mano, unos 30 productos.' }, estado: 'nuevo', etapa: 'recibido', pagoEstado: 'pendiente', asignado: '', asignadoNombre: '', createdAt: ahora - dia }
    ,{ ...base, id: 'o4', uid: 'u_marta', clienteNombre: 'Marta Gil', clienteEmail: 'marta@ejemplo.com', plan: 'landing', planNombre: 'Landing page', precioBase: 149, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 209, ref: 'u_trab', plantilla: 'lienzo', respuestas: { negocio: 'Marta Fotografía', sector: 'Profesional / freelance', objetivo: 'Darme a conocer', telefono: '600 777 888', estilo: 'Minimalista', color: '', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: '' }, tareas: { diseno: true, contenido: true, desarrollo: true, revision: true, publicacion: true }, estado: 'entregado', etapa: 'publicada', urlWeb: 'https://martafotografia.es', dominio: { nombre: 'martafotografia.es', tipo: 'nuevo', t: ahora - 10 * dia }, pagoEstado: 'pagado', pagoMetodo: 'bizum', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 12 * dia }
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
  local.set('sembrado_v4', true);
}

function usuarioLocal(uid) {
  const d = local.get('users', {})[uid];
  return d ? { uid: d.uid, name: d.name, email: d.email, photo: d.photo || '', role: rolDe(d.email, d.role) } : null;
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
// Cliente de Supabase (versión fija para que nada cambie sin avisar)
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.100.1/+esm';

export async function iniciar() {
  if (modoDemo) {
    sembrarDemo();
    const s = local.get('sesion');
    listo = true;
    emitir(s ? usuarioLocal(s) : null);
    resolverListo(usuario);
    return;
  }
  const { createClient } = await import(SUPABASE_JS);
  sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
  });
  const { data } = await sb.auth.getSession();
  const u = data.session ? await sincronizar(data.session.user) : null;
  listo = true;
  emitir(u);
  resolverListo(u);
  sb.auth.onAuthStateChange(async (evento, sesion) => {
    if (evento === 'INITIAL_SESSION') return;
    if (evento === 'SIGNED_OUT' || !sesion) return emitir(null);
    if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') emitir(await sincronizar(sesion.user));
  });
  // Al volver del login de Google/GitHub se limpia la dirección
  if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
}

// Perfil del usuario (tabla perfiles). Se crea solo al registrarse (ver supabase/esquema.sql).
async function sincronizar(su) {
  const meta = su.user_metadata || {};
  let perfil = null;
  try {
    const { data } = await sb.from('perfiles').select('*').eq('id', su.id).maybeSingle();
    perfil = data;
    if (!perfil) {
      const nuevo = { id: su.id, name: meta.full_name || meta.name || nombrePendiente || su.email.split('@')[0], email: su.email, photo: meta.avatar_url || '', role: 'client' };
      const r = await sb.from('perfiles').insert(nuevo).select().single();
      perfil = r.data || nuevo;
    }
  } catch (e) { console.warn(e); }
  perfil = perfil || { name: su.email.split('@')[0], role: 'client' };
  return { uid: su.id, name: perfil.name, email: su.email, photo: perfil.photo || meta.avatar_url || '', role: rolDe(su.email, perfil.role) };
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
    owner: { name: 'Propietario', email: CONFIG.propietarios[0] || 'propietario@demo.com', role: 'client' }
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
async function leer(tabla, filtro) {
  let q = sb.from(tabla).select('id, uid, datos');
  if (filtro) q = filtro(q);
  return recientes(comprobar(await q).map(deFila));
}
async function insertar(tabla, doc) {
  const { uid, ...datos } = doc;
  const f = comprobar(await sb.from(tabla).insert({ uid, datos }).select('id, uid, datos').single());
  return deFila(f);
}
async function cambiar(tabla, id, cambios) {
  const actual = comprobar(await sb.from(tabla).select('datos').eq('id', id).single());
  comprobar(await sb.from(tabla).update({ datos: { ...actual.datos, ...cambios } }).eq('id', id));
}
const borrar = async (tabla, id) => comprobar(await sb.from(tabla).delete().eq('id', id));

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
    return p;
  }
  return insertar('pedidos', p);
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
    local.set('orders', local.get('orders', []).map(o => (o.id === id ? { ...o, ...cambios } : o)));
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

/* ---------- Usuarios y equipo ---------- */
export async function listarUsuarios() {
  necesitaUsuario();
  if (modoDemo) return Object.values(local.get('users', {})).map(u => ({ ...u, role: rolDe(u.email, u.role) }));
  const filas = comprobar(await sb.from('perfiles').select('*'));
  return filas.map(u => ({ uid: u.id, name: u.name, email: u.email, photo: u.photo, createdAt: Date.parse(u.created_at), role: rolDe(u.email, u.role) }));
}

export async function cambiarRol(uid, role) {
  necesitaUsuario();
  if (modoDemo) {
    const users = local.get('users', {});
    if (users[uid]) { users[uid].role = role; local.set('users', users); }
    return;
  }
  comprobar(await sb.from('perfiles').update({ role }).eq('id', uid));
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
  const { data, error } = await sb.functions.invoke('asistente', { body: cuerpo });
  if (error) throw new Error('El asistente no está disponible ahora mismo');
  return data;
}
