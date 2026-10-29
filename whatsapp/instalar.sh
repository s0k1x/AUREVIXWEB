#!/usr/bin/env bash
# ==========================================================
#  INSTALADOR DE WHATSAPP CON IA · AurevixWeb
#  Se ejecuta UNA vez en un VPS nuevo con Ubuntu 24.04:
#
#    curl -fsSL https://aurevixweb.es/whatsapp/instalar.sh | sudo bash
#
#  Qué hace:
#   1. Instala Docker y activa el cortafuegos (solo SSH, 80 y 443).
#   2. Instala OpenWA (versión fija) y lo arranca.
#   3. Le pone HTTPS automático con Caddy (dirección <ip>.sslip.io).
#   4. Crea la sesión de WhatsApp, una clave solo para esa sesión
#      y el aviso (webhook firmado) hacia la función «whatsapp» de Supabase.
#   5. Pide a WhatsApp un CÓDIGO DE 8 LETRAS para vincular el número
#      desde el móvil (Dispositivos vinculados → Vincular con número).
#   6. Muestra los 4 datos que hay que poner en Supabase.
#  Se puede volver a ejecutar sin romper nada.
# ==========================================================
set -euo pipefail

NUMERO="${NUMERO:-34666962150}"
VERSION="0.26.0"
WEBHOOK="https://jmmwuiuhwxgwnyqectcb.supabase.co/functions/v1/whatsapp"
SESION="aurevix"
DIR=/opt/openwa
DATOS=/root/aurevix-whatsapp.txt
LOCAL=http://127.0.0.1:2785

paso() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }
fallo() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$1"; exit 1; }
[ "$(id -u)" = 0 ] || fallo "Ejecútalo como root: añade «sudo» delante."

paso "1/6 Instalando Docker y el cortafuegos"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git jq ufw openssl ca-certificates >/dev/null
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh >/dev/null
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

paso "2/6 Instalando OpenWA ${VERSION}"
if [ ! -d "$DIR/.git" ]; then
  git clone -q --depth 1 --branch "v${VERSION}" https://github.com/rmyndharis/OpenWA.git "$DIR"
fi
cd "$DIR"
IMAGEN=""
for t in "$VERSION" "v$VERSION" latest; do
  if docker pull -q "ghcr.io/rmyndharis/openwa:$t" >/dev/null 2>&1; then IMAGEN="ghcr.io/rmyndharis/openwa:$t"; break; fi
done
[ -n "$IMAGEN" ] || fallo "No se ha podido descargar OpenWA. Revisa la conexión del servidor."
printf 'services:\n  openwa-api:\n    image: %s\n' "$IMAGEN" > docker-compose.override.yml
cat > .env <<EOF
NODE_ENV=production
ENGINE_TYPE=whatsapp-web.js
RESOLVE_LID_TO_PHONE=true
EOF
docker compose up -d --no-build openwa-api >/dev/null
printf 'Esperando a que arranque'
for i in $(seq 1 100); do curl -fsS "$LOCAL/api/health" >/dev/null 2>&1 && break; printf '.'; sleep 3; done
curl -fsS "$LOCAL/api/health" >/dev/null 2>&1 || fallo "OpenWA no arranca. Mira el registro con: docker logs openwa-api"
ADMIN="$(docker exec openwa-api cat /app/data/.api-key)"
[ -n "$ADMIN" ] || fallo "No se encuentra la clave de administrador de OpenWA."
api() { local m=$1 r=$2; shift 2; curl -fsS -X "$m" "$LOCAL/api$r" -H "X-API-Key: $ADMIN" -H 'Content-Type: application/json' "$@"; }

paso "3/6 Poniendo HTTPS"
IP="$(curl -4 -fsS https://api.ipify.org)"
DOMINIO="${IP//./-}.sslip.io"
printf '%s {\n  reverse_proxy 127.0.0.1:2785\n}\n' "$DOMINIO" > "$DIR/Caddyfile"
docker rm -f caddy >/dev/null 2>&1 || true
docker run -d --name caddy --restart unless-stopped --network host \
  -v caddy_data:/data -v caddy_config:/config -v "$DIR/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.8.4 >/dev/null
for i in $(seq 1 40); do curl -fsS "https://$DOMINIO/api/health" >/dev/null 2>&1 && break; sleep 3; done
curl -fsS "https://$DOMINIO/api/health" >/dev/null 2>&1 || fallo "El HTTPS no responde en https://$DOMINIO. Comprueba que el proveedor del VPS no bloquea los puertos 80 y 443."

paso "4/6 Creando la sesión, la clave y el aviso a Supabase"
SID="$(api GET "/sessions?name=$SESION" | jq -r '(.data // .)[0].id // empty')"
[ -n "$SID" ] || SID="$(api POST /sessions -d "{\"name\":\"$SESION\"}" | jq -r .id)"
[ -n "$SID" ] && [ "$SID" != null ] || fallo "No se ha podido crear la sesión."
CLAVE="$(api POST /auth/api-keys -d "{\"name\":\"supabase-ia-$(date +%Y%m%d%H%M)\",\"role\":\"operator\",\"allowedSessions\":[\"$SID\"]}" | jq -r .apiKey)"
[ -n "$CLAVE" ] && [ "$CLAVE" != null ] || fallo "No se ha podido crear la clave de la sesión."
SECRETO="$(openssl rand -hex 32)"
# Si ya había un aviso a Supabase (instalación anterior), se sustituye
for w in $(api GET "/sessions/$SID/webhooks" | jq -r --arg u "$WEBHOOK" '(.data // .)[] | select(.url == $u) | .id'); do
  api DELETE "/sessions/$SID/webhooks/$w" >/dev/null || true
done
api POST "/sessions/$SID/webhooks" -d "{\"url\":\"$WEBHOOK\",\"events\":[\"message.received\",\"message.sent\"],\"secret\":\"$SECRETO\"}" >/dev/null \
  || fallo "No se ha podido crear el aviso a Supabase."

paso "5/6 Vinculando el número +${NUMERO}"
estado() { api GET "/sessions/$SID" | jq -r .status; }
[ "$(estado)" = ready ] || api POST "/sessions/$SID/start" >/dev/null 2>&1 || true
for i in $(seq 1 60); do e="$(estado)"; [ "$e" = qr_ready ] || [ "$e" = ready ] && break; sleep 3; done
if [ "$(estado)" = ready ]; then
  echo "El número ya estaba vinculado."
else
  CODIGO="$(api POST "/sessions/$SID/pairing-code" -d "{\"phoneNumber\":\"$NUMERO\"}" | jq -r .pairingCode)"
  printf '\n  En tu móvil: WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo\n'
  printf '  → «Vincular con el número de teléfono» y escribe este código:\n\n'
  printf '        \033[1;33m%s\033[0m\n\n' "$CODIGO"
  printf 'Esperando a que lo escribas (tienes unos minutos)'
  for i in $(seq 1 100); do [ "$(estado)" = ready ] && break; printf '.'; sleep 3; done
  echo
  [ "$(estado)" = ready ] || fallo "No se ha vinculado. Vuelve a ejecutar el instalador para pedir un código nuevo. (Si WhatsApp pide crear una «llave de acceso», este método no funciona con tu cuenta.)"
  echo "¡Vinculado!"
fi

paso "6/6 Listo. Pon estos 4 datos en Supabase (Edge Functions → Secrets)"
umask 077
cat > "$DATOS" <<EOF
OPENWA_URL=https://$DOMINIO
OPENWA_SESION=$SID
OPENWA_CLAVE=$CLAVE
WHATSAPP_SECRETO=$SECRETO
EOF
cat "$DATOS"
cat <<EOF

(Guardados también en $DATOS)
Panel de OpenWA: https://$DOMINIO  (clave de administrador: docker exec openwa-api cat /app/data/.api-key)
Para ver qué pasa: docker logs -f openwa-api
EOF
