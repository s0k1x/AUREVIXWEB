/* ==========================================================
   Sesión y datos
   - Con CONFIG.firebase → login real (Google / email) + Firestore
   - Sin configurar      → MODO DEMO (todo se guarda en este navegador)
   ========================================================== */
import { CONFIG } from '../config.js';

export const modoDemo = !(CONFIG.firebase && CONFIG.firebase.apiKey);

const propietarios = CONFIG.propietarios.map(e => e.toLowerCase().trim());
const rolDe = (email, guardado) =>
  propietarios.includes((email || '').toLowerCase()) ? 'owner' : (guardado || 'client');

let fb = null;
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
  if (local.get('sembrado_v3')) return;
  const ahora = Date.now(), dia = 864e5;
  const users = {
    u_trab: { uid: 'u_trab', name: 'Laura Ruiz', email: 'trabajador@demo.com', photo: '', role: 'worker', createdAt: ahora - 30 * dia },
    u_ana: { uid: 'u_ana', name: 'Ana Torres', email: 'ana@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 5 * dia },
    u_pepe: { uid: 'u_pepe', name: 'Pepe Gómez', email: 'pepe@ejemplo.com', photo: '', role: 'client', createdAt: ahora - 3 * dia },
    u_carla: { uid: 'u_carla', name: 'Carla Díaz', email: 'carla@ejemplo.com', photo: '', role: 'client', createdAt: ahora - dia }
  };
  const base = { notas: [], mensual: 0 };
  const orders = [
    { ...base, id: 'o1', uid: 'u_ana', clienteNombre: 'Ana Torres', clienteEmail: 'ana@ejemplo.com', plan: 'reservas', planNombre: 'Web con reservas', precioBase: 490, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 550, ref: 'u_trab', plantilla: 'calma', respuestas: { negocio: 'Estética Ana', sector: 'Belleza y estética', objetivo: 'Reservas / citas', telefono: '600 111 222', estilo: 'Elegante', color: '#6f8f72', logo: 'Sí, ya tengo', contenido: 'Tengo algunos', comentarios: 'Me gustaría que se vieran bien los precios de los tratamientos.' }, estado: 'en_curso', pagoEstado: 'senal', pagoMetodo: 'bizum', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 5 * dia },
    { ...base, id: 'o2', uid: 'u_pepe', clienteNombre: 'Pepe Gómez', clienteEmail: 'pepe@ejemplo.com', plan: 'negocio', planNombre: 'Web de negocio', precioBase: 349, extras: [{ id: 'logo', nombre: 'Diseño de logo', precio: 80 }], urgente: false, total: 429, mensual: 15, plantilla: 'filo', respuestas: { negocio: 'Barbería Pepe', sector: 'Peluquería / barbería', objetivo: 'Que me contacten', telefono: '600 333 444', estilo: 'Oscuro', color: '#c9a24a', logo: 'No, necesito uno', contenido: 'No, ayudadme', comentarios: '' }, estado: 'nuevo', pagoEstado: 'verificando', pagoMetodo: 'transferencia', pagoFase: 'senal', pagoAviso: ahora - 2 * 36e5, asignado: '', asignadoNombre: '', createdAt: ahora - 3 * dia },
    { ...base, id: 'o3', uid: 'u_carla', clienteNombre: 'Carla Díaz', clienteEmail: 'carla@ejemplo.com', plan: 'tienda', planNombre: 'Tienda online', precioBase: 690, extras: [], urgente: true, total: 862.5, ref: 'u_trab', plantilla: 'kiosko', respuestas: { negocio: 'Carla Handmade', sector: 'Tienda / comercio', objetivo: 'Vender online', telefono: '600 555 666', estilo: 'Moderno', color: '#2f5bff', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: 'Vendo bisutería hecha a mano, unos 30 productos.' }, estado: 'nuevo', pagoEstado: 'pendiente', asignado: '', asignadoNombre: '', createdAt: ahora - dia }
    ,{ ...base, id: 'o4', uid: 'u_marta', clienteNombre: 'Marta Gil', clienteEmail: 'marta@ejemplo.com', plan: 'landing', planNombre: 'Landing page', precioBase: 149, extras: [{ id: 'dominio', nombre: 'Dominio + alojamiento (1er año)', precio: 60 }], urgente: false, total: 209, ref: 'u_trab', plantilla: 'lienzo', respuestas: { negocio: 'Marta Fotografía', sector: 'Profesional / freelance', objetivo: 'Darme a conocer', telefono: '600 777 888', estilo: 'Minimalista', color: '', logo: 'Sí, ya tengo', contenido: 'Sí, todo', comentarios: '' }, tareas: { diseno: true, contenido: true, desarrollo: true, revision: true, publicacion: true }, estado: 'entregado', pagoEstado: 'pagado', pagoMetodo: 'bizum', asignado: 'u_trab', asignadoNombre: 'Laura Ruiz', createdAt: ahora - 12 * dia }
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
  local.set('sembrado_v3', true);
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
let nombrePendiente = '';

export async function iniciar() {
  if (modoDemo) {
    sembrarDemo();
    const s = local.get('sesion');
    listo = true;
    emitir(s ? usuarioLocal(s) : null);
    resolverListo(usuario);
    return;
  }
  const V = '10.12.2', base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [app, auth, fs] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js')
  ]);
  const a = app.initializeApp(CONFIG.firebase);
  fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), A: auth, F: fs };
  fb.auth.languageCode = 'es';

  await new Promise(res => {
    let primera = true;
    auth.onAuthStateChanged(fb.auth, async fu => {
      const u = fu ? await sincronizar(fu) : null;
      listo = true;
      emitir(u);
      if (primera) { primera = false; resolverListo(u); res(); }
    });
  });
}

async function sincronizar(fu) {
  const { doc, getDoc, setDoc } = fb.F;
  const ref = doc(fb.db, 'users', fu.uid);
  let datos = null;
  try { const s = await getDoc(ref); if (s.exists()) datos = s.data(); } catch (e) { console.warn(e); }
  if (!datos) {
    datos = {
      name: fu.displayName || nombrePendiente || fu.email.split('@')[0],
      email: fu.email, photo: fu.photoURL || '', role: 'client', createdAt: Date.now()
    };
    try { await setDoc(ref, datos); } catch (e) { console.warn(e); }
  }
  return { uid: fu.uid, name: datos.name, email: fu.email, photo: datos.photo || fu.photoURL || '', role: rolDe(fu.email, datos.role) };
}

/* ---------- Login ---------- */
const traducirError = e => {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email o contraseña incorrectos';
  if (c.includes('email-already-in-use')) return 'Ese email ya tiene cuenta. Inicia sesión.';
  if (c.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres';
  if (c.includes('invalid-email')) return 'El email no es válido';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Has cerrado la ventana de Google';
  if (c.includes('unauthorized-domain')) return 'Este dominio no está autorizado en Firebase (mira el LEEME)';
  return e?.message || 'Algo ha fallado, inténtalo de nuevo';
};

export async function entrarConGoogle() {
  if (modoDemo) return entrarLocal({ name: 'Usuario de Google', email: 'google@demo.com' });
  try {
    const p = new fb.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    await fb.A.signInWithPopup(fb.auth, p);
  } catch (e) {
    if ((e.code || '').includes('popup-blocked')) {
      return fb.A.signInWithRedirect(fb.auth, new fb.A.GoogleAuthProvider());
    }
    throw new Error(traducirError(e));
  }
}

export async function entrarConGithub() {
  if (modoDemo) return entrarLocal({ name: 'Usuario de GitHub', email: 'github@demo.com' });
  try { await fb.A.signInWithPopup(fb.auth, new fb.A.GithubAuthProvider()); }
  catch (e) { throw new Error(traducirError(e)); }
}

export async function entrarConEmail(email, pass) {
  if (modoDemo) return entrarLocal({ name: email.split('@')[0], email });
  try { await fb.A.signInWithEmailAndPassword(fb.auth, email, pass); }
  catch (e) { throw new Error(traducirError(e)); }
}

export async function registrarConEmail(nombre, email, pass) {
  if (modoDemo) return entrarLocal({ name: nombre, email });
  try {
    nombrePendiente = nombre;
    const cred = await fb.A.createUserWithEmailAndPassword(fb.auth, email, pass);
    await fb.A.updateProfile(cred.user, { displayName: nombre });
  } catch (e) { throw new Error(traducirError(e)); }
}

export async function recuperarPass(email) {
  if (modoDemo) return;
  try { await fb.A.sendPasswordResetEmail(fb.auth, email); }
  catch (e) { throw new Error(traducirError(e)); }
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
  await fb.A.signOut(fb.auth);
}

/* ---------- Helpers Firestore ---------- */
const col = n => fb.F.collection(fb.db, n);
const docRef = (n, id) => fb.F.doc(fb.db, n, id);
const lista = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const recientes = arr => arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

/* ---------- Pedidos ---------- */
export async function crearPedido(datos) {
  const u = necesitaUsuario();
  const p = {
    ...datos, uid: u.uid, clienteNombre: u.name, clienteEmail: u.email,
    estado: 'nuevo', pagoEstado: 'pendiente', asignado: '', asignadoNombre: '', notas: [], createdAt: Date.now()
  };
  if (modoDemo) {
    p.id = nuevoId();
    local.set('orders', [p, ...local.get('orders', [])]);
    return p;
  }
  const ref = await fb.F.addDoc(col('orders'), p);
  return { ...p, id: ref.id };
}

export async function misPedidos() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('orders', []).filter(o => o.uid === u.uid));
  const { query, where, getDocs } = fb.F;
  return recientes(lista(await getDocs(query(col('orders'), where('uid', '==', u.uid)))));
}

export async function todosLosPedidos() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('orders', []));
  return recientes(lista(await fb.F.getDocs(col('orders'))));
}

export async function actualizarPedido(id, cambios) {
  necesitaUsuario();
  if (modoDemo) {
    local.set('orders', local.get('orders', []).map(o => (o.id === id ? { ...o, ...cambios } : o)));
    return;
  }
  await fb.F.updateDoc(docRef('orders', id), cambios);
}

export async function borrarPedido(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('orders', local.get('orders', []).filter(o => o.id !== id)); return; }
  await fb.F.deleteDoc(docRef('orders', id));
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
  const ref = await fb.F.addDoc(col('applications'), c);
  return { ...c, id: ref.id };
}

export async function miCandidatura() {
  const u = necesitaUsuario();
  if (modoDemo) return recientes(local.get('apps', []).filter(a => a.uid === u.uid))[0] || null;
  const { query, where, getDocs } = fb.F;
  return recientes(lista(await getDocs(query(col('applications'), where('uid', '==', u.uid)))))[0] || null;
}

export async function todasLasCandidaturas() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('apps', []));
  return recientes(lista(await fb.F.getDocs(col('applications'))));
}

export async function actualizarCandidatura(id, cambios) {
  necesitaUsuario();
  if (modoDemo) {
    local.set('apps', local.get('apps', []).map(a => (a.id === id ? { ...a, ...cambios } : a)));
    return;
  }
  await fb.F.updateDoc(docRef('applications', id), cambios);
}

/* ---------- Usuarios y equipo ---------- */
export async function listarUsuarios() {
  necesitaUsuario();
  if (modoDemo) return Object.values(local.get('users', {})).map(u => ({ ...u, role: rolDe(u.email, u.role) }));
  return lista(await fb.F.getDocs(col('users'))).map(u => ({ ...u, uid: u.id, role: rolDe(u.email, u.role) }));
}

export async function cambiarRol(uid, role) {
  necesitaUsuario();
  if (modoDemo) {
    const users = local.get('users', {});
    if (users[uid]) { users[uid].role = role; local.set('users', users); }
    return;
  }
  await fb.F.updateDoc(docRef('users', uid), { role });
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
  if (modoDemo) {
    r.id = nuevoId();
    local.set('resenas', [r, ...local.get('resenas', [])]);
  } else {
    const ref = await fb.F.addDoc(col('resenas'), r);
    r.id = ref.id;
  }
  await actualizarPedido(pedidoId, { resenada: true });
  return r;
}

export async function resenasPublicas() {
  if (modoDemo) return recientes(local.get('resenas', []).filter(r => r.aprobada));
  const { query, where, getDocs } = fb.F;
  return recientes(lista(await getDocs(query(col('resenas'), where('aprobada', '==', true)))));
}

export async function todasLasResenas() {
  necesitaUsuario();
  if (modoDemo) return recientes(local.get('resenas', []));
  return recientes(lista(await fb.F.getDocs(col('resenas'))));
}

export async function actualizarResena(id, cambios) {
  necesitaUsuario();
  if (modoDemo) { local.set('resenas', local.get('resenas', []).map(r => (r.id === id ? { ...r, ...cambios } : r))); return; }
  await fb.F.updateDoc(docRef('resenas', id), cambios);
}

export async function borrarResena(id) {
  necesitaUsuario();
  if (modoDemo) { local.set('resenas', local.get('resenas', []).filter(r => r.id !== id)); return; }
  await fb.F.deleteDoc(docRef('resenas', id));
}
