# React Bits — ficha informativa (sin código)

| Campo | Valor |
|---|---|
| Web oficial | https://reactbits.dev |
| Repositorio oficial | https://github.com/DavidHDev/react-bits |
| Autor | David Haz |
| Licencia | «MIT + Commons Clause License Condition v1.0», texto propio del autor: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md |
| Tipo de contenido | Componentes React animados (JS/TS, con CSS o Tailwind), herramientas y sonidos |
| Versión revisada | commit `e12c22192ac7b4b452c5e2feb9b586d74765d696` (2026-10-19), revisado el 2026-10-24 |
| Componentes en esa versión | 218: 64 Backgrounds, 48 Components, 38 Animations, 35 Micro y 33 TextAnimations, cada uno en 4 variantes (JS+CSS, TS+CSS, JS+Tailwind y TS+Tailwind) |

## Por qué no se incluye su código

Su licencia no es la MIT estándar. Según el texto original:

- solo permite usar, copiar, modificar y distribuir el software *«as part of an application,
  website, or product»* (como parte de una aplicación, web o producto);
- permite cualquier uso, también comercial, siempre que no se vendan, sublicencien ni
  redistribuyan *«the components themselves»* (los componentes en sí), ni solos, ni en un
  paquete, ni portados. La misma restricción alcanza a sus herramientas, a sus sonidos y a lo
  que se exporte con ellas cuando se distribuye por separado.

Una colección de sus componentes en un repositorio público, fuera de una aplicación, podría ser
justo la redistribución que prohíbe. Por eso el 2026-10-24 se eliminó de `biblioteca-ui/` la copia
completa (`_sources/react-bits/`: 2.791 archivos) y la copia de su licencia (`_licenses/react-bits/`).
`_scripts/descargar.sh` ya no la descarga.

El 2026-10-24 se reescribió el historial de la rama de la PR (`claude/download-ui-libraries-yktubi`):
sus tres commits se sustituyeron por uno solo, sin React Bits, sobre el `main` de ese momento. Los
commits que contenían su código (`d4e2d4d` y `13bcf1c`) ya no forman parte de la rama ni entrarán
en `main`. GitHub puede conservar copias de esos commits (por ejemplo, en la cronología de la PR
o accesibles por su identificador); eliminarlas por completo requiere solicitarlo a su soporte. Ver `../_reports/INFORME.md`.

## Uso

Para usar un componente de React Bits en un proyecto, hay que obtenerlo de su fuente oficial,
mantener el aviso de copyright y su licencia, y evaluar antes si ese uso concreto (por ejemplo,
en webs de clientes o servicios comerciales) es compatible con su licencia. No debe darse por hecho
que está permitido sin restricciones.

No se ha copiado aquí ningún código, texto de documentación, imagen ni sonido de React Bits.
