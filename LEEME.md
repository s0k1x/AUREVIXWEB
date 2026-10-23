# Web de servicios + PWA (TuMarca)

## Qué hay dentro
| Archivo | Para qué sirve |
|---|---|
| `index.html` | Portada: tipos de web y precios, diseños, cómo funciona, compra con cuestionario y «Mis pedidos» |
| `plantilla.html` | Pinta los 6 diseños de ejemplo (con el nombre y color del cliente) |
| `trabaja.html` | Página «Trabaja con nosotros» con formulario de candidatura |
| `panel.html` | Panel de **propietario** (pedidos, candidaturas, equipo) y de **trabajador** (encargos) |
| `terminos.html` | Términos y condiciones + política de privacidad (se rellena con `config.js → legal`) |
| `config.js` | ⚙️ **Todo lo que se cambia**: marca, WhatsApp, formas de pago, Trustpilot, datos legales, precios, extras, Firebase |
| `animaciones.css` + `js/efectos.js` | Todas las animaciones: botones (onda, elevación, relleno), tarjetas con foco de luz, apariciones, diálogos, pasos, pestañas, contadores, barra de progreso, cabecera que se esconde |
| `componentes.css` | Kit de componentes (botones con brillo, campos animados, opciones, checks, interruptores, estrellas, pagos, cargando, fondos…) |
| `js/pago.js` | Ventana de pago y de reseñas del cliente |
| `js/plantillas.js` | Textos y colores de los 6 diseños (puedes añadir más) |
| `firestore.rules` | Reglas de seguridad para Firebase |
| `manifest.json`, `sw.js`, `icons/` | Lo que la hace instalable como app (PWA) |

## 1. Cambia tus datos
Abre `config.js` y cambia:
- `marca` → el nombre cuando lo tengas (se cambia solo en toda la web, también en la intro animada)
- `whatsapp`, `email`
- `pagos` → tu Bizum, IBAN y titular (ver punto 7)
- `legal` → tu nombre, NIF y domicilio para la página de términos
- `trustpilot` → el enlace a tu página de Trustpilot cuando la crees
- `propietarios` → **tu email de Google** (el que tendrá acceso total)
- Precios y extras en `PLANES` y `EXTRAS`

El nombre también aparece en `manifest.json` (`name` y `short_name`): cámbialo ahí a mano.

## 2. Modo demo (ya funciona)
Mientras `firebase` esté en `null`, la web funciona en **modo demo**:
el login es de prueba y los pedidos se guardan solo en ese móvil.
En la ventana de «Entrar» tienes botones para probar como **Cliente**, **Trabajador** o **Propietario**.

## 3. Activar el login con Google de verdad (Firebase, gratis)
Todo se puede hacer desde el móvil en **console.firebase.google.com**:

1. **Crear proyecto** → ponle un nombre → sin Analytics.
2. En la portada del proyecto pulsa el icono **`</>` (Web)** → nombre de la app → **Registrar**.
   Te enseña un bloque `firebaseConfig = { apiKey: ..., ... }`. Cópialo.
3. Pégalo en `config.js` en lugar de `firebase: null`:
   ```js
   firebase: {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```
4. **Authentication** → Comenzar → **Método de acceso** → activa **Google** y **Correo electrónico/contraseña**.
5. **Authentication → Configuración → Dominios autorizados** → añade tu dominio
   (por ejemplo `tuusuario.github.io`).
6. **Firestore Database** → Crear base de datos → modo **producción** → elige ubicación `eur3 (europe)`.
7. Firestore → pestaña **Reglas** → borra lo que haya, pega el contenido de `firestore.rules`,
   **cambia `tuemail@gmail.com` por tu email** y pulsa **Publicar**.

Listo: los clientes entran con Google o email, sus pedidos se guardan en la nube
y tú los ves en el panel desde cualquier dispositivo.

## 4. Herramientas que ya trae
- **Te ayudo a elegir**: 3 preguntas y recomienda el tipo de web (con entrega urgente si la piden).
- **Borrador automático**: si el cliente cierra el cuestionario, al volver recupera lo que había rellenado.
- **Filtro de diseños** por tipo de negocio.
- **Tareas por pedido** (diseño, contenido, desarrollo, revisión, publicación): las marca el equipo y el cliente ve la barra de progreso en «Mis pedidos».
- **Tablero** en *Panel → Pedidos*: arrastra las tarjetas entre columnas para cambiar el estado (en ordenador).
- **Exportar** los pedidos a un archivo que se abre en Excel o Google Sheets.
- Atajo **/** para buscar en el panel y número de pendientes en el icono de la app instalada.
- **Imagen para compartir** (`icons/og.png`): la que sale al pegar el enlace en WhatsApp o redes. Cámbiala cuando tengas tu marca.

## 4b. Vendedores y comisiones (Trabaja con nosotros)
- El % de comisión está en `config.js → comision` (ahora **30**). La página «Trabaja con nosotros» y la calculadora usan ese número.
- Cada trabajador tiene en *Panel → Mis ventas* su **enlace personal** (`index.html?ref=...`). Si un cliente entra por ese enlace
  y hace un pedido en los 30 días siguientes, el pedido queda a nombre de ese vendedor.
- La comisión pasa a «Lista para cobrar» cuando el pedido está marcado como **Pagado**.
- En *Panel → Equipo* ves cuánto debes a cada vendedor; cuando le pagues, pulsa «Pagar» y quedan marcadas como cobradas.
- ⚠️ Revisa las ventajas que aparecen en la página (formación en IA, cobro, etc.) y deja solo las que vayas a cumplir.
  Consulta con una gestoría cómo deben facturar los vendedores sus comisiones.

## 4c. Cómo funciona el equipo
- Alguien rellena **Trabaja con nosotros** → te aparece en *Panel → Candidaturas*.
- Pulsas **Aceptar** → pasa a ser **trabajador** y ya puede entrar a su panel.
- También puedes añadir a alguien por email en *Panel → Equipo*
  (tiene que haber iniciado sesión en la web al menos una vez).
- Los trabajadores ven los pedidos **Disponibles**, los **cogen** y van cambiando el estado.
  El cliente lo ve en «Mis pedidos».

## 5. Publicarla gratis (GitHub Pages)
1. Crea un repositorio en github.com y sube **todo** el contenido de la carpeta (también `js/` e `icons/`).
2. Settings → Pages → Branch `main` → Save.
3. Recuerda añadir ese dominio en Firebase (paso 3.5).

> Importante: la web usa módulos de JavaScript, así que **no funciona abriendo el archivo
> directamente** en el móvil; tiene que estar publicada (GitHub Pages, Netlify…).

## 6. Cuando hagas cambios
Sube la versión en `sw.js` (ahora está en `v6` → pon `v7`…) para que los móviles con la app instalada se actualicen.

## 7. Cobros (lo más barato posible)
El cliente paga desde «Mis pedidos» o al terminar el pedido. Solo aparecen las formas de pago que rellenes en `config.js → pagos`:

| Forma | Coste | ¿Automático? |
|---|---|---|
| **Bizum** a tu número | Gratis | No: el cliente pulsa «Ya he pagado» y tú lo confirmas en el panel |
| **Transferencia** | Gratis | No: igual que Bizum |
| **Stripe** (tarjeta, Apple Pay, Google Pay y Bizum online) | 1,5 % + 0,25 € por pago con tarjeta europea; sin cuota mensual | El cobro sí; en el panel lo confirmas tú (Stripe te avisa por email con la referencia del pedido) |
| **PayPal.Me** | 2,9 % + 0,35 € (pagos comerciales) | El importe va ya rellenado; lo confirmas tú |

**Recomendación:** empieza con Bizum + transferencia (gratis). Cuando tengas más pedidos, añade Stripe.

**Configurar Stripe (desde el móvil):**
1. Crea una cuenta en stripe.com y verifica tus datos (para Bizum online te piden el DNI/NIE).
2. Ajustes → Métodos de pago → activa Tarjetas, Apple Pay, Google Pay y **Bizum**.
3. Enlaces de pago → Crear → Producto «Señal / pago de web» → **«Permitir que los clientes elijan el importe»**.
4. En «Después del pago» elige *Redirigir* a `https://TU-WEB/index.html?pagado=1`.
5. Copia el enlace (`https://buy.stripe.com/...`) en `config.js → pagos.stripe`.
La web añade sola la referencia del pedido al enlace, así sabrás qué pedido es en el email de Stripe.

> Para que el pago se marque como pagado **solo** (sin que tú lo confirmes) haría falta una Cloud Function de Firebase
> que escuche a Stripe. Firebase pide para eso el plan de pago por uso (Blaze), que tiene una parte gratuita. Se puede añadir más adelante.

## 8. Opiniones y Trustpilot
- Cuando un pedido pasa a **Entregado**, el cliente ve el botón «Valorar mi web».
- Las opiniones llegan a *Panel → Reseñas* y **no se ven en la web hasta que las publicas**.
- Después de opinar, a todos los clientes se les invita a dejar también su opinión en Trustpilot (si pusiste el enlace).
  Invita a todos por igual: Trustpilot no permite pedir reseñas solo a los clientes contentos.
- Las 3 opiniones con la etiqueta «Ejemplo» solo existen en el modo demo.

## 9. Términos y privacidad
`terminos.html` es una **plantilla orientativa**. Rellena `config.js → legal` y revísala con un profesional antes de publicar.
Los clientes deben aceptarla al confirmar un pedido, al crear cuenta con email y al enviar una candidatura.
