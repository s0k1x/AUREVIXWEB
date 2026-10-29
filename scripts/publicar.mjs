/* ==========================================================
   COPIA PUBLICABLE DE LA WEB  ·  node scripts/publicar.mjs
   Crea la carpeta dist/ con SOLO lo que necesita la web para funcionar,
   con el JavaScript y el CSS minificados (sin comentarios, nombres
   acortados y todo en pocas líneas), para que copiar el código no sirva
   de mucho. Lo usa .github/workflows/publicar.yml, que la sube al
   repositorio público que sirve aurevixweb.es; este repositorio, con el
   código legible, puede ser privado.
   No se publica: SQL y funciones de Supabase, scripts, pruebas, notas
   (.md), configuración de herramientas ni carpetas de trabajo.
   Necesita esbuild:  npm install --no-save esbuild
   ========================================================== */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { transform } = createRequire(import.meta.url)('esbuild');
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = process.env.DIST || join(RAIZ, 'dist');

// Lo que NO se publica (rutas relativas a la raíz)
const FUERA = new Set(['.git', '.github', '.claude', '.agents', '.taste-skill', 'agent', 'node_modules', 'dist', 'scripts', 'tests', 'supabase',
  '.gitignore', '.mcp.json', 'skills-lock.json', 'firestore.rules']);
const fuera = r => FUERA.has(r.split(sep)[0]) || /\.md$/i.test(r);
// Ya vienen minificados (o son de terceros): se copian tal cual
const TAL_CUAL = r => r.startsWith(join('js', 'vendor')) || r.startsWith('biblioteca-ui') || /\.min\.(js|css)$/.test(r);
const AVISO = '/*! © AurevixWeb. Todos los derechos reservados. Prohibida la copia o reutilización sin autorización. */';

let n = 0, antes = 0, despues = 0;
async function recorrer(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name), rel = relative(RAIZ, abs);
    if (fuera(rel)) continue;
    if (e.isDirectory()) { await recorrer(abs); continue; }
    const dest = join(DIST, rel);
    await mkdir(join(dest, '..'), { recursive: true });
    const ext = extname(e.name);
    if ((ext === '.js' || ext === '.css') && !TAL_CUAL(rel)) {
      const codigo = await readFile(abs, 'utf8');
      // Sin «format»: los módulos siguen siendo módulos y los scripts normales, scripts normales
      const r = await transform(codigo, { loader: ext.slice(1), minify: true, legalComments: 'none', target: ext === '.js' ? 'es2022' : undefined, charset: 'utf8' });
      await writeFile(dest, `${AVISO}\n${r.code}`);
      antes += codigo.length; despues += r.code.length; n++;
    } else {
      await cp(abs, dest);
    }
  }
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await recorrer(RAIZ);
await writeFile(join(DIST, '.nojekyll'), '');
const kb = b => `${Math.round(b / 1024)} KB`;
console.log(`dist/ lista: ${n} archivos JS y CSS minificados (${kb(antes)} → ${kb(despues)}).`);
for (const imprescindible of ['index.html', 'sw.js', 'config.js', 'CNAME', '404.html', 'js/app.js']) {
  try { await stat(join(DIST, imprescindible)); } catch { console.error(`Falta ${imprescindible} en dist/`); process.exit(1); }
}
