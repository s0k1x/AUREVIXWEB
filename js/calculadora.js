/* ==========================================================
   CALCULADORA DE PRESUPUESTO (portada)
   Misma fórmula que el pedido: base + recargo urgente + extras únicos,
   los extras mensuales aparte. El botón abre el pedido con todo marcado.
   ========================================================== */
import { CONFIG } from '../config.js';
import { planesActivos, extrasActivos } from './sitio.js';
import { esc, euros, desgloseIVA, ivaTexto } from './ui.js';

export function montarCalculadora(raiz, { bienvenida = false } = {}) {
  const planes = planesActivos(), extras = extrasActivos();
  if (!planes.length) { raiz.closest('section')?.remove(); return; }
  const E = { plan: (planes.find(p => p.popular) || planes[0]).id, extras: new Set(), urgente: false, bv: false };

  raiz.innerHTML = `
    <div class="calc-form">
      <fieldset class="calc-g"><legend>Tipo de web</legend>
        <div class="calc-pills" role="radiogroup">${planes.map(p => `
          <label class="calc-pill"><input type="radio" name="calcPlan" value="${esc(p.id)}"${p.id === E.plan ? ' checked' : ''}><span><b>${esc(p.nombre)}</b><small>${euros(p.precio)}</small></span></label>`).join('')}
        </div>
      </fieldset>
      ${extras.length ? `<fieldset class="calc-g"><legend>Extras</legend>
        <div class="calc-extras">${extras.map(x => `
          <label class="calc-ck"><input type="checkbox" name="calcExtra" value="${esc(x.id)}"><span class="calc-mark" aria-hidden="true"></span><span class="calc-tx">${esc(x.nombre)}</span><b>${x.mensual ? `${euros(x.precio)}/mes` : euros(x.precio)}</b></label>`).join('')}
        </div></fieldset>` : ''}
      <div class="calc-opts">
        <label class="calc-ck"><input type="checkbox" id="calcUrg"><span class="calc-mark" aria-hidden="true"></span><span class="calc-tx">Entrega urgente <small>plazo en torno a un 40 % menor</small></span><b>+${Math.round(CONFIG.urgente * 100)} %</b></label>
        ${bienvenida ? `<label class="calc-ck"><input type="checkbox" id="calcBv"><span class="calc-mark" aria-hidden="true"></span><span class="calc-tx">Es mi primera web con vosotros <small>descuento de bienvenida</small></span><b>−${CONFIG.bienvenida.pct} %</b></label>` : ''}
      </div>
    </div>
    <aside class="calc-res" aria-live="polite">
      <p class="calc-etq">Total estimado</p>
      <p class="calc-total"><b id="calcTotal"></b><span id="calcMes"></span></p>
      <p class="calc-iva" id="calcIva"></p>
      <dl class="calc-lista">
        <div><dt>Señal al empezar (${CONFIG.senal} %)</dt><dd id="calcSenal"></dd></div>
        <div><dt>Resto a la entrega</dt><dd id="calcResto"></dd></div>
        <div><dt>Plazo estimado</dt><dd id="calcDias"></dd></div>
      </dl>
      <button type="button" class="btn btn-primary w100" id="calcBtn"><span>${CONFIG.aceptarPedidos ? 'Pedir esta web' : 'Apuntarme a la lista de espera'}</span></button>
      <p class="calc-nota">Precio final. Pago solo por transferencia. 14 días para desistir.</p>
    </aside>`;

  const $ = s => raiz.querySelector(s);
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
    const dias = Math.round(plan.dias * (E.urgente ? .6 : 1));
    const nuevo = euros(total), t = $('#calcTotal');
    if (t.textContent !== nuevo) { t.textContent = nuevo; t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
    $('#calcMes').textContent = mensual ? `+ ${euros(mensual)}/mes` : '';
    const iva = desgloseIVA(total);
    $('#calcIva').textContent = CONFIG.iva ? `${ivaTexto()} · base ${euros(iva.base)} + IVA ${iva.pct} % ${euros(iva.cuota)}` : ivaTexto();
    $('#calcSenal').textContent = euros(senal);
    $('#calcResto').textContent = euros(Math.round((total - senal) * 100) / 100);
    $('#calcDias').textContent = dias === 1 ? '1 día' : `${dias} días`;
  };
  raiz.addEventListener('change', e => {
    const n = e.target;
    if (n.name === 'calcPlan') E.plan = n.value;
    else if (n.name === 'calcExtra') n.checked ? E.extras.add(n.value) : E.extras.delete(n.value);
    else if (n.id === 'calcUrg') E.urgente = n.checked;
    else if (n.id === 'calcBv') E.bv = n.checked;
    pintar();
  });
  $('#calcBtn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('aurevix:pedir', { detail: { plan: E.plan, urgente: E.urgente, extras: [...E.extras] } }));
  });
  pintar();
}
