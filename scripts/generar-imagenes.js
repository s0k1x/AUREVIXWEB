// Genera las imágenes de vista previa al compartir enlaces (1200×630) y los iconos de los atajos de la app.
// Uso (desde la raíz):  node scripts/generar-imagenes.js      Necesita playwright y ejecutar antes generar-iconos.py
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..'), I = path.join(RAIZ, 'icons');
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(I, f)).toString('base64');
const LOGO = b64('logo-a.png'), NOMBRE = b64('nombre.png');

const BASE = `
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0a0a0c;color:#f2f1ec;font-family:'Inter Display','Inter',system-ui,sans-serif;position:relative;overflow:hidden}
.glow{position:absolute;right:-120px;top:-80px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(120,170,30,.38),transparent 62%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(circle at 80% 30%,#000,transparent 70%);mask-image:radial-gradient(circle at 80% 30%,#000,transparent 70%)}
.marca{position:absolute;left:80px;top:62px;height:34px}
h1{position:absolute;left:80px;top:130px;width:590px;font-size:84px;line-height:.98;font-weight:800;letter-spacing:-.035em}
h1 em{font-style:normal;color:#c8f560}
p.sub{position:absolute;left:80px;top:415px;width:600px;font-size:30px;line-height:1.35;color:#a6a5a0}
.chips{position:absolute;left:80px;bottom:62px;display:flex;gap:14px}
.chip{padding:15px 24px;border-radius:99px;font-size:23px;font-weight:600;background:#141416;border:1px solid #2c2c30}
.chip.v{background:#c8f560;color:#0c0c0e;border-color:#c8f560}
.der{position:absolute;right:70px;top:90px;width:440px;height:450px}
.sello{position:absolute;right:56px;top:68px;width:150px;height:150px;border-radius:50%;background:#c8f560;color:#0c0c0e;display:grid;place-items:center;text-align:center;font-weight:800;line-height:1;transform:rotate(8deg);box-shadow:0 20px 50px rgba(0,0,0,.4)}
.sello small{display:block;font-size:20px;font-weight:700}.sello b{font-size:48px;letter-spacing:-.04em}
.tarjeta{position:absolute;border-radius:26px;background:#141416;border:1px solid #2c2c30;box-shadow:0 30px 70px rgba(0,0,0,.5)}
`;
const pagina = (cuerpo, extra = '') => `<style>${BASE}${extra}</style><body><div class="glow"></div><div class="grid"></div><img class="marca" src="${NOMBRE}">${cuerpo}</body>`;

const IMAGENES = {
  'og-trabaja.png': pagina(`
    <h1>Vende webs y <em>gana el 30 %</em>.</h1>
    <p class="sub">Remoto, sin horarios y sin inversión. Te damos tu enlace de ventas.</p>
    <div class="chips"><span class="chip v">Remoto</span><span class="chip">Sin inversión</span><span class="chip">15 € por vídeo</span></div>
    <div class="der">
      <div class="tarjeta" style="left:20px;top:70px;width:400px;height:150px;padding:28px 34px"><div style="color:#a6a5a0;font-size:22px">Tu comisión por venta</div><div style="font-size:78px;font-weight:800;letter-spacing:-.04em;color:#c8f560;margin-top:6px">30 %</div></div>
      <div class="tarjeta" style="left:60px;top:245px;width:380px;height:92px;padding:0 30px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:22px;font-weight:700;white-space:nowrap">Web de negocio</div><div style="color:#a6a5a0;font-size:19px">Venta cerrada</div></div><div style="font-size:30px;white-space:nowrap;font-weight:800;color:#c8f560">+104,70 €</div></div>
      <div class="tarjeta" style="left:0;top:355px;width:380px;height:92px;padding:0 30px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:24px;font-weight:700">Vídeo aprobado</div><div style="color:#a6a5a0;font-size:19px">Redes sociales</div></div><div style="font-size:34px;font-weight:800;color:#c8f560">+15 €</div></div>
    </div>`),
  'og-terminos.png': pagina(`
    <h1>Tus datos, <em>claros</em> y a salvo.</h1>
    <p class="sub">Términos, privacidad y cookies explicados sin letra pequeña.</p>
    <div class="chips"><span class="chip v">Privacidad</span><span class="chip">Cookies</span><span class="chip">Derechos</span></div>
    <div class="der"><div class="tarjeta" style="left:60px;top:40px;width:330px;height:400px;padding:34px">
      <div style="width:70px;height:84px;border-radius:20px 20px 36px 36px;background:#c8f560;margin-bottom:28px;display:grid;place-items:center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>
      <div style="height:16px;border-radius:8px;background:#2a2a2e;margin-bottom:16px;width:90%"></div><div style="height:16px;border-radius:8px;background:#2a2a2e;margin-bottom:16px;width:70%"></div><div style="height:16px;border-radius:8px;background:#2a2a2e;margin-bottom:16px;width:82%"></div><div style="height:16px;border-radius:8px;background:#2a2a2e;width:50%"></div>
    </div></div>`),
  'og-disenos.png': pagina(`
    <h1>Elige tu <em>diseño</em> de partida.</h1>
    <p class="sub">Seis estilos para empezar. Los adaptamos a tu marca.</p>
    <div class="chips"><span class="chip v">Negocio local</span><span class="chip">Tienda online</span><span class="chip">Profesional</span></div>
    <div class="der" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;right:60px;top:70px;height:480px">
      ${[['Filo', '#0e0c0a', '#c9a24a'], ['Brasa', '#f6efe4', '#d9482b'], ['Kiosko', '#ffffff', '#2f5bff'], ['Lienzo', '#f4f1ea', '#222222'], ['Calma', '#eef4ee', '#3d7a5c'], ['Pulso', '#0c0c0e', '#ff5a36']].map(([n, bg, ac]) => `
      <div class="tarjeta" style="position:relative;background:${bg};border-color:rgba(255,255,255,.12);padding:20px 20px"><div style="width:44px;height:8px;border-radius:4px;background:${ac};margin-bottom:14px"></div><div style="font-size:30px;font-weight:800;letter-spacing:-.03em;color:${/^#(0|1)/.test(bg) ? '#f2f1ec' : '#1a1a1a'}">${n}</div><div style="height:9px;border-radius:5px;background:${/^#(0|1)/.test(bg) ? '#2a2a2e' : '#d8d6cf'};margin-top:14px;width:80%"></div><div style="height:9px;border-radius:5px;background:${/^#(0|1)/.test(bg) ? '#2a2a2e' : '#d8d6cf'};margin-top:8px;width:55%"></div><div style="position:absolute;left:20px;bottom:18px;padding:7px 16px;border-radius:99px;background:${ac};width:70px;height:22px"></div></div>`).join('')}
    </div>`),
  'og-panel.png': pagina(`
    <h1>Tu proyecto, <em>paso a paso</em>.</h1>
    <p class="sub">Estado en vivo, chat con el equipo y tus archivos en un solo sitio.</p>
    <div class="chips"><span class="chip v">Seguimiento</span><span class="chip">Chat</span><span class="chip">Archivos</span></div>
    <div class="der">
      <div class="tarjeta" style="left:20px;top:50px;width:410px;height:370px;padding:30px">
        <div style="font-size:24px;font-weight:700;margin-bottom:22px">Web de negocio</div>
        ${[['Pedido', 1], ['Diseño', 1], ['Revisión', 0], ['Entrega', 0]].map(([t, h]) => `<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px"><div style="width:34px;height:34px;border-radius:50%;background:${h ? '#c8f560' : '#2a2a2e'};display:grid;place-items:center">${h ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>' : ''}</div><div style="font-size:23px;color:${h ? '#f2f1ec' : '#77767a'}">${t}</div></div>`).join('')}
        <div style="height:12px;border-radius:6px;background:#2a2a2e;margin-top:26px"><div style="height:100%;width:52%;border-radius:6px;background:#c8f560"></div></div>
      </div></div>`),
  'og-libreria.png': pagina(`
    <h1>Miles de <em>componentes</em>.</h1>
    <p class="sub">Botones, tarjetas, loaders, formularios… cada uno con su licencia.</p>
    <div class="chips"><span class="chip v">9.900 componentes</span><span class="chip">Con licencia</span></div>
    <div class="der" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;right:60px;top:80px;height:440px">
      <div class="tarjeta" style="position:relative;display:grid;place-items:center"><div style="padding:16px 34px;border-radius:99px;background:#c8f560;color:#0c0c0e;font-weight:800;font-size:24px">Botón</div></div>
      <div class="tarjeta" style="position:relative;display:grid;place-items:center"><div style="width:84px;height:84px;border-radius:50%;border:10px solid #2a2a2e;border-top-color:#c8f560"></div></div>
      <div class="tarjeta" style="position:relative;padding:24px"><div style="width:50px;height:50px;border-radius:14px;background:#c8f560;margin-bottom:16px"></div><div style="height:12px;border-radius:6px;background:#2a2a2e;width:85%;margin-bottom:10px"></div><div style="height:12px;border-radius:6px;background:#2a2a2e;width:60%"></div></div>
      <div class="tarjeta" style="position:relative;padding:24px;display:flex;flex-direction:column;justify-content:center;gap:14px"><div style="height:34px;border-radius:10px;background:#1d1d20;border:1px solid #34343a"></div><div style="height:34px;border-radius:10px;background:#c8f560"></div></div>
    </div>`),
};

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const [nombre, html] of Object.entries(IMAGENES)) {
    await p.setContent(`<!doctype html><meta charset="utf-8">${html}`); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(I, nombre) }); console.log(nombre);
  }
  // Atajos de la app (96 px)
  const G = JSON.parse(fs.readFileSync(path.join(__dirname, '.glifos.json'), 'utf8'));
  const c2 = await br.newContext({ viewport: { width: 96, height: 96 }, deviceScaleFactor: 1 });
  const q = await c2.newPage();
  for (const [n, g] of Object.entries(G)) {
    await q.setContent(`<style>*{margin:0}body{width:96px;height:96px;background:transparent}</style><svg width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#0c0c0e"/><g transform="translate(24 24) scale(2)" fill="none" stroke="#c8f560" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>`);
    await q.screenshot({ path: path.join(I, n + '.png'), omitBackground: true }); console.log(n);
  }
  await br.close();
  fs.unlinkSync(path.join(__dirname, '.glifos.json'));
})();
