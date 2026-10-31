/* Las vistas previas (iframes con srcdoc) son documentos aparte: sin esto, el doble toque o el pellizco
   dentro de ellas hace zoom a toda la página en el iPhone. */
const SIN_ZOOM = '<style>html{touch-action:manipulation;-webkit-tap-highlight-color:transparent}</style>'
  + '<script>addEventListener("gesturestart",function(e){e.preventDefault()},{passive:false})</script>';

export const conSinZoom = html => {
  const h = String(html ?? '');
  return /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, m => m + SIN_ZOOM) : SIN_ZOOM + h;
};
