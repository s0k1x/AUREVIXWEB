# Pasar aurevixweb.es a Cloudflare Pages

La web ya está preparada: puede seguir en GitHub Pages hasta el día del cambio y no hay que tocar nada del código. Supabase, Brevo y Gemini no cambian, porque se llaman igual desde cualquier hosting.

## Lo que ya está hecho en el repositorio

| Archivo | Para qué sirve |
|---|---|
| `scripts/cloudflare-build.sh` | Copia a `dist/` solo lo público. No sube `supabase/`, `tests/`, `scripts/`, `LEEME.md` ni otros archivos internos, y falla si alguna página enlaza a algo que falta. |
| `_headers` | Cabeceras de seguridad (HSTS, nosniff, anti-iframe ajeno, permisos) y caché: `sw.js` y `config.js` siempre frescos, fuentes e iconos con caché larga. |
| `_redirects` | Las direcciones antiguas `/library/…` y `/biblioteca-ui/…` van a la portada. |
| `404.html` | Igual que en GitHub Pages: muestra las webs publicadas de los clientes (`aurevixweb.es/<nombre>`) y, si no existe, la página de error. |

GitHub Pages ignora `_headers` y `_redirects`, así que no estorban mientras tanto.

## Pasos (unos 20 minutos más la espera del DNS)

1. **Repositorio privado.** En GitHub → Settings del repositorio → *Change visibility* → Private.
   - GitHub Pages en un repositorio privado necesita un plan de pago, así que haz este paso el mismo día del cambio.
2. **Crear el proyecto.** Entra en Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git*.
   - Autoriza solo el repositorio `aurevixweb`.
   - Rama de producción: `main`.
   - Build command: `bash scripts/cloudflare-build.sh`.
   - Build output directory: `dist`.
   - No hacen falta variables de entorno: las claves privadas siguen solo en Supabase.
3. **Probar** en la dirección `*.pages.dev` que te da Cloudflare:
   - La portada y el panel.
   - Entrar con el código.
   - Una web publicada de un cliente (`…pages.dev/<nombre>`).
4. **Pasar el dominio a Cloudflare.** *Add a site* → `aurevixweb.es` → plan Free.
   - Cloudflare copia los registros DNS actuales. Comprueba que estén **todos**, sobre todo los del correo de Brevo: el `TXT` de SPF (`v=spf1 … include:spf.brevo.com …`), los `CNAME`/`TXT` de DKIM (`brevo1._domainkey`, `brevo2._domainkey` o el que te dio Brevo) y el `TXT` de `_dmarc`.
   - Si falta alguno, los correos con el código de acceso y las facturas irían a spam.
   - En tu registrador (donde compraste el dominio), cambia los *nameservers* por los dos de Cloudflare. Tarda de minutos a 24 h.
5. **Dominio propio en Pages.** Ve a tu proyecto → *Custom domains* → añade `aurevixweb.es` y `www.aurevixweb.es`.
6. **www → sin www.** En el dominio → *Rules* → *Redirect Rules* → plantilla «Redirect from WWW to root» (301).
7. **Supabase.** En Authentication → URL Configuration, el *Site URL* sigue siendo `https://aurevixweb.es`, así que no cambia. Si añadiste la dirección `*.pages.dev` para probar, quítala al terminar.
8. **Apagar GitHub Pages.** Cuando `aurevixweb.es` ya cargue desde Cloudflare, ve a Settings → Pages → *Unpublish*. Después puedes borrar el archivo `CNAME`.
9. **Turnstile.** La clave de Turnstile ya es de Cloudflare. Revisa que en su lista de dominios esté `aurevixweb.es`.

## Volver atrás

Vuelve a poner los *nameservers* antiguos o, en Cloudflare DNS, apunta `aurevixweb.es` a GitHub Pages:
- Registros `A`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`.
- Con el archivo `CNAME` en el repositorio.

## La Librería

Ya no forma parte de esta web. Para guardarla en su propio repositorio privado:
1. Crea en GitHub un repositorio **privado y vacío** (por ejemplo `aurevix-libreria`).
2. Ejecuta `bash scripts/separar-libreria.sh <dirección-del-repositorio>`. Copia `library/`, `biblioteca-ui/`, `js/base/zip.js` y el SQL de suscripciones desde el commit `4f6d79e`.

La tabla `suscripciones` de Supabase no se ha borrado.
