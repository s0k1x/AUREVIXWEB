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
| `manifest.json`, `sw.js`, `icons/` | Lo que la hace instalable como app (PWA) |

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
