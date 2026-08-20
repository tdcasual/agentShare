#!/usr/bin/env sh

# Prints a ready-to-set TRUSTED_PROXY_CIDRS value for the running stack:
# one /32 per IP the `web` service holds on networks it shares with `api`.
# That is the exact peer set whose X-Forwarded-For the API should honor, and
# nothing wider.
#
# Usage (host with docker access):
#   ./scripts/ops/inspect-trusted-proxies.sh                 # Coolify stack
#   COMPOSE_FILE=docker-compose.prod.yml \
#     ./scripts/ops/inspect-trusted-proxies.sh               # Caddy stack
#
# Container IPs change on redeploy (Coolify may also recreate networks), so
# re-run this script after every redeploy and update TRUSTED_PROXY_CIDRS, or
# keep the compose default if you prefer zero maintenance.

set -eu
umask 077

: "${COMPOSE_FILE:=docker-compose.coolify.yml}"
: "${API_SERVICE:=api}"
: "${PROXY_SERVICE:=web}"

api_id="$(docker compose -f "${COMPOSE_FILE}" ps -q "${API_SERVICE}")"
proxy_id="$(docker compose -f "${COMPOSE_FILE}" ps -q "${PROXY_SERVICE}")"
if [ -z "${api_id}" ] || [ -z "${proxy_id}" ]; then
  echo "error: '${API_SERVICE}' and '${PROXY_SERVICE}' must be running (COMPOSE_FILE=${COMPOSE_FILE})" >&2
  exit 1
fi

api_networks=" $(docker inspect -f \
  '{{range $name, $conf := .NetworkSettings.Networks}}{{$name}} {{end}}' "${api_id}")"

cidrs=""
for network in $(docker inspect -f \
  '{{range $name, $conf := .NetworkSettings.Networks}}{{$name}} {{end}}' "${proxy_id}"); do
  case "${api_networks}" in
    *" ${network} "*) ;;
    *) continue ;;
  esac
  ip="$(docker inspect -f \
    "{{(index .NetworkSettings.Networks \"${network}\").IPAddress}}" "${proxy_id}")"
  if [ -n "${ip}" ]; then
    cidrs="${cidrs:+${cidrs},}${ip}/32"
  fi
done

if [ -z "${cidrs}" ]; then
  echo "error: no shared IPv4 network found between '${PROXY_SERVICE}' and '${API_SERVICE}'" >&2
  exit 1
fi

echo "TRUSTED_PROXY_CIDRS=${cidrs}"
echo "# Set this on the api service, then re-run this script after every redeploy:" >&2
echo "# container IPs (and Coolify's per-deployment network) can change." >&2
