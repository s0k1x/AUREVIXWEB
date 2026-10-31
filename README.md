# AurevixWeb

Web de [aurevixweb.es](https://aurevixweb.es): páginas web para negocios a precio cerrado, con área de clientes,
panel del equipo y asistente con IA. Es una web estática (HTML, CSS y JavaScript sin compilar) con
Supabase de base de datos y funciones del servidor.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `/` (raíz) | Las páginas (`index.html`, `panel.html`, `ajustes.html`, guías…), `config.js`, `sw.js`, `manifest.json`, `robots.txt`, `sitemap.xml`. Van en la raíz para que las direcciones de la web (aurevixweb.es/guias…) no cambien. |
| `css/` | Hojas de estilo: base (`style.css`), componentes, portada (`inicio.css`), funciones, panel, trabaja, tema claro, temporadas… |
| `js/base/` | Lo que usa toda la web: datos y sesión (`store.js`), piezas comunes (`ui.js`), iconos, idioma, apariencia, temporadas, avisos, cookies, verificación anti-robots… |
| `js/portada/` | Portada y páginas públicas: `app.js`, calculadora, presupuesto en PDF, antes y después, reservar llamada, revisa tu web, diseños de ejemplo, webs publicadas de clientes. |
| `js/cuenta/` | Zonas con sesión: panel del equipo (`panel.js`), `ajustes.js`, proyecto del cliente, mensajes y archivos, pagos, firma, dominio, mantenimiento, vista previa, brief y SEO. |
| `js/asistente/` | El chat (`asistente.js`) y el robot animado (`mascota.js`). |
| `js/vendor/` | Librerías de terceros alojadas aquí (Supabase, jsPDF, QR). |
| `icons/`, `fuentes/`, `promo/` | Iconos e imágenes, tipografías propias y material de promoción. |
| `supabase/functions/` | Funciones del servidor: `asistente` (IA), `codigo` (entrar con código), `correo` (facturas), `recordatorios` (avisos e informe mensual), `notificar`, `verificar`. Lo común está en `_shared/`. |
| `supabase/migraciones/` | Los SQL de la base de datos, numerados por versión (`v00-esquema.sql`, `v44-…` … `v94-…`): se aplican en ese orden en Supabase → SQL Editor. |
| `supabase/plantillas/` | Plantillas de correo de reserva para Supabase. |
| `scripts/` | Herramientas: compilación para Cloudflare, generador de páginas, iconos e imágenes, vista previa de correos, vídeo promo y lo necesario para publicar la librería aparte. |
| `tests/` | `node tests/pruebas.mjs`: prueba la web entera en un navegador (móvil y ordenador). |
| `docs/` | `LEEME.md` (guía completa y novedades de cada versión), `CLOUDFLARE.md`, `AUDITORIA.md` e `historico/`. |
| `.claude/skills/` | Skills de diseño y animación que usa Claude al trabajar en la web (`aurevix-diseno` es la guía de estilo propia). |

## Probar en local

```bash
python3 -m http.server 8080        # y abre http://localhost:8080 (sin Supabase funciona en modo demo)
node tests/pruebas.mjs             # pruebas completas
```

Al cambiar algo, sube `VERSION` en `sw.js` (y añade los archivos nuevos a su lista). Todo lo demás está en
[`docs/LEEME.md`](docs/LEEME.md).

© AurevixWeb. Todos los derechos reservados. Ver `LICENSE`.
