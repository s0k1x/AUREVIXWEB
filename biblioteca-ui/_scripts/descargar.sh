#!/usr/bin/env bash
# Vuelve a descargar (o actualiza en una carpeta nueva) las fuentes de biblioteca-ui.
#
# Uso:  bash biblioteca-ui/_scripts/descargar.sh [carpeta_temporal]
#
# - Clona cada repositorio con --depth 1 en la carpeta temporal (por defecto /tmp/biblioteca-ui-clones).
# - Copia a biblioteca-ui/_sources/<nombre>/ solo los archivos de codigo (ver copiar_repo.py).
# - NUNCA sobrescribe archivos que ya existan: para actualizar una fuente, renombra o borra antes
#   su carpeta en _sources/ de forma consciente.
# - Si un clon falla, lo anota en _reports/errores.log y continua con el resto.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
TMP="${1:-/tmp/biblioteca-ui-clones}"
LOG="$ROOT/_reports/errores.log"
mkdir -p "$TMP" "$ROOT/_sources" "$ROOT/_reports"

# repo_github  carpeta_destino  [subrutas...]   (sin subrutas = repositorio completo)
SOURCES=(
  "uiverse-io/galaxy uiverse-galaxy"
  "origin-space/originui origin-ui apps/origin apps/ui LICENSING.md"
  "keenthemes/reui reui"
  "markmead/hyperui hyperui"
  "htmlstreamofficial/preline preline"
  "themesberg/flowbite flowbite"
  "saadeghi/daisyui daisyui"
  "shadcn-ui/ui shadcn-ui"
  "tobiasahlin/SpinKit spinkit"
  "lukehaas/css-loaders css-loaders"
  "animate-css/animate.css animate-css"
  "tabler/tabler-icons tabler-icons"
  "lucide-icons/lucide lucide"
  "tailwindlabs/heroicons heroicons"
  "feathericons/feather feather"
  "phosphor-icons/core phosphor-icons"
  "twbs/icons bootstrap-icons"
  "thedevdojo/pines pines"
  "magicuidesign/magicui magic-ui"
  "mertJF/tailblocks tailblocks"
  "connoratherton/loaders.css loaders-css"
  "SamHerbert/SVG-Loaders svg-loaders"
  "jh3y/whirl whirl"
  "loadingio/css-spinner loading-io-css-spinner"
  "kokonut-labs/kokonutui kokonut-ui"
  "ionic-team/ionicons ionicons"
  "tailwindlabs/headlessui headless-ui"
  "radix-ui/primitives radix-primitives"
  "emilkowalski/sonner sonner"
  "merakiuilabs/merakiui meraki-ui"
  "ibelick/motion-primitives motion-primitives"
  "nolly-studio/cult-ui cult-ui"
  "codse/animata animata"
  "mantinedev/ui.mantine.dev mantine-ui"
  "simple-icons/simple-icons simple-icons"
  "akveo/eva-icons eva-icons"
  "mdbootstrap/TW-Elements tw-elements"
  "tremorlabs/tremor tremor"
)

for entry in "${SOURCES[@]}"; do
  read -r repo dest subs <<<"$entry"
  clone="$TMP/${repo//\//_}"
  if [ ! -d "$clone/.git" ]; then
    if ! git clone -q --depth 1 "https://github.com/$repo.git" "$clone"; then
      echo "$(date -u +%FT%TZ) ERROR clonando $repo" | tee -a "$LOG"
      continue
    fi
  fi
  # shellcheck disable=SC2086
  python3 -I "$HERE/copiar_repo.py" "$clone" "$ROOT/_sources/$dest" "$repo" $subs
done

# Duplicados generados que se eliminan tras copiar (se documentan en PROCEDENCIA.json de cada fuente):
#   reui/public/r (registro JSON generado) y phosphor-icons/raw (SVG sin optimizar).
# Excluidas por su licencia, no anadir sin revisarla: React Bits (DavidHDev/react-bits, ver
#   _referencias/react-bits.md), Float UI, Hover.css, Remix Icon y Tailwind UI.
echo "Hecho. Regenera el catalogo con: python3 -I $HERE/construir_catalogo.py"
