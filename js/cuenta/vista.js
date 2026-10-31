/* ==========================================================
   VISTA PREVIA EN SU PROPIA PÁGINA (/vista-previa?p=…&v=…)
   La misma vista que en «Mis proyectos» y en el panel, a pantalla
   completa, para abrirla en otra pestaña o guardarla en favoritos.
   Hace falta entrar con la cuenta del cliente o del equipo: los
   archivos de la web son privados.
   ========================================================== */
import { fiesta } from '../asistente/mascota.js';
import * as store from '../base/store.js';
import { $, esc, icono, arrancar, pedirLogin, cargandoHTML, errorCargaHTML, toast } from '../base/ui.js';
import { montarVisor, enlaceVista } from './vistaweb.js';
import { aprobarWeb, pedirCambios, webCliente, estadoParaEtapa, conHistorial } from './proyecto.js';
import { confeti } from '../base/efectos.js';

await arrancar('vista');

const q = new URLSearchParams(location.search);
const raiz = $('#vista');
let quitar = () => {}, montado = '';

const aviso = (ic, titulo, texto, botones = '') => {
  quitar(); quitar = () => {}; montado = '';
  raiz.innerHTML = `<div class="vista-aviso card"><div class="em">${icono(ic)}</div><h1>${esc(titulo)}</h1><p class="muted">${esc(texto)}</p><div class="gate-btns">${botones}</div></div>`;
};

store.alCambiarUsuario(async u => {
  if (!u) {
    aviso('lock', 'Entra para ver la web', 'La vista previa es privada: solo la pueden ver el cliente y el equipo.', `<button class="btn btn-primary" id="vsLogin"><span>Iniciar sesión</span></button>`);
    $('#vsLogin').addEventListener('click', () => pedirLogin('Entra con la cuenta con la que hiciste el pedido.'));
    return;
  }
  if (montado === u.uid) return;
  raiz.innerHTML = cargandoHTML('Abriendo la vista previa…');
  const equipo = u.role !== 'client';
  let p;
  try { p = (equipo ? await store.todosLosPedidos() : await store.misPedidos()).find(x => x.id === q.get('p')); }
  catch (e) {
    raiz.innerHTML = `<div class="vista-aviso card">${errorCargaHTML(e.message, 'No se ha podido abrir')}</div>`;
    raiz.querySelector('[data-reintentar]')?.addEventListener('click', () => location.reload(), { once: true });
    return;
  }
  const volver = p ? (equipo ? `panel#pedido-${p.id}` : `./#proyecto-${p.id}`) : (equipo ? 'panel' : './#mis-pedidos');
  if (!p) return aviso('search', 'No encontramos esta web', 'Puede que el enlace no sea de tu cuenta o que el proyecto ya no exista.', `<a class="btn btn-primary" href="${volver}">Ir a mis proyectos</a>`);
  // El cliente solo ve la versión que le hemos enviado; el equipo, cualquiera
  const v = equipo ? (p.webs || []).find(w => w.id === q.get('v')) || webCliente(p) || (p.webs || []).at(-1) : webCliente(p);
  if (!v) return aviso('clock', 'Tu web aún no está lista', 'Te avisaremos en cuanto puedas verla.', `<a class="btn btn-primary" href="${volver}">Volver</a>`);
  if (v.id !== q.get('v')) history.replaceState(null, '', enlaceVista(p, v));
  document.title = `${p.respuestas?.negocio || 'Tu web'} · Vista previa · AurevixWeb`;

  const guardar = async (cambios, msg, hito) => {
    if (cambios.etapa) cambios.estado = estadoParaEtapa(cambios.etapa, p.estado);
    if (hito) cambios = conHistorial(p, cambios, hito, u.name);
    await store.actualizarPedido(p.id, cambios);
    Object.assign(p, cambios);
    toast(msg, 'ok');
  };
  quitar();
  montado = u.uid;
  quitar = montarVisor(raiz, {
    p, version: v, modo: equipo ? 'equipo' : 'cliente', pagina: q.get('pag') || '',
    enlace: (w, pag) => enlaceVista(p, w, pag),
    alCerrar: () => { location.href = volver; },
    alAprobar: async () => {
      await guardar(aprobarWeb(p), 'Web aprobada. Solo falta el pago final para publicarla.', `Versión ${v.n} aprobada`);
      confeti();
      fiesta('¡Web aprobada!', 'Solo falta el pago final para publicarla');
      setTimeout(() => { location.href = volver; }, 2600);
    },
    alCambios: async (_w, texto, pagina) => {
      await guardar(pedirCambios(p, texto, { pagina }), 'Cambios enviados. Te avisaremos cuando estén hechos.');
      setTimeout(() => { location.href = volver; }, 1200);
    }
  });
});
