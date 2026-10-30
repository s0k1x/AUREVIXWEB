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

- `css/style.css` — tokens y piezas base (botones, tarjetas, cabecera, formularios). Todas las hojas están en `css/`.
- `componentes.css`, `funciones.css`, `widgets.css`, `inicio.css` — piezas por zona.
- `pulido.css` — ajustes finos de movimiento y tipografía.
- `tema-claro.css` — el mismo diseño en claro (`html[data-tema=claro]`).
- `css/temporadas.css` + `js/temporada.js` — el acento cambia por temporada (Halloween,
  Navidad…). **Usa siempre `var(--accent)`**, nunca el verde escrito a mano.
- `js/mascota.js` — el robot del asistente: dibujo vectorial por capas animado en código (coreografías calculadas
  fotograma a fotograma con física de muelles). Su color sale de `--m-luz`, `--m-halo` y `--m-logo` (Ajustes → Apariencia).

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
- Duraciones cortas: 150–300 ms en interfaz, nunca más de 500 ms salvo el vuelo del robot del asistente.
- Solo `transform` y `opacity`. Respeta `prefers-reduced-motion` y
  `html[data-movimiento=reducido]` (ajuste del usuario en Apariencia).
- Hover solo con `@media (hover:hover) and (pointer:fine)` (en el móvil no se queda pegado).

## Sin adornos

Nada de rayas diagonales de fondo, brillos de neón alrededor de botones o barras, cintas que corren
ni brillos que recorren tarjetas: superficies lisas (`--bg`, `--bg2`, `--card`) y sombras suaves.

## Reglas

1. Un solo acento por pantalla; el resto en grises cálidos.
2. Precios con `euros()` y el IVA con `ivaTexto()` (`js/ui.js`).
3. Todo texto nuevo en español → añade su traducción en `js/idioma-en.js`.
4. Al subir cambios, sube `VERSION` en `sw.js` y añade los archivos nuevos a `ARCHIVOS`.
5. Prueba en móvil (390 px) y en ordenador (1440 px), en oscuro y en claro.

## Catálogo de movimiento (nombres de la skill animation-vocabulary)

Cada movimiento de la web con su nombre técnico. Antes de añadir uno nuevo, mira si ya existe aquí y reutiliza su curva y su duración.

| Dónde | Nombre | Cómo está hecho |
|---|---|---|
| Secciones al bajar | **Scroll reveal** | Fade in + translate 24 px, `--e-out`, 0,6–0,7 s, una vez |
| Botones | **Press / Tap feedback** | `scale(.97)` en 0,1 s; hover solo con ratón (`hover:hover`) |
| Avisos (toast) | **Slide in / Swipe to dismiss** | Entran y salen por abajo; en el móvil se quitan deslizando (con distancia o velocidad); el tiempo se pausa con el ratón encima |
| Barra de etapas de un proyecto | **Continuity transition** | La línea se llena con `scaleX` (compositing) |
| Maqueta y tarjetas de precios | **3D tilt** + **Perspective** 1100 px | Muelle amortiguado sin bounce, solo con ratón |
| Insignia de éxito | **Flip** (rotateY) + **Reveal** de brillo | Sin overshoot; con partículas que frenan (follow-through) |
| Robot del asistente volando | **Shared element transition** | Sale del botón y se convierte en el avatar del chat; anticipation al despegar, squash & stretch al aterrizar |
| Robot en reposo | **Idle animation** / **Float** | Coreografía en código (`COREO` en `js/mascota.js`): respiración, cabeza con retraso, parpadeo al azar |
| Pantalla de carga | **Fade in / Draw** | Logotipo y nombre suben y aparecen, una línea fina se completa; sin tarjeta |
| «Escribiendo…» del chat | **Pulse** | Solo mientras la IA responde de verdad |
| Precios y cifras | **Tabular numbers** | `font-variant-numeric: tabular-nums` |
| Preguntas frecuentes | **Accordion / Collapse** | Única animación de altura permitida |
| Desplegables y menús | **Origin-aware animation** | Crecen desde su botón; los diálogos, desde el centro |

Reglas que no se rompen: ease-out para entrar y salir y ease-in-out para moverse, nunca ease-in. La interfaz no rebota (el **bounce** es solo para la mascota). Solo se anima transform y opacity (sin **layout thrashing**). Todo respeta el **reduced motion**. La vibración (háptica) va una vez por acción y siempre junto a algo visible.
