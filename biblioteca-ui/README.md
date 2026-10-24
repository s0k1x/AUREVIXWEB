# biblioteca-ui

Colección privada de código de componentes web (HTML, CSS, JS, JSX/TSX, SVG) copiado de 38
bibliotecas de código abierto. Es independiente del resto de la web: no la usa ninguna página.

**El contenido de terceros no es de AurevixWeb.** Se rige por la licencia original de cada
biblioteca: ver [`LICENSE-TERCEROS.md`](LICENSE-TERCEROS.md). Antes de usar cualquier componente
hay que revisar su licencia. Algunas (Preline, Animate.css, Simple Icons…) tienen condiciones.

**React Bits no está incluida.** Su licencia prohíbe redistribuir sus componentes fuera de una
aplicación, así que se eliminó su código y solo queda una ficha informativa en
[`_referencias/react-bits.md`](_referencias/react-bits.md).

## Estructura

| Carpeta / archivo | Contenido | ¿Se publica en la web? |
|---|---|---|
| `index.html` | Esqueleto del futuro visor (vacío, con `noindex`) | Sí |
| `LICENSE-TERCEROS.md` | Aviso sobre las licencias de terceros | Sí (como página HTML y como `.md`) |
| `README.md` | Este archivo | Sí (como texto, sin procesar) |
| `.gitattributes` | Excluye el código de terceros de las estadísticas de lenguajes de GitHub | No |
| `_sources/<biblioteca>/` | Copia de cada repositorio original (sin `.git`, imágenes, vídeos, fuentes binarias ni lockfiles), con sus licencias, avisos y README originales y un `PROCEDENCIA.json` (repo, commit, fecha, recuentos y exclusiones) | No |
| `_catalogo/componentes.json` | Un registro por componente: biblioteca, nombre, categoría, archivos, licencia, autor (Uiverse) y si está verificado | No |
| `_catalogo/iconos.json` | Un registro por set de iconos: carpeta y número de SVG | No |
| `_catalogo/resumen.json` | Recuentos por biblioteca y por categoría | No |
| `_licenses/<biblioteca>/` | Copia de las licencias de raíz de cada fuente y notas de verificación | No |
| `_referencias/` | Fichas sin código de bibliotecas excluidas por su licencia (`react-bits.md`) | No |
| `_reports/INFORME.md` | Qué se ha descargado, cifras, exclusiones y avisos de licencia | No |
| `_reports/PENDIENTES.md` | Fuentes y tareas pendientes | No |
| `_reports/errores.log` | Errores de descarga | No |
| `_scripts/` | `descargar.sh`, `copiar_repo.py` y `construir_catalogo.py` | No |

Las categorías (`buttons`, `cards`, `inputs`, `loaders`, `backgrounds`…) están en el catálogo y no
como carpetas, para no duplicar el código. En Uiverse, HyperUI, Meraki UI, Animate.css y Animata la
categoría viene de la carpeta original. En el resto se infiere por el nombre (campo
`category`, con `otros` cuando no se pudo deducir).

## Publicación en GitHub Pages

La web se publica desde `main` con Jekyll, que **ignora las carpetas y archivos que empiezan por
`_`**. Por eso todo lo interno está en carpetas `_…`. En la web publicada solo aparecen cuatro
archivos de esta carpeta: `index.html`, `LICENSE-TERCEROS.html`, `LICENSE-TERCEROS.md` y `README.md`. El resto sigue
visible en el repositorio de GitHub, que es público.

`_sources/` también evita otro problema: 4.351 de sus archivos empiezan con *front matter* (`---`)
y 263 de ellos contienen sintaxis de plantilla (llaves dobles o etiquetas de llave y porcentaje). Si Jekyll los procesara podría romper o
ralentizar la publicación de la web principal.

Cuando se desarrolle el visor habrá que decidir cómo servir el código de `_sources/` y el catálogo
(por ejemplo, con un `.nojekyll` en la raíz, que es un cambio fuera de esta carpeta), revisando
antes las licencias.

## Regenerar

```bash
bash biblioteca-ui/_scripts/descargar.sh          # descarga lo que falte (no sobrescribe nada)
python3 -I biblioteca-ui/_scripts/construir_catalogo.py
```
