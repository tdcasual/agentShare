#!/usr/bin/env sh

set -eu

: "${BACKUP_DIR:=./backups/postgres}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${POSTGRES_SERVICE:=postgres}"

# For the default production topology, run from the deploy directory after sourcing
# `.env.production`. The helper executes inside the Postgres container so the
# compose-internal `postgres` hostname never has to resolve on the host itself.

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"
backup_file="${BACKUP_DIR}/postgres-${timestamp}.dump"

docker compose --env-file "${COMPOSE_ENV_FILE}" -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --format=custom \
  > "${backup_file}"

echo "Postgres backup written to ${backup_file}"

# Rotate old backups - keep last 30
: "${BACKUP_RETENTION_COUNT:=30}"
backup_count=$(find "${BACKUP_DIR}" -name "postgres-*.dump" -type f | wc -l)
if [ "${backup_count}" -gt "${BACKUP_RETENTION_COUNT}" ]; then
  find "${BACKUP_DIR}" -name "postgres-*.dump" -type f -printf '%T@ %p\n' | \
    sort -n | head -n $((backup_count - BACKUP_RETENTION_COUNT)) | \
    awk '{print $2}' | xargs rm -f
  echo "Rotated old backups, keeping last ${BACKUP_RETENTION_COUNT}"
fi
