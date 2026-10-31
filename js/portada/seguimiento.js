/* ==========================================================
   SEGUIMIENTO PÚBLICO DEL PROYECTO (/seguimiento?t=…)
   Para que el cliente enseñe a su familia o a su socio cómo va su web,
   sin iniciar sesión. Solo el avance: negocio, tipo de web, etapa,
   fecha de cada etapa y entrega prevista. Nada de datos personales.
   ========================================================== */
import * as store from '../base/store.js';
import { $, esc, icono, arrancar, cargandoHTML, fecha } from '../base/ui.js';
import { ETAPAS, fechaEntrega } from '../cuenta/proyecto.js';

await arrancar('seguimiento');
const raiz = $('#seguimiento');
const token = new URLSearchParams(location.search).get('t') || '';
const aviso = (ic, t, d) => { raiz.innerHTML = `<div class="seg-aviso"><span class="seg-aviso-ic">${icono(ic)}</span><h1>${esc(t)}</h1><p class="lead">${esc(d)}</p><a class="btn btn-ghost" href="./">Ir a AurevixWeb</a></div>`; };

raiz.innerHTML = cargandoHTML('Cargando el seguimiento…');
let s = null;
try { s = await store.verSeguimiento(token); } catch (e) { console.warn(e); }
if (!s) aviso('search', 'No encontramos este seguimiento', 'Puede que el enlace esté incompleto o que el proyecto ya no esté activo. Pide a quien te lo envió que lo copie de nuevo.');
else {
  const actual = s.estado === 'entregado' ? 'publicada' : (s.etapa || 'recibido');
  const idx = Math.max(0, ETAPAS.findIndex(e => e.id === actual));
  const cuando = id => { const e = ETAPAS.find(x => x.id === id); const h = (s.hitos || []).filter(x => x.texto === `Etapa: ${e?.txt}`).pop(); return h?.t || null; };
  const entrega = fechaEntrega({ plan: s.plan, urgente: s.urgente, createdAt: s.createdAt, fechaEntrega: s.fechaEntrega });
  const hecha = actual === 'publicada';
  document.title = `${s.negocio || 'Tu web'} · Seguimiento · AurevixWeb`;
  raiz.innerHTML = `
    <header class="seg-cab">
      <h1>${esc(s.negocio || 'Una web en marcha')}</h1>
      <p class="lead">${esc(s.planNombre || 'Página web')} · ${hecha ? 'Publicada' : `Va por <b>${esc(ETAPAS[idx].txt)}</b>`}</p>
      <dl class="seg-datos">
        <div><dt>Empezó</dt><dd>${s.createdAt ? fecha(s.createdAt) : '—'}</dd></div>
        <div><dt>${hecha ? 'Entregada' : 'Entrega prevista'}</dt><dd>${hecha && cuando('publicada') ? fecha(cuando('publicada')) : fecha(entrega)}</dd></div>
        <div><dt>Avance</dt><dd>${Math.round((idx / (ETAPAS.length - 1)) * 100)} %</dd></div>
      </dl>
      <div class="seg-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${ETAPAS.length - 1}" aria-valuenow="${idx}" aria-label="Avance del proyecto"><i style="width:${(idx / (ETAPAS.length - 1)) * 100}%"></i></div>
    </header>
    <ol class="seg-etapas">${ETAPAS.map((e, i) => {
      const t = i <= idx ? cuando(e.id) : null;
      const est = i < idx || hecha ? 'hecha' : i === idx ? 'ahora' : 'luego';
      return `<li class="${est}"><span class="seg-ic">${icono(est === 'hecha' ? 'check' : e.icono)}</span><div><b>${esc(e.txt)}</b><small>${est === 'ahora' ? 'En curso' : est === 'hecha' ? (t ? fecha(t) : 'Hecho') : 'Pendiente'}</small></div></li>`;
    }).join('')}</ol>
    <p class="seg-pie">Seguimiento compartido por el cliente. Solo se ve el avance del proyecto.<br>¿Quieres una web así? <a href="./">Conoce AurevixWeb</a>.</p>`;
}
