/* Graba el vídeo promo (promo/promo-15s.html) fotograma a fotograma a 60 fps y lo junta con ffmpeg.
   Uso: node scripts/grabar-promo.cjs <url-base> <salida-sin-extensión> [ancho] [alto]
   Ejemplo (con la web servida en el puerto 8731):
     node scripts/grabar-promo.cjs http://127.0.0.1:8731 /tmp/aurevixweb-promo 1920 1080
   Necesita Playwright (Chromium) y ffmpeg. Sale <salida>.mp4 (H.264, yuv420p, para redes y webs). */
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');

const [base, salida, w = '1920', h = '1080'] = process.argv.slice(2);
if (!base || !salida) { console.error('Uso: node scripts/grabar-promo.cjs <url-base> <salida> [ancho] [alto]'); process.exit(1); }
const FPS = 60;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await p.goto(`${base}/promo/promo-15s.html?w=${w}&h=${h}`);
  await p.evaluate(() => window.listo);
  const dur = await p.evaluate(() => window.DURACION);
  const n = Math.round(dur / 1000 * FPS);
  for (let i = 0; i < n; i++) {
    await p.evaluate(ms => window.irA(ms), i * 1000 / FPS);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
    if (i % 120 === 0) console.log(`fotograma ${i}/${n}`);
  }
  await b.close();
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', `${salida}.mp4`]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Listo:', `${salida}.mp4`);
})();
