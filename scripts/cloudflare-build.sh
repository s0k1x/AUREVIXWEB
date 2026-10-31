#!/usr/bin/env bash
# Compilación para Cloudflare Pages: copia SOLO lo que es público a dist/.
# En Cloudflare Pages → Settings → Build: comando «bash scripts/cloudflare-build.sh», carpeta de salida «dist».
# Así no se publican supabase/ (SQL y funciones), tests/, scripts/, LEEME, AUDITORIA, etc.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir dist
cp *.html config.js sw.js manifest.json robots.txt sitemap.xml favicon.ico _headers _redirects dist/
cp -R css js icons fuentes promo dist/
# Código y estilos comprimidos (sin espacios ni comentarios) solo en la copia publicada: los originales no se tocan
# y se ven igual. Si esbuild no está disponible, se publica tal cual.
if command -v npx >/dev/null && npx --yes esbuild@0.24.0 --version >/dev/null 2>&1; then
  for f in $(find dist/css -name '*.css') dist/config.js $(find dist/js -name '*.js' -not -path 'dist/js/vendor/*'); do
    case "$f" in
      *.css) npx --yes esbuild@0.24.0 "$f" --minify --outfile="$f.min" --log-level=error ;;
      *)     npx --yes esbuild@0.24.0 "$f" --minify --format=esm --target=es2022 --outfile="$f.min" --log-level=error ;;
    esac && mv "$f.min" "$f" || { echo "Sin comprimir: $f"; rm -f "$f.min"; }
  done
  echo "Código y estilos comprimidos"
fi
# Comprobación: las páginas no deben enlazar a nada que se haya quedado fuera
faltan=0
for f in dist/*.html; do
  for r in $(grep -oE '(src|href)="[a-z0-9_-]+/[^"#?]+' "$f" | sed -E 's/^(src|href)="//' | sort -u); do
    [ -e "dist/$r" ] || { echo "Falta $r (en $f)"; faltan=1; }
  done
done
[ "$faltan" = 0 ] || exit 1
echo "dist/ listo: $(find dist -type f | wc -l) archivos, $(du -sh dist | cut -f1)"
