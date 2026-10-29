---
name: aurevix-diseno
description: Sistema de diseño de AurevixWeb (colores, tipografía, espaciado, botones, tarjetas, movimiento y temporadas). Úsala siempre que crees o cambies cualquier pantalla, sección, componente o correo de esta web, para que todo siga el mismo estilo profesional, sobrio y oscuro. Hecha a mano a partir del CSS del proyecto (equivale a la salida de SkillUI).
---

# Diseño de AurevixWeb

Web en español que vende páginas web a negocios a precio cerrado. El tono es
**profesional y sobrio**: fondo casi negro, un único color de acento, tipografía
grande y mucho aire. El dueño rechazó una versión «demasiado colorida»: no añadir
fondos de colores por sección, degradados llamativos ni varios acentos a la vez.

## Archivos

- `style.css` — tokens y piezas base (botones, tarjetas, cabecera, formularios).
- `componentes.css`, `funciones.css`, `widgets.css`, `inicio.css` — piezas por zona.
- `pulido.css` — ajustes finos de movimiento y tipografía.
- `tema-claro.css` — el mismo diseño en claro (`html[data-tema=claro]`).
- `temporadas.css` + `js/temporada.js` — el acento cambia por temporada (Halloween,
  Navidad…). **Usa siempre `var(--accent)`**, nunca el verde escrito a mano.
- `mundo.css` + `js/mundo.js` — intro en vídeo con scroll (solo ordenador).

## Tokens (oscuro, por defecto)

| Token | Valor | Uso |
|---|---|---|
| `--bg` / `--bg2` | `#0c0c0e` / `#111115` | fondo / franjas alternas (`section.alt`) |
| `--card` / `--card2` | `#16161b` / `#1d1d24` | tarjetas |
| `--field` | `#0f0f12` | campos de formulario |
| `--line` / `--line2` | blanco 9 % / 16 % | bordes |
| `--text` / `--muted` / `--dim` | `#f3f1ea` / `#a19f96` / `#8d8a83` | texto (todos pasan AA, ≥ 4,5:1) |
| `--accent` | `#c8f560` (lima) | botón principal, foco, detalles. Texto encima: `--ink` |
| `--ok` `--warn` `--info` `--danger` | verde, ámbar, azul, rojo | estados |
| `--r` | `18px` | radio de tarjetas; botones y chips en píldora (`999px`) |
| `--max` / `--gutter` | `1880px` / `clamp(18px,3vw,60px)` | ancho y márgenes (`.wrap`) |

Claro: `--bg #f6f5f0`, `--card #fff`, `--text #16161b`, `--muted #5d5b55`; el acento
se oscurece para que el texto blanco se lea.

## Tipografía (alojada en `fuentes/`, sin Google Fonts)

- Titulares: `--fd` **Bricolage Grotesque** 700–800, `line-height:1.06`, `letter-spacing:-.025em`.
- Texto: `--fb` **Instrument Sans** 16 px, `line-height:1.55`.
- Etiquetas y datos: `--fm` **JetBrains Mono** 12.5 px, mayúsculas, `letter-spacing:.08em` (`.eyebrow`).

## Piezas

- Botón: `.btn` (50 px de alto, píldora, 600) + `.btn-primary` (acento) · `.btn-ghost`
  (borde `--line`) · `.btn-dark`. Al pulsar `scale(.97)`.
- Tarjeta: `.card` (`--card`, borde `--line`, radio `--r`, padding 26 px) con la
  profundidad de `temporadas.css` (`--luz`, `--sombra-1..3`).
- Secciones: `<section>` con `padding:92px 0`; títulos con `.eyebrow` + `h2`.
- Iconos: `js/iconos.js` → `icono('nombre')` (trazo 2, `currentColor`). Al pasar el
  ratón se animan con `iconos-vivos.css` (ver allí cómo añadir uno).

## Movimiento

- Curvas: `--e-out cubic-bezier(.2,.8,.2,1)`, `--e-spring cubic-bezier(.23,1,.32,1)`.
- Duraciones cortas: 150–300 ms en interfaz, nunca más de 500 ms salvo la intro.
- Solo `transform` y `opacity`. Respeta `prefers-reduced-motion` y
  `html[data-movimiento=reducido]` (ajuste del usuario en Apariencia).
- Hover solo con `@media (hover:hover) and (pointer:fine)` (en el móvil no se queda pegado).

## Reglas

1. Un solo acento por pantalla; el resto en grises cálidos.
2. Precios con `euros()` y el IVA con `ivaTexto()` (`js/ui.js`).
3. Todo texto nuevo en español → añade su traducción en `js/idioma-en.js`.
4. Al subir cambios, sube `VERSION` en `sw.js` y añade los archivos nuevos a `ARCHIVOS`.
5. Prueba en móvil (390 px) y en ordenador (1440 px), en oscuro y en claro.
