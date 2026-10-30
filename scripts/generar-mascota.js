// Genera las hojas de fotogramas del robot del asistente: una por cada cosa que hace, a 60 fps.
// Cada acción es una coreografía fotograma a fotograma (no un bucle CSS): el cuerpo respira, la cabeza
// acompaña con retraso, los brazos siguen el movimiento, los ojos miran y parpadean… y el último fotograma
// enlaza con el primero, así el bucle no se nota.
//
// Uso (desde la raíz, con la web servida en local):  node scripts/generar-mascota.js http://127.0.0.1:8731 [acción…]
// Necesita playwright y Pillow (python3). Salida: icons/asistente/<forma>-<acción>.webp (+ indice.json).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8731';
const SOLO = process.argv.slice(3);
const SALIDA = path.resolve(__dirname, '..', 'icons', 'asistente'), TMP = path.join(SALIDA, '_tmp');
const ESC = 2; // se dibuja al doble y se reduce: bordes más limpios
const TAU = Math.PI * 2;
const s = (t, f = 1, fase = 0) => Math.sin(TAU * (t * f + fase)); // onda que cierra el bucle si f es entero
const campana = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a))); // sube y baja entre a y b

/* Cada coreografía recibe t ∈ [0, 1) y devuelve las piezas que se mueven:
   todo, cabeza, ojos (mirada), ojoI/ojoD (escala vertical: parpadeo, hablar), brazoI/brazoD (giro en grados),
   piernaI/piernaD, sombra, llama (escala), puntos (opacidad) y estado (forma de los ojos). */
const COREO = {
  // Reposo: respira, se balancea, mira a un lado y al otro, parpadea dos veces y sonríe un momento
  normal: t => {
    const parp = campana(t, .30, .335) + campana(t, .36, .395) + campana(t, .80, .835);
    return {
      todo: `translateY(${(-1 * s(t)).toFixed(3)}%) scale(${(1 + .006 * s(t, 1, .25)).toFixed(4)},${(1 - .006 * s(t, 1, .25)).toFixed(4)})`,
      cabeza: `rotate(${(3 * s(t, 1, -.08) + 1.5 * s(t, 2)).toFixed(2)}deg)`,
      ojos: `translate(${(2.4 * s(t, 1, .1)).toFixed(2)}%,${(-.5 + .6 * s(t, 2, .3)).toFixed(2)}%)`,
      ojoI: `scaleY(${(1 - .92 * parp).toFixed(3)})`, ojoD: `scaleY(${(1 - .92 * parp).toFixed(3)})`,
      brazoI: 9 + 4 * s(t, 1, -.12), brazoD: -9 - 4 * s(t, 1, .38),
      estado: t > .55 && t < .72 ? 'feliz' : 'normal'
    };
  },
  // Habla: cabecea al ritmo de las frases, los ojos laten como una voz y la mano acompaña explicando
  habla: t => {
    const voz = Math.abs(s(t, 4)) * .45 + Math.abs(s(t, 3, .2)) * .2;
    return {
      todo: `translateY(${(-.8 * s(t, 2)).toFixed(3)}%)`,
      cabeza: `rotate(${(2.6 * s(t, 2, .1) + 1 * s(t, 3)).toFixed(2)}deg) translateY(${(.4 * s(t, 4)).toFixed(2)}%)`,
      ojos: `translate(${(1.2 * s(t, 1)).toFixed(2)}%,0)`,
      ojoI: `scaleY(${(1 - voz).toFixed(3)})`, ojoD: `scaleY(${(1 - Math.abs(s(t, 4, .12)) * .45 - Math.abs(s(t, 3, .32)) * .2).toFixed(3)})`,
      brazoI: 10 + 3 * s(t, 2),
      brazoD: -18 - 30 * (.5 - .5 * Math.cos(TAU * t)) - 8 * s(t, 3),
      estado: 'normal'
    };
  },
  // Piensa: mano a la barbilla, cabeza ladeada, ojos que buscan arriba y puntos que aparecen uno a uno
  piensa: t => ({
    todo: `translateY(${(-.6 * s(t)).toFixed(3)}%)`,
    cabeza: `rotate(${(-8 + 2.5 * s(t, 1, .15)).toFixed(2)}deg) translateY(.4%)`,
    ojos: `translate(${(-2.4 + 2.6 * (.5 - .5 * Math.cos(TAU * t))).toFixed(2)}%,${(-1.4 + .4 * s(t, 2)).toFixed(2)}%)`,
    ojoI: `scaleY(${(.82 - .74 * campana(t, .6, .64)).toFixed(3)})`, ojoD: `scaleY(${(.82 - .74 * campana(t, .6, .64)).toFixed(3)})`,
    brazoI: 9 + 2 * s(t), brazoD: -128 + 6 * s(t, 1, .3),
    puntos: Math.min(1, .25 + .75 * Math.max(0, s(t, 1, -.25))),
    estado: 'normal'
  }),
  // Alegría: coge impulso, salta estirándose con los brazos arriba, cae aplastándose y se recupera
  feliz: (t, forma) => {
    const alto = campana(t, .16, .74), aplasta = campana(t, 0, .16) * .9 + campana(t, .74, .92), salto = forma === 'cara' ? 1.6 : 6;
    const sx = 1 + .1 * aplasta - .05 * alto, sy = 1 - .13 * aplasta + .07 * alto;
    return {
      todo: `translateY(${(-salto * alto).toFixed(3)}%) scale(${sx.toFixed(4)},${sy.toFixed(4)})`,
      cabeza: `rotate(${(4 * s(t, 1, .1)).toFixed(2)}deg) translateY(${(1.2 * aplasta).toFixed(2)}%)`,
      ojos: 'translate(0,-.6%)', ojoI: 'none', ojoD: 'none',
      brazoI: 104 + 34 * (.5 + .5 * s(t, 2)), brazoD: -104 - 34 * (.5 + .5 * s(t, 2, .25)),
      piernaI: 8 * alto, piernaD: -8 * alto,
      sombra: `scale(${(1 - .25 * alto).toFixed(3)})`, sombraO: 1 - .45 * alto,
      estado: 'feliz'
    };
  },
  // Saluda: brazo arriba moviendo la mano, cuerpo que acompaña y cabeza que asiente
  saluda: t => ({
    todo: `translateY(${(-1 * s(t)).toFixed(3)}%) rotate(${(1.2 * s(t, 1, .2)).toFixed(2)}deg)`,
    cabeza: `rotate(${(4 + 3 * s(t, 2, .1)).toFixed(2)}deg)`,
    ojos: 'translate(1.2%,-.4%)', ojoI: 'none', ojoD: 'none',
    brazoI: 10 + 3 * s(t), brazoD: -122 - 18 * s(t, 2),
    estado: 'feliz'
  }),
  // Vuela: llamas vivas bajo los pies, brazos abiertos que equilibran y piernas colgando con inercia
  vuela: t => ({
    todo: `translateY(${(-1.6 * s(t)).toFixed(3)}%) rotate(${(2 * s(t, 1, .25)).toFixed(2)}deg)`,
    cabeza: `rotate(${(-2 * s(t, 1, .1)).toFixed(2)}deg)`,
    ojos: 'translate(0,-.8%)', ojoI: 'none', ojoD: 'none',
    brazoI: 62 + 8 * s(t, 2), brazoD: -62 - 8 * s(t, 2, .5),
    piernaI: 10 + 5 * s(t, 1, .3), piernaD: -6 - 5 * s(t, 1, .55),
    llama: `scale(${(1.05 + .12 * s(t, 8) + .06 * s(t, 13)).toFixed(3)},${(1.1 + .28 * s(t, 7, .3) + .12 * s(t, 11)).toFixed(3)})`,
    sombra: 'scale(.7)', sombraO: .4,
    estado: 'feliz'
  })
};

/* Qué hojas se hacen: forma (cara = solo la cabeza en su disco, para el botón y el chat; cuerpo = entero) */
const HOJAS = [
  { forma: 'cara', accion: 'normal', n: 120, ms: 2400, w: 96, h: 96, cols: 12 },
  { forma: 'cara', accion: 'habla', n: 60, ms: 1000, w: 96, h: 96, cols: 10 },
  { forma: 'cara', accion: 'piensa', n: 120, ms: 2400, w: 96, h: 96, cols: 12 },
  { forma: 'cara', accion: 'feliz', n: 60, ms: 1000, w: 96, h: 96, cols: 10 },
  { forma: 'cuerpo', accion: 'saluda', n: 60, ms: 1000, w: 170, h: 200, cols: 10 },
  { forma: 'cuerpo', accion: 'feliz', n: 60, ms: 1000, w: 170, h: 200, cols: 10 },
  { forma: 'cuerpo', accion: 'vuela', n: 60, ms: 1000, w: 170, h: 200, cols: 10 }
].filter(h => !SOLO.length || SOLO.includes(`${h.forma}-${h.accion}`));

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 420 }, deviceScaleFactor: ESC });
  const p = await ctx.newPage();
  // Página mínima con los estilos de la web: dibuja rápido
  await p.goto(BASE + '/404.html').catch(() => {});
  await p.setContent(`<!doctype html><html><head><base href="${BASE}/"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="funciones.css">
    <style>html,body{background:transparent!important;margin:0}.masc,.masc *{animation:none!important;transition:none!important}#lab{position:fixed;left:0;top:0}</style></head><body><div id="lab"></div></body></html>`);
  await p.waitForTimeout(400);
  const indice = fs.existsSync(path.join(SALIDA, 'indice.json')) ? JSON.parse(fs.readFileSync(path.join(SALIDA, 'indice.json'), 'utf8')) : {};
  for (const H of HOJAS) {
    const id = `${H.forma}-${H.accion}`;
    await p.evaluate(async ({ forma, accion, w }) => {
      const m = await import(new URL('js/mascota.js', document.baseURI).href);
      const lab = document.getElementById('lab');
      lab.style.width = w + 'px'; lab.className = forma;
      lab.style.boxSizing = 'border-box';
      // Aire alrededor del cuerpo para los saltos, los brazos arriba y las llamas (en px: los % irían contra la ventana)
      lab.style.padding = forma === 'cuerpo' ? `${Math.round(w * .13)}px ${Math.round(w * .05)}px ${Math.round(w * .09)}px` : '0';
      lab.innerHTML = m.mascotaHTML(accion === 'normal' ? 'normal' : accion, { cuerpo: forma === 'cuerpo' });
    }, H);
    await p.waitForTimeout(500); // logotipo del pecho y del casco cargados
    // Dónde queda el robot dentro del fotograma (para colocar la hoja exactamente encima del dibujo en vector)
    const caja = await p.evaluate(forma => {
      const l = document.querySelector(forma === 'cuerpo' ? '#lab' : '#lab .masc').getBoundingClientRect(), m = document.querySelector('#lab .masc').getBoundingClientRect();
      const r = v => +v.toFixed(5);
      return { x: r((m.left - l.left) / l.width), y: r((m.top - l.top) / l.height), w: r(m.width / l.width), h: r(m.height / l.height) };
    }, H.forma);
    const el = p.locator(H.forma === 'cuerpo' ? '#lab' : '#lab .masc');
    for (let i = 0; i < H.n; i++) {
      const pose = COREO[H.accion](i / H.n, H.forma);
      await p.evaluate(pz => {
        const m = document.querySelector('#lab .masc'), q = s => m.querySelectorAll(s);
        const pon = (sel, v) => q(sel).forEach(e => { e.style.transform = v == null ? '' : typeof v === 'number' ? `rotate(${v}deg)` : v; });
        m.dataset.estado = pz.estado || 'normal';
        pon('.m-todo', pz.todo); pon('.l-cabeza', pz.cabeza); pon('.l-ojos', pz.ojos);
        pon('.ojo-i', pz.ojoI); pon('.ojo-d', pz.ojoD);
        pon('.l-brazo-i', pz.brazoI); pon('.l-brazo-d', pz.brazoD);
        pon('.l-pierna-i', pz.piernaI); pon('.l-pierna-d', pz.piernaD);
        pon('.l-sombra', pz.sombra); q('.l-sombra').forEach(e => { e.style.opacity = pz.sombraO ?? ''; });
        pon('.l-llama', pz.llama); q('.l-llama').forEach(e => { e.style.opacity = pz.llama ? 1 : ''; });
        q('.l-puntos').forEach(e => { e.style.opacity = pz.puntos ?? ''; });
        q('.l-sigue-c').forEach(e => { e.style.transform = 'none'; });
      }, pose);
      await el.screenshot({ path: path.join(TMP, `${id}-${String(i).padStart(3, '0')}.png`), omitBackground: true });
    }
    execFileSync('python3', ['-I', '-c', `
from PIL import Image
import glob,os
W,N,C=${H.w},${H.n},${H.cols}
fs=sorted(glob.glob(r'${TMP}/${id}-*.png'))
a=Image.open(fs[0]); H=round(W*a.height/a.width)
open(r'${TMP}/alto.txt','w').write(str(H))
R=(N+C-1)//C
hoja=Image.new('RGBA',(W*C,H*R),(0,0,0,0))
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGBA').resize((W,H),Image.LANCZOS)
    hoja.paste(im,((i%C)*W,(i//C)*H))
hoja.save(r'${SALIDA}/${id}.webp','WEBP',quality=74,alpha_quality=85,method=6)
print('${id}',hoja.size,os.path.getsize(r'${SALIDA}/${id}.webp')//1024,'KB')
`], { stdio: 'inherit' });
    const alto = +fs.readFileSync(path.join(TMP, 'alto.txt'), 'utf8');
    indice[id] = { n: H.n, ms: H.ms, w: H.w, h: alto, cols: H.cols, filas: Math.ceil(H.n / H.cols), caja };
    fs.readdirSync(TMP).filter(f => f.startsWith(id + '-')).forEach(f => fs.unlinkSync(path.join(TMP, f)));
  }
  fs.writeFileSync(path.join(SALIDA, 'indice.json'), JSON.stringify(indice, null, 1) + '\n');
  // La web lee las medidas de aquí (lo escribe este script: no editar a mano)
  fs.writeFileSync(path.resolve(__dirname, '..', 'js', 'mascota-hojas.js'),
    '/* Hojas de fotogramas del robot (las genera scripts/generar-mascota.js: no editar a mano) */\nexport const HOJAS = ' + JSON.stringify(indice) + ';\n');
  await b.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})();
