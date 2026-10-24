#!/usr/bin/env node
/* ==========================================================
   ÍNDICE DE LA LIBRERÍA (/library)
   Lee la colección de biblioteca-ui/ (sin modificarla) y escribe:
     library/indice.json  → un registro compacto por componente
     library/iconos.json  → los nombres de los iconos de cada set
   Cada componente lleva su biblioteca, su licencia (SPDX), si se puede
   usar en webs de clientes, su autor y su URL de origen.

   Uso (en un ordenador con Node 18 o más, sin instalar nada):
     node scripts/generar-indice.mjs
   Después sube library/indice.json y library/iconos.json a GitHub.
   ========================================================== */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIB = join(RAIZ, 'biblioteca-ui');
const SALIDA = join(RAIZ, 'library');
const leer = p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const json = p => JSON.parse(readFileSync(p, 'utf8'));

if (!existsSync(join(BIB, '_catalogo', 'componentes.json'))) {
  console.error('No encuentro biblioteca-ui/_catalogo/componentes.json. Ejecuta el script desde la carpeta del repositorio.');
  process.exit(1);
}

/* ---------- Licencias ----------
   permisiva   → MIT, Apache-2.0, BSD, ISC, 0BSD, Unlicense, CC0: se puede usar en webs de clientes
   atribucion  → se puede usar solo conservando la atribución (CC-BY y licencias que la exigen)
   restringida → GPL/AGPL/LGPL, CC-BY-NC/SA, solo uso personal, de pago o desconocida: solo consulta */
const PERMISIVAS = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0']);
const clasificar = spdx => {
  if (!spdx || spdx === 'desconocida') return 'restringida';
  if (/^(L?A?GPL|CC-BY-(NC|SA)|CC-BY-NC)/i.test(spdx) || /Hippocratic|LicenseRef-(Personal|Comercial)/i.test(spdx)) return 'restringida';
  if (/^CC-BY/i.test(spdx) || /LicenseRef-.*(Fair-Use|Atribucion)/i.test(spdx)) return 'atribucion';
  return spdx.split(/\s+AND\s+/).every(p => PERMISIVAS.has(p)) ? 'permisiva' : 'restringida';
};

/* Licencia SPDX de cada biblioteca (comprobada en _licenses/ y _reports/INFORME.md) */
const SPDX = {
  'uiverse-galaxy': 'MIT', hyperui: 'MIT', flowbite: 'MIT', daisyui: 'MIT',
  preline: 'MIT AND LicenseRef-Preline-Fair-Use', 'shadcn-ui': 'MIT', 'origin-ui': 'MIT', reui: 'MIT',
  'magic-ui': 'MIT', 'kokonut-ui': 'MIT', pines: 'MIT', tailblocks: 'MIT', spinkit: 'MIT', 'css-loaders': 'MIT',
  'loaders-css': 'MIT', 'svg-loaders': 'MIT', whirl: 'MIT', 'loading-io-css-spinner': 'CC0-1.0',
  'animate-css': 'Hippocratic-2.1', 'headless-ui': 'MIT', 'radix-primitives': 'MIT', sonner: 'MIT',
  'cult-ui': 'MIT', 'meraki-ui': 'MIT', 'motion-primitives': 'MIT', animata: 'MIT', 'mantine-ui': 'MIT',
  'tw-elements': 'MIT', tremor: 'Apache-2.0',
  'tabler-icons': 'MIT', lucide: 'ISC', heroicons: 'MIT', feather: 'MIT', 'phosphor-icons': 'MIT',
  'bootstrap-icons': 'MIT', ionicons: 'MIT', 'simple-icons': 'CC0-1.0', 'eva-icons': 'MIT'
};
const NOTAS = {
  preline: 'Doble licencia MIT + Preline UI Fair Use: conserva la atribución con enlace al repositorio y no la uses para crear un producto que compita con Preline.',
  'animate-css': 'Hippocratic License 2.1: no es una licencia permisiva estándar (impone condiciones de derechos humanos). Solo consulta.',
  'simple-icons': 'Los SVG son CC0, pero los logotipos son marcas de sus dueños: úsalos según las normas de cada marca.',
  'origin-ui': 'Solo apps/origin y apps/ui (MIT según su LICENSING.md). El resto del repositorio original es AGPL y no se copió.',
  'tw-elements': 'MIT para TW Elements Free (License.txt del paquete npm 2.0.0).',
  'loading-io-css-spinner': 'Los loaders son CC0; el resto del código del repositorio, MIT (según su README).'
};
const NOMBRES = {
  'uiverse-galaxy': 'Uiverse', hyperui: 'HyperUI', flowbite: 'Flowbite', daisyui: 'daisyUI', preline: 'Preline',
  'shadcn-ui': 'shadcn/ui', 'origin-ui': 'Origin UI', reui: 'ReUI', 'magic-ui': 'Magic UI', 'kokonut-ui': 'Kokonut UI',
  pines: 'Pines', tailblocks: 'Tailblocks', spinkit: 'SpinKit', 'css-loaders': 'CSS Loaders', 'loaders-css': 'Loaders.css',
  'svg-loaders': 'SVG Loaders', whirl: 'Whirl', 'loading-io-css-spinner': 'loading.io', 'animate-css': 'Animate.css',
  'headless-ui': 'Headless UI', 'radix-primitives': 'Radix Primitives', sonner: 'Sonner', 'cult-ui': 'Cult UI',
  'meraki-ui': 'Meraki UI', 'motion-primitives': 'Motion Primitives', animata: 'Animata', 'mantine-ui': 'Mantine UI',
  'tw-elements': 'TW Elements', tremor: 'Tremor', 'tabler-icons': 'Tabler Icons', lucide: 'Lucide', heroicons: 'Heroicons',
  feather: 'Feather', 'phosphor-icons': 'Phosphor', 'bootstrap-icons': 'Bootstrap Icons', ionicons: 'Ionicons',
  'simple-icons': 'Simple Icons', 'eva-icons': 'Eva Icons'
};
const WEBS = {
  'uiverse-galaxy': 'https://uiverse.io', hyperui: 'https://www.hyperui.dev', flowbite: 'https://flowbite.com',
  daisyui: 'https://daisyui.com', preline: 'https://preline.co', 'shadcn-ui': 'https://ui.shadcn.com',
  'magic-ui': 'https://magicui.design', spinkit: 'https://tobiasahlin.com/spinkit/', 'animate-css': 'https://animate.style',
  'loading-io-css-spinner': 'https://loading.io/css/', 'tabler-icons': 'https://tabler.io/icons', lucide: 'https://lucide.dev',
  heroicons: 'https://heroicons.com', 'bootstrap-icons': 'https://icons.getbootstrap.com', 'simple-icons': 'https://simpleicons.org',
  'headless-ui': 'https://headlessui.com', 'radix-primitives': 'https://www.radix-ui.com/primitives'
};

/* ---------- Categorías (pestañas de la librería) ---------- */
const CATEGORIAS = [
  ['buttons', 'Botones'], ['cards', 'Tarjetas'], ['forms', 'Formularios'], ['inputs', 'Inputs'], ['toggles', 'Toggles'],
  ['checkboxes', 'Checkboxes'], ['radios', 'Radios'], ['loaders', 'Loaders'], ['tooltips', 'Tooltips'],
  ['navigation', 'Menús'], ['backgrounds', 'Patrones y fondos'], ['layouts', 'Plantillas y secciones'],
  ['feedback', 'Avisos'], ['modals', 'Ventanas'], ['data-display', 'Datos'], ['animations', 'Animaciones'],
  ['text-effects', 'Efectos de texto'], ['otros', 'Otros']
];
/* Palabras en español para buscar por categoría */
const SINONIMOS = {
  buttons: 'boton botones', cards: 'tarjeta tarjetas', forms: 'formulario formularios login registro contacto',
  inputs: 'campo campos entrada buscador', toggles: 'interruptor interruptores', checkboxes: 'casilla casillas',
  radios: 'opcion opciones', loaders: 'cargando carga spinner', tooltips: 'tooltip ayuda', navigation: 'menu menus navegacion barra',
  backgrounds: 'fondo fondos patron patrones', layouts: 'plantilla plantillas seccion secciones hero bloque',
  feedback: 'aviso avisos alerta notificacion', modals: 'modal ventana dialogo', 'data-display': 'tabla lista datos grafico',
  animations: 'animacion animaciones', 'text-effects': 'texto efecto', otros: ''
};

/* ---------- Utilidades ---------- */
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const humano = s => {
  const t = String(s || '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};
const FORMATOS = { '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'scss', '.less': 'css', '.styl': 'styl', '.js': 'js', '.mjs': 'js', '.ts': 'ts', '.jsx': 'jsx', '.tsx': 'tsx', '.svg': 'svg', '.md': 'md', '.mdx': 'md', '.json': 'json', '.pug': 'pug', '.vue': 'vue' };
const formatoDe = (ruta, texto) => {
  const f = FORMATOS[extname(ruta).toLowerCase()] || 'otro';
  // Los .js con JSX (p. ej. Tailblocks) son JSX
  if (f === 'js' && /return\s*\(\s*</.test(texto)) return 'jsx';
  return f;
};
/* Autores cuando el aviso de copyright no se puede leer de forma automática */
const AUTORES = {
  preline: 'Preline Labs Ltd.', 'origin-ui': 'coss.com (Origin UI)', 'loaders-css': 'Connor Atherton',
  'animate-css': 'Daniel Eden', tremor: 'Tremor Labs, Inc.', 'simple-icons': 'Simple Icons Collaborators',
  'loading-io-css-spinner': 'loading.io', 'uiverse-galaxy': 'Uiverse.io y cada autor'
};
const copyright = lib => {
  if (AUTORES[lib]) return AUTORES[lib];
  const dir = join(BIB, '_licenses', lib);
  if (!existsSync(dir)) return '';
  for (const f of readdirSync(dir)) {
    const m = leer(join(dir, f)).match(/^\s*Copyright\s*(?:\(c\)|©)?\s*([^\n]{3,90})$/im);
    if (m) return m[1].replace(/\s+/g, ' ').replace(/[.,;]\s*$/, '').trim();
  }
  return '';
};

/* Rasgos que se ven en el código (para buscar y para que la IA elija) */
const RASGOS = [
  ['animado', /@keyframes|animation\s*:|transition\s*:|animate-|framer-motion|motion\./i],
  ['degradado', /gradient/i],
  ['cristal', /backdrop-filter|backdrop-blur/i],
  ['neon', /neon|glow/i],
  ['3d', /perspective|rotate[XY]\(|translateZ|preserve-3d/i],
  ['sombra', /box-shadow|shadow-/i],
  ['hover', /:hover|hover:/i],
  ['tailwind', /class(Name)?="[^"]*\b(flex|grid|px-\d|py-\d|bg-[a-z]+-\d{2,3}|rounded-(md|lg|xl|full)|text-(sm|lg|xl))\b/],
  ['react', /from ['"]react['"]|useState|className=/],
  ['alpine', /x-data|x-show|@click/],
  ['svg', /<svg/i],
  ['oscuro', /dark:|#0{3,6}\b|#1[0-9a-f]{5}\b|rgb\(\s*[0-2]?\d\s*,\s*[0-2]?\d\s*,\s*[0-2]?\d\s*\)/i],
  ['minimalista', /^(?![\s\S]*(gradient|shadow|@keyframes))[\s\S]{0,1600}$/i]
];

/* ---------- Bibliotecas ---------- */
const procedencia = lib => {
  const p = join(BIB, '_sources', lib, 'PROCEDENCIA.json');
  return existsSync(p) ? json(p) : {};
};
const libs = new Map();
const biblioteca = lib => {
  if (libs.has(lib)) return libs.get(lib).idx;
  const pr = procedencia(lib);
  const spdx = SPDX[lib] || 'desconocida';
  const dirLic = join(BIB, '_licenses', lib);
  const licencias = existsSync(dirLic) ? readdirSync(dirLic).sort().map(f => `_licenses/${lib}/${f}`) : [];
  const repo = String(pr.repo || '').replace(/\/$/, '');
  const b = {
    id: lib, nombre: NOMBRES[lib] || humano(lib), repo, commit: pr.commit || '', fecha: String(pr.commit_date || '').slice(0, 10),
    web: WEBS[lib] || repo, spdx, clase: clasificar(spdx), autor: copyright(lib) || NOMBRES[lib] || lib,
    nota: NOTAS[lib] || '', licencias, n: 0
  };
  libs.set(lib, { idx: libs.size, b });
  return libs.get(lib).idx;
};

/* ---------- Componentes ---------- */
const catalogo = json(join(BIB, '_catalogo', 'componentes.json'));
const items = [];
const avisos = [];

function previewDe(lib, archivos, textos) {
  const html = textos.find((_, i) => /\.html?$/i.test(archivos[i])) || '';
  switch (lib) {
    case 'uiverse-galaxy': return /<style/i.test(html) ? 'html' : 'tw';
    case 'hyperui': return 'hyperui';
    case 'meraki-ui': return 'doc';
    case 'pines': return 'twa';
    case 'svg-loaders': return 'svg';
    case 'loading-io-css-spinner': return 'html';
    case 'preline': return archivos.some(a => /\.html$/.test(a)) ? 'doc' : 'code';
    default: return 'code';
  }
}

function etiquetas(texto, nombre, cat, extra = []) {
  const k = new Set(extra.map(x => sinTildes(x).trim()).filter(Boolean));
  for (const [t, re] of RASGOS) if (re.test(texto)) k.add(t);
  sinTildes(nombre).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !/^\d+$/.test(w)).forEach(w => k.add(w));
  k.delete(cat);
  return [...k].slice(0, 14);
}

function añadir(x, { nombre, cat, archivos, preview, extra = {}, tags = [], autor, web, texto, tam }) {
  const lib = x.library;
  const b = biblioteca(lib);
  const pref = `_sources/${lib}/`;
  const a = archivos.map(r => (r.startsWith(pref) ? r.slice(pref.length) : r));
  const textos = extra._textos || archivos.map(r => leer(join(BIB, r)));
  const t = texto ?? textos.join('\n');
  const f = [...new Set(archivos.map((r, i) => formatoDe(r, textos[i] || '')))];
  const item = {
    i: x.id + (extra.x != null ? `#${extra.x}` : ''), n: nombre, c: cat, b, a, f,
    p: preview, k: etiquetas(t, nombre, cat, tags), s: tam ?? t.length,
    v: x.verified ? 1 : 0
  };
  if (autor) item.u = autor;
  if (web) item.o = web;
  if (extra.x != null) item.x = extra.x;
  if (extra.h) item.h = extra.h;
  // «Recomendados»: con vista previa en vivo, verificados y bien etiquetados primero
  item.w = (preview !== 'code' ? 40 : 0) + (item.v ? 10 : 0) + Math.min(10, item.k.length) + (autor ? 3 : 0)
    + ({ 'uiverse-galaxy': 15, hyperui: 12, 'meraki-ui': 8, pines: 6, 'magic-ui': 6, 'shadcn-ui': 6 }[lib] || 0)
    - (item.s > 40000 ? 10 : 0);
  items.push(item);
  libs.get(lib).b.n++;
}

/* SpinKit: el marcado de cada spinner está en examples.html */
const spinkitHTML = leer(join(BIB, '_sources/spinkit/examples.html'));
const marcadoSpinkit = cls => {
  const i = spinkitHTML.indexOf(`<div class="${cls}">`);
  if (i < 0) return `<div class="${cls}"></div>`;
  let prof = 0, j = i;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(spinkitHTML))) {
    prof += m[0][1] === '/' ? -1 : 1;
    if (prof === 0) { j = m.index + m[0].length; break; }
  }
  return spinkitHTML.slice(i, j).replace(/\n\s*/g, '');
};

/* Flowbite: cada {{< example >}} de la documentación es un componente */
const ejemplosFlowbite = md => {
  const lista = [];
  const re = /\{\{<\s*example\b[\s\S]*?>\}\}\n?([\s\S]*?)\{\{<\s*\/example\s*>\}\}/g;
  let m;
  while ((m = re.exec(md))) {
    const antes = md.slice(0, m.index);
    const titulo = [...antes.matchAll(/^#{2,4}\s+(.+)$/gm)].pop()?.[1] || '';
    lista.push({ codigo: m[1].trim(), titulo: titulo.replace(/[`*]/g, '').trim() });
  }
  return lista;
};

for (const x of catalogo) {
  const lib = x.library;
  if (lib === 'react-bits') continue; // excluida por su licencia (ver _referencias/react-bits.md)
  let cat = x.category || 'otros';
  if (x.original_category === 'Tooltips' || /tooltip/i.test(x.name)) cat = 'tooltips';
  const base = basename(String(x.name).split('#')[0]);

  if (lib === 'flowbite') {
    const md = leer(join(BIB, x.files[0]));
    const pagina = humano(basename(x.files[0], '.md'));
    ejemplosFlowbite(md).forEach((e, n) => {
      const nombre = `${pagina}${e.titulo ? ` · ${e.titulo}` : ''}`;
      añadir(x, { nombre, cat: x.category === 'otros' ? cat : cat, archivos: [x.files[0]], preview: 'code', extra: { x: n, _textos: [e.codigo] }, texto: e.codigo, tam: e.codigo.length, tags: ['tailwind', 'flowbite'] });
    });
    continue;
  }
  if (lib === 'uiverse-galaxy') {
    const html = leer(join(BIB, x.files[0]));
    const tags = (html.match(/Tags:\s*([^*\n]+?)\s*(?:\*\/|-->|$)/m)?.[1] || '').split(',').map(s => s.trim()).filter(Boolean);
    const autor = html.match(/From Uiverse\.io by\s+([^\s-][^ ]*)/)?.[1] || x.author || '';
    const slug = x.uiverse_slug || '';
    añadir(x, {
      nombre: humano(slug.replace(/-\d+$/, '')) || humano(base), cat, archivos: x.files, preview: previewDe(lib, x.files, [html]),
      tags, autor, web: autor && slug ? `https://uiverse.io/${autor}/${slug}` : '', texto: html
    });
    continue;
  }
  if (lib === 'spinkit') {
    const cls = x.name.replace(/^.*\//, '');
    añadir(x, { nombre: humano(cls.replace(/^sk-/, '')), cat: 'loaders', archivos: x.files, preview: 'css', extra: { h: marcadoSpinkit(cls) }, tags: ['spinner'] });
    continue;
  }
  if (lib === 'css-loaders') {
    const n = base.replace(/\.css$/, '');
    añadir(x, { nombre: `Loader ${n.replace(/\D/g, '')}`, cat: 'loaders', archivos: x.files, preview: 'css', extra: { h: `<div class="${n}"><div class="loader">Cargando…</div></div>` } });
    continue;
  }
  if (lib === 'animate-css') {
    const n = base.replace(/\.css$/, '');
    añadir(x, {
      nombre: humano(n), cat: 'animations', archivos: x.files, preview: 'anim',
      extra: { h: `<div class="animated infinite ${n}" style="width:96px;height:96px;border-radius:22px;background:#c8f560"></div>` }, tags: [x.original_category || '']
    });
    continue;
  }
  let nombre = x.title || humano(base.replace(/\.(tsx|ts|jsx|js|html|css|scss)$/, ''));
  const partes = String(x.name).split('/');
  if (lib === 'hyperui' && partes.length >= 3) {
    const n = partes.at(-1), oscuro = /-dark$/.test(n);
    nombre = `${humano(partes.at(-2))} ${n.replace(/-dark$/, '')}${oscuro ? ' · oscuro' : ''}`;
  } else if (lib === 'tailblocks' && partes.length >= 3) {
    nombre = `${humano(partes[0])} ${partes[2].toUpperCase()} · ${partes[1] === 'dark' ? 'oscuro' : 'claro'}`;
  } else if (lib === 'meraki-ui' && partes.length >= 2) {
    nombre = `${humano(partes[0])} · ${humano(partes.at(-1))}`;
  }
  const textos = x.files.map(r => leer(join(BIB, r)));
  añadir(x, { nombre, cat, archivos: x.files, preview: previewDe(lib, x.files, textos), extra: { _textos: textos } });
}

/* ---------- Iconos ---------- */
const iconos = json(join(BIB, '_catalogo', 'iconos.json')).map(s => {
  const b = biblioteca(s.library);
  const dir = join(BIB, s.folder);
  const nombres = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.svg')).sort().map(f => f.slice(0, -4)) : [];
  libs.get(s.library).b.n += nombres.length;
  return { b, variante: s.variant, carpeta: s.folder, nombres };
});

/* ---------- Escribir ---------- */
const bibliotecas = [...libs.values()].sort((a, z) => a.idx - z.idx).map(x => x.b);
const ahora = new Date().toISOString().slice(0, 10);
const indice = {
  version: 1, generado: ahora, base: '../biblioteca-ui/',
  categorias: CATEGORIAS.map(([id, nombre]) => ({ id, nombre, sin: SINONIMOS[id] || '', n: items.filter(i => i.c === id).length })),
  bibliotecas,
  componentes: items
};
mkdirSync(SALIDA, { recursive: true });
writeFileSync(join(SALIDA, 'indice.json'), JSON.stringify(indice));
writeFileSync(join(SALIDA, 'iconos.json'), JSON.stringify({ version: 1, generado: ahora, base: '../biblioteca-ui/', sets: iconos }));

/* ---------- Resumen en pantalla ---------- */
const porClase = { permisiva: 0, atribucion: 0, restringida: 0 };
const ejecutables = new Set(['html', 'css', 'js', 'svg']);
let paraIA = 0, traducibles = 0;
for (const it of items) {
  const cl = bibliotecas[it.b].clase;
  porClase[cl]++;
  if (cl === 'restringida') continue;
  if (it.f.every(f => ejecutables.has(f))) paraIA++; else traducibles++;
}
const tam = p => (statSync(p).size / 1048576).toFixed(2) + ' MB';
console.log(`Componentes: ${items.length} de ${bibliotecas.filter(b => items.some(i => i.b === bibliotecas.indexOf(b))).length} bibliotecas`);
console.log(`Iconos: ${iconos.reduce((s, x) => s + x.nombres.length, 0)} en ${iconos.length} sets`);
console.log(`Licencias → permisiva: ${porClase.permisiva} · con atribución: ${porClase.atribucion} · restringida/desconocida: ${porClase.restringida}`);
console.log(`Utilizables por la IA: ${paraIA} en HTML/CSS/JS/SVG + ${traducibles} que habría que traducir (JSX/TSX/SCSS/TS…)`);
console.log(`library/indice.json: ${tam(join(SALIDA, 'indice.json'))} · library/iconos.json: ${tam(join(SALIDA, 'iconos.json'))}`);
if (avisos.length) console.log('Avisos:\n- ' + avisos.join('\n- '));
