#!/usr/bin/env bash
# Pasa la Librería (library/ y biblioteca-ui/) a su propio repositorio privado, con su historial.
# 1) Crea en GitHub un repositorio PRIVADO y vacío, por ejemplo «aurevix-libreria».
# 2) Ejecuta desde la raíz de este repositorio:
#      bash scripts/separar-libreria.sh git@github.com:s0k1x/aurevix-libreria.git
# El último commit de la web que aún contiene la librería es 4f6d79e (rama claude/download-ui-libraries-yktubi).
set -euo pipefail
DESTINO="${1:?Pon la dirección del repositorio nuevo}"
ORIGEN_COMMIT="${2:-4f6d79e}"
TMP="$(mktemp -d)"
git worktree add --detach "$TMP/web" "$ORIGEN_COMMIT"
mkdir -p "$TMP/libreria"
cp -R "$TMP/web/library" "$TMP/web/biblioteca-ui" "$TMP/libreria/"
mkdir -p "$TMP/libreria/js" "$TMP/libreria/supabase"
cp "$TMP/web/js/zip.js" "$TMP/libreria/js/"                     # library.js lo importa con ../js/zip.js
cp "$TMP/web/supabase/libreria-v60.sql" "$TMP/libreria/supabase/" # tabla «suscripciones»
git worktree remove --force "$TMP/web"
cd "$TMP/libreria"
cat > README.md <<'TXT'
# Librería de componentes de AurevixWeb (privada)
Separada de la web principal (aurevixweb.es) en la v88.
- `library/`: buscador y descargas (index.html, library.js, índices).
- `biblioteca-ui/`: los componentes con sus licencias.
- `supabase/libreria-v60.sql`: tabla de suscripciones (sigue en el mismo proyecto de Supabase).
Se puede publicar aparte en Cloudflare Pages (proyecto propio) si algún día vuelve a ser pública.
TXT
git init -q -b main && git add -A && git commit -q -m "Librería separada de la web principal"
git remote add origin "$DESTINO" && git push -u origin main
echo "Listo: $DESTINO"
