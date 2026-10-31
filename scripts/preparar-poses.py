#!/usr/bin/env python3
"""
Recorta las poses de personas de una lámina (fondo claro o cuadriculado) y las guarda como img/poses/*.webp con
transparencia, subidas de tamaño. 
Uso:  python3 scripts/preparar-poses.py ruta/a/la-lamina.png
Si se sustituye una pieza por otra de más resolución, basta con volver a pasar el script (los nombres no cambian).
Necesita: pip install rembg onnxruntime scipy pillow numpy
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
from rembg import remove, new_session

RAIZ = Path(__file__).resolve().parent.parent
SAL = RAIZ / 'img' / 'poses'; SAL.mkdir(parents=True, exist_ok=True)
im = Image.open(sys.argv[1]).convert('RGB'); sesion = new_session('isnet-general-use')
# nombre: (x0, y0, x1, y1) en la lámina de 1536x1024
CAJAS = {  # solo las que se usan en la web (revisa tu web, contacto, trabaja con nosotros y página 404)
 'revisa-lupa': (6, 560, 240, 784), 'contacto-auriculares': (1038, 560, 1272, 790), 'equipo-1': (4, 790, 276, 1020), 'error-404': (836, 792, 1064, 1020),
}
F = 2.2
for k, (x0, y0, x1, y1) in CAJAS.items():
    c = im.crop((x0, y0, x1, y1)); o = remove(c, session=sesion)
    al = np.array(o.getchannel('A')).astype(float) / 255; al = np.where(al > .5, al, 0)
    lab, n = ndi.label(al > 0)
    if n > 1: al = np.where(lab == (1 + int(np.argmax(ndi.sum(al > 0, lab, range(1, n + 1))))), al, 0)  # solo la pieza grande
    o.putalpha(Image.fromarray((np.clip(al, 0, 1) * 255).astype('uint8')))
    bb = o.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox(); o = o.crop(bb)
    g = o.convert('RGBa').resize((round(o.width * F), round(o.height * F)), Image.LANCZOS).convert('RGBA')
    rgb = g.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2)); rgb.putalpha(g.getchannel('A'))
    rgb.save(SAL / f'{k}.webp', 'WEBP', quality=86, method=6)
print('listo:', ', '.join(CAJAS))
