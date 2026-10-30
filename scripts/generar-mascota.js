// Genera los 60 fotogramas del robot saludando (un bucle perfecto de 1 s a 60 fps) y los junta en una hoja de sprites.
// Uso (desde la raíz, con la web servida en local):  node scripts/generar-mascota.js http://127.0.0.1:8731
// Necesita playwright y Pillow (python3). Salida: icons/asistente/saluda-00.webp … saluda-59.webp y icons/asistente/saluda.webp (10 × 6).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8731';
const SALIDA = path.resolve(__dirname, '..', 'icons', 'asistente'), TMP = path.join(SALIDA, '_tmp');
const N = 60, W = 200, H = 235, ESC = 2; // tamaño final de cada fotograma; se dibuja al doble y se reduce (bordes más limpios)
const BUCLE = `
.masc.cuerpo[data-estado=saluda] .m-todo{animation:masc-flota 1s ease-in-out infinite!important}
.masc.cuerpo[data-estado=saluda] .l-brazo-d{animation:masc-saluda .5s ease-in-out infinite alternate!important}
.masc.cuerpo[data-estado=saluda] .l-brazo-i{animation:masc-brazo-i .5s ease-in-out infinite alternate!important}
.masc.cuerpo[data-estado=saluda] .l-cabeza{animation:masc-cabecea 1s ease-in-out infinite!important}
html,body{background:transparent!important}body>*:not(#lab):not(#masc-defs){display:none!important}
#lab{position:fixed;left:0;top:0;width:${W}px;z-index:99999;background:transparent}`;
(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 420 }, deviceScaleFactor: ESC });
  const p = await ctx.newPage();
  await p.goto(BASE + '/ajustes'); await p.waitForTimeout(1200);
  await p.addStyleTag({ content: BUCLE });
  await p.evaluate(async () => {
    const m = await import('/js/mascota.js');
    const c = document.createElement('div'); c.id = 'lab'; c.innerHTML = m.mascotaHTML('saluda', { cuerpo: true }); document.body.append(c);
    const x = c.querySelector('.masc'); x.style.setProperty('--px', 0); x.style.setProperty('--py', 0);
  });
  await p.waitForTimeout(800);
  const el = p.locator('#lab');
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }), (i / N) * 1000);
    await p.waitForTimeout(40);
    await el.screenshot({ path: path.join(TMP, `f${String(i).padStart(2, '0')}.png`), omitBackground: true });
  }
  await b.close();
  execFileSync('python3', ['-I', '-c', `
from PIL import Image
import glob,os,sys
W,H,N=${W},${H},${N}
fr=[Image.open(f).convert('RGBA') for f in sorted(glob.glob(r'${TMP}/f*.png'))]
print('tamaño dibujado',fr[0].size)
sheet=Image.new('RGBA',(W*10,H*6),(0,0,0,0))
for i,f in enumerate(fr):
    f=f.resize((W,H),Image.LANCZOS)
    f.save(r'${SALIDA}/saluda-%02d.webp'%i,'WEBP',quality=74,alpha_quality=80,method=6)
    sheet.paste(f,((i%10)*W,(i//10)*H))
sheet.save(r'${SALIDA}/saluda.webp','WEBP',quality=72,alpha_quality=80,method=6)
print('hoja',os.path.getsize(r'${SALIDA}/saluda.webp')//1024,'KB')
`]);
  fs.rmSync(TMP, { recursive: true, force: true });
})();
