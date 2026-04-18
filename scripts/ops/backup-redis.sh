#!/usr/bin/env sh

set -eu

: "${BACKUP_DIR:=./backups/redis}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${REDIS_SERVICE:=redis}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"
backup_file="${BACKUP_DIR}/redis-${timestamp}.rdb"
container_backup_file="/tmp/redis-${timestamp}.rdb"

docker compose --env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" \
  redis-cli \
  --rdb "${container_backup_file}" >/dev/null

docker compose --env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}" cp \
  "${REDIS_SERVICE}:${container_backup_file}" \
  "${backup_file}"

docker compose --env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" \
  rm -f "${container_backup_file}"

echo "Redis backup written to ${backup_file}"
