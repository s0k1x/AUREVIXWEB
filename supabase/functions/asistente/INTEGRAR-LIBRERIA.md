# Función «asistente»: qué hay desplegado y cómo añadir la librería

## Situación comprobada (24/10/2026, solo lectura)

- La función `asistente` desplegada en Supabase (**versión 2**) es **idéntica,
  byte a byte**, al `index.ts` anterior de este repositorio. Solo tiene los
  modos **`chat`** (atención al cliente) y **`elegir`** («Te ayudo a elegir»).
- La tabla `webs_ia` (de la v26) existe en la base de datos, pero la versión
  de la función con los modos `prompt`, `web-plan`, `web-html`,
  `web-revisar` y `web-retocar` (LEEME, secciones 16 y 19) **no está
  desplegada ni en GitHub**. Por eso, hoy:
  - «Mega prompt con IA» muestra el prompt local (sin IA) con el aviso
    «la IA no ha respondido».
  - «Crear la web con IA» falla en el primer paso («Petición incompleta»).
- Si tienes el `.zip` de la v23/v26, su `supabase/functions/asistente/index.ts`
  es el que falta. **No se ha reconstruido ni sustituido**: hace falta el
  original.

> **Desplegado el 24/10/2026 (versión 3 de la función):** `index.ts` y `libreria.ts` de esta carpeta, con
> `verify_jwt` desactivado como antes. La versión 2 (la anterior) es el `index.ts` del commit `7654751`:
> para volver a ella, pégala en `index.ts`, borra `libreria.ts` y pulsa **Deploy**.

## Qué cambia en esta versión (v31)

`index.ts` = el desplegado **sin tocar `chat` ni `elegir`** + 4 líneas:

1. `import * as Libreria from './libreria.ts';`
2. el cuerpo de la petición se lee una vez en `cuerpo` (mismo resultado);
3. `if (modo === 'web-recursos') return await Libreria.responderRecursos(...)`.

`libreria.ts` (nuevo) tiene:

- **`web-recursos`**: la IA (modelo barato, `GEMINI_MODEL`) elige
  componentes de la librería. Comprueba que quien lo pide es del equipo
  (`es_equipo()` de `supabase/esquema.sql`) y responde en directo (SSE).
- **`prepararWebHtml()`** y **`reglasConservar()`**: lo necesario para que
  `web-html`, `web-revisar` y `web-retocar` reciban los componentes y los
  **iconos** elegidos. Se usan cuando recuperes la función v26 (abajo).

Pruebas hechas (simuladas, sin Supabase ni Gemini reales):

- chat, elegir, errores y límites idénticos a la desplegada (14/14);
- `libreria.ts` (35/35);
- `tsc --strict` sin errores.

## Desplegar (solo cuando lo decidas)

1. **Copia de seguridad:** Supabase → Edge Functions → `asistente` → Code →
   copia `index.ts` y guárdalo. (Es el `index.ts` anterior de este
   repositorio: también puedes recuperarlo con
   `git show 7654751:supabase/functions/asistente/index.ts`.)
2. En el editor de la función, crea el archivo `libreria.ts` y pega el de
   este repositorio. Sustituye `index.ts` por el de este repositorio.
   Con la CLI: `supabase functions deploy asistente`.
3. **Deploy.** No hay que cambiar ningún secreto. `BIBLIOTECA_URL` es opcional
   (por defecto `https://aurevixweb.es/`).
4. **Comprueba:**
   - el chat de la web y «Te ayudo a elegir» responden como antes;
   - en el panel → pedido → «Crear la web con IA» → «Sugerir con IA», ya no sale
     el aviso «Se han elegido sin IA».

**Volver atrás:** pega la copia del paso 1 en `index.ts`, borra
`libreria.ts` y pulsa **Deploy**. La web sigue funcionando (sin
`web-recursos` elige los componentes sin IA y lo avisa).

## Cuando recuperes la función v26 (web-plan, web-html…)

En su modo `web-html`, antes de llamar a Gemini:

```ts
const lib = await Libreria.prepararWebHtml(cuerpo);
// 1) añade lib.sistema al final de las instrucciones del sistema
// 2) añade lib.datos al final del texto de los datos
// 3) en el evento final: { fin: true, modelo, motivo, uso, ...lib.fin }
```

En `web-revisar` y `web-retocar` (opcional, recomendado):

```ts
const cons = Libreria.reglasConservar(cuerpo);
// añade cons.sistema a las reglas y cons.datos a los datos
```

`lib.sistema` y `lib.datos` están vacíos si no hay componentes ni iconos:
la web se crea exactamente igual que antes cuando no se usa la librería.
Con esto, la IA recibe la lista de iconos permitidos (id + nombre + uso),
escribe marcadores `<svg data-icono="…"></svg>` y el panel pone el SVG
original y su licencia.
