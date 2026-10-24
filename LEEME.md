# AurevixWeb · web de servicios + PWA

© AurevixWeb. Todos los derechos reservados. Ver `LICENSE` (no es código abierto).

## Qué hay dentro
| Archivo | Para qué sirve |
|---|---|
| `index.html` | Portada: tipos de web y precios, diseños, cómo trabajamos, compra con cuestionario y «Mis proyectos» |
| `plantilla.html` | Pinta los 6 diseños de ejemplo (con el nombre y color del cliente) |
| `trabaja.html` | Página «Trabaja con nosotros» con formulario de candidatura |
| `panel.html` | Panel de **propietario** (resumen, pedidos, clientes, soporte, agenda, actividad, candidaturas, reseñas, equipo) y de **trabajador** (encargos, agenda, disponibles, soporte, ventas, ranking) |
| `ajustes.html` | Ajustes de cada usuario (perfil, cuenta, facturación, cobros, avisos, apariencia, privacidad) y del **negocio** para el propietario |
| `js/colabora.js` | Mensajes, archivos y recibos de cada proyecto |
| `js/sitio.js` | Aplica los ajustes del negocio (precios, plazos, pagos, avisos) |
| `js/cookies.js`, `js/apariencia.js`, `js/avisos.js` | Aviso de cookies, tema claro/oscuro y campana de avisos |
| `LICENSE` | Licencia: todos los derechos reservados |
| `terminos.html` | Términos y condiciones + política de privacidad (se rellena con `config.js → legal`) |
| `config.js` | Valores iniciales: marca, correo, pagos, datos legales, precios, extras, Supabase y asistente |
| `js/proyecto.js` | Etapas del proyecto (dominio, contenido, diseño, revisión, pago final, publicada) |
| `js/asistente.js` | Chat de dudas y «Te ayudo a elegir» |
| `js/plantillas.js` | Textos, colores y fotos de los 6 diseños (puedes añadir más) |
| `js/store.js` | Login y base de datos (Supabase o modo demo) |
| `supabase/esquema.sql` | Tablas y permisos de la base de datos |
| `supabase/functions/asistente/index.ts` | Función que habla con Gemini (la clave nunca va en la web) |
| `supabase/functions/asistente/libreria.ts` | Librería para la IA (v31): modo `web-recursos` y componentes e iconos para `web-html`. Cómo desplegarlo: `INTEGRAR-LIBRERIA.md` |
| `manifest.json`, `sw.js`, `icons/` | Lo que la hace instalable como app (PWA) |
| `library/` | Librería de componentes en `aurevixweb.es/library` (v31): página, índice y núcleo compartido con el generador |
| `library/extra.json`, `library/extra/` | Componentes que añades tú a mano desde el móvil (ver sección 21) |
| `scripts/generar-indice.mjs` | Regenera `library/indice.json` y `library/iconos.json` a partir de `biblioteca-ui/` (necesita ordenador con Node) |
| `js/zip.js` | Crea archivos .zip (lo usan el generador y la librería) |
| `robots.txt`, `.nojekyll` | Que los buscadores no indexen la librería · que GitHub Pages publique `biblioteca-ui/` tal cual |

## 1. Cambia tus datos
Abre `config.js` y cambia:
- `email` → único canal de contacto (no hay WhatsApp)
- `pagos` → tu Bizum, IBAN y titular (ver punto 8)
- `legal` → tu nombre, NIF y domicilio para la página de términos
- `trustpilot` → el enlace a tu página de Trustpilot cuando la crees
- `propietarios` → `aurevixweb@gmail.com` (acceso total)

Con Supabase conectado, **casi todo se cambia sin tocar código** desde *Ajustes → Negocio* (ver punto 13).

El nombre también aparece en `manifest.json` (`name` y `short_name`): cámbialo ahí a mano.

## 2. Modo demo (ya funciona)
Mientras `supabase.url` y `supabase.anonKey` estén vacíos, la web funciona en **modo demo**:
el login es de prueba, los pedidos se guardan solo en ese navegador y el asistente responde con
respuestas automáticas (sin IA). En «Entrar» tienes botones para probar como **Cliente**, **Trabajador** o **Propietario**.

## 3. Conectar Supabase (login real y base de datos, plan gratuito)
Todo se puede hacer desde el móvil en **supabase.com**:

1. **New project** → nombre → contraseña de la base de datos (guárdala) → región **Europe (Frankfurt o Irlanda)**.
2. **SQL Editor → New query**. Abre `supabase/esquema.sql`, pega todo y pulsa **Run**.
   Crea las tablas, los permisos, los avisos automáticos, el tiempo real y la carpeta de archivos.
   **Se puede volver a ejecutar** cuando subas una versión nueva: no borra datos.
   El propietario es `aurevixweb@gmail.com` (el SQL deja solo ese correo como propietario).
3. **Project Settings → API**: copia **Project URL** y la clave **anon public** en `config.js`:
   ```js
   supabase: {
     url: 'https://abcdefgh.supabase.co',
     anonKey: 'eyJhbGciOi...'
   }
   ```
   (La clave *anon* es pública, no pasa nada por ponerla en la web. La *service_role* no la pongas nunca.)
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://s0k1x.github.io/websTdw/`
   - *Redirect URLs*: añade `https://s0k1x.github.io/websTdw/**`
5. **Authentication → Sign In / Providers**:
   - **Email** ya viene activado (el cliente confirma su cuenta con un enlace en su correo).
   - **Google**: en console.cloud.google.com → APIs y servicios → Credenciales → *Crear ID de cliente OAuth* (Aplicación web).
     En «URI de redireccionamiento autorizados» pon `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
     Copia el *ID de cliente* y el *secreto* en Supabase → Google → Enable.
   - **GitHub** (opcional): igual, y pon `loginGithub: true` en `config.js`.

Listo: los clientes entran con Google o email, sus pedidos se guardan en la nube y los ves en el panel desde cualquier dispositivo.

## 4. Activar el asistente con IA (Gemini)
1. Entra en **aistudio.google.com → Get API key** y crea una clave.
2. En Supabase: **Edge Functions → Deploy a new function → Via editor**. Nombre: `asistente`.
   Borra el ejemplo, pega el contenido de `supabase/functions/asistente/index.ts` y pulsa **Deploy**.
3. **Edge Functions → Secrets** → añade `GEMINI_API_KEY` con tu clave.
   (Opcional: `GEMINI_MODEL` para cambiar de modelo; por defecto usa `gemini-3.5-flash-lite`, el más rápido y barato.)

El asistente responde solo con los precios, extras y diseños de `config.js` y `js/plantillas.js`: si cambias un precio, el asistente lo sabe al momento.
Si la IA falla o no está configurada, el chat sigue funcionando con respuestas automáticas.
Revisa los límites y precios de la API de Gemini en ai.google.dev antes de abrir la web al público.

## 5. Etapas de cada proyecto
En *Panel → Pedidos* abre un pedido: arriba tienes la barra de etapas. Pulsa una etapa para cambiarla.

| Etapa | Qué hace el cliente en «Mis proyectos» |
|---|---|
| Pedido recibido | Ve su pedido y puede pagar la señal |
| Dominio | Elige un dominio nuevo (nombre + .com/.es…) o indica el que ya tiene |
| Contenido | Envía textos, horario y redes, y sube fotos y logotipo en «Archivos» |
| Diseño | Espera; puede ver el diseño de partida |
| Revisión | Abre la vista previa, la **aprueba** o **pide cambios** |
| Pago final | Paga el resto |
| Publicada | Ve el enlace a su web y puede valorar el servicio |

Cuando el cliente completa el dominio, el contenido o aprueba la revisión, la etapa avanza sola.
En la ficha del pedido tienes, en tres columnas: gestión (estado, pago, enlaces, tareas internas),
datos del cliente y del pedido, y todo lo que ha enviado el cliente.
- **Enlace de la vista previa**: si lo rellenas, es lo que abre el cliente en la etapa Revisión.
- **Dirección de la web publicada**: es el botón «Visitar mi web» que ve el cliente al final.
- **Exportar HTML**: descarga el diseño elegido como un único archivo `.html`, con el nombre y el color del cliente,
  listo para editarlo y publicarlo (menú, carrito, reservas y animaciones incluidos).

## 6. Herramientas que ya trae
- **Te ayudo a elegir**: el cliente describe su negocio y el asistente recomienda tipo de web, diseño y extras (o responde 3 preguntas).
- **Chat de dudas** en la portada y en «Trabaja con nosotros», con enlace para escribir por correo.
- **Borrador automático** del cuestionario.
- **Tablero** en *Panel → Pedidos*: arrastra las tarjetas entre columnas (en ordenador).
- **Exportar** los pedidos a un archivo que se abre en Excel o Google Sheets.
- **Imagen para compartir** (`icons/og.png`): cámbiala cuando tengas tu marca.

## 7. Diseños de ejemplo: fotos e iconos
- Los 6 diseños usan **fotos de Pexels** (gratis, sin atribución obligatoria). Cada foto es un número (`img: 8218487`).
  Para cambiarla, abre otra foto en pexels.com y copia el número del final de la dirección.
- Las fotos se piden al tamaño justo para cada pantalla y se guardan en el móvil la primera vez, así que después cargan al instante.
- Si una foto no carga, se ve un fondo de color: nunca queda un hueco roto.
- Para la web de un cliente, sustituye esas fotos por las suyas.
- Los iconos están en `js/iconos.js`. En el HTML: `<i data-i="star"></i>`.

## 8. Cobros (lo más barato posible)
Solo aparecen las formas de pago que rellenes en `config.js → pagos`:

| Forma | Coste | ¿Automático? |
|---|---|---|
| **Bizum** a tu número | Gratis | No: el cliente pulsa «Ya he pagado» y tú lo confirmas en el panel |
| **Transferencia** | Gratis | No: igual que Bizum |

Stripe y PayPal se han quitado de la web (v22). Los datos de cobro se cambian desde
**Ajustes → Negocio → «Cobros y comisiones»** (solo el propietario): Bizum, titular e IBAN.

## 9. Vendedores y comisiones
- El % de comisión está en `config.js → comision` (ahora **30**).
- Cada trabajador tiene en *Panel → Mis ventas* su **enlace personal** (`index.html?ref=...`). Los pedidos que llegan por ese enlace en 30 días quedan a su nombre.
- La comisión pasa a «Lista para cobrar» cuando el pedido está marcado como **Pagado**. En *Panel → Equipo* ves cuánto debes a cada vendedor.
- Revisa las condiciones que aparecen en «Trabaja con nosotros» y deja solo las que vayas a cumplir.
  Consulta con una gestoría cómo deben facturar los vendedores sus comisiones.

## 10. Publicarla (GitHub Pages)
1. Sube **todo** el contenido de la carpeta al repositorio (también `js/`, `icons/` y `supabase/`).
2. Settings → Pages → Branch `main` → Save.
3. Cada vez que subas cambios, sube la versión en `sw.js` (ahora `v13` → pon `v14`…).
   La web siempre descarga los archivos nuevos; la versión sirve para limpiar lo guardado en los móviles.

> La web usa módulos de JavaScript: **no funciona abriendo el archivo directamente**; tiene que estar publicada.

## 11. Opiniones y términos
- Cuando la web está publicada, el cliente ve «Valorar el servicio». Las opiniones no salen en la web hasta que las apruebas en *Panel → Reseñas*.
- `terminos.html` es una **plantilla orientativa**. Rellena `config.js → legal` y revísala con un profesional antes de publicar.

## 12. Poner tu dominio (aurevixweb.es) — preparado, para más adelante
La web no necesita cambios de código: se adapta sola a la dirección en la que esté publicada.
Cuando quieras activarlo, en este orden (si cambias el orden, la web puede dejar de abrir):

1. **DNS del dominio** (en tu proveedor, apartado de zona DNS). Para GitHub Pages:
   - 4 registros **A** en `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME** en `www` → `s0k1x.github.io`
   Espera entre unos minutos y unas horas.
2. **GitHub → Settings → Pages → Custom domain**: escribe `aurevixweb.es`, guarda y marca **Enforce HTTPS** cuando aparezca.
   (GitHub crea el archivo `CNAME` solo; no lo añadas a mano antes.)
3. **Supabase → Authentication → URL Configuration**: cambia *Site URL* a `https://aurevixweb.es` y añade en *Redirect URLs* `https://aurevixweb.es/**` (deja también la de github.io).
4. **Google Cloud → tu cliente OAuth → Orígenes autorizados de JavaScript**: añade `https://aurevixweb.es`.
   (El URI de redireccionamiento sigue siendo el de Supabase; no cambia.)
5. En `config.js` cambia `email` por tu correo del dominio y sube `VERSION` en `sw.js`.
6. En `index.html` pon la imagen para compartir con dirección completa: `https://aurevixweb.es/icons/og.png`.

## 13. Funciones (versión 13)
**Clientes**
- *Mis proyectos* con pestañas: **Estado** (lo que le toca hacer), **Mensajes** con el equipo, **Archivos** (sube fotos, logotipo y documentos), **Pagos** (recibos imprimibles) e **Historial**.
- Fecha prevista de entrega y aviso si se retrasa. Puede pedir la cancelación mientras no haya pagado.
- **Ayuda y soporte**: consultas con respuesta del equipo dentro de la web.
- **Campana de avisos** (y notificaciones del navegador si las activa en Ajustes).
- **Cupones de descuento** en el resumen del pedido, **comparador de planes** y **buscador** en las preguntas frecuentes.
- Formulario de **contacto** (también sin cuenta) y **lista de espera** si cierras la agenda.

**Trabajadores**
- Encargos ordenados por fecha de entrega, **Agenda**, mensajes y archivos de cada proyecto con **respuestas rápidas**.
- **Soporte** compartido, **Ranking** de ventas, **objetivo mensual**, **código QR** y **kit de ventas** con textos listos para copiar.
- En Ajustes: disponibilidad y datos de cobro (solo los ve el propietario).

**Propietario**
- Resumen con ingresos por mes, retrasos, consultas sin responder y una lista **«Para hoy»**.
- **Clientes** (gasto total, pendiente, exportar), **Soporte**, **Agenda**, **Actividad** y gestión de cancelaciones.
- En la ficha del pedido: fecha de entrega editable, mensajes, archivos, historial, notas internas y recibo.
- **Ajustes → Negocio**: texto de la píldora de la portada, franja de aviso, aceptar o no pedidos, contacto y horario, **precios, plazos y días de cada plan**, extras, señal, recargo urgente, comisión, formas de pago, **cupones** y asistente. Se aplican al momento a todos los visitantes.

**Todos**
- *Ajustes*: perfil con foto, cambiar correo y contraseña, cerrar sesión en todos los dispositivos, facturación, avisos, **tema claro u oscuro**, tamaño de letra, reducir animaciones, más contraste, descargar tus datos y pedir la baja.
- **Aviso de cookies** (solo necesarias y preferencias; no hay cookies de publicidad ni de estadísticas).

## 14. Licencia
El archivo `LICENSE`, el pie de la web y la sección «Propiedad intelectual» de `terminos.html` dejan claro que **todo es tuyo y está prohibido copiarlo**.
Aunque el repositorio de GitHub sea público para usar GitHub Pages, eso no da permiso a nadie para reutilizarlo.
Si quieres más protección, puedes hacer el repositorio **privado** (GitHub Pages en repos privados necesita un plan de pago) o publicar desde otro servicio.

## 15. Versión 21: descuento de bienvenida y pago por vídeo

**Antes de subir esta versión**, en Supabase → SQL Editor pega el archivo `supabase/actualizacion-v21.sql` entero y pulsa **Run** (se puede repetir sin problema). Crea la tabla de vídeos y actualiza la comprobación de cupones.

- **Descuento de bienvenida**: −10 % con el código `BIENVENIDA10`, solo en la primera web de cada cliente. Se anuncia en «Webs y precios», en cada tarjeta y en el resumen del pedido. Se cambia o se apaga en Ajustes → Negocio → «Descuento de bienvenida».
- **Pago por vídeo** («Trabaja con nosotros»): 15 € por vídeo aprobado, +25 € si pasa de 10.000 visualizaciones en 14 días, hasta 12 vídeos pagados al mes, y además la comisión si alguien compra desde su enlace. Se cambia en Ajustes → Negocio → «Creadores de vídeo».
  - El creador (trabajador) envía el enlace del vídeo desde su panel → «Mis vídeos».
  - Tú lo revisas en el panel → «Vídeos»: aprobar, añadir bonus, marcar pagado o «Pagar todo» a un creador.
- **Más**: aviso de «pedido a medias» en la portada, confeti al enviar un pedido y botón para volver arriba.
- Opcional: vuelve a desplegar la función `asistente` para que la IA conozca el descuento y el pago por vídeo (sin desplegar, el asistente lo responde igual con sus respuestas propias).

## 16. Versión 23: web reforzada y mega prompt con IA
**Qué hay que hacer:** sube el contenido del zip a GitHub y recarga la web con la caché limpia. Para que el mega prompt use Gemini,
vuelve a desplegar la función `asistente` (Supabase → Edge Functions → asistente → pega el nuevo `supabase/functions/asistente/index.ts` → Deploy).
No hace falta ejecutar ningún SQL nuevo.

- **Se acabaron los «Cargando…» infinitos.** Al volver a la web desde otra app, Supabase podía quedarse bloqueado y ninguna consulta terminaba
  (Ayuda y soporte, Guardar ajustes…). Ahora: el aviso de sesión no bloquea nada, ninguna petición espera más de 20 s, el candado de sesión
  no puede atascar la web y, si algo falla, sale el motivo con un botón **Reintentar**.
- **Pedidos sin duplicados:** si la conexión se corta justo al enviar un pedido, al reintentar no se crea otro igual.
- **Guardar ajustes:** guarda todo a la vez, avisa si algo falla y no se queda girando.
- **Móvil:** nada se desliza de lado (pestañas del panel y de Ajustes en filas, etapas del proyecto siempre visibles, filtros en filas,
  tablas de precios como fichas), sin palabras partidas, chat del asistente a pantalla completa, número de la campana entero.
- **Mega prompt con IA** (Panel → abre un pedido → «Mega prompt con IA»): junta cuestionario, plan, extras, diseño, contenido, dominio,
  cambios, mensajes del cliente y notas internas, y Gemini escribe un prompt completo para crear su web. Copiar o descargar en .txt.
  Solo lo puede pedir el equipo. Si la IA no responde, se genera igualmente una versión ordenada sin IA.
- Stripe y PayPal quitados (v22): solo Bizum y transferencia. Los datos se cambian en Ajustes → Negocio → «Cobros y comisiones».

## 17. Versión 24
- **Pagos:** el Bizum, el IBAN y el titular de *Ajustes → Negocio* ya salen al pagar (antes se quedaban los de ejemplo de config.js).
- **Vídeos (panel):** el filtro «Por revisar · Por pagar · Pagados…» ya no monta los textos.
- **iPhone:** en el móvil la cabecera es opaca y ya no se esconde al bajar, así la zona de la hora no enseña la página por detrás.
- **Formas de pago:** el subtítulo se ve siempre; la tarjeta ya no pisa el número con el importe.
- **Reseñas:** son las de tu web (Supabase), no las de Trustpilot. Al publicar una, el cliente ve un botón para opinar también en Trustpilot (se le copia su texto).

## 18. Versión v25 — iPhone: franja de aviso y hora
- La franja de aviso (y la de modo demo) ahora va **debajo** de la cabecera. Antes iba pegada arriba del todo, detrás de la hora del iPhone, y la cabecera dejaba un hueco vacío enorme debajo.
- Pantallas de 360 px: el titular de portada y dos textos pequeños ya no se salen.
- Sube todo y recarga con caché limpia (el service worker pasa a v25).

## 19. Versión v26 — crear la web del cliente con IA y desplegables nuevos

### Qué hay de nuevo
- **Crear la web con IA** (ficha del pedido → botón verde, solo equipo). La IA:
  1. Mira **todo** lo que pidió el cliente: cuestionario, plan, extras, diseño elegido, contenido, dominio,
     mensajes, cambios pedidos, notas del equipo y **sus archivos** (fotos, logotipo, PDF y textos, uno a uno).
  2. Hace un plan desde **9 puntos de vista**: el cliente, su visitante en el móvil, diseñador, experto en
     conversión, redactor, SEO local, accesibilidad, rendimiento y legal (RGPD).
  3. Escribe la web completa en **un solo HTML**. Si eligió un diseño predeterminado, lo respeta y lo adapta a
     su marca; si es a medida, la crea desde cero a su gusto.
  4. La **revisa** otra vez desde esos 9 puntos de vista, aplica las mejoras y le pone nota.
  - Cada versión se guarda. Puedes verla en móvil y ordenador, leer el informe y el plan, editar el código,
    **pedir cambios** («pon el botón de reservar más grande»), descargarla en **.zip** (con las fotos del cliente en
    `img/`) o **enviarla al cliente**: la ve dentro de «Mis proyectos», recibe un aviso y la aprueba o pide cambios.
    Cuando pide cambios, en el generador aparece un botón para pasárselos a la IA.
  - Lo que falte (horario, dirección, datos legales…) queda como **[PENDIENTE: …]** y en la lista del informe.
- **Modelo de IA**: solo para crear webs se usa **Gemini 3.8 Flash** (el mejor calidad-precio de Google ahora mismo:
  0,75 $ por millón de tokens de entrada y 3,75 $ de salida hasta el 31/12/2026; luego sube a 1,50 $ y 7,50 $).
  Una web completa (plan + web + revisión) sale aproximadamente por **0,30-0,60 $** según fotos y tamaño. El chat, «Te ayudo a elegir» y el mega prompt siguen con
  `gemini-3.5-flash-lite`. Para la máxima calidad (unas 3-5 veces más caro) añade el secreto
  `GEMINI_MODEL_WEB` = `gemini-4-argon`.
- **Desplegables propios**: los menús de Estado, Asignado, Pago, Motivo, Tipo… ya no abren el menú gris del iPhone:
  en el móvil sale una hoja desde abajo con el estilo de la web y en el ordenador un menú flotante.
- **Menús de la cabecera** (avisos y tu cuenta): fondo oscurecido detrás, lista completa y «Cerrar sesión» en rojo.
- **Pestañas del panel** en cuadrícula de 5 × 2 (ya no queda «Equipo» sola), filtros que llenan sus filas,
  campos de Ajustes más compactos y barra «Guardar cambios» en una sola fila.

### Qué tienes que hacer
1. Sube todo el contenido del zip a GitHub y recarga con caché limpia (el service worker pasa a v26).
2. Supabase → **SQL Editor** → pega `supabase/actualizacion-v26.sql` → **Run** (crea la tabla de versiones).
3. Supabase → **Edge Functions → asistente** → pega el nuevo `supabase/functions/asistente/index.ts` → **Deploy**.
   No hace falta ninguna clave nueva: usa tu `GEMINI_API_KEY`.

### Tiempo máximo
Cada paso es una llamada separada y la respuesta llega en directo, pero en el plan gratuito de Supabase una función
puede durar como mucho 150 s (400 s en el de pago). Si un paso se corta, pulsa **Reintentar**; si pasa a menudo,
quita algún archivo grande o desactiva la revisión automática (puedes lanzarla luego con «Revisar otra vez»).

## 20. Versión v28 — animaciones suaves y zona de la hora en Safari
- **Animaciones suaves en toda la web**: menús de la cabecera y de navegación (aparecen deslizándose y sus filas entran una a una),
  ventanas (fondo que se funde y caja que sube; en el móvil, hoja desde abajo), desplegables propios, botones, tarjetas, campos y
  contenido que cambia. Una sola curva y tiempos cortos. Se apagan solas con «Reducir movimiento» (Ajustes → Apariencia o el ajuste del móvil).
- **Safari (no la app instalada)**: la web ya no se mete por detrás de la hora, así que la cabecera queda pegada arriba sin hueco.
  En la app instalada sigue ocupando toda la pantalla como antes.
- Service worker v30. La cabecera del móvil va fija (position: fixed) para que Safari pinte bien la zona de la hora al subir y bajar. Sube el zip a GitHub y recarga con la caché limpia.

## 21. Versión v31 — Librería de componentes (aurevixweb.es/library) y componentes en «Crear la web con IA»

### Qué hay de nuevo
- **Librería** en `https://aurevixweb.es/library` (enlace «Librería» en el menú y en el pie). Al estilo de uiverse.io con el diseño de la web:
  buscador (atajo «/»), pestañas por categoría con contador, filtros por biblioteca (con buscador), formato, licencia y
  «Usable en webs de clientes» (activado por defecto para el equipo), orden (Recomendados, Más nuevos, A–Z), chips para quitar filtros,
  favoritos (corazón) con la vista «Mis favoritos» y todo guardado en la dirección para compartir enlaces (también un componente concreto).
  - Cada tarjeta enseña el componente **en vivo** (aislado en un iframe: su código no puede leer tu sesión ni tus datos), su biblioteca y su
    licencia en color (verde permisiva, ámbar con atribución, rojo restringida). Los JSX/TSX, SCSS y TypeScript no se ejecutan sin compilar:
    se ve su código resaltado.
  - Al abrir un componente: vista grande con fondo claro/oscuro/puntos, pestañas por archivo, «Copiar», «Descargar» (.zip con su licencia),
    «Pantalla completa», aviso de licencia con autor y origen, «Anterior/Siguiente» (también con ← →) y, para el equipo, «Usar en mi pedido».
  - **9.901 componentes de 29 bibliotecas + 26.180 iconos de 19 sets.** El índice pesa 2,8 MB (unos 350 KB comprimido) y el código de cada
    componente solo se descarga al verlo. No se indexa en buscadores (`noindex` y `robots.txt`).
- **Licencias** (regla obligatoria): cada componente lleva su biblioteca, su licencia (SPDX), su autor y su origen.
  - *Permisiva* (MIT, Apache-2.0, BSD, ISC, 0BSD, Unlicense, CC0): se puede usar en webs de clientes conservando el aviso.
  - *Con atribución* (CC-BY y licencias que la exigen, como Preline): solo conservando la atribución.
  - *Restringida* (GPL/AGPL/LGPL, CC-BY-NC/SA, solo uso personal, de pago o desconocida): solo consulta; la IA no la usa.
  - Hoy: 9.770 permisivas, 33 con atribución (Preline) y **98 restringidas (Animate.css, Hippocratic License)**, que se pueden consultar
    pero no entran en la IA ni en webs de clientes.
  - «Copiar» y «Descargar» añaden siempre la cabecera con autor, licencia y origen.
- **Crear la web con IA** usa la librería en dos etapas:
  1. **Componentes sugeridos** (antes de crear): «Sugerir con IA» (modo nuevo `web-recursos`, modelo barato) recibe la ficha del cliente y
     hasta 400 candidatos ya filtrados aquí (solo licencias utilizables, por sector, estilo y palabras) y elige como máximo 25, por secciones
     (menú, portada, servicios, galería, precios, opiniones, contacto, pie, extras) con su motivo. Ves la vista previa, puedes quitar o añadir
     desde la librería («Usar en mi pedido»; se comparte entre pestañas), el número de tokens, el coste aproximado y el presupuesto
     (30.000 / 60.000 / 100.000 / 150.000 tokens; por defecto 60.000). Si se pasa, se recortan **solo los sugeridos** de menos
     prioridad; **lo elegido a mano nunca se recorta**: si no cabe, el panel lo avisa antes de gastar nada y ofrece «Subir a …»
     (o quitar alguno). Los elegidos a mano tampoco compiten con los 400 candidatos ni cuentan contra los que elige la IA.
  2. **Crear la web** (el `web-html` de siempre, modelo avanzado) recibe además el código de los elegidos: la función lo lee de
     `aurevixweb.es`, lo trata como datos (nunca como órdenes), y la IA lo adapta a la marca del cliente, unifica estilos y traduce o descarta
     los JSX/TSX (la web final es un único HTML).
  - La web generada conserva el aviso de licencia de cada componente y lleva al final `<!-- Componentes de terceros: … -->` con la lista real.
    El **informe** dice cuáles se han usado, adaptado, descartado o recortado, con su licencia, y el **.zip** incluye `LICENSES-TERCEROS.txt`.
  - En el modo demo funciona «Sugerir (sin IA)» (elige por categoría y estilo) para ver el panel. Si la función desplegada todavía no
    tiene `web-recursos`, «Sugerir con IA» avisa y elige igual sin IA.
  - **Iconos**: ver la sección 22.
- **Service worker v31**: la librería (`/library/` y `/biblioteca-ui/`) no se guarda en el móvil (son miles de archivos).

### Qué tienes que hacer
Los cambios están en GitHub en la rama `claude/download-ui-libraries-yktubi` (no en `main`): la web publicada no cambia hasta que la unas.
1. **Publicar la web** (GitHub, también desde el móvil): *Pull requests → New pull request* → base `main`, compare
   `claude/download-ui-libraries-yktubi` → *Create pull request* → revisa los archivos → *Merge pull request*.
   Incluye `.nojekyll` (archivo vacío en la raíz). **Por qué hace falta:** GitHub Pages pasa la web por Jekyll, y Jekyll no publica las
   carpetas que empiezan por «_», que es donde está el código (`biblioteca-ui/_sources`). Sin `.nojekyll` la librería se ve vacía y la IA no
   puede leer los componentes ni los iconos. La web no usa ninguna función de Jekyll, así que no cambia nada más. A partir de entonces se
   publican los 62.000 archivos de `biblioteca-ui/` (unos 200 MB, por debajo del límite de 1 GB): la publicación tarda más que antes.
2. En GitHub → *Actions*, espera a que «pages build and deployment» salga en verde. Abre `https://aurevixweb.es/library` y recarga con la
   caché limpia (el service worker pasa a v31).
3. **Supabase — hecho el 24/10/2026 (versión 3 de la función, con tu autorización).** Para repetirlo o revisarlo: sigue `supabase/functions/asistente/INTEGRAR-LIBRERIA.md`. Resumen: copia de seguridad del código
   desplegado → añade `libreria.ts` → sustituye `index.ts` por el de GitHub (es el desplegado **más** `web-recursos`; el chat y «Te ayudo a
   elegir» no cambian) → *Deploy*. No hace falta ninguna clave nueva ni ningún SQL. Solo si la web **no** está en `aurevixweb.es`, añade en
   *Secrets* `BIBLIOTECA_URL` con la dirección donde esté publicada (por ejemplo `https://s0k1x.github.io/AUREVIXWEB/`).
   - **Importante:** la función desplegada hoy **solo tiene el chat y «Te ayudo a elegir»** (comprobado el 24/10/2026: es idéntica al
     `index.ts` anterior de GitHub). La versión con «Mega prompt con IA» y «Crear la web con IA» (secciones 16 y 19) no llegó a subirse ni a
     desplegarse, así que esos dos botones hoy no usan la IA. Si conservas el zip de la v23/v26, su `supabase/functions/asistente/index.ts`
     es el que falta: pásalo y se integra con `libreria.ts` (ver la guía). No se ha reconstruido para no inventar sus instrucciones.
4. Cuando quieras, `biblioteca-ui/index.html` (la página vacía antigua) se puede cambiar por una redirección a la librería:
   `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=../library/"><a href="../library/">Librería</a>`
   No se ha tocado nada de `biblioteca-ui/` (su `README.md` dice que las carpetas «_» no se publican: con `.nojekyll` eso deja de ser así).

### Añadir componentes desde el móvil (sin ordenador)
1. En GitHub entra en `library/extra` → *Add file → Create new file* → nombre, por ejemplo, `boton-neon.html` → pega el código
   (HTML con su `<style>`) → *Commit*. Puedes subir también varios archivos (`.css`, `.js`) con *Upload files*.
2. Abre `library/extra.json` → lápiz (*Edit*) → añade una ficha por componente, separadas por comas, dentro de los corchetes:
   ```json
   [
     { "nombre": "Botón neón", "archivo": "boton-neon.html", "categoria": "buttons", "licencia": "MIT",
       "autor": "Nombre del autor", "origen": "https://dirección-de-donde-lo-sacaste", "etiquetas": ["neon", "animado"] }
   ]
   ```
   - `categoria`: buttons, cards, forms, inputs, toggles, checkboxes, radios, loaders, tooltips, navigation, backgrounds, layouts,
     feedback, modals, data-display, animations, text-effects u otros.
   - `licencia`: el identificador SPDX (MIT, Apache-2.0, ISC, CC0-1.0, CC-BY-4.0…). Si no la sabes, `desconocida` (solo consulta).
   - Para varios archivos usa `"archivos": ["tarjeta.html", "tarjeta.css"]`. `"vista": "tw"` si usa Tailwind; `"vista": "code"` si no se puede ejecutar.
3. *Commit*. Al recargar la librería aparece en «Añadidos a mano (licencia)», y la IA ya puede usarlo si su licencia lo permite.

### Añadir una biblioteca entera (necesita ordenador o una sesión de Claude Code)
Hay que descargarla, catalogarla y regenerar el índice. En un ordenador con Git, Python y Node:
`bash biblioteca-ui/_scripts/descargar.sh` (después de añadir la biblioteca a su lista), `python3 -I biblioteca-ui/_scripts/construir_catalogo.py`
y `node scripts/generar-indice.mjs`; luego sube `biblioteca-ui/`, `library/indice.json` y `library/iconos.json`. Antes, comprueba su licencia:
si no permite redistribuirla (como React Bits, Float UI, Hover.css, Remix Icon o Tailwind UI), no la añadas. También puedes pedírselo a
Claude Code en una sesión nueva: no sube nada por su cuenta.

### Regenerar los índices
Si cambia `biblioteca-ui/` (bibliotecas nuevas, iconos nuevos), en un ordenador con Node 18 o más: `node scripts/generar-indice.mjs`.
Reescribe `library/indice.json` y `library/iconos.json` (no toca `biblioteca-ui/`); sube los dos. Los añadidos a mano de
`library/extra.json` no necesitan regenerar nada.

### Volver atrás
- **Web:** en GitHub abre el pull request ya unido → *Revert* → *Merge*. Se quita todo lo de la v31 (la librería deja de verse y el
  generador vuelve a la v30). También se puede borrar solo `.nojekyll` para dejar de publicar `biblioteca-ui/_sources`.
- **Supabase:** pega la copia de seguridad en `index.ts`, borra `libreria.ts` y *Deploy* (detalles en `INTEGRAR-LIBRERIA.md`).

### Qué se ha probado y qué no
Todo en una **copia de prueba** (modo demo, IA falsa inyectada solo en esa copia), nunca contra Supabase ni Gemini reales:
- Galería en 360 px, 390 px y escritorio con la biblioteca real y con 2.000 componentes falsos: búsqueda, filtros, chips, enlaces, favoritos,
  scroll infinito (máximo 40 vistas montadas), código, copiar, descargar, iconos, tema claro, «reducir movimiento», teclado y añadidos a mano.
- Generador con IA falsa: componentes, presupuesto, licencias, informe, `.zip` con `LICENSES-TERCEROS.txt`, y el recorrido completo de los
  iconos (sección 22). También: función sin `web-recursos`, error del proveedor y petición vacía.
- Función: el `index.ts` nuevo responde **igual** que el desplegado en chat, «Te ayudo a elegir», errores y límites (misma petición a
  Gemini, misma respuesta), y `libreria.ts` con Gemini, Supabase y la web simulados (permisos, presupuesto, rutas, tamaños, tiempos,
  inyección de instrucciones, iconos inventados). `tsc --strict` sin errores.
- Vistas previas con Tailwind 3.4.16 y Alpine 3.14.8: los CDN están bloqueados en el entorno de pruebas, así que se usaron los paquetes
  oficiales de npm (Alpine: el mismo archivo que sirve el CDN; Tailwind: su compilador oficial para las clases de los componentes probados).
  40 de 40 componentes con Tailwind y 47 de 47 de Pines con Alpine se ven con sus estilos y Alpine arrancado. Dos de Pines (`combobox` y
  `video`) dan un error de JavaScript propio dentro de su vista aislada.
- **No probado:** Supabase y Gemini reales (la calidad real de lo que escribe la IA), un iPhone real y el CDN «Play» de Tailwind en sí.

## 22. Versión v31 — Iconos para la IA

**El problema:** los iconos de la librería (26.180, de 19 sets) no llegaban nunca a la IA. La librería los excluía de todo lo que se enviaba
(`paraIA` en `library/nucleo.js`), el botón «Usar en mi pedido» estaba desactivado en los iconos, el generador no los mandaba y la función
los descartaba («Los iconos no se envían a la IA»). La IA, si ponía iconos, se los inventaba (SVG dibujados a mano o nombres que no existen).

**Cómo funciona ahora:**
1. **Buscar:** en la librería (pestaña «Iconos») y en el generador hay un buscador que entiende español («teléfono», «tijeras», «coche») e
   inglés. No repite el mismo icono en varios sets.
2. **Elegir:** a mano («Usar en mi pedido» en cualquier icono, o «+» en el buscador del generador) y/o **automáticamente** (casilla
   «Añadir iconos automáticamente», activada por defecto): menú, cerrar, teléfono, email, dirección, horario, ventajas, flecha, estrella y
   los del sector, extras y redes del pedido (por ejemplo, peluquería → tijeras; reservas → calendario; WhatsApp, Instagram). Un solo
   estilo para toda la web (Lucide y, si falta, Tabler); las marcas salen de Simple Icons (CC0; son marcas registradas: solo para enlazar
   a sus perfiles). Máximo 24 por web, sin repetir; **los elegidos a mano van siempre primero y nunca se quedan fuera**.
3. **Enviar:** la IA recibe solo id, nombre y para qué sirve cada icono (unos 25 tokens por icono; con 24 iconos, unos 600 tokens:
   cabe de sobra en el presupuesto, que se calcula con los componentes y los iconos juntos).
4. **Generar:** la IA escribe marcadores vacíos `<svg data-icono="icono/lucide/default/phone" class="…"></svg>`. El panel cambia cada
   marcador por el **SVG original** del archivo de la colección, saneado (sin scripts, estilos globales, enlaces ni ids; colores negros →
   `currentColor`, así se pintan con el color del texto). Conserva `class`, tamaño, `style` y `aria-label`. **Los ids que no estaban en la
   lista se quitan** y aparecen en el informe como «Inventado». La revisión y los retoques pasan por el mismo filtro.
5. **Licencias:** el comentario final «Componentes de terceros» añade una línea por set («Iconos de Lucide (12): phone, mail… · Licencia
   ISC · Autor · Origen») y `LICENSES-TERCEROS.txt` del `.zip` incluye el texto completo de cada licencia y la lista de iconos.

**Comprobar que funciona** (después de desplegar en Supabase la función con `libreria.ts` y la parte de `web-html`):
panel → pedido → «Crear la web con IA» → mira la lista «Iconos» → *Crear la web* → **Informe → Iconos** debe decir «N de M usados» **sin**
«la función desplegada no los ha recibido». En **Código**, cada icono es un `<svg data-icono="…">` con su dibujo dentro.

**Qué falta para que funcione en producción:** que `web-html` de la función envíe la lista a Gemini (`Libreria.prepararWebHtml`, ver
`INTEGRAR-LIBRERIA.md`). Ese modo está en la función v26, que hoy no está desplegada (sección 21, paso 3). Mientras tanto, el informe lo
indica («No enviado») y la web se crea igual, sin iconos de la librería.

**Probado** (simulado): recorrido completo en 1440, 390 y 360 px. El recorrido es: búsqueda en la librería → «Usar en mi pedido» → iconos manuales y automáticos en el
generador → búsqueda y «+» → petición `web-html` con la lista (manuales primero, sin repetidos, sin SVG) → marcadores rellenados con el
SVG original, inventado quitado, `<i>`/`<span>` convertidos, `aria-label` conservado → **render** en la vista previa (24 iconos dibujados,
con tamaño y color del CSS) → retoque que añade otro icono → `.zip` con las licencias de Lucide (ISC) y Tabler (MIT). Además, saneado de un
SVG de cada uno de los 19 sets y de un SVG malicioso, y la parte de la función (ids inventados o con rutas raras, máximo 24, «uso» sin
etiquetas, índice de iconos caído).
**No probado:** con Gemini real (si obedece siempre los marcadores; si no lo hace, los iconos inventados se quitan igualmente).

## 23. Versión v32 — crear la web con IA funcionando, precio del paso 3 y tema claro

- **Crear la web con IA y Mega prompt con IA ya funcionan** (antes fallaban con «Petición incompleta» porque la
  función desplegada solo tenía el chat). Son instrucciones nuevas en `supabase/functions/asistente/web.ts`
  (la versión v23/v26 no se conservó). Solo el equipo puede usarlos.
  - **Modelo:** de momento el mismo del chat, `gemini-3.5-flash-lite` (básico y barato). Para usar uno mejor sin
    tocar código: Supabase → *Edge Functions → Secrets* → añade `GEMINI_MODEL_WEB` con el nombre del modelo
    (por ejemplo `gemini-3.8-flash`) y guarda; no hace falta volver a desplegar.
  - Si un modelo no acepta algún ajuste, la función repite la petición una vez con una configuración más sencilla.
  - El chat y «Te ayudo a elegir» no cambian (mismas instrucciones y mismos ajustes que antes).
- **Paso 3 del pedido (Estilo):** «No, necesito uno» (logotipo) y «Necesito ayuda» (textos) suman su extra y,
  si cambias de opción, ahora se quita y el precio baja. Si el cliente marcó el extra él mismo en «Extras», se respeta.
  Un aviso dice qué se ha añadido o quitado. El estilo y el color no cambian el precio.
- **Tema claro:** la nota «Para empezar pagas la señal…» del resumen ya se lee (antes, verde claro sobre verde claro).
  Comprobado el contraste de todos los textos de la portada y de los 6 pasos del pedido en tema claro y oscuro.
- **Librería, vistas previas a prueba de toques:** muchos componentes son enlaces (`<a href="/">`, `<a href="#">`) o
  formularios; al tocarlos, la vista previa abría la web dentro de la tarjeta o un «404 File not found». Ahora sus
  enlaces y formularios no navegan (los «#id» solo desplazan) y, si un script intenta cambiar de página, la vista se
  restaura sola y, si insiste, muestra «Este componente intenta abrir otra página». Se han probado **todas** las vistas
  previas pulsando cada enlace, botón y formulario: antes fallaban 367 de los 711 componentes que pueden navegar.
- **5 plantillas de Preline** (ai-chat-interface, cms-admin, coffee-shop, digital-agency, personal-portfolio) saltan nada más
  abrirse a un archivo `index-preview.html` que no está en su repositorio: ahora se enseñan como código (sin vista previa
  rota). `scripts/generar-indice.mjs` lo detecta solo si vuelve a pasar.
- **Probado (simulado):**
  - modos nuevos 29/29: solo el equipo, peticiones incompletas, plan con fotos, web con iconos, revisión, retoques,
    reintento y Gemini caído;
  - chat y «Te ayudo a elegir» idénticos a la versión anterior;
  - precio del paso 3: 7/7;
  - contraste en los dos temas.
- **No probado:** con Gemini real (calidad del resultado con el modelo básico).

## 24. Versión v33 — la IA piensa como ingeniero sénior y pide más datos al cliente

- **Más datos del cliente** («Mis proyectos» → Contenido): además de lo de siempre, un bloque desplegable y opcional
  «Más detalles para una web a tu medida» con 12 preguntas:
  - a quién se dirige y qué le diferencia;
  - qué quiere que haga el visitante;
  - contacto público, dirección y zona;
  - opiniones reales y preguntas frecuentes;
  - webs que le gustan, marca y tono;
  - datos legales (nombre o razón social, NIF y dirección fiscal) y algo más que debamos saber.

  Todo llega a la IA y se ve en la ficha del pedido (Entregas). No hace falta tocar la base de datos.
- **La IA pregunta lo que falta:** el plan y la revisión redactan entre 5 y 12 preguntas concretas para el cliente, en tono
  de tú y sin tecnicismos, con el motivo y un ejemplo. En el generador → Informe → «Preguntas para el cliente», el botón
  **«Enviar las preguntas al cliente»** se las manda por el chat de su proyecto, numeradas y sin repetir. Cuando responda,
  vuelve a crear la web y la IA tendrá sus respuestas.
- **Piensa como un ingeniero con más de 20 años de experiencia:**
  - Arquitectura de información y conversión.
  - HTML semántico.
  - Sistema de diseño con variables y tipografía fluida.
  - Presupuesto de rendimiento: LCP < 2,5 s, CLS < 0,1 y peso sin fotos < 100 KB.
  - Accesibilidad WCAG 2.2 AA.
  - SEO local con JSON-LD.
  - Seguridad y RGPD.

  El plan incluye «Decisiones técnicas» (pestaña Plan) y la revisión es una auditoría estricta. La IA razona antes de
  responder (se ve en directo): a fondo en el plan y la revisión, y a nivel medio al escribir la web, para no pasar del
  tiempo máximo de Supabase. Si el modelo no admite el razonamiento, la función repite sin él.
- **Probado (simulado):** función 33/33, recorrido del cliente y de las preguntas 14/14, generador, iconos y contraste.
  **No probado:** con Gemini real.

## 25. Versión v34 — app más rápida, miniaturas de diseños, franja de Safari y revisión completa

- **La app abre más rápido.** El service worker (`sw.js`, v34) sirve al momento el CSS, el JS y las imágenes que ya
  tiene guardados y los actualiza por detrás para la próxima vez. Las páginas siguen yendo por internet primero, como
  máximo 2,5 s. Las páginas piden todos sus módulos a la vez (`<link rel="modulepreload">`) en lugar de uno tras otro.
  `supabase-js` 2.100.1 se sirve desde la propia web (`js/vendor/supabase.js`, con licencia MIT) y el CDN solo se usa
  si falla. En una prueba con un servidor lento simulado (350 ms por petición), volver a abrir la app pasó de unos
  3,7 s a unos 0,9 s.
- **Miniaturas de «Diseños de partida».** La escala y el recorrido de cada miniatura se calculan con JavaScript
  (`colocarDz` en `js/app.js`). Safari no recalculaba el `transform` cuando cambiaba una variable CSS, y por eso la
  web salía encogida con una franja blanca. El fondo de cada tarjeta lleva el color de su plantilla. Al cambiar el
  tamaño, la escala se recoloca sin animación.
- **Franja de arriba en Safari (iOS 26).** La cabecera es opaca y se prolonga hacia arriba (`.header::before`), así
  que el contenido ya no se ve detrás de la barra de estado. Lo mismo en la librería (`.lb-top::before`). El fondo de
  `html` es el del tema.
- **Revisión crítica de toda la web.** Revisadas 18 páginas (inicio, panel, ajustes, trabaja, términos, sin
  conexión, librería y las 6 plantillas) a 360, 390, 768 y 1440 px, en tema oscuro y claro. No hay errores de JS,
  peticiones fallidas, desbordes laterales, imágenes rotas ni ids repetidos. Arreglado:
  - Contraste en el tema claro: textos de la tarjeta «El más pedido», dominio de las miniaturas y la etiqueta
    «recorre la web».
  - Librería en móvil: el botón «Código» salía vacío (20 px). Ahora muestra `</>` y mide 44 px.
  - Pie: en pantallas táctiles, los enlaces tienen una zona de toque de 40 px. En móvil, los botones flotantes de
    subir y del chat ya no tapan los últimos enlaces.
  - Panel: plurales correctos («1 vendedor», «1 pedido», «1 publicada») y cifras cortas en el gráfico de ingresos
    (2,1 k€ en vez de «205…»).
  - El enlace «Saltar al contenido» queda fuera de la pantalla también en iPhone con barra de estado.
- **No probado:** Safari real en iPhone, porque aquí solo hay Chromium. Los arreglos de Safari se basan en cómo
  funciona WebKit y en las capturas recibidas.

### v35 — etiquetas de los formularios en móvil
- Las etiquetas animadas largas («Teléfono, email y WhatsApp que se publican en la web»…) se aplastaban en iPhone porque
  cada letra podía encogerse. Ahora las letras no se encogen y la etiqueta salta de línea entre palabras (`etiquetas()` en
  `js/ui.js`, `.fc-w` en `componentes.css`). Se acortaron dos etiquetas de «Más detalles». `sw.js` v35.
