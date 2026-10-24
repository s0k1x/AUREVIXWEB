#!/usr/bin/env python3
"""Genera el catalogo de biblioteca-ui a partir de las copias en _sources/.

Uso (desde cualquier directorio):  python3 -I biblioteca-ui/_scripts/construir_catalogo.py

Escribe:
  _catalogo/componentes.json -> un registro por componente/ejemplo de UI
  _catalogo/iconos.json      -> un registro por set de iconos (con su carpeta y recuento)
  _catalogo/resumen.json     -> recuentos por biblioteca y por categoria

"verificado" significa: todos los archivos del componente existen en _sources/,
no estan vacios y su contenido tiene la forma esperada (etiquetas HTML, <svg>, reglas CSS,
codigo JSX/TS...). No significa que se haya probado visualmente en un navegador.
"""
import collections
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_sources')
OUT = os.path.join(ROOT, '_catalogo')

LICENSES = {
    'uiverse-galaxy': 'MIT', 'hyperui': 'MIT', 'flowbite': 'MIT', 'daisyui': 'MIT',
    'preline': 'MIT + Preline UI Fair Use License', 'shadcn-ui': 'MIT',
    'origin-ui': 'MIT (apps/origin y apps/ui, segun LICENSING.md; el LICENSE AGPL-3.0 de la raiz se conserva como referencia y cubre partes no copiadas)',
    'reui': 'MIT', 'magic-ui': 'MIT', 'kokonut-ui': 'MIT', 'pines': 'MIT', 'tailblocks': 'MIT',
    'spinkit': 'MIT', 'css-loaders': 'MIT', 'loaders-css': 'MIT', 'svg-loaders': 'MIT', 'whirl': 'MIT',
    'loading-io-css-spinner': 'CC0-1.0 (loaders; resto del codigo MIT, segun su README)', 'animate-css': 'Hippocratic License 2.1',
    'headless-ui': 'MIT', 'radix-primitives': 'MIT', 'sonner': 'MIT',
    'tabler-icons': 'MIT', 'lucide': 'ISC', 'heroicons': 'MIT', 'feather': 'MIT',
    'phosphor-icons': 'MIT', 'bootstrap-icons': 'MIT', 'ionicons': 'MIT',
    'meraki-ui': 'MIT', 'motion-primitives': 'MIT', 'cult-ui': 'MIT', 'animata': 'MIT',
    'mantine-ui': 'MIT', 'tw-elements': 'MIT (LICENSE del repo y License.txt del paquete npm 2.0.0, MIT para TW Elements Free)', 'tremor': 'Apache-2.0',
    'simple-icons': 'CC0-1.0 (los logotipos pueden ser marcas registradas de sus duenos)', 'eva-icons': 'MIT',
}

# Palabras clave -> categoria normalizada (la primera que coincida gana).
KEYWORDS = [
    ('loaders', r'loader|loading|spinner|spin|progress|skeleton'),
    ('buttons', r'button|btn|cta'),
    ('toggles', r'toggle|switch'),
    ('checkboxes', r'checkbox'),
    ('radios', r'radio'),
    ('inputs', r'input|textarea|otp|pin-input|select|combobox|autocomplete|slider|range|date|calendar|picker|upload|tag'),
    ('forms', r'form|login|signup|sign-in|sign-up|auth|contact|newsletter'),
    ('cards', r'card|pricing|testimonial|profile|stat|bento|product'),
    ('navigation', r'nav|menu|sidebar|breadcrumb|pagination|tabs|dock|header|footer|stepper|command|link'),
    ('modals', r'modal|dialog|drawer|sheet|popover|overlay|lightbox'),
    ('feedback', r'alert|toast|notification|banner|badge|tooltip|announcement|sonner|callout'),
    ('backgrounds', r'background|pattern|grid|particles|beam|meteor|aurora|ripple|retro|globe|bg'),
    ('text-effects', r'text|typing|word|letter|number-ticker|marquee|highlight'),
    ('animations', r'anim|motion|reveal|fade|blur|shine|border|orbit|confetti|cursor|hover|scroll'),
    ('data-display', r'table|chart|list|timeline|accordion|avatar|kbd|tree|carousel|gallery|code|terminal'),
    ('layouts', r'hero|section|layout|feature|blog|ecommerce|content|team|faq|template|dashboard|page'),
]


def infer_category(*names):
    s = ' '.join(n.lower() for n in names if n)
    for cat, rx in KEYWORDS:
        if re.search(rx, s):
            return cat
    return 'otros'


def read(path):
    try:
        with open(path, 'rb') as h:
            return h.read().decode('utf-8', 'replace')
    except OSError:
        return ''


def looks_ok(path):
    t = read(path)
    if not t.strip():
        return False
    ext = os.path.splitext(path)[1].lower()
    if ext == '.svg':
        return '<svg' in t
    if ext in ('.html', '.htm', '.vue', '.svelte', '.astro'):
        return bool(re.search(r'<[a-zA-Z]', t))
    if ext in ('.css', '.scss', '.less'):
        return '{' in t and '}' in t
    if ext in ('.tsx', '.jsx', '.ts', '.js', '.mjs'):
        return bool(re.search(r'export|function|const|import|=>', t))
    if ext in ('.md', '.mdx', '.json'):
        return True
    return True


components = []


def add(lib, name, files, category=None, kind='component', **extra):
    if not files:
        return
    rel = [os.path.relpath(f, ROOT) for f in files]
    verified = bool(files) and all(os.path.isfile(f) and looks_ok(f) for f in files)
    item = {
        'id': f'{lib}/{name}', 'library': lib, 'name': name, 'kind': kind,
        'category': category or infer_category(name, *rel),
        'files': rel, 'license': LICENSES.get(lib), 'verified': verified,
    }
    item.update({k: v for k, v in extra.items() if v is not None})
    components.append(item)


def S(*p):
    return os.path.join(SRC, *p)


# --- Uiverse (galaxy): un .html por componente, autor en el nombre del archivo ---
UIVERSE_CAT = {'Buttons': 'buttons', 'Cards': 'cards', 'Checkboxes': 'checkboxes', 'Forms': 'forms',
               'Inputs': 'inputs', 'Notifications': 'feedback', 'Patterns': 'backgrounds',
               'Radio-buttons': 'radios', 'Toggle-switches': 'toggles', 'Tooltips': 'feedback',
               'loaders': 'loaders'}
for f in sorted(glob.glob(S('uiverse-galaxy', '*', '*.html'))):
    folder = os.path.basename(os.path.dirname(f))
    base = os.path.splitext(os.path.basename(f))[0]
    author, _, slug = base.partition('_')
    add('uiverse-galaxy', f'{folder}/{base}', [f], UIVERSE_CAT.get(folder, infer_category(folder)),
        author=author or None, uiverse_slug=slug or None, original_category=folder)

# --- HyperUI: public/examples/<seccion>/<categoria>/<n>.html ---
for f in sorted(glob.glob(S('hyperui', 'public', 'examples', '**', '*.html'), recursive=True)):
    rel = os.path.relpath(f, S('hyperui', 'public', 'examples'))
    parts = rel.split(os.sep)
    add('hyperui', os.path.splitext(rel)[0], [f], infer_category(*parts[1:-1]) if len(parts) > 2 else None,
        original_category='/'.join(parts[:-1]))

# --- Flowbite: ejemplos {{< example >}} dentro de content/**/*.md ---
for f in sorted(glob.glob(S('flowbite', 'content', '**', '*.md'), recursive=True)):
    n = read(f).count('{{< example')
    if n:
        rel = os.path.splitext(os.path.relpath(f, S('flowbite', 'content')))[0]
        add('flowbite', rel, [f], infer_category(os.path.basename(rel), rel), kind='docs-with-examples',
            examples=n)

# --- DaisyUI: un CSS por componente + su pagina de documentacion ---
docs = S('daisyui', 'packages', 'docs', 'src', 'routes', '(routes)', 'components')
for f in sorted(glob.glob(S('daisyui', 'packages', 'daisyui', 'src', 'components', '*.css'))):
    name = os.path.splitext(os.path.basename(f))[0]
    files = [f] + sorted(glob.glob(os.path.join(docs, name, '*.md')))
    add('daisyui', name, files, infer_category(name), kind='css-component')

# --- Preline: plugins JS + plantillas HTML ---
for d in sorted(glob.glob(S('preline', 'src', 'plugins', '*'))):
    name = os.path.basename(d)
    if name == 'base-plugin':
        continue
    add('preline', f'plugins/{name}', sorted(f for f in glob.glob(os.path.join(d, '*.ts')) if not f.endswith('.d.ts')),
        infer_category(name),
        kind='js-plugin')
for f in sorted(glob.glob(S('preline', 'templates', '*', '*', '**', '*.html'), recursive=True)):
    add('preline', os.path.splitext(os.path.relpath(f, S('preline', 'templates')))[0], [f], 'layouts',
        kind='template')


# --- Registros estilo shadcn (registry.json con items y files) ---
def registry(lib, app_dir, skip_types=('registry:style', 'registry:theme', 'registry:internal',
                                       'registry:font', 'registry:lib', 'registry:base')):
    path = os.path.join(app_dir, 'registry.json')
    data = json.load(open(path, encoding='utf-8'))
    prefix = os.path.relpath(app_dir, S(lib))
    for it in data.get('items', []):
        if it.get('type') in skip_types:
            continue
        files = []
        for fl in it.get('files', []):
            p = fl['path'] if isinstance(fl, dict) else fl
            files.append(os.path.join(app_dir, p))
        name = it['name'] if prefix == '.' else f"{prefix}/{it['name']}"
        cat = infer_category(it['name'], ' '.join(it.get('categories', []) or []))
        add(lib, name, files, cat, kind=it.get('type', '').replace('registry:', '') or 'component',
            title=it.get('title'), description=it.get('description'))


registry('shadcn-ui', S('shadcn-ui', 'apps', 'v4'))
registry('origin-ui', S('origin-ui', 'apps', 'origin'))
registry('origin-ui', S('origin-ui', 'apps', 'ui'))
registry('magic-ui', S('magic-ui', 'apps', 'www'))
registry('kokonut-ui', S('kokonut-ui'))

# --- ReUI: componentes propios + patrones (la variante "radix" es la misma coleccion para Radix) ---
for f in sorted(glob.glob(S('reui', 'registry-reui', 'bases', 'base', 'reui', '*'))):
    name = os.path.basename(f)
    if name.startswith('_'):
        continue
    files = sorted(glob.glob(os.path.join(f, '**', '*.tsx'), recursive=True)) if os.path.isdir(f) else [f]
    add('reui', 'reui/' + os.path.splitext(name)[0], files, infer_category(name), kind='ui')
for f in sorted(glob.glob(S('reui', 'registry-reui', 'bases', 'base', 'components', '*', '*.tsx'))):
    group = os.path.basename(os.path.dirname(f))
    radix = f.replace(os.sep + 'base' + os.sep + 'components', os.sep + 'radix' + os.sep + 'components')
    add('reui', f'patterns/{group}/{os.path.splitext(os.path.basename(f))[0]}', [f], infer_category(group),
        kind='example', radix_variant=os.path.relpath(radix, ROOT) if os.path.isfile(radix) else None)

# --- Pines (Alpine.js + Tailwind) ---
for f in sorted(glob.glob(S('pines', 'elements', '*.html'))):
    name = os.path.splitext(os.path.basename(f))[0]
    ex = sorted(glob.glob(S('pines', 'elements', name + '-examples', '*.html')))
    add('pines', name, [f] + ex, infer_category(name), examples=len(ex) or None)

# --- Tailblocks (bloques React+Tailwind, version light y dark) ---
for f in sorted(glob.glob(S('tailblocks', 'src', 'blocks', '*', '*', '*.js'))):
    rel = os.path.splitext(os.path.relpath(f, S('tailblocks', 'src', 'blocks')))[0]
    group = rel.split(os.sep)[0]
    add('tailblocks', rel, [f], infer_category(group) if group not in ('hero',) else 'layouts', kind='block')

# --- Loaders y animaciones CSS ---
for cls in sorted(set(re.findall(r'class="(sk-[a-z-]+)"', read(S('spinkit', 'examples.html'))))):
    if read(S('spinkit', 'examples.html')).count(f'class="{cls}"') == 1 and not cls.endswith(('-dot', '-cube', '-rect')):
        add('spinkit', cls, [S('spinkit', 'spinkit.css')], 'loaders', kind='css-loader')
for f in sorted(glob.glob(S('css-loaders', 'css', 'load*.css'))):
    add('css-loaders', os.path.splitext(os.path.basename(f))[0], [f], 'loaders', kind='css-loader')
for f in sorted(glob.glob(S('loaders-css', 'src', 'animations', '*.scss'))):
    add('loaders-css', os.path.splitext(os.path.basename(f))[0].lstrip('_'), [f], 'loaders', kind='css-loader')
for f in sorted(glob.glob(S('svg-loaders', 'svg-loaders', '*.svg'))):
    add('svg-loaders', os.path.splitext(os.path.basename(f))[0], [f], 'loaders', kind='svg-loader')
for f in sorted(glob.glob(S('whirl', 'src', 'whirls', '*.scss'))):
    add('whirl', os.path.splitext(os.path.basename(f))[0], [f], 'loaders', kind='css-loader')
for d in sorted(glob.glob(S('loading-io-css-spinner', 'src', '*'))):
    files = sorted(x for x in glob.glob(os.path.join(d, '*')) if os.path.isfile(x))
    dist = S('loading-io-css-spinner', 'dist', os.path.basename(d) + '.html')
    files = ([dist] if os.path.isfile(dist) else []) + files
    add('loading-io-css-spinner', os.path.basename(d), files, 'loaders',
        kind='css-loader')
for f in sorted(glob.glob(S('animate-css', 'source', '*', '*.css'))):
    group = os.path.basename(os.path.dirname(f))
    add('animate-css', f'{group}/{os.path.splitext(os.path.basename(f))[0]}', [f], 'animations',
        kind='css-animation', original_category=group)

# --- Primitivas React/Vue (librerias, no snippets) ---
for d in sorted(glob.glob(S('headless-ui', 'packages', '@headlessui-*', 'src', 'components', '*'))):
    if not os.path.isdir(d):
        continue
    pkg = d.split(os.sep)[-4]
    files = [f for f in glob.glob(os.path.join(d, '*')) if os.path.isfile(f) and not re.search(r'\.test\.', f)]
    add('headless-ui', f'{pkg}/{os.path.basename(d)}', sorted(files), infer_category(os.path.basename(d)),
        kind='primitive')
for d in sorted(glob.glob(S('radix-primitives', 'packages', 'react', '*'))):
    files = sorted(glob.glob(os.path.join(d, 'src', '*.tsx')))
    files = [f for f in files if not re.search(r'\.(test|stories)\.', f)]
    if files:
        add('radix-primitives', os.path.basename(d), files, infer_category(os.path.basename(d)), kind='primitive')
add('sonner', 'toaster', sorted(glob.glob(S('sonner', 'src', '*.tsx'))), 'feedback', kind='primitive')

# --- Bibliotecas de la tercera tanda ---
registry('cult-ui', S('cult-ui', 'apps', 'www'))
for f in sorted(glob.glob(S('meraki-ui', 'components', '**', '*.html'), recursive=True)):
    rel = os.path.splitext(os.path.relpath(f, S('meraki-ui', 'components')))[0]
    add('meraki-ui', rel, [f], infer_category(rel.split(os.sep)[0]), original_category=rel.split(os.sep)[0])
for f in sorted(glob.glob(S('motion-primitives', 'components', 'core', '*.tsx'))):
    add('motion-primitives', os.path.splitext(os.path.basename(f))[0], [f])
for f in sorted(glob.glob(S('animata', 'animata', '*', '*.tsx'))):
    if '.stories.' in f:
        continue
    group = os.path.basename(os.path.dirname(f))
    add('animata', f'{group}/{os.path.splitext(os.path.basename(f))[0]}', [f], infer_category(group),
        original_category=group)
for d in sorted(glob.glob(S('mantine-ui', 'lib', '*'))):
    if not os.path.isdir(d):
        continue
    files = sorted(f for f in glob.glob(os.path.join(d, '*')) if os.path.isfile(f) and not re.search(r'\.(story|test)\.', f))
    add('mantine-ui', os.path.basename(d), files, infer_category(os.path.basename(d)))
for f in sorted(glob.glob(S('tw-elements', 'src', 'js', 'free', '*', '*.js'))):
    add('tw-elements', os.path.splitext(os.path.relpath(f, S('tw-elements', 'src', 'js', 'free')))[0], [f],
        kind='js-plugin')
for d in sorted(glob.glob(S('tremor', 'src', 'components', '*'))):
    files = sorted(f for f in glob.glob(os.path.join(d, '*.tsx')) if '.stories.' not in f)
    add('tremor', os.path.basename(d), files, infer_category(os.path.basename(d)))

# --- Iconos: un registro por set ---
ICON_SETS = [
    ('tabler-icons', 'outline', 'icons/outline'), ('tabler-icons', 'filled', 'icons/filled'),
    ('lucide', 'default', 'icons'),
    ('heroicons', '16-solid', 'optimized/16/solid'), ('heroicons', '20-solid', 'optimized/20/solid'),
    ('heroicons', '24-outline', 'optimized/24/outline'), ('heroicons', '24-solid', 'optimized/24/solid'),
    ('feather', 'default', 'icons'),
    ('bootstrap-icons', 'default', 'icons'), ('ionicons', 'default', 'src/svg'),
    ('simple-icons', 'brands', 'icons'),
    ('eva-icons', 'fill', 'package/icons/fill/svg'), ('eva-icons', 'outline', 'package/icons/outline/svg'),
] + [('phosphor-icons', w, f'assets/{w}') for w in ('thin', 'light', 'regular', 'bold', 'fill', 'duotone')]
icons = []
for lib, variant, sub in ICON_SETS:
    files = sorted(glob.glob(S(lib, sub, '*.svg')))
    ok = sum(1 for f in files if looks_ok(f))
    icons.append({'library': lib, 'variant': variant, 'folder': os.path.relpath(S(lib, sub), ROOT),
                  'icons_found': len(files), 'icons_verified': ok, 'license': LICENSES[lib]})

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'componentes.json'), 'w', encoding='utf-8') as h:
    json.dump(components, h, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'iconos.json'), 'w', encoding='utf-8') as h:
    json.dump(icons, h, ensure_ascii=False, indent=1)

by_lib = collections.OrderedDict()
for c in components:
    e = by_lib.setdefault(c['library'], {'entries': 0, 'verified': 0, 'examples_inside_docs': 0,
                                         'license': c['license']})
    e['entries'] += 1
    e['verified'] += c['verified']
    e['examples_inside_docs'] += c.get('examples', 0) if c['kind'] == 'docs-with-examples' else 0
summary = {
    'total_component_entries': len(components),
    'total_verified': sum(c['verified'] for c in components),
    'by_library': by_lib,
    'by_category': dict(collections.Counter(c['category'] for c in components).most_common()),
    'icons_total': sum(i['icons_found'] for i in icons),
    'icons_verified': sum(i['icons_verified'] for i in icons),
}
with open(os.path.join(OUT, 'resumen.json'), 'w', encoding='utf-8') as h:
    json.dump(summary, h, ensure_ascii=False, indent=1)
print(json.dumps(summary, ensure_ascii=False, indent=1))
