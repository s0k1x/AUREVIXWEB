# Licencias de terceros — biblioteca-ui

La carpeta `biblioteca-ui/` reúne copias de código publicado por terceros: componentes, iconos,
estilos y scripts de 38 bibliotecas de código abierto. **Ese contenido no es propiedad de
AurevixWeb.** Pertenece a sus autores y se rige exclusivamente por la licencia original de cada
biblioteca.

La cláusula 4 del archivo `LICENSE` de la raíz del repositorio excluye expresamente esta carpeta
de la licencia general de AurevixWeb («todos los derechos reservados»). Sus restricciones no se
aplican a este contenido ni limitan los derechos que conceden sus licencias originales.

## Dónde está cada licencia

- `_sources/<biblioteca>/`: la copia de cada biblioteca, con sus archivos de licencia y sus avisos
  de copyright originales, sin modificar. Algunas incluyen además licencias propias en
  subcarpetas, que también se conservan.
- `_sources/<biblioteca>/PROCEDENCIA.json`: repositorio de origen, commit exacto y fecha de
  descarga.
- `_licenses/<biblioteca>/`: copia de las licencias de raíz de cada biblioteca, para consultarlas
  juntas.
- `_catalogo/componentes.json`: licencia aplicable a cada componente (campo `license`).

## Lo que esta exclusión no resuelve

Excluir la carpeta de la licencia de AurevixWeb **no cumple por sí solo las obligaciones de cada
licencia**. Antes de usar o redistribuir cualquier componente hay que leer su licencia y cumplir
sus condiciones. Por ejemplo:

- conservar el aviso de copyright y el texto de la licencia (MIT, ISC, BSD, Apache-2.0);
- conservar los avisos de cambios y de NOTICE cuando la licencia lo exige (Apache-2.0);
- respetar las restricciones de uso de licencias no estándar.

Hay licencias que requieren una evaluación específica antes de usarlas en servicios comerciales o
de redistribuirlas:

| Biblioteca | Licencia | Atención |
|---|---|---|
| Preline | MIT + Preline UI Fair Use License | Prohíbe crear productos competidores de Preline. La redistribución debe incluir ambas licencias, sin alterarlas, y atribución con enlace al repositorio original. |
| Animate.css | Hippocratic License 2.1 | No es una licencia de código abierto estándar: impone condiciones de respeto a los derechos humanos. |
| Simple Icons | CC0-1.0 | Los SVG son de dominio público, pero los logotipos son marcas de sus propietarios. Su uso está sujeto a las normas de cada marca. |
| Origin UI | MIT (solo `apps/origin` y `apps/ui`) | El repositorio original es AGPL-3.0 salvo esas dos carpetas, según su `LICENSING.md`. Solo se copiaron esas dos. El `LICENSE` AGPL de su raíz se conserva como referencia y no se aplica a lo copiado. |
| TW Elements | MIT | El `LICENSE` del repositorio es MIT, y el `License.txt` del paquete oficial de npm (2.0.0) es MIT para la versión gratuita. Los `.min.js` copiados son idénticos a los de ese paquete. Su cabecera remite a la licencia de su web, que no se pudo consultar. |
| loading.io css-spinner | CC0-1.0 (loaders) y MIT (resto) | No incluye archivo LICENSE: la licencia consta en su README, `package.json` y npm. Su web de demostración (`web/`) contiene librerías de terceros (MIT/BSD) con sus propias licencias. Su web no se pudo consultar. |
| Loaders.css | MIT | No incluye archivo LICENSE, pero su README contiene el texto MIT completo con el copyright; `package.json` y npm declaran MIT. Su web no se pudo consultar. |

## Bibliotecas no incluidas por su licencia

- **React Bits:** su licencia (MIT modificada + «Commons Clause» propia) solo permite distribuir
  el código como parte de una aplicación, web o producto, y prohíbe redistribuir los componentes en
  sí, solos o en un paquete. Su código se eliminó de esta carpeta y queda solo una ficha sin código
  en [`_referencias/react-bits.md`](https://github.com/s0k1x/AUREVIXWEB/blob/main/biblioteca-ui/_referencias/react-bits.md). Usar uno de sus componentes en un
  servicio comercial o en webs de clientes exige evaluar antes su licencia para ese caso.
- **Float UI**, **Hover.css** (el uso comercial requiere licencia de pago), **Remix Icon** y
  **Tailwind UI / Tailwind Plus**.

## Archivos propios de la carpeta

Los archivos auxiliares creados para organizar la colección (`README.md`, este archivo,
`index.html`, `_catalogo/`, `_scripts/`, `_reports/` y `_referencias/`) no contienen código de terceros, salvo
nombres, descripciones y rutas extraídos de las fuentes para el catálogo.
