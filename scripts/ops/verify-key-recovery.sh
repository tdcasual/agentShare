#!/usr/bin/env sh

set -eu

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${API_SERVICE:=api}"

docker compose --env-file "${COMPOSE_ENV_FILE}" --env-file "${COMPOSE_RELEASE_ENV_FILE}" \
  -f "${COMPOSE_FILE}" exec -T "${API_SERVICE}" \
  python -m app.durability keyring-audit
