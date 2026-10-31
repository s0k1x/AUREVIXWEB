// ==========================================================
//  REVISA TU WEB · función de Supabase
//  La web (js/portada/revisa.js) manda aquí la dirección y esta función la mide
//  con Google PageSpeed Insights usando la clave de la API, que solo vive en
//  Supabase (Edge Functions → Secrets → PAGESPEED_KEY). Así la clave nunca se ve
//  en la web y el cupo de revisiones es propio (sin clave, Google lo comparte).
//  Devuelve solo lo que pinta la página (puntuaciones, métricas y qué mejorar),
//  no el informe entero (más de 1 MB). Las revisiones se guardan 30 minutos en
//  memoria para no gastar cupo dos veces en la misma web.
// ==========================================================
const CLAVE = Deno.env.get('PAGESPEED_KEY') || '';
const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIAS = ['performance', 'seo', 'accessibility', 'best-practices'];
const ORIGENES = ['https://aurevixweb.es', 'https://www.aurevixweb.es'];
const GUARDA = 30 * 60e3;
const memoria = new Map<string, { t: number; datos: unknown }>();

const permitido = (o: string | null) => !!o && (ORIGENES.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
const cabeceras = (origen: string | null) => ({
  'Access-Control-Allow-Origin': permitido(origen) ? origen! : ORIGENES[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Content-Type': 'application/json',
  Vary: 'Origin'
});
const json = (d: unknown, status: number, h: Record<string, string>) => new Response(JSON.stringify(d), { status, headers: h });

/** Solo direcciones públicas de verdad (nada de redes internas) */
function urlValida(texto: unknown) {
  if (typeof texto !== 'string' || texto.length > 300) return null;
  try {
    const u = new URL(texto);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)|\.local$|\.internal$/i.test(u.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}

/** Lo justo para la página: categorías (con sus auditorías) y, de cada auditoría, lo que se enseña */
function recortar(lh: any) {
  const audits: Record<string, unknown> = {};
  for (const [id, a] of Object.entries<any>(lh.audits || {})) {
    audits[id] = { id, title: a.title, score: a.score, scoreDisplayMode: a.scoreDisplayMode, displayValue: a.displayValue,
      details: a.details ? { type: a.details.type, overallSavingsMs: a.details.overallSavingsMs } : undefined };
  }
  const categories: Record<string, unknown> = {};
  for (const [k, c] of Object.entries<any>(lh.categories || {})) {
    categories[k] = { score: c.score, auditRefs: (c.auditRefs || []).map((r: any) => ({ id: r.id, weight: r.weight })) };
  }
  return { lighthouseResult: { categories, audits, finalDisplayedUrl: lh.finalDisplayedUrl } };
}

Deno.serve(async req => {
  const origen = req.headers.get('origin');
  const h = cabeceras(origen);
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405, h);
  if (!permitido(origen)) return json({ error: 'Solo desde aurevixweb.es' }, 403, h);
  let url: string | null = null;
  try { url = urlValida((await req.json())?.url); } catch { /* sin cuerpo */ }
  if (!url) return json({ error: 'Dirección no válida' }, 400, h);

  const guardada = memoria.get(url);
  if (guardada && Date.now() - guardada.t < GUARDA) return json(guardada.datos, 200, h);

  const pedir = (conClave: boolean) => {
    const q = new URLSearchParams({ url, strategy: 'mobile', locale: 'es' });
    CATEGORIAS.forEach(c => q.append('category', c));
    if (conClave && CLAVE) q.set('key', CLAVE);
    // Se presenta como aurevixweb.es: así vale también una clave restringida a «Sitios web» (aurevixweb.es/*)
    return fetch(`${API}?${q}`, { headers: { Referer: 'https://aurevixweb.es/' }, signal: AbortSignal.timeout(75000) });
  };
  let r: Response | null = null, conClave = !!CLAVE;
  for (const pausa of [0, 3000]) {
    if (pausa) await new Promise(ok => setTimeout(ok, pausa));
    try { r = await pedir(conClave); } catch (e) { console.warn('PageSpeed sin respuesta', String(e)); r = null; continue; }
    // Clave mal restringida o no válida: se avisa en los registros y se mide sin ella (con el cupo compartido)
    if (conClave && (r.status === 403 || r.status === 400)) {
      console.warn('La clave PAGESPEED_KEY no vale (', r.status, '): revisa sus restricciones en Google Cloud. Se mide sin clave.');
      conClave = false;
      try { r = await pedir(false); } catch { r = null; continue; }
    }
    if (r.status !== 429) break;
  }
  if (!r) return json({ error: 'Google no responde ahora mismo' }, 504, h);
  if (r.status === 429) return json({ error: 'Demasiadas revisiones', sinClave: !CLAVE }, 429, h);
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.lighthouseResult) {
    console.warn('PageSpeed no ha podido medir', r.status, JSON.stringify(j?.error || '').slice(0, 300));
    return json({ error: 'No se ha podido medir esa web' }, 422, h);
  }
  const datos = recortar(j.lighthouseResult);
  memoria.set(url, { t: Date.now(), datos });
  if (memoria.size > 200) memoria.delete(memoria.keys().next().value!);
  return json(datos, 200, h);
});
