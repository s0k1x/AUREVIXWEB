/* ==========================================================
   COLABORACIÓN EN CADA PROYECTO (cliente y equipo)
   - Mensajes: conversación del proyecto (en tiempo real con Supabase)
   - Archivos: fotos, logotipo y documentos (Supabase Storage)
   - Recibos: justificante imprimible de cada pago
   ========================================================== */
import { CONFIG } from '../config.js';
import * as store from './store.js';
import { $, $$, esc, euros, fecha, haceCuanto, icono, toast, ocupado, tamano, refPedido, avatar, PAGOS, METODOS, errorCarga, desgloseIVA } from './ui.js';

/* ==========================================================
   MENSAJES
   ========================================================== */
const RAPIDAS_EQUIPO = [
  'Hola, ¿cómo estás? Te escribo para ponerte al día de tu web.',
  'Ya hemos recibido el contenido. Empezamos con el diseño.',
  'La vista previa está lista. Ábrela en «Mis proyectos» y dinos qué te parece.',
  '¿Me confirmas el horario y la dirección exactos para ponerlos en la web?',
  'Hemos aplicado los cambios que nos pediste.',
  'Nos falta el logotipo en buena calidad. ¿Puedes subirlo en «Archivos»?',
  'Tu web ya está publicada. ¡Gracias por confiar en nosotros!'
];

const enlazar = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');

function burbuja(m, yo) {
  const mio = m.uid === yo;
  return `<div class="hm ${mio ? 'yo' : 'el'} ${m.rol === 'client' ? 'cli' : 'eq'}" data-mid="${esc(m.id)}">
    ${mio ? '' : avatar({ name: m.autor || '?' }, 'sm')}
    <div class="hm-b"><small>${mio ? 'Tú' : esc(m.autor || '')}${m.rol && m.rol !== 'client' && !mio ? ' · Equipo' : ''} · ${haceCuanto(m.createdAt)}</small><p>${enlazar(m.texto)}</p></div>
  </div>`;
}

/** Monta la conversación de un pedido dentro de «caja». Devuelve una función para desmontarla. */
export function montarHilo(caja, p, { equipo = false } = {}) {
  const u = store.usuarioActual();
  caja.innerHTML = `
    <div class="hilo">
      <div class="hilo-msgs" aria-live="polite"><div class="hilo-carga">${icono('message')} Cargando mensajes…</div></div>
      ${equipo ? `<details class="hilo-rapidas"><summary>${icono('reply')} Respuestas rápidas</summary><div>${RAPIDAS_EQUIPO.map(r => `<button type="button">${esc(r)}</button>`).join('')}</div></details>` : ''}
      <form class="hilo-form" autocomplete="off">
        <textarea rows="1" maxlength="2000" placeholder="${equipo ? 'Escribe al cliente…' : 'Escribe al equipo…'}" aria-label="Mensaje"></textarea>
        <button class="chat-send" aria-label="Enviar">${icono('send')}</button>
      </form>
      <p class="hilo-nota">${equipo ? 'El cliente recibe un aviso con cada mensaje.' : `El equipo recibe un aviso con cada mensaje. ${esc(CONFIG.respuesta)}.`}</p>
    </div>`;
  const msgs = $('.hilo-msgs', caja), form = $('.hilo-form', caja), ta = $('textarea', form);
  let lista = [];
  const pintar = () => {
    msgs.innerHTML = lista.length
      ? lista.map(m => burbuja(m, u.uid)).join('')
      : `<div class="hilo-vacio">${icono('message')}<b>Aún no hay mensajes</b><small>${equipo ? 'Escribe al cliente para ponerle al día.' : 'Escríbenos cualquier duda sobre tu web. Te contestamos aquí mismo.'}</small></div>`;
    msgs.scrollTop = msgs.scrollHeight;
  };
  const cargarMsgs = () => {
    msgs.innerHTML = `<div class="hilo-carga">${icono('message')} Cargando mensajes…</div>`;
    store.mensajesDe(p.id).then(L => { lista = L; pintar(); }).catch(e => errorCarga(msgs, e, cargarMsgs, 'No se han podido cargar los mensajes'));
  };
  cargarMsgs();
  const dejar = store.escucharMensajes(p.id, m => {
    if (lista.some(x => x.id === m.id)) return;
    lista.push(m); pintar();
  });
  // En el modo demo se refresca cada pocos segundos por si escribe la otra parte (otra pestaña)
  const intervalo = store.modoDemo ? setInterval(async () => {
    if (!caja.isConnected) return clearInterval(intervalo);
    const L = await store.mensajesDe(p.id).catch(() => lista);
    if (L.length !== lista.length) { lista = L; pintar(); }
  }, 5000) : 0;

  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(hover: hover)').matches) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = ta.value.trim();
    if (!texto) return;
    const b = $('button', form);
    ocupado(b, true);
    try {
      const m = await store.enviarMensaje(p.id, texto);
      if (!lista.some(x => x.id === m.id)) lista.push(m);
      ta.value = ''; ta.style.height = '';
      pintar();
    } catch (err) { toast(err.message, 'err'); }
    ocupado(b, false);
  });
  $('.hilo-rapidas', caja)?.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    ta.value = b.textContent; ta.focus(); ta.dispatchEvent(new Event('input'));
    $('.hilo-rapidas', caja).open = false;
  });
  return () => { dejar(); clearInterval(intervalo); };
}

/* ==========================================================
   ARCHIVOS
   ========================================================== */
const esImagen = a => /^image\//.test(a.tipo) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(a.nombre);

export function montarArchivos(caja, p, { equipo = false } = {}) {
  caja.innerHTML = `
    <div class="arch">
      <label class="arch-drop">
        <input type="file" multiple hidden>
        <span class="arch-ic">${icono('upload')}</span>
        <b>Sube fotos, logotipo o documentos</b>
        <small>Pulsa o arrastra aquí los archivos · hasta 25 MB cada uno</small>
      </label>
      <div class="arch-prog" hidden><i></i><span></span></div>
      <div class="arch-list"><div class="hilo-carga">${icono('folder')} Cargando archivos…</div></div>
    </div>`;
  const lista = $('.arch-list', caja), input = $('input', caja), drop = $('.arch-drop', caja), prog = $('.arch-prog', caja);

  async function pintar() {
    let L = [];
    try { L = await store.listarArchivos(p.id); }
    catch (e) { errorCarga(lista, e, () => { lista.innerHTML = `<div class="hilo-carga">${icono('folder')} Cargando archivos…</div>`; pintar(); }, 'No se han podido cargar los archivos'); return; }
    if (!L.length) {
      lista.innerHTML = `<div class="hilo-vacio">${icono('image')}<b>No hay archivos todavía</b><small>${equipo ? 'Cuando el cliente suba archivos aparecerán aquí.' : 'Sube aquí las fotos de tu negocio, tu logotipo o cualquier documento que necesitemos.'}</small></div>`;
      return;
    }
    lista.innerHTML = `<div class="arch-grid">${L.map((a, i) => `
      <div class="arch-it" data-i="${i}">
        <div class="arch-th">${esImagen(a) ? `<img alt="" loading="lazy" data-src-i="${i}">` : icono('file')}</div>
        <div class="arch-tx"><b title="${esc(a.nombre)}">${esc(a.nombre)}</b><small>${tamano(a.tam)} · ${fecha(a.t)}</small></div>
        <div class="arch-btns">
          <button type="button" class="icon-btn sm" data-abrir="${i}" aria-label="Abrir">${icono('external')}</button>
          <button type="button" class="icon-btn sm" data-borrar="${i}" aria-label="Borrar">${icono('trash')}</button>
        </div>
      </div>`).join('')}</div>`;
    // Miniaturas (enlaces temporales y privados)
    $$('img[data-src-i]', lista).forEach(async img => {
      try { img.src = await store.urlArchivo(L[+img.dataset.srcI]); } catch { /* sin vista previa */ }
    });
    lista.onclick = async e => {
      const ab = e.target.closest('[data-abrir]'), bo = e.target.closest('[data-borrar]');
      if (ab) {
        try { const url = await store.urlArchivo(L[+ab.dataset.abrir]); window.open(url, '_blank', 'noopener'); }
        catch (err) { toast(err.message, 'err'); }
      }
      if (bo) {
        const a = L[+bo.dataset.borrar];
        if (!confirm(`¿Borrar «${a.nombre}»?`)) return;
        try { await store.borrarArchivo(a); toast('Archivo borrado'); pintar(); }
        catch (err) { toast(err.message, 'err'); }
      }
    };
  }

  async function subir(files) {
    files = [...files];
    if (!files.length) return;
    prog.hidden = false;
    let hechos = 0, fallos = 0;
    for (const f of files) {
      $('span', prog).textContent = `Subiendo ${hechos + 1} de ${files.length}: ${f.name}`;
      $('i', prog).style.width = `${(hechos / files.length) * 100}%`;
      try { await store.subirArchivo(p.id, f); }
      catch (err) { fallos++; toast(err.message, 'err'); }
      hechos++;
    }
    $('i', prog).style.width = '100%';
    setTimeout(() => (prog.hidden = true), 600);
    if (hechos - fallos) {
      toast(`${hechos - fallos} archivo${hechos - fallos === 1 ? '' : 's'} subido${hechos - fallos === 1 ? '' : 's'}`, 'ok');
      // Aviso a la otra parte con un mensaje en la conversación
      store.enviarMensaje(p.id, `${equipo ? 'Hemos subido' : 'He subido'} ${hechos - fallos} archivo${hechos - fallos === 1 ? '' : 's'} en «Archivos».`).catch(() => {});
    }
    input.value = '';
    pintar();
  }
  input.addEventListener('change', () => subir(input.files));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => subir(e.dataTransfer.files));
  pintar();
}

/** Todos los archivos del proyecto en un .zip (fotos, logotipo, documentos) */
export async function descargarArchivosCliente(p, btn) {
  ocupado(btn, true);
  try {
    const L = await store.listarArchivos(p.id);
    if (!L.length) { toast('El cliente todavía no ha subido archivos'); return; }
    const { crearZip } = await import('./zip.js');
    const usados = new Set(), archivos = [];
    for (const a of L) {
      let nombre = a.nombre, k = 1;
      while (usados.has(nombre)) nombre = a.nombre.replace(/(\.[^.]+)?$/, m => `-${++k}${m}`);
      usados.add(nombre);
      const r = await fetch(await store.urlArchivo(a));
      if (!r.ok) throw new Error(`No se ha podido descargar «${a.nombre}»`);
      archivos.push({ nombre, datos: await r.arrayBuffer() });
    }
    const url = URL.createObjectURL(new Blob([crearZip(archivos)], { type: 'application/zip' }));
    const el = Object.assign(document.createElement('a'), { href: url, download: `archivos-${refPedido(p.id).slice(1)}.zip` });
    document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`${archivos.length} archivo${archivos.length === 1 ? '' : 's'} descargado${archivos.length === 1 ? '' : 's'}`, 'ok');
  } catch (e) { toast(e.message, 'err'); }
  finally { ocupado(btn, false); }
}

/* ==========================================================
   RECIBOS DE PAGO (se abren listos para imprimir o guardar en PDF)
   ========================================================== */
export async function abrirRecibo(p, fase) {
  const senal = Math.round((p.total || 0) * CONFIG.senal) / 100;
  const importe = fase === 'senal' ? senal : fase === 'resto' ? (p.total || 0) - senal : p.total || 0;
  const concepto = fase === 'senal' ? `Señal (${CONFIG.senal} %)` : fase === 'resto' ? 'Pago final' : 'Total del proyecto';
  let fact = {};
  try { if (store.usuarioActual()?.uid === p.uid) fact = await store.leerPrivado(); } catch { /* sin datos de facturación */ }
  const L = CONFIG.legal || {};
  const num = `${new Date(p.createdAt).getFullYear()}-${refPedido(p.id).slice(1)}${fase === 'resto' ? '-2' : fase === 'senal' ? '-1' : ''}`;
  const filas = [
    [p.planNombre, p.precioBase],
    ...(p.extras || []).map(x => [x.nombre + (x.mensual ? ' (cuota mensual, aparte)' : ''), x.mensual ? 0 : x.precio]),
    ...(p.urgente ? [['Entrega urgente', (p.total || 0) - (p.precioBase || 0) - (p.extras || []).filter(x => !x.mensual).reduce((s, x) => s + x.precio, 0) + (p.descuento || 0)]] : []),
    ...(p.descuento ? [[`Descuento ${p.cupon ? '(' + p.cupon + ')' : ''}`, -p.descuento]] : [])
  ];
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${num} · ${esc(CONFIG.marca)}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#16161b;background:#f3f2ee;padding:24px}
    .doc{max-width:760px;margin:0 auto;background:#fff;border-radius:16px;padding:44px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
    header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #16161b;padding-bottom:20px;margin-bottom:26px}
    header img{height:22px;margin-top:8px}.logo{display:flex;align-items:center;gap:10px}.logo img:first-child{height:44px;margin:0}
    h1{font-size:26px;letter-spacing:-.02em}.meta{text-align:right;font-size:13.5px;color:#55534c}
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:26px;font-size:14px}.cols small{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#86837c;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:14.5px}th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:#86837c;border-bottom:1px solid #ddd;padding:8px 0}
    td{padding:10px 0;border-bottom:1px solid #eee}td:last-child,th:last-child{text-align:right}
    .tot{margin-top:18px;display:grid;gap:6px;justify-content:end;font-size:14.5px}.tot div{display:flex;gap:40px;justify-content:space-between}
    .tot .big{font-size:20px;font-weight:700;border-top:2px solid #16161b;padding-top:8px;margin-top:4px}
    .estado{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:99px;background:#eaf7d2;color:#3d6a0a;font-weight:700;font-size:12px}
    .estado.no{background:#fdf0d5;color:#8a5a00}
    footer{margin-top:34px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#86837c}
    .acc{max-width:760px;margin:0 auto 16px;display:flex;gap:10px;justify-content:flex-end}
    .acc button{font:600 14px system-ui;padding:10px 18px;border-radius:99px;border:0;background:#16161b;color:#fff;cursor:pointer}
    @media print{body{background:#fff;padding:0}.doc{box-shadow:none;padding:0}.acc{display:none}}
    @media (max-width:600px){.doc{padding:24px}.cols{grid-template-columns:1fr}header{flex-direction:column}.meta{text-align:left}}
  </style></head><body>
  <div class="acc"><button onclick="print()">Imprimir o guardar en PDF</button></div>
  <div class="doc">
    <header>
      <div class="logo"><img src="${new URL('icons/logo-a.png', location.href)}" alt=""><img src="${new URL('icons/nombre-oscuro.png', location.href)}" alt="${esc(CONFIG.marca)}"></div>
      <div class="meta"><h1>Recibo</h1>Nº ${esc(num)}<br>Pedido ${refPedido(p.id)}<br>${fecha(Date.now())}</div>
    </header>
    <div class="cols">
      <div><small>Emitido por</small><b>${esc(L.titular || CONFIG.marca)}</b><br>${esc(L.nif ? 'NIF ' + L.nif : '')}<br>${esc(L.domicilio || '')}<br>${esc(CONFIG.email)}</div>
      <div><small>Cliente</small><b>${esc(fact.razon || p.clienteNombre)}</b><br>${esc(fact.nif ? 'NIF ' + fact.nif : '')}<br>${esc([fact.direccion, fact.cp, fact.ciudad].filter(Boolean).join(', '))}<br>${esc(fact.emailFact || p.clienteEmail || '')}</div>
    </div>
    <table><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody>
      ${filas.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${euros(v || 0)}</td></tr>`).join('')}
    </tbody></table>
    <div class="tot">
      ${(p.iva ?? CONFIG.iva) ? (iv => `<div><span>Base imponible</span><span>${euros(iv.base)}</span></div><div><span>IVA (${iv.pct} %)</span><span>${euros(iv.cuota)}</span></div>`)(desgloseIVA(p.total || 0)) : ''}
      <div><span>Total del proyecto${(p.iva ?? CONFIG.iva) ? ' (IVA incluido)' : ''}</span><b>${euros(p.total || 0)}</b></div>
      ${fase ? `<div class="big"><span>${concepto}</span><span>${euros(importe)}</span></div>` : ''}
      <div><span>Estado</span><span class="estado ${p.pagoEstado === 'pagado' || (fase === 'senal' && p.pagoEstado === 'senal') ? '' : 'no'}">${esc((PAGOS[p.pagoEstado || 'pendiente'] || PAGOS.pendiente).txt)}</span></div>
      ${p.pagoMetodo ? `<div><span>Forma de pago</span><span>${esc(METODOS[p.pagoMetodo] || p.pagoMetodo)}</span></div>` : ''}
    </div>
    <footer>Este documento es un justificante del pago de tu proyecto «${esc(p.respuestas?.negocio || p.planNombre)}» y <b>no sustituye a la factura</b>, que te enviamos por cada pago. Para que salga a nombre de tu empresa, revisa tus datos en «Ajustes → Facturación». Condiciones de contratación, derecho de desistimiento (14 días) y política de privacidad: ${esc(location.origin)}/terminos-y-privacidad. Consultas: ${esc(CONFIG.legal?.email || CONFIG.email)}.<br>© ${new Date().getFullYear()} ${esc(CONFIG.marca)}. Todos los derechos reservados.</footer>
  </div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `recibo-${num}.html`; a.click();
    return;
  }
  w.document.open(); w.document.write(html); w.document.close();
}
