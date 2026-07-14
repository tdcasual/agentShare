#!/usr/bin/env sh

set -eu

: "${BACKUP_DIR:=./backups/postgres}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${POSTGRES_SERVICE:=postgres}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"
backup_file="${BACKUP_DIR}/postgres-${timestamp}.dump"

docker compose --env-file "${COMPOSE_ENV_FILE}" --env-file "${COMPOSE_RELEASE_ENV_FILE}" \
  -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  sh -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom' \
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
