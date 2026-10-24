# Pendientes

## Fuentes sin descargar o incompletas

- **Uiverse.io (web)**: el repositorio `galaxy` tiene 3.802 elementos, pero su último commit es del
  2024-09-02; la web tiene elementos publicados después. No se pudo acceder a uiverse.io desde el
  entorno de descarga (bloqueado por la red). Pendiente: revisar sus condiciones y si existe una API
  o exportación oficial. No hacer scraping si las condiciones no lo permiten.
- **Preline**: el repositorio incluye los plugins JS y 5 plantillas, pero no los cientos de ejemplos
  HTML de su documentación (preline.co). Pendiente: buscar si están publicados en otro repositorio.
- **DaisyUI**: se tienen los CSS de los 61 componentes y la documentación; los ejemplos están
  dentro de los `.md` de docs y no se han separado uno a uno.
- **Flowbite**: los 670 ejemplos están dentro de 70 archivos `.md`; no se han extraído a archivos
  sueltos. Otros repos del ecosistema (flowbite-react, flowbite-svelte, flowbite-blocks gratuitos)
  no se han descargado.
- **Origin UI**: la parte AGPL-3.0 del repositorio no se copió (solo apps/origin y apps/ui, MIT).
- **React Bits**: eliminada por su licencia; queda una ficha en `_referencias/react-bits.md`. El
  historial de la rama se limpió, pero GitHub puede conservar copias de los commits antiguos
  (`d4e2d4d`, `13bcf1c`); eliminarlas requiere solicitarlo a su soporte.
- **Webs de TW Elements, loading.io y Loaders.css**: no se pudieron consultar. Sus licencias están
  comprobadas en el repositorio y en npm, no en las webs (https://tw-elements.com/license/,
  https://loading.io/css/).
- **Lucide**: 1 archivo > 5 MB excluido; era una caché de compilación de Angular, no un componente.

## Restricciones de licencia pendientes de evaluar antes de usar en proyectos

No impiden guardar el código en esta colección, pero hay que evaluarlas en cada uso concreto:

- **Preline** (MIT + Preline UI Fair Use License): no crear productos que compitan con Preline UI;
  al redistribuir, incluir ambas licencias sin alterarlas y atribuir con enlace al repositorio.
- **Animate.css** (Hippocratic License 2.1): condiciones de respeto a los derechos humanos; no es
  una licencia de código abierto estándar.
- **Simple Icons** (CC0-1.0): los SVG son de dominio público, pero los logotipos son marcas de sus
  propietarios y su uso depende de las normas de cada marca.
- **Uiverse.io**: el repositorio `galaxy` es MIT, pero no se han podido revisar las condiciones de
  uso de la web uiverse.io (inaccesible desde el entorno de descarga). Por eso no se ha descargado
  nada de la web, solo del repositorio.

## Fuentes candidatas no revisadas todavía

Comprobar licencia antes de incorporarlas:
Aceternity UI (sin repo público completo), HeroUI/NextUI, Mantine (librería completa), Chakra UI,
Park UI, Ark UI, Untitled UI (parte gratuita), Shadcn blocks gratuitos, Tailwind Elements (repo
antiguo), Animista (sin repo), CSS Gradient/patrones (Hero Patterns, Pattern Monster), Iconoir,
Material Symbols (Apache-2.0, muy grande), Font Awesome Free (SVG, CC BY 4.0), Radix Icons,
Boxicons, Line Awesome, Akar Icons, Uiball loaders (ldrs), Epic Spinners, CSS-Tricks snippets.

## Descartadas por licencia (no reintentar sin permiso del autor)

Float UI, Hover.css (uso comercial), Remix Icon, Tailwind UI / Tailwind Plus y React Bits
(eliminada tras descargarla).

## Tareas siguientes (cuando se pida)

- Visor en `index.html` a partir de `_catalogo/componentes.json` (decidir cómo servir `_sources/`).
- Extraer los ejemplos de Flowbite y DaisyUI a archivos individuales.
- Mejorar la categorización (1.423 entradas en `otros`).
