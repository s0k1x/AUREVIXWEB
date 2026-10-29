/* ==========================================================
   CALCULADORA DE PRESUPUESTO (portada)
   Se monta como un ticket que se va escribiendo:
   - Tipo de web: al elegirlo se ve qué incluye y su plazo.
   - Extras: interruptores con lo que hace cada uno.
   - ¿Para cuándo?: normal o urgente, con la fecha real de entrega.
   - El ticket añade y quita líneas, el total cuenta hasta el nuevo
     importe y la barra enseña lo que se paga hoy y a la entrega.
   - En el móvil, una barra fija con el total mientras eliges.
   Misma fórmula que el pedido (y que el servidor): base + recargo
   urgente + extras únicos; los mensuales van aparte. El botón abre
   el pedido con todo marcado.
   ========================================================== */
import { CONFIG } from '../config.js';
import { planesActivos, extrasActivos } from './sitio.js';
import { esc, euros, desgloseIVA, ivaTexto, icono } from './ui.js';
import { IDIOMA } from './idioma.js';

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'reducido';
const LOCALE = IDIOMA === 'en' ? 'en-GB' : 'es-ES';
const diaMes = d => d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
const entregaEn = dias => { const d = new Date(); d.setDate(d.getDate() + dias); return d; };

export function montarCalculadora(raiz, { bienvenida = false } = {}) {
  const planes = planesActivos(), extras = extrasActivos();
  if (!planes.length) { raiz.closest('section')?.remove(); return; }
  const E = { plan: (planes.find(p => p.popular) || planes[0]).id, extras: new Set(), urgente: false, bv: false };
  const urg = Math.round(CONFIG.urgente * 100);
  const formas = CONFIG.pagos?.bizum ? 'Bizum o transferencia' : 'Transferencia bancaria';

  raiz.innerHTML = `
    <div class="calc-form">
      <fieldset class="calc-g"><legend><span class="calc-n">1</span>Tipo de web</legend>
        <div class="calc-planes" role="radiogroup" aria-label="Tipo de web">${planes.map(p => `
          <label class="calc-plan"><input type="radio" name="calcPlan" value="${esc(p.id)}"${p.id === E.plan ? ' checked' : ''}>
            <span class="cp-in"><span class="cp-ic">${icono(p.icono || 'laptop')}</span><b>${esc(p.nombre)}</b><span class="cp-pr">${euros(p.precio)}</span><small>${esc(p.entrega || '')}</small></span>
          </label>`).join('')}
        </div>
        <div class="calc-detalle" id="calcDetalle" aria-live="polite"></div>
      </fieldset>
      ${extras.length ? `<fieldset class="calc-g"><legend><span class="calc-n">2</span>Extras <small>opcionales</small></legend>
        <div class="calc-extras">${extras.map(x => `
          <label class="calc-sw"><input type="checkbox" role="switch" name="calcExtra" value="${esc(x.id)}">
            <span class="sw-tx"><b>${esc(x.nombre)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</span>
            <span class="sw-pr">${x.mensual ? `${euros(x.precio)}/mes` : `+${euros(x.precio)}`}</span>
            <span class="sw-ui" aria-hidden="true"><i></i></span>
          </label>`).join('')}
        </div></fieldset>` : ''}
      <fieldset class="calc-g"><legend><span class="calc-n">${extras.length ? 3 : 2}</span>¿Para cuándo la necesitas?</legend>
        <div class="calc-plazo" role="radiogroup" aria-label="Plazo de entrega">
          <i class="cpz-pastilla" aria-hidden="true"></i>
          <label><input type="radio" name="calcPlazo" value="normal" checked><span><b>Plazo normal</b><small id="calcFechaN"></small></span></label>
          <label><input type="radio" name="calcPlazo" value="urgente"><span><b>Urgente <em>+${urg} %</em></b><small id="calcFechaU"></small></span></label>
        </div>
        ${bienvenida ? `<label class="calc-sw calc-bv"><input type="checkbox" role="switch" id="calcBv">
          <span class="sw-tx"><b>Es mi primera web con vosotros</b><small>Descuento de bienvenida en tu primer pedido</small></span>
          <span class="sw-pr">−${CONFIG.bienvenida.pct} %</span>
          <span class="sw-ui" aria-hidden="true"><i></i></span>
        </label>` : ''}
      </fieldset>
      <div class="calc-barra" id="calcBarra">
        <span><small>Total</small><b id="calcBarraTotal"></b></span>
        <a href="#calcRes" class="btn btn-primary btn-sm">Ver presupuesto</a>
      </div>
    </div>
    <aside class="calc-res" id="calcRes" aria-labelledby="calcResT">
      <div class="calc-ticket">
        <p class="calc-etq" id="calcResT">Tu presupuesto</p>
        <ul class="calc-lineas" id="calcLineas"></ul>
        <div class="calc-total">
          <span>Total</span>
          <b id="calcTotal" aria-live="polite"></b>
        </div>
        <p class="calc-mes" id="calcMes"></p>
        <p class="calc-iva" id="calcIva"></p>
      </div>
      <div class="calc-pago">
        <div class="cpg-barra" aria-hidden="true"><i id="calcBarSenal"></i></div>
        <div class="cpg-filas">
          <div><small>Hoy, para empezar (${CONFIG.senal} %)</small><b id="calcSenal"></b></div>
          <div><small>Al entregarte la web</small><b id="calcResto"></b></div>
        </div>
        <p class="cpg-fecha">${icono('calendar')}<span>Entrega estimada: <b id="calcFecha"></b></span></p>
      </div>
      <button type="button" class="btn btn-primary w100" id="calcBtn"><span>${CONFIG.aceptarPedidos ? 'Pedir esta web' : 'Apuntarme a la lista de espera'}</span></button>
      <p class="calc-nota">Precio final. ${formas}. 14 días para desistir.</p>
    </aside>`;

  const $ = s => raiz.querySelector(s);
  const lineas = $('#calcLineas');

  /* El ticket: se añaden y quitan líneas con su animación, sin rehacer las que siguen */
  const pintarLineas = filas => {
    const vivas = new Map([...lineas.children].filter(li => !li.classList.contains('sale')).map(li => [li.dataset.k, li]));
    let antes = null;
    for (const f of filas) {
      let li = vivas.get(f.k);
      if (li) {
        vivas.delete(f.k);
        li.querySelector('span').textContent = f.t;
        li.querySelector('b').textContent = f.v;
      } else {
        li = document.createElement('li');
        li.dataset.k = f.k;
        if (f.cls) li.className = f.cls;
        li.innerHTML = `<span>${esc(f.t)}</span><b>${esc(f.v)}</b>`;
        if (!quieto()) li.classList.add('entra');
        antes ? antes.after(li) : lineas.prepend(li);
        if (!quieto()) requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('entra')));
      }
      antes = li;
    }
    vivas.forEach(li => {
      if (quieto()) return li.remove();
      li.classList.add('sale');
      li.addEventListener('transitionend', () => li.remove(), { once: true });
      setTimeout(() => li.remove(), 400);
    });
  };

  /* El total cuenta hasta el importe nuevo (rápido: 380 ms) */
  let mostrado = null, anim = 0;
  const contar = (el, destino) => {
    cancelAnimationFrame(anim);
    if (mostrado === null || quieto()) { mostrado = destino; el.textContent = euros(destino); return; }
    const desde = mostrado, t0 = performance.now(), dur = 380;
    const paso = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      mostrado = desde + (destino - desde) * e;
      el.textContent = euros(k < 1 ? Math.round(mostrado) : destino);
      if (k < 1) anim = requestAnimationFrame(paso); else mostrado = destino;
    };
    anim = requestAnimationFrame(paso);
  };

  const pintar = () => {
    const plan = planes.find(p => p.id === E.plan) || planes[0];
    const sel = extras.filter(x => E.extras.has(x.id));
    const base = plan.precio, rec = E.urgente ? base * CONFIG.urgente : 0;
    const unico = sel.filter(x => !x.mensual).reduce((s, x) => s + x.precio, 0);
    const mensual = sel.filter(x => x.mensual).reduce((s, x) => s + x.precio, 0);
    const bruto = base + rec + unico;
    const dto = E.bv ? Math.round(bruto * CONFIG.bienvenida.pct) / 100 : 0;
    const total = Math.round((bruto - dto) * 100) / 100;
    const senal = Math.round(total * CONFIG.senal) / 100;
    const diasN = plan.dias || 14, diasU = Math.round(diasN * .6);

    pintarLineas([
      { k: 'plan', t: plan.nombre, v: euros(base) },
      ...sel.filter(x => !x.mensual).map(x => ({ k: 'x-' + x.id, t: x.nombre, v: '+' + euros(x.precio) })),
      ...(rec ? [{ k: 'urg', t: `Entrega urgente (+${urg} %)`, v: '+' + euros(rec) }] : []),
      ...(dto ? [{ k: 'bv', t: `Bienvenida (−${CONFIG.bienvenida.pct} %)`, v: '−' + euros(dto), cls: 'dto' }] : [])
    ]);
    contar($('#calcTotal'), total);
    $('#calcBarraTotal').textContent = euros(total);
    $('#calcMes').textContent = mensual ? `+ ${euros(mensual)}/mes de mantenimiento` : '';
    const iva = desgloseIVA(total);
    $('#calcIva').textContent = CONFIG.iva ? `${ivaTexto()} · base ${euros(iva.base)} + IVA ${iva.pct} % ${euros(iva.cuota)}` : ivaTexto();
    $('#calcSenal').textContent = euros(senal);
    $('#calcResto').textContent = euros(Math.round((total - senal) * 100) / 100);
    $('#calcBarSenal').style.setProperty('--p', `${CONFIG.senal}%`);
    $('#calcFechaN').textContent = `Hacia el ${diaMes(entregaEn(diasN))}`;
    $('#calcFechaU').textContent = `Hacia el ${diaMes(entregaEn(diasU))}`;
    $('#calcFecha').textContent = diaMes(entregaEn(E.urgente ? diasU : diasN));
    raiz.querySelector('.calc-plazo').dataset.v = E.urgente ? 'urgente' : 'normal';
  };

  /* Qué incluye el tipo de web elegido (cambia con un fundido corto) */
  const pintarDetalle = () => {
    const p = planes.find(x => x.id === E.plan) || planes[0];
    const d = $('#calcDetalle');
    const html = `<p>${esc(p.desc || '')}</p>${p.incluye?.length ? `<ul>${p.incluye.map(i => `<li>${icono('check')}<span>${esc(i)}</span></li>`).join('')}</ul>` : ''}`;
    if (quieto() || !d.innerHTML) { d.innerHTML = html; return; }
    d.classList.add('cambia');
    setTimeout(() => { d.innerHTML = html; d.classList.remove('cambia'); }, 140);
  };

  raiz.addEventListener('change', e => {
    const n = e.target;
    if (n.name === 'calcPlan') { E.plan = n.value; pintarDetalle(); }
    else if (n.name === 'calcExtra') n.checked ? E.extras.add(n.value) : E.extras.delete(n.value);
    else if (n.name === 'calcPlazo') E.urgente = n.value === 'urgente';
    else if (n.id === 'calcBv') E.bv = n.checked;
    pintar();
  });
  $('#calcBtn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('aurevix:pedir', { detail: { plan: E.plan, urgente: E.urgente, extras: [...E.extras] } }));
  });
  $('.calc-barra a').addEventListener('click', e => {
    e.preventDefault();
    $('#calcRes').scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' });
  });
  // La barra del móvil solo mientras se ve el formulario y aún no el ticket
  // (mientras está, el botón del chat se aparta para no taparla)
  if ('IntersectionObserver' in window) {
    const barra = $('#calcBarra'), vis = { form: false, res: false };
    const toca = () => {
      const on = vis.form && !vis.res;
      barra.classList.toggle('oculta', !on);
      document.documentElement.classList.toggle('con-calc', on && matchMedia('(max-width:960px)').matches);
    };
    new IntersectionObserver(es => { es.forEach(x => { vis[x.target === $('#calcRes') ? 'res' : 'form'] = x.isIntersecting; }); toca(); }, { rootMargin: '0px 0px -30% 0px' })
      .observe($('#calcRes'));
    new IntersectionObserver(es => { vis.form = es[0].isIntersecting; toca(); }).observe($('.calc-form'));
  }
  pintarDetalle();
  pintar();
}
