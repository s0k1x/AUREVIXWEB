#!/usr/bin/env python3
"""
Prepara las imágenes de personas de la web a partir de una lámina PNG con TRANSPARENCIA REAL (sin fondo):
  - img/3d/persona-<id>.webp      las 6 personas de las tarjetas «Webs pensadas para tu sector» (enseñan su móvil)
  - js/portada/escena-datos.js    dónde está la pantalla del móvil de cada una (para poner el diseño encima)
  - img/poses/*.webp              revisa-lupa, contacto-auriculares, equipo-1 y error-404

Uso:  python3 scripts/preparar-imagenes.py ruta/a/la-lamina.png
Si se sustituye una pieza por otra de más resolución, vuelve a pasar el script: las posiciones se recalculan solas.
Necesita: pip install scipy pillow numpy
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

RAIZ = Path(__file__).resolve().parent.parent
S3D = RAIZ / 'img' / '3d'; S3D.mkdir(parents=True, exist_ok=True)
SPOSES = RAIZ / 'img' / 'poses'; SPOSES.mkdir(parents=True, exist_ok=True)
hoja = Image.open(sys.argv[1]).convert('RGBA'); A = np.array(hoja)
F = 2.4  # factor de ampliación

# (x0, y0, x1, y1) en la lámina de 1536x1024; los límites entre vecinos se ajustan solos al hueco más estrecho
CAJAS = {
 'persona-filo': (6, 214, 180, 498), 'persona-calma': (176, 216, 354, 498), 'persona-brasa': (366, 214, 570, 498),
 'persona-kiosko': (570, 214, 756, 498), 'persona-pulso': (760, 214, 950, 498), 'persona-lienzo': (954, 212, 1166, 498),
 'revisa-lupa': (1086, 496, 1324, 708), 'contacto-auriculares': (326, 712, 507, 910), 'equipo-1': (728, 706, 1148, 958), 'error-404': (1146, 712, 1318, 910),
}

# restos de la pieza vecina que se cuelan en el recorte: (x0, y0, x1, y1, regla) en la lámina.
# «blanco» borra lo muy claro (una manga), «claro» borra lo que no es negro puro (una tableta, una mano)
EXCLUIR = {'persona-kiosko': [(540, 300, 592, 500, 'blanco')], 'contacto-auriculares': [(322, 840, 356, 910, 'claro')]}

def hueco(x, y0, y1, ancho=14):
    """Columna cercana a x con menos píxeles opacos: ahí se separa una pieza de la vecina."""
    cols = range(max(0, x - ancho), x + ancho + 1)
    return min(cols, key=lambda c: int((A[y0:y1, c, 3] > 20).sum()))

def pieza(caja, nombre='', ajusta_izq=True, ajusta_der=True):
    x0, y0, x1, y1 = caja
    if ajusta_izq and x0 > 0: x0 = hueco(x0, y0, y1)
    if ajusta_der: x1 = hueco(x1, y0, y1)
    a = A[y0:y1, x0:x1].copy()
    al = a[..., 3].astype(float) * 255 / 252  # el alfa de la lámina llega a 252: se normaliza a opaco
    al = np.clip(al, 0, 255); al[al < 12] = 0
    for (ex0, ey0, ex1, ey1, regla) in EXCLUIR.get(nombre, []):
        sub = a[max(ey0 - y0, 0):max(ey1 - y0, 0), max(ex0 - x0, 0):max(ex1 - x0, 0), :3].astype(int)
        quitar = (sub.min(2) > 170) if regla == 'blanco' else (sub.max(2) > 62)
        zona = al[max(ey0 - y0, 0):max(ey1 - y0, 0), max(ex0 - x0, 0):max(ex1 - x0, 0)]; zona[quitar] = 0
    lab, n = ndi.label(al > 20)
    if n > 1: al = np.where(lab == (1 + int(np.argmax(ndi.sum(al > 20, lab, range(1, n + 1))))), al, 0)  # solo la pieza grande
    a[..., 3] = al.astype('uint8')
    im = Image.fromarray(a, 'RGBA'); bb = im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return im.crop(bb), (x0 + bb[0], y0 + bb[1])

def sube(im):
    g = im.convert('RGBa').resize((round(im.width * F), round(im.height * F)), Image.LANCZOS).convert('RGBA')
    rgb = g.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=2)); rgb.putalpha(g.getchannel('A')); return rgb

def pantalla_movil(im):
    """Esquinas (TL, TR, BR, BL) de la pantalla del móvil: el rectángulo negro más rectangular y de proporción de móvil."""
    a = np.array(im); oscuro = (a[..., :3].max(2) < 34) & (a[..., 3] > 200)
    oscuro = ndi.binary_opening(oscuro, iterations=2); lab, n = ndi.label(oscuro); mejor = None
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i); w = xs.max() - xs.min() + 1; h = ys.max() - ys.min() + 1
        area = len(xs)
        if not (700 < area < 5500) or not (.35 < w / h < .75): continue
        pts = np.stack([xs, ys], 1); s = pts.sum(1); d = pts[:, 0] - pts[:, 1]
        rect = area / (w * h)
        if rect > .7 and (mejor is None or rect > mejor[0]):
            mejor = (rect, [pts[s.argmin()], pts[d.argmax()], pts[s.argmax()], pts[d.argmin()]])
    return mejor and [[float(p[0]) * F, float(p[1]) * F] for p in mejor[1]]

datos = {'personas': {}}
for k, caja in CAJAS.items():
    im, _ = pieza(caja, k); g = sube(im)
    if k.startswith('persona-'):
        g.save(S3D / f'{k}.webp', 'WEBP', quality=88, method=6)
        datos['personas'][k[8:]] = {'ancho': g.width, 'alto': g.height, 'pantalla': pantalla_movil(im)}
    else:
        g.save(SPOSES / f'{k}.webp', 'WEBP', quality=88, method=6)
(RAIZ / 'js' / 'portada' / 'escena-datos.js').write_text('/* Generado por scripts/preparar-imagenes.py: posición de la pantalla del móvil de cada persona. No editar a mano. */\nexport const ESCENA = ' + json.dumps(datos, indent=1) + ';\n')
print(json.dumps({k: (v['ancho'], v['alto'], bool(v['pantalla'])) for k, v in datos['personas'].items()}))
