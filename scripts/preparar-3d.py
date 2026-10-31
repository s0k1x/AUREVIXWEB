#!/usr/bin/env python3
"""
Prepara las imágenes 3D de la portada a partir de una lámina (portátil en 4 pasos, móviles, personas y objetos
sobre fondo gris liso). Recorta cada pieza, la sube de tamaño, la guarda en img/3d/*.webp con transparencia y escribe
js/portada/escena-datos.js con dónde está la pantalla de cada portátil/móvil/persona (para poner la web encima).

Uso:  python3 scripts/preparar-3d.py ruta/a/la-lamina.png
Si cambias las imágenes por otras de más resolución, vuelve a pasar el script: las posiciones se recalculan solas.
Necesita: pip install rembg onnxruntime scipy pillow numpy
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
from rembg import remove, new_session

RAIZ = Path(__file__).resolve().parent.parent
SAL = RAIZ / 'img' / '3d'; SAL.mkdir(parents=True, exist_ok=True)
hoja = Path(sys.argv[1]); im = Image.open(hoja).convert('RGB'); A = np.array(im).astype(int)
sesion = new_session('isnet-general-use')
# (x0, y0, x1, y1, modo) en la lámina de 1536x1024: d = por diferencia con el fondo, r = rembg
CAJAS = {
 'portatil-1': (30, 28, 370, 268, 'd'), 'portatil-2': (378, 95, 650, 250, 'd'), 'portatil-3': (655, 150, 925, 245, 'd'), 'portatil-4': (930, 150, 1195, 230, 'd'),
 'movil': (1230, 25, 1365, 272, 'd'),
 'persona-filo': (15, 290, 280, 708, 'r'), 'persona-calma': (282, 305, 520, 708, 'r'), 'persona-brasa': (522, 290, 785, 708, 'r'),
 'persona-kiosko': (795, 295, 1015, 708, 'r'), 'persona-pulso': (1010, 290, 1255, 708, 'r'), 'persona-lienzo': (1258, 290, 1530, 708, 'r'),
 'obj-euro': (40, 725, 255, 945, 'r'), 'obj-calendario': (298, 722, 525, 945, 'r'), 'obj-estrella': (552, 728, 765, 940, 'r'),
 'obj-escudo': (790, 718, 995, 953, 'r'), 'obj-bolsa': (1040, 712, 1245, 953, 'r'), 'obj-check': (1285, 725, 1503, 947, 'r'),
}
# pantalla del móvil en cada persona (x0, y0, x1, y1 aproximados en la lámina)
TELEFONOS = {'filo': (45, 418, 93, 512), 'calma': (305, 434, 352, 530), 'brasa': (552, 430, 598, 526),
             'kiosko': (804, 434, 852, 528), 'pulso': (1041, 438, 1088, 535), 'lienzo': (1288, 438, 1338, 534)}

def recorta(k):
    x0, y0, x1, y1, m = CAJAS[k]; c = im.crop((x0, y0, x1, y1))
    if m == 'r':
        o = remove(c, session=sesion); al = np.array(o.getchannel('A')).astype(float) / 255
        al = np.where(al > .5, al, 0)
    else:
        sub = A[y0:y1, x0:x1]; borde = np.concatenate([sub[0], sub[-1], sub[:, 0], sub[:, -1]]); bg = np.median(borde, axis=0)
        mk = np.sqrt(((sub - bg) ** 2).sum(2)) > 34
        mk = ndi.binary_fill_holes(ndi.binary_closing(mk, iterations=3))
        lab, n = ndi.label(mk)
        if n > 1: mk = lab == (1 + int(np.argmax(ndi.sum(mk, lab, range(1, n + 1)))))
        al = ndi.gaussian_filter(mk.astype(float), .8)
        o = c.convert('RGBA')
    o.putalpha(Image.fromarray((np.clip(al, 0, 1) * 255).astype('uint8')))
    bb = o.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return o.crop(bb), (x0 + bb[0], y0 + bb[1])

def sube(o, f):
    o = o.convert('RGBa').resize((round(o.width * f), round(o.height * f)), Image.LANCZOS).convert('RGBA')
    rgb = o.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2)); rgb.putalpha(o.getchannel('A')); return rgb

def esquinas(mask):
    ys, xs = np.nonzero(mask)
    pts = np.stack([xs, ys], 1); s = pts.sum(1); d = pts[:, 0] - pts[:, 1]
    return [pts[s.argmin()], pts[d.argmax()], pts[s.argmax()], pts[d.argmin()]]  # TL, TR, BR, BL

datos = {}
P = {k: recorta(k) for k in CAJAS}
# --- Portátil: 4 pasos en un mismo lienzo (ancho común, pegados abajo y centrados) ---
F = 3.0; base = P['portatil-1'][0]; W = round(base.width * F)
Hs = []; piezas = []
for i in range(1, 5):
    o = P[f'portatil-{i}'][0]
    esc = (base.width / o.width) * F if i > 1 else F          # misma anchura de base en todos los pasos
    piezas.append(sube(o, esc)); Hs.append(piezas[-1].height)
H = max(Hs); quads = []
for i, o in enumerate(piezas, 1):
    lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0)); x = (W - o.width) // 2; y = H - o.height
    lienzo.alpha_composite(o, (x, y)); lienzo.save(SAL / f'portatil-{i}.webp', 'WEBP', quality=88, method=6)
    # pantalla = zona negra de la tapa (dentro del contorno, lejos del borde metálico)
    a = np.array(o); oscuro = (a[..., :3].max(2) < 38) & (a[..., 3] > 200)
    if i <= 3:
        # el teclado también es oscuro: se separa de la pantalla con una erosión y se elige la zona más alta
        it = 1 if i == 1 else 6
        er = ndi.binary_erosion(oscuro, iterations=it); lab, n = ndi.label(er)
        if i == 1 and n:
            tam = ndi.sum(er, lab, range(1, n + 1)); zona = lab == (1 + int(np.argmax(tam)))
        elif n:
            alto = ndi.mean(np.indices(er.shape)[0], lab, range(1, n + 1)); zona = lab == (1 + int(np.argmin(alto)))
        else: zona = None
        if zona is not None:
            zona = ndi.binary_dilation(zona, iterations=it) & oscuro
            q = [[float(p[0] + x), float(p[1] + y)] for p in esquinas(zona)]
        else: q = None
    else: q = None
    if i == 3: q = [[round(W * .07), round(H * .64)], [round(W * .94), round(H * .64)], [round(W * .93), round(H * .72)], [round(W * .085), round(H * .72)]]  # tapa casi cerrada: solo una rendija
    quads.append(q)
datos['portatil'] = {'ancho': W, 'alto': H, 'altos': Hs, 'pantallas': quads}
# --- Móvil ---
mv, _ = P['movil']; mv = sube(mv, 2.4); mv.save(SAL / 'movil.webp', 'WEBP', quality=88, method=6)
a = np.array(mv); dark = (a[..., :3].max(2) < 30) & (a[..., 3] > 200); dark = ndi.binary_opening(dark, iterations=3)
lab, n = ndi.label(dark); tam = ndi.sum(dark, lab, range(1, n + 1)); dark = lab == (1 + int(np.argmax(tam)))
ys, xs = np.nonzero(dark)
datos['movil'] = {'ancho': mv.width, 'alto': mv.height, 'pantalla': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
# --- Personas y objetos ---
FP = 2.2; datos['personas'] = {}
for k in CAJAS:
    if k.startswith('persona-'):
        o, (ox, oy) = P[k]; id_ = k[8:]; g = sube(o, FP); g.save(SAL / f'{k}.webp', 'WEBP', quality=86, method=6)
        x0, y0, x1, y1 = TELEFONOS[id_]; sub = np.array(o.convert('RGB')).astype(int)
        # ventana del teléfono en el recorte y esquinas de la zona negra
        wx0, wy0, wx1, wy1 = x0 - ox - 8, y0 - oy - 8, x1 - ox + 8, y1 - oy + 8
        v = sub[max(wy0, 0):wy1, max(wx0, 0):wx1]; mk = v.max(2) < 34; lab, n = ndi.label(ndi.binary_opening(mk, iterations=2))
        cy, cx = (y1 - y0) // 2 + 8, (x1 - x0) // 2 + 8
        etq = lab[min(cy, lab.shape[0] - 1), min(cx, lab.shape[1] - 1)]
        if etq:
            q = [[float((p[0] + max(wx0, 0)) * FP), float((p[1] + max(wy0, 0)) * FP)] for p in esquinas(lab == etq)]
        else: q = None
        datos['personas'][id_] = {'ancho': g.width, 'alto': g.height, 'pantalla': q}
    elif k.startswith('obj-'):
        g = sube(P[k][0], 2.0); g.save(SAL / f'{k}.webp', 'WEBP', quality=88, method=6)
(RAIZ / 'js' / 'portada' / 'escena-datos.js').write_text('/* Generado por scripts/preparar-3d.py: posiciones de las pantallas en las imágenes de img/3d. No editar a mano. */\nexport const ESCENA = ' + json.dumps(datos, indent=1) + ';\n')
print(json.dumps(datos)[:1500])
