#!/usr/bin/env bash
# Compilación para Cloudflare Pages: copia SOLO lo que es público a dist/.
# En Cloudflare Pages → Settings → Build: comando «bash scripts/cloudflare-build.sh», carpeta de salida «dist».
# Así no se publican supabase/ (SQL y funciones), tests/, scripts/, LEEME, AUDITORIA, etc.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir dist
cp *.html config.js sw.js manifest.json robots.txt sitemap.xml favicon.ico _headers _redirects dist/
cp -R css js icons fuentes promo dist/
# Comprobación: las páginas no deben enlazar a nada que se haya quedado fuera
faltan=0
for f in dist/*.html; do
  for r in $(grep -oE '(src|href)="[a-z0-9_-]+/[^"#?]+' "$f" | sed -E 's/^(src|href)="//' | sort -u); do
    [ -e "dist/$r" ] || { echo "Falta $r (en $f)"; faltan=1; }
  done
done
[ "$faltan" = 0 ] || exit 1
echo "dist/ listo: $(find dist -type f | wc -l) archivos, $(du -sh dist | cut -f1)"
