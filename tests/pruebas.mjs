/* ==========================================================
   PRUEBAS AUTOMÁTICAS DE LA WEB
   Las ejecuta GitHub en cada cambio (.github/workflows/pruebas.yml) y
   también se pueden lanzar a mano:  node tests/pruebas.mjs
   - Sirve la web en local en «modo demo» (sin tocar Supabase).
   - Abre cada página en ordenador y en móvil y comprueba que no hay
     errores, que nada se sale por los lados y que lo principal funciona
     (precios, calculadora y su PDF, preguntas, pedido, enlaces).
   Si algo falla, termina con error y GitHub marca el cambio en rojo.
   ========================================================== */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Con require se encuentra Playwright tanto instalado en el proyecto (GitHub) como global
const { chromium } = createRequire(import.meta.url)('playwright');

// WEB_DIR: probar otra carpeta (por ejemplo dist/, la copia minificada que se publica)
const RAIZ = process.env.WEB_DIR ? join(process.env.WEB_DIR, sep) : fileURLToPath(new URL('..', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };

/* ---------- Servidor como GitHub Pages: /pagina → pagina.html, 404.html si no existe ---------- */
async function archivo(ruta) {
  let p = normalize(join(RAIZ, decodeURIComponent(ruta.split('?')[0])));
  if (!p.startsWith(RAIZ)) return null;
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html'); } catch { if (!extname(p)) p += '.html'; }
  try { return { p, datos: await readFile(p) }; } catch { return null; }
}
const servidor = createServer(async (req, res) => {
  const a = await archivo(req.url);
  if (!a) { res.writeHead(404, { 'Content-Type': TIPOS['.html'] }); return res.end(await readFile(join(RAIZ, '404.html'))); }
  let datos = a.datos;
  // Modo demo: sin Supabase (como en las pruebas a mano)
  if (a.p.endsWith('config.js')) datos = String(datos).replace(/url: 'https:\/\/[^']*'/, "url: ''").replace(/anonKey: '[^']*'/, "anonKey: ''");
  res.writeHead(200, { 'Content-Type': TIPOS[extname(a.p)] || 'application/octet-stream' });
  res.end(datos);
});
await new Promise(r => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

/* ---------- Ayudas ---------- */
const fallos = [];
const ok = (cond, txt) => { console.log(`${cond ? '✓' : '✗'} ${txt}`); if (!cond) fallos.push(txt); };
const PAGINAS = ['/', '/trabaja-con-nosotros', '/terminos-y-privacidad', '/panel', '/ajustes', '/revisa-tu-web', '/mantenimiento', '/guias',
  '/cuanto-cuesta-una-pagina-web', '/que-necesita-la-web-de-mi-negocio', '/dominio-alojamiento-y-correo', '/antes-de-lanzar-tu-web',
  '/seo-local-para-negocios', '/como-conseguir-resenas-en-google', '/web-o-redes-sociales',
  '/webs-para-barberias', '/webs-para-centros-de-estetica', '/webs-para-restaurantes', '/tiendas-online', '/webs-para-gimnasios', '/webs-para-profesionales'];
const PC = { viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' };
const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

const nav = await chromium.launch();
async function contexto(tipo) {
  const ctx = await nav.newContext({ ...tipo, serviceWorkers: 'block', acceptDownloads: true, locale: 'es-ES' });
  // Fuera de la web (fotos de ejemplo, Cloudflare…): no hace falta para probar
  await ctx.route(url => !url.href.startsWith(BASE), r => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('tm_intro', '1'); localStorage.setItem('tm_cookies', JSON.stringify({ necesarias: true, v: 1 })); });
  return ctx;
}
const errores = pg => { const e = []; pg.on('pageerror', x => e.push(x.message)); pg.on('console', m => m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && e.push(m.text())); return e; };

/* ---------- 1. Todas las páginas, en ordenador y en móvil ---------- */
for (const [nombre, tipo] of [['ordenador', PC], ['móvil', MOVIL]]) {
  const ctx = await contexto(tipo);
  for (const ruta of PAGINAS) {
    const pg = await ctx.newPage(); const e = errores(pg);
    const r = await pg.goto(BASE + ruta, { waitUntil: 'load' });
    await pg.waitForTimeout(800);
    const ancho = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(r.status() === 200 && !e.length && ancho <= 1, `${nombre} ${ruta}${e.length ? ` → ${e[0]}` : ''}${ancho > 1 ? ` → se sale ${ancho}px` : ''}`);
    await pg.close();
  }
  await ctx.close();
}

/* ---------- 2. Portada: lo que más importa ---------- */
{
  const ctx = await contexto(MOVIL);
  const pg = await ctx.newPage(); const e = errores(pg);
  await pg.goto(BASE + '/', { waitUntil: 'load' }); await pg.waitForTimeout(1000);
  ok(await pg.locator('#planes [data-comprar]').count() >= 3, 'portada: se ven los tipos de web con su botón');
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('mundo')).display === 'none'), 'móvil: la intro en vídeo no aparece');
  await pg.locator('#calc').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1200);
  ok(!!(await pg.textContent('#calcTotal'))?.includes('€'), 'calculadora: muestra el total');
  const [pdf] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }).catch(() => null), pg.click('#calcPdf')]);
  ok(!!pdf && /\.pdf$/.test(pdf.suggestedFilename()), 'calculadora: descarga el presupuesto en PDF');
  await pg.locator('#faq summary').first().click();
  ok(await pg.locator('#faq details[open]').count() === 1, 'preguntas frecuentes: se abren');
  ok(!e.length, `portada sin errores${e.length ? ` → ${e[0]}` : ''}`);
  const pg2 = await ctx.newPage();
  await pg2.goto(BASE + '/?comprar=negocio&diseno=filo', { waitUntil: 'load' }); await pg2.waitForTimeout(1500);
  ok(await pg2.evaluate(() => !!document.querySelector('#compraDlg[open]')), 'enlace «Empezar» abre el pedido');
  await ctx.close();
}

/* ---------- 3. Enlaces internos rotos ---------- */
{
  const ctx = await contexto(PC); const pg = await ctx.newPage(); const enlaces = new Set();
  for (const ruta of ['/', '/guias', '/webs-para-barberias', '/terminos-y-privacidad']) {
    await pg.goto(BASE + ruta, { waitUntil: 'load' }); await pg.waitForTimeout(500);
    (await pg.$$eval('a[href]', as => as.map(a => a.href))).forEach(h => h.startsWith(BASE) && enlaces.add(h.split('#')[0]));
  }
  const rotos = [];
  for (const h of enlaces) { const r = await ctx.request.get(h); if (r.status() >= 400) rotos.push(h.replace(BASE, '')); }
  ok(!rotos.length, `enlaces internos (${enlaces.size}) sin romper${rotos.length ? ` → ${rotos.join(', ')}` : ''}`);
  await ctx.close();
}

await nav.close();
servidor.close();
console.log(fallos.length ? `\n${fallos.length} prueba(s) fallida(s)` : '\nTodo correcto');
process.exit(fallos.length ? 1 : 0);
