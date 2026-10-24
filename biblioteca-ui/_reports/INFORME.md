# Informe de descarga — 2026-10-24

Clones `git --depth 1` de la rama por defecto de cada repositorio (commit exacto en
`_sources/<biblioteca>/PROCEDENCIA.json`). Total copiado: **38 bibliotecas, 62.156 archivos en `_sources/`
(~197 MB)**. La carpeta `biblioteca-ui/` completa tiene 62.212 archivos: los anteriores más el catálogo, las
copias de licencias, los informes, los scripts, las fichas de `_referencias/` y los archivos de la raíz
de la carpeta.

**React Bits ya no forma parte del código redistribuido.** Se descargó el 2026-10-24 y se eliminó el
mismo día por su licencia (ver «Restricciones y avisos de licencia» y `../_referencias/react-bits.md`).

## Definiciones

- **Encontrado**: el componente está listado por la propia fuente (carpeta, `registry.json`, docs).
- **Descargado**: sus archivos están en `_sources/`.
- **Verificado**: todos sus archivos existen, no están vacíos y tienen la forma esperada
  (etiquetas HTML, `<svg>`, reglas CSS, código JS/TS). Comprobación automática de
  `_scripts/construir_catalogo.py`; **no** se ha probado cada componente visualmente en un navegador.

## Componentes de UI (_catalogo/componentes.json)

9.301 entradas encontradas · 9.291 descargadas y verificadas · 10 encontradas pero no disponibles.

| Biblioteca | Repo | Licencia | Entradas | Verificadas | Qué cuenta como entrada |
|---|---|---|---:|---:|---|
| Uiverse (galaxy) | uiverse-io/galaxy | MIT | 3.802 | 3.802 | 1 archivo HTML+CSS por elemento, con autor |
| ReUI | keenthemes/reui | MIT | 1.291 | 1.291 | 28 componentes + 1.263 patrones (cada uno también en variante Radix) |
| Origin UI | origin-space/originui | MIT (solo apps/origin y apps/ui; ver avisos) | 1.235 | 1.235 | Items de los dos `registry.json` |
| HyperUI | markmead/hyperui | MIT | 560 | 560 | 1 HTML por ejemplo |
| shadcn/ui | shadcn-ui/ui | MIT | 390 | 380 | Items de `apps/v4/registry.json` (ui, block, example, chart, hook) |
| Cult UI | nolly-studio/cult-ui | MIT | 273 | 273 | Items de `registry.json` |
| Magic UI | magicuidesign/magicui | MIT | 248 | 248 | Items de `registry.json` |
| Meraki UI | merakiuilabs/merakiui | MIT | 228 | 228 | 1 HTML por ejemplo |
| Animata | codse/animata | MIT | 204 | 204 | 1 TSX por componente |
| Tailblocks | mertJF/tailblocks | MIT | 126 | 126 | Bloques React (light y dark) |
| Mantine UI | mantinedev/ui.mantine.dev | MIT | 123 | 123 | 1 carpeta por componente |
| Whirl | jh3y/whirl | MIT | 108 | 108 | 1 SCSS por loader |
| Kokonut UI | kokonut-labs/kokonutui | MIT | 106 | 106 | Items de `registry.json` |
| Animate.css | animate-css/animate.css | Hippocratic 2.1 | 98 | 98 | 1 CSS por animación |
| Headless UI | tailwindlabs/headlessui | MIT | 80 | 80 | Primitivas React y Vue |
| Flowbite | themesberg/flowbite | MIT | 70 | 70 | 70 páginas con **670 ejemplos** dentro (bloques `example` de Hugo) |
| DaisyUI | saadeghi/daisyui | MIT | 61 | 61 | 1 CSS por componente + su página de docs |
| Radix Primitives | radix-ui/primitives | MIT | 58 | 58 | Paquetes React |
| Pines | thedevdojo/pines | MIT | 47 | 47 | Componente Alpine.js + sus ejemplos |
| Tremor | tremorlabs/tremor | Apache-2.0 | 39 | 39 | Componentes React (gráficos, dashboard) |
| Preline | htmlstreamofficial/preline | MIT + Fair Use | 33 | 33 | 28 plugins JS + 5 plantillas HTML |
| Motion Primitives | ibelick/motion-primitives | MIT | 33 | 33 | 1 TSX por componente |
| Loaders.css | connoratherton/loaders.css | MIT (package.json) | 31 | 31 | 1 SCSS por loader |
| SpinKit | tobiasahlin/SpinKit | MIT | 12 | 12 | Spinners de `spinkit.css` |
| SVG Loaders | SamHerbert/SVG-Loaders | MIT | 12 | 12 | 1 SVG animado |
| loading.io css-spinner | loadingio/css-spinner | CC0-1.0 (package.json; ver avisos) | 12 | 12 | HTML compilado + fuente Stylus/Pug |
| TW Elements | mdbootstrap/TW-Elements | MIT (ver avisos) | 12 | 12 | Componentes JS (versión gratuita) |
| CSS Loaders | lukehaas/css-loaders | MIT | 8 | 8 | 1 CSS por loader |
| Sonner | emilkowalski/sonner | MIT | 1 | 1 | Librería de toasts |

Por categoría (aproximada): buttons 1.622, loaders 1.048, cards 1.000, inputs 926, navigation 470,
data-display 453, toggles 402, feedback 343, forms 268, backgrounds 261, checkboxes 244,
layouts 191, animations 185, text-effects 159, radios 156, modals 150, otros 1.423.

Las cifras de entradas no son comparables entre bibliotecas (un "item" de shadcn puede ser un bloque
entero; uno de Uiverse es un botón).

## Iconos (_catalogo/iconos.json)

26.180 SVG encontrados, descargados y verificados:

| Set | Licencia | SVG |
|---|---|---:|
| Phosphor (6 pesos × 1.512) | MIT | 9.072 |
| Tabler (5.184 outline + 1.054 filled) | MIT | 6.238 |
| Simple Icons (logos de marcas) | CC0-1.0 · marcas de terceros | 3.467 |
| Bootstrap Icons | MIT | 2.078 |
| Lucide | ISC | 1.903 |
| Ionicons | MIT | 1.357 |
| Heroicons (16/20/24, solid/outline) | MIT | 1.288 |
| Eva Icons (fill + outline) | MIT | 490 |
| Feather | MIT | 287 |

## Qué se ha excluido al copiar

- Carpeta `.git`, imágenes, capturas, vídeos, audio, fuentes binarias (woff/ttf…), comprimidos,
  PDF, archivos de diseño, lockfiles (`package-lock.json`, `pnpm-lock.yaml`…) y archivos > 5 MB
  (solo 1, en Lucide). El detalle está en cada `PROCEDENCIA.json`.
- Duplicados generados: `reui/public/r` (83 MB de JSON generado desde `registry-reui/`) y
  `phosphor-icons/raw` (los mismos SVG sin optimizar que `assets/`).
- Origin UI: solo `apps/origin` y `apps/ui` (MIT según su `LICENSING.md`). El resto del repositorio
  es AGPL-3.0 y no se copió. El `LICENSE` AGPL-3.0 de su raíz sí está en `_sources/origin-ui/LICENSE`
  (y en `_licenses/origin-ui/`) solo como referencia: no se aplica a las carpetas copiadas.
- Los `.gitignore`, `.gitattributes` y `.gitmodules` originales se renombraron a `*.original`
  para que no alteren este repositorio.

## Restricciones y avisos de licencia

- **No incorporadas por su licencia** (aunque el repositorio es público, este repo también lo es y su
  licencia no permite redistribuirlas así):
  - *Float UI* (MarsX-dev/floatui): prohíbe distribuir los componentes fuera de un producto final.
  - *Hover.css* (IanLunn/Hover): MIT solo para uso personal/open source; el uso comercial requiere
    licencia de pago, y AurevixWeb es un proyecto comercial.
  - *Remix Icon* (Remix-Design/RemixIcon): su licencia v1.0 (2026) prohíbe ofrecer los iconos como
    colección descargable independiente.
  - *Tailwind UI / Tailwind Plus*: de pago, sin descarga ni redistribución autorizada. No se intentó.
  - *React Bits* (DavidHDev/react-bits): **descargada y después eliminada.** No es la licencia MIT
    estándar con la «Commons Clause» habitual, sino un texto propio:
    - Solo permite usar, copiar, modificar y distribuir el software **«como parte de una
      aplicación, web o producto»**.
    - Su restricción permite cualquier uso, también comercial, siempre que no se vendan,
      sublicencien ni **redistribuyan los componentes en sí, solos, en un paquete o portados**.
      Lo mismo vale para sus herramientas y sonidos, y para lo exportado con ellas cuando se
      distribuye por separado.
    - Una copia en un repositorio público es una colección de sus componentes fuera de una
      aplicación, lo que podría ser la redistribución que prohíbe. Por eso se eliminaron
      `_sources/react-bits/` (2.791 archivos) y `_licenses/react-bits/`, se quitó del catálogo y de
      `_scripts/descargar.sh`, y se dejó solo una ficha sin código en `_referencias/react-bits.md`.
    - Se comprobó que no quedan copias de sus archivos en otras carpetas: ningún archivo de la
      colección coincide (SHA-256) con los 8.618 archivos de 300 bytes o más de su repositorio. Solo
      hay menciones y URLs de reactbits.dev en la documentación de shadcn/ui y Animata.
    - **Historial:** la rama de la PR se reescribió en un único commit sin React Bits, sobre el
      `main` de ese momento. Los commits con su código (`d4e2d4d` y `13bcf1c`) ya no están en la
      rama ni entrarán en `main`. GitHub puede conservar copias (cronología de la PR, acceso por
      identificador); eliminarlas por completo requiere solicitarlo a su soporte.
    - Usar un componente de React Bits en un servicio comercial o en webs de clientes exige evaluar
      antes su licencia para ese caso concreto. No debe darse por hecho que está permitido.
- **Incorporadas con condiciones** que hay que respetar al usarlas:
  - *Preline*: Fair Use License, no se puede usar para crear un producto competidor de Preline;
    exige atribución con enlace.
  - *Animate.css*: Hippocratic License 2.1 (condiciones de derechos humanos).
  - *Simple Icons*: los SVG son CC0 pero los logotipos son marcas de sus propietarios.
  - *Uiverse*: MIT; se agradece atribución al autor (está en el nombre de cada archivo y en el catálogo).
  - *Origin UI*: ver «Qué se ha excluido al copiar».
  - Las licencias de estas tres bibliotecas se comprobaron el 2026-10-24 en sus fuentes oficiales
    (repositorio de GitHub y paquete de npm). Sus **webs no se pudieron consultar** (dominios
    inaccesibles desde el entorno de descarga), así que lo que publiquen allí no está verificado.
    Notas en `_licenses/<biblioteca>/`.
    - *TW Elements*: el `LICENSE` del repositorio es MIT. Su `package.json` remite a un
      `License.txt` que no está en el repositorio pero sí en el paquete oficial de npm
      `tw-elements@2.0.0` («MIT license for TW Elements Free», copiado en
      `_licenses/tw-elements/`). Los `.min.js` y el `.min.css` copiados son idénticos (SHA-256) a
      los de ese paquete. Su cabecera remite además a https://tw-elements.com/license/, no consultada.
    - *loading.io css-spinner*: sin archivo LICENSE. Su README dice que los loaders son CC0 (se
      agradece un enlace, sin ser obligatorio) y el resto del código MIT. Su `package.json` y el
      paquete de npm `@loadingio/css-spinner@2.0.2` declaran CC0-1.0. Incluye su web de
      demostración (`web/`, 342 archivos) con librerías de terceros (`web/static/assets/lib/`:
      Bootstrap 4.6.0 y librerías ld*/plotdb, MIT o BSD), algunas sin archivo de licencia propio.
    - *Loaders.css*: sin archivo LICENSE, pero su README contiene el texto MIT completo con el aviso
      «Copyright (c) 2016 Connor Atherton». Su `package.json` y el paquete de npm
      `loaders.css@0.1.2` declaran MIT.

La cláusula 4 del `LICENSE` raíz excluye `biblioteca-ui/` de la licencia de AurevixWeb (ver
`../LICENSE-TERCEROS.md`). Esa exclusión no cumple por sí sola las obligaciones de cada licencia.

## Publicación en GitHub Pages

Jekyll ignora las carpetas que empiezan por `_`. Comprobado compilando con la misma versión que usa
GitHub Pages (`github-pages` 232, Jekyll 3.10.0):

- Se publican 4 archivos: `index.html`, `LICENSE-TERCEROS.html`, `LICENSE-TERCEROS.md` y `README.md`
  (estos dos últimos como texto, sin procesar).
- No se publican `_sources/`, `_catalogo/`, `_licenses/`, `_reports/`, `_scripts/` ni `.gitattributes`.

En `_sources/` hay 4.351 archivos con *front matter* (`---` al inicio), 263 de ellos con sintaxis
de plantilla (llaves dobles o etiquetas de llave y porcentaje), que Jekyll procesaría si no estuvieran en una carpeta `_…`.

## Errores

- `Meraki-UI/meraki-ui`: no existe; el repositorio correcto es `merakiuilabs/merakiui` (descargado).
- `uiverse.io`: inaccesible desde este entorno (la política de red rechaza la conexión). No se pudo
  revisar sus condiciones de uso ni si hay una exportación oficial más reciente.
- shadcn/ui: 10 ejemplos `*-form` aparecen en su `registry.json` pero los archivos no existen en el
  repositorio original (`checkbox-form-multiple`, `checkbox-form-single`, `combobox-form`,
  `date-picker-form`, `input-form`, `input-otp-form`, `radio-group-form`, `select-form`,
  `switch-form`, `textarea-form`). Constan como no verificados.
