#!/usr/bin/env sh

set -eu

: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${POSTGRES_SERVICE:=postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "Restore starting from ${BACKUP_FILE}"
echo "Restore safety: Stop API writes before restore and verify the target database is disposable or in maintenance mode."

docker compose --env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  < "${BACKUP_FILE}"

echo "Restore completed for ${POSTGRES_DB}"
