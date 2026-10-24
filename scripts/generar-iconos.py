# Genera todos los iconos de la app a partir de icons/logo-a.png (y el nombre de la marca para las pantallas de arranque).
# Uso:  python3 scripts/generar-iconos.py        (desde la raíz del proyecto)
from PIL import Image, ImageDraw
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I = os.path.join(RAIZ, 'icons')
FONDO = (12, 12, 14); VERDE = (200, 245, 96)
logo = Image.open(f'{I}/logo-a.png').convert('RGBA')
# Letras claras (para fondos oscuros)
nombre = Image.open(f'{I}/nombre.png').convert('RGBA')

def ajusta(img, ancho):
    return img.resize((ancho, round(img.height * ancho / img.width)), Image.LANCZOS)

def icono(tam, fondo=FONDO, marca=0.58, tinte=None, redondo=0):
    """Cuadrado con el logo centrado. marca = proporción del ancho que ocupa el logo."""
    S = tam * 4  # sobremuestreo para bordes limpios
    lienzo = Image.new('RGBA', (S, S), fondo + (255,) if fondo else (0, 0, 0, 0))
    l = ajusta(logo, int(S * marca))
    if tinte:
        a = l.getchannel('A'); l = Image.new('RGBA', l.size, tinte + (255,)); l.putalpha(a)
    lienzo.alpha_composite(l, ((S - l.width) // 2, (S - l.height) // 2 + int(S * 0.012)))
    if redondo:
        m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * redondo), fill=255)
        lienzo.putalpha(m)
    return lienzo.resize((tam, tam), Image.LANCZOS)

hechos = []
def guarda(img, ruta, **kw):
    img.save(f'{I}/{ruta}', optimize=True, **kw); hechos.append(ruta)

# Iconos «any» (fondo oscuro, logo a buen tamaño)
for t in (48, 72, 96, 128, 144, 152, 167, 384):
    guarda(icono(t, marca=0.64).convert('RGB'), f'icon-{t}.png')
# Maskable (el logo dentro de la zona segura del 80 %)
for t in (192, 384):
    guarda(icono(t, marca=0.5).convert('RGB'), f'maskable-{t}.png')
# Monocromo (Android tematizado): solo forma, sin fondo
guarda(icono(512, fondo=None, marca=0.6, tinte=(255, 255, 255)), 'monocromo-512.png')
# Icono alternativo, verde con el logo oscuro
guarda(icono(512, fondo=VERDE, marca=0.6, tinte=FONDO).convert('RGB'), 'icon-verde-512.png')
# iPhone / iPad
for t in (120, 152, 167):
    guarda(icono(t, marca=0.64).convert('RGB'), f'apple-touch-icon-{t}.png')
# Pestaña del navegador
fav = {t: icono(t, marca=0.72, redondo=0.22) for t in (16, 32, 48)}
for t, im in fav.items(): guarda(im, f'favicon-{t}.png')
fav[48].save(f'{RAIZ}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)]); hechos.append('../favicon.ico')
# Icono suelto (para compartir / avatar), con esquinas redondeadas
guarda(icono(512, marca=0.64, redondo=0.22), 'icon-redondo-512.png')

# Atajos de la app (96 px): glifo verde sobre fondo oscuro redondeado
GLIFOS = {
  'atajo-pedir': '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
  'atajo-proyectos': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  'atajo-soporte': '<path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><path d="M8 11h8M8 14h5"/>',
  'atajo-panel': '<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>',
}
with open(f'{RAIZ}/scripts/.glifos.json', 'w') as f:
    import json; json.dump(GLIFOS, f)

# Pantallas de arranque de iPhone (apple-touch-startup-image)
PANTALLAS = [(1290, 2796), (1179, 2556), (1284, 2778), (1170, 2532), (1125, 2436), (1242, 2688), (828, 1792), (750, 1334), (1536, 2048), (1668, 2388), (2048, 2732)]
os.makedirs(f'{I}/arranque', exist_ok=True)
for w, h in PANTALLAS:
    S = Image.new('RGB', (w, h), FONDO)
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(glow)
    r = int(min(w, h) * 0.55); d.ellipse((w // 2 - r, int(h * .42) - r, w // 2 + r, int(h * .42) + r), fill=(120, 170, 30, 46))
    from PIL import ImageFilter
    S = Image.alpha_composite(S.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.12)))
    lg = ajusta(logo, int(min(w, h) * 0.26)); S.alpha_composite(lg, ((w - lg.width) // 2, int(h * .42) - lg.height // 2))
    if nombre is not None:
        nm = ajusta(nombre, int(min(w, h) * 0.5)); S.alpha_composite(nm, ((w - nm.width) // 2, int(h * .42) + lg.height // 2 + int(min(w, h) * 0.06)))
    S.convert('RGB').save(f'{I}/arranque/{w}x{h}.png', optimize=True); hechos.append(f'arranque/{w}x{h}.png')
print(len(hechos), 'archivos:', ', '.join(hechos))
