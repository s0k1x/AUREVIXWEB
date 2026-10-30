# Auditoría del repositorio — registro verificable

> Documento vivo. Cada hallazgo lleva un ID, su gravedad, dónde está, qué se hizo y cómo se comprobó.
> Última actualización: ver el historial de git de este archivo.

## 1. Alcance real (medido, no estimado)

Archivos rastreados por git: **62.599**.

| Grupo | Qué es | Archivos | Tratamiento |
|---|---|---|---|
| **A. Sitio propio** | HTML, CSS, JS, SQL, funciones edge, scripts, library/, config | **170** (89 de texto con 23.351 líneas, 3 `.ts`, 78 binarios: 48 PNG, 28 woff2, 1 ico, `.nojekyll`) | **Revisión línea a línea** |
| **B. Herramientas de IA** | `.agents/` (135), `agent/` (62, copia duplicada de `.agents/`), `.claude/` (19, enlaces a `.agents/`), `skills-lock.json` | 217 | Son skills de terceros, no código del sitio. Se revisan **solo** en seguridad: secretos, scripts peligrosos y si se publican |
| **C. Biblioteca de referencia** | `biblioteca-ui/` (componentes UI de terceros: shadcn, magic-ui, reui…) | **62.212** (99,4 %) | **No se audita línea a línea** (no es código tuyo ni se despliega en el sitio). Se comprueba: secretos, si se publica, licencias |

## 2. Fases

- F0 Inventario y alcance
- F1 Seguridad (secretos, Supabase, funciones edge, XSS, autenticación)
- F2 Código JS línea a línea
- F3 HTML/CSS: diseño, accesibilidad, responsive, SEO
- F4 Terceros, dependencias y licencias
- F5 Correcciones, pruebas y cierre

## 3. Hallazgos

Gravedad: **A** alta · **M** media · **B** baja · **I** informativo. Estado: ✅ corregido y probado · 🔶 propuesto/pendiente · 👤 requiere acción del propietario.

### F1 · Seguridad

#### Comprobado sin hallazgos
- **Secretos en el árbol de trabajo**: búsqueda por patrones (claves `sb_secret_`, JWT, Gemini `AIza`, Brevo `xkeysib-`, OpenWA, GitHub, AWS, claves privadas…) sobre **todos** los archivos, incluido `biblioteca-ui`: **0 secretos reales**. Solo aparece la clave *publishable* de Supabase en `config.js` (pública por diseño) y 3 falsos positivos (fuentes en base64).
- **Secretos en el historial** (106 commits, todas las ramas, sin `biblioteca-ui` ni SVG): **0 coincidencias**; ningún archivo `.env`, `.pem`, `.key` ni de credenciales fue añadido jamás.
- **RLS**: las 14 tablas de `public` tienen RLS activado y políticas de lectura/escritura coherentes (revisadas una a una).
- **Propietarios reales** (consultado en la base): un único propietario (`aurevixweb@gmail.com`), 2 trabajadores; las 6 cuentas tienen el correo verificado. El correo `senorsevillamario@gmail.com` que aparece en `supabase/migraciones/esquema.sql` **no** tiene acceso (solo es un resto del archivo).
- **Storage**: un bucket `archivos`, privado, límite 25 MB; políticas por pedido correctas; la lectura pública solo cubre el prefijo `pedido/web/versión/` de las webs publicadas (el prefijo se genera a partir de un UUID, no puede quedar vacío).
- **Funciones SECURITY DEFINER**: todas con `search_path` fijo. Las 4 que el asesor de Supabase marca como ejecutables por `anon` (`es_equipo`, `es_propietario`, `es_mi_pedido`, `cupon`) **deben** serlo (las políticas RLS las invocan con el rol del usuario) y no filtran nada.

#### Hallazgos
| ID | Gravedad | Dónde | Hallazgo | Estado |
|---|---|---|---|---|
| S-01 | **A** | `supabase/functions/notificar` + política `av_crear` | *(introducido en v58)* Cualquier usuario podía insertar avisos propios con texto libre y `notificar` enviaba el correo a `perfiles.email`, que el usuario puede editar → se podía usar la marca para mandar correos con texto arbitrario a terceros (phishing/spam). | 🔶 |
| S-02 | M | `notificar` / `correo` | La cuota gratuita de Brevo (300/día) es compartida con los códigos de acceso: un abuso agotaría el envío de códigos. Sin tope por destinatario. | 🔶 |
| S-03 | M | `pedidos_crear` | El precio lo calcula el navegador y la base no lo valida: un cliente podía crear un pedido con `total` arbitrario. | 🔶 |
| S-04 | B | `limitar_cliente` | Un cliente podía volver a poner `pagoEstado='verificando'` en un pedido ya pagado y tocar `created_at`. | 🔶 |
| S-05 | B | permisos de tabla | `anon` y `authenticated` tienen `TRUNCATE`, `TRIGGER` y `REFERENCES` sobre todas las tablas (valores por defecto de Supabase). `TRUNCATE` no pasa por RLS. | 🔶 |
| S-06 | B | `avisos` UPDATE | El usuario podía modificar cualquier campo de sus avisos, no solo `leido`. | 🔶 |
| S-07 | B | JSON sin límite | Ninguna tabla limita el tamaño de `datos`. | 🔶 |
| S-08 | B | `correo` | El recibo se enviaba a `clienteEmail` (dato del pedido, controlado por el cliente) o `emailFact`; debe ir al correo verificado de la cuenta. | 🔶 |
| S-09 | B | `cupon()` | Ejecutable sin sesión: permite adivinar códigos de cupón por fuerza bruta (no hay límite de intentos). | 🔶 informativo |
| S-10 | I | `ajustes` clave `web` | Lectura pública por diseño: expone IBAN/titular, NIF y domicilio (ya son públicos en los textos legales y al pagar). | aceptado |
| S-11 | I | `supabase/migraciones/esquema.sql` | El esquema del repositorio está desactualizado respecto a la base real (faltan 8 tablas y varias funciones) y nombra a otro propietario. | 🔶 |
| S-12 | 👤 | Supabase Auth | No verificable desde aquí: «Confirm email» activado, «Leaked password protection» (el asesor lo marca desactivado), «Secure email change», límite de correos por hora. | 👤 |
