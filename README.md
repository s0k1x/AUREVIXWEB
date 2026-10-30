# AurevixWeb

Web de [aurevixweb.es](https://aurevixweb.es): páginas web para negocios a precio cerrado, con área de clientes,
panel del equipo y asistente con IA. Es una web estática (HTML, CSS y JavaScript sin compilar) con
Supabase de base de datos y funciones del servidor.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `/` (raíz) | Las páginas (`index.html`, `panel.html`, `ajustes.html`, guías…), `config.js`, `sw.js`, `manifest.json`, `robots.txt`, `sitemap.xml`. Están en la raíz para que las direcciones de la web no cambien. |
| `css/` | Hojas de estilo: base (`style.css`), componentes, portada (`inicio.css`), funciones, panel, tema claro, temporadas… |
| `js/` | Módulos de la web: `app.js` (portada), `panel.js`, `ajustes.js`, `store.js` (datos), `ui.js` (piezas comunes), `mascota.js` (el robot del asistente)… |
| `js/vendor/` | Librerías de terceros alojadas aquí (Supabase, jsPDF…). |
| `icons/`, `fuentes/`, `promo/` | Iconos e imágenes, tipografías propias y material de promoción. |
| `supabase/functions/` | Funciones del servidor: `asistente` (IA), `codigo` (entrar con código), `correo` (facturas), `recordatorios` (avisos e informe mensual), `notificar`, `verificar`. Lo común está en `_shared/`. |
| `supabase/migraciones/` | Los SQL de la base de datos, por versión. Se pegan en Supabase → SQL Editor. |
| `supabase/plantillas/` | Plantillas de correo de reserva para Supabase. |
| `scripts/` | Herramientas: compilación para Cloudflare, vista previa de correos, generador de páginas e imágenes. |
| `tests/` | `node tests/pruebas.mjs`: prueba la web entera en un navegador (móvil y ordenador). |
| `docs/` | `LEEME.md` (guía completa y novedades de cada versión), `CLOUDFLARE.md`, `AUDITORIA.md` e `historico/`. |

## Probar en local

```bash
python3 -m http.server 8080        # y abre http://localhost:8080 (sin Supabase funciona en modo demo)
node tests/pruebas.mjs             # pruebas completas
```

Al cambiar algo, sube `VERSION` en `sw.js` (y añade los archivos nuevos a su lista). Todo lo demás está en
[`docs/LEEME.md`](docs/LEEME.md).

© AurevixWeb. Todos los derechos reservados. Ver `LICENSE`.
