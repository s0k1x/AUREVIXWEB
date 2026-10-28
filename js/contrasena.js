/* ==========================================================
   CONTRASEÑAS: seguridad, barra de nivel y contraseñas filtradas
   - Reglas: mínimo 8 caracteres, con letras y números.
   - Barra de nivel (muy débil → muy segura) con lo que falta.
   - Contraseñas filtradas: se consulta Have I Been Pwned (Pwned
     Passwords) con k-anonimato. Del SHA-1 de la contraseña solo se
     envían los 5 primeros caracteres: ni la contraseña ni su huella
     completa salen del navegador. Equivale al ajuste «Prevent use of
     leaked passwords» de Supabase, que solo existe en el plan Pro.
   ========================================================== */
import { icono } from './iconos.js';

export const MINIMO = 8;

/* Contraseñas y trozos muy repetidos: sirven para restar puntos aunque cumplan las reglas */
const COMUNES = ['password', 'contrasena', 'contraseña', 'admin', 'qwerty', 'azerty', 'abc123', 'letmein', 'welcome', 'iloveyou', 'monkey', 'dragon', 'futbol', 'barcelona', 'realmadrid', 'colocolo', 'aurevix', 'aurevixweb', 'bienvenido', 'princesa', 'chocolate', 'sevilla'];
const SECUENCIAS = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'zyxwvutsrqponmlkjihgfedcba', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'qazwsxedc'];

const plano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const tieneSecuencia = p => {
  const x = plano(p);
  for (const sec of SECUENCIAS) for (let i = 0; i + 4 <= sec.length; i++) if (x.includes(sec.slice(i, i + 4))) return true;
  return false;
};

/**
 * Evalúa una contraseña. Devuelve { puntos: 0-4, ok, reglas: {largo, letras, numeros}, avisos: [] }
 * «ok» = cumple las reglas mínimas (otra cosa es que sea fuerte).
 */
export function evaluar(pass, { email = '', nombre = '' } = {}) {
  const p = String(pass || '');
  const reglas = { largo: p.length >= MINIMO, letras: /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(p), numeros: /\d/.test(p) };
  const ok = reglas.largo && reglas.letras && reglas.numeros;
  const avisos = [];
  if (!p) return { puntos: 0, ok: false, reglas, avisos };

  const x = plano(p);
  const clases = [/[a-z]/.test(p), /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  const unicos = new Set(p).size;
  let pts = 0;
  pts += Math.min(p.length, 20) * 1.2;             // largo: lo que más pesa
  pts += (clases - 1) * 4;                          // variedad de caracteres
  pts += Math.min(unicos, 12) * .8;                 // caracteres distintos
  if (p.length >= 14) pts += 4;
  if (p.length >= 18) pts += 4;

  const trozoCorreo = plano(email).split('@')[0];
  if (trozoCorreo.length >= 4 && x.includes(trozoCorreo)) { pts -= 14; avisos.push('Contiene tu correo'); }
  const nombres = plano(nombre).split(/\s+/).filter(n => n.length >= 4);
  if (nombres.some(n => x.includes(n))) { pts -= 12; avisos.push('Contiene tu nombre'); }
  if (COMUNES.some(c => x.includes(c))) { pts -= 14; avisos.push('Es una palabra muy común'); }
  if (tieneSecuencia(p)) { pts -= 10; avisos.push('Tiene una secuencia fácil (1234, abcd…)'); }
  if (/(.)\1{2,}/.test(p)) { pts -= 8; avisos.push('Repite el mismo carácter'); }
  if (unicos <= 3 && p.length >= 6) pts -= 10;

  const puntos = !ok ? (pts < 16 ? 0 : 1) : pts < 22 ? 1 : pts < 30 ? 2 : pts < 38 ? 3 : 4;
  return { puntos, ok, reglas, avisos };
}

export const NIVELES = [
  { txt: 'Muy débil', cls: 'n0' }, { txt: 'Débil', cls: 'n1' }, { txt: 'Aceptable', cls: 'n2' }, { txt: 'Segura', cls: 'n3' }, { txt: 'Muy segura', cls: 'n4' }
];

/* ---------- Contraseñas filtradas (Have I Been Pwned, k-anonimato) ---------- */
const cache = new Map();
async function sha1(texto) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
/**
 * Veces que la contraseña aparece en filtraciones conocidas (0 = no aparece).
 * Devuelve null si no se ha podido comprobar (sin conexión, servicio caído…): en ese caso
 * no se bloquea a nadie, porque la comprobación es una ayuda extra y no un requisito legal.
 */
export async function vecesFiltrada(pass, { ms = 4500 } = {}) {
  if (!pass || !globalThis.crypto?.subtle) return null;
  try {
    const h = await sha1(pass);
    const pre = h.slice(0, 5), suf = h.slice(5);
    if (!cache.has(pre)) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      // Add-Padding: la respuesta lleva líneas de relleno, así nadie deduce nada por su tamaño
      const r = await fetch(`https://api.pwnedpasswords.com/range/${pre}`, { headers: { 'Add-Padding': 'true' }, signal: ctrl.signal, cache: 'no-store', referrerPolicy: 'no-referrer' }).finally(() => clearTimeout(t));
      if (!r.ok) return null;
      cache.set(pre, await r.text());
    }
    for (const linea of cache.get(pre).split('\n')) {
      const [s, n] = linea.trim().split(':');
      if (s === suf) return Math.max(0, parseInt(n, 10) || 0);
    }
    return 0;
  } catch { return null; }
}

export const MSG_FILTRADA = 'Esa contraseña ha aparecido en filtraciones de datos y cualquiera podría probarla. Elige otra.';

/** Comprobación final antes de crear o cambiar una contraseña. Lanza un Error con el motivo si no vale. */
export async function exigir(pass, { email = '', nombre = '' } = {}) {
  const ev = evaluar(pass, { email, nombre });
  if (!ev.ok) throw new Error(`La contraseña necesita al menos ${MINIMO} caracteres, con letras y números.`);
  if ((await vecesFiltrada(pass)) > 0) throw new Error(MSG_FILTRADA);
  return ev;
}

/* ==========================================================
   BARRA DE NIVEL
   ========================================================== */
/**
 * Monta la barra bajo un campo de contraseña.
 *   montarMedidor(input, { email: () => '…', nombre: () => '…', repetir: inputRepetir })
 * Devuelve { destruir, estado() } donde estado() = { ev, filtrada }.
 */
export function montarMedidor(input, { email = () => '', nombre = () => '', alCambiar = () => {} } = {}) {
  const campo = input.closest('.fc');
  const caja = document.createElement('div');
  caja.className = 'pw-medidor';
  caja.hidden = true;
  caja.innerHTML = `
    <div class="pw-barra" role="img" aria-label="Seguridad de la contraseña"><i></i><i></i><i></i><i></i></div>
    <p class="pw-nivel" aria-live="polite"><b></b><span></span></p>
    <ul class="pw-reglas">
      <li data-r="largo">${icono('check')}${icono('x', 'pw-x')}<span>Al menos ${MINIMO} caracteres</span></li>
      <li data-r="letras">${icono('check')}${icono('x', 'pw-x')}<span>Letras</span></li>
      <li data-r="numeros">${icono('check')}${icono('x', 'pw-x')}<span>Números</span></li>
      <li data-r="filtrada">${icono('check')}${icono('x', 'pw-x')}<span>No aparece en filtraciones de datos</span></li>
    </ul>`;
  campo.after(caja);

  // Botón de ver u ocultar: escribir 8 o más caracteres a ciegas en el móvil da muchos fallos
  const ojo = document.createElement('button');
  ojo.type = 'button';
  ojo.className = 'pw-ojo';
  ojo.setAttribute('aria-label', 'Mostrar la contraseña');
  ojo.setAttribute('aria-pressed', 'false');
  ojo.innerHTML = icono('eye');
  campo.appendChild(ojo);
  ojo.addEventListener('click', () => {
    const ver = input.type === 'password';
    input.type = ver ? 'text' : 'password';
    ojo.setAttribute('aria-pressed', String(ver));
    ojo.setAttribute('aria-label', ver ? 'Ocultar la contraseña' : 'Mostrar la contraseña');
  });

  let estado = { ev: evaluar(''), filtrada: null }, tic = 0, espera;
  const pintar = () => {
    const { ev, filtrada } = estado;
    const vacio = !input.value;
    caja.hidden = vacio;
    if (vacio) { alCambiar(estado); return; }
    const nivel = filtrada > 0 ? 0 : ev.puntos;
    caja.dataset.n = nivel;
    $$i(caja, '.pw-barra i').forEach((b, i) => b.classList.toggle('on', i < Math.max(nivel, 1) && (nivel > 0 || i === 0)));
    caja.querySelector('.pw-nivel b').textContent = NIVELES[nivel].txt;
    caja.querySelector('.pw-nivel span').textContent = filtrada > 0 ? 'Ha aparecido en filtraciones' : ev.avisos[0] || (ev.ok ? (nivel >= 3 ? '' : 'Añade más caracteres o símbolos') : 'Aún no cumple las reglas');
    for (const [k, v] of Object.entries({ ...ev.reglas, filtrada: filtrada === null ? null : filtrada === 0 })) {
      const li = caja.querySelector(`[data-r="${k}"]`);
      if (!li) continue;
      li.classList.toggle('ok', v === true);
      li.classList.toggle('mal', v === false);
      li.classList.toggle('pend', v === null);
    }
    // El aviso de filtraciones solo se enseña cuando ya hay respuesta (o se está comprobando)
    caja.querySelector('[data-r="filtrada"]').hidden = !ev.ok;
    alCambiar(estado);
  };
  const entrada = () => {
    const mia = ++tic;
    estado = { ev: evaluar(input.value, { email: email(), nombre: nombre() }), filtrada: null };
    pintar();
    clearTimeout(espera);
    if (!estado.ev.ok) return;
    // Se espera a que deje de escribir: una consulta por pausa, no una por tecla
    espera = setTimeout(async () => {
      const n = await vecesFiltrada(input.value);
      if (mia !== tic) return;
      estado = { ...estado, filtrada: n };
      pintar();
    }, 450);
  };
  const $$i = (r, s) => [...r.querySelectorAll(s)];
  input.addEventListener('input', entrada);
  return { estado: () => estado, destruir: () => { clearTimeout(espera); caja.remove(); ojo.remove(); input.removeEventListener('input', entrada); }, actualizar: entrada, reiniciar: () => { input.type = 'password'; input.value = ''; entrada(); } };
}
