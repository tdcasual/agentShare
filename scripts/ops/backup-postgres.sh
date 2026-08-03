#!/usr/bin/env sh

set -eu
umask 077

: "${BACKUP_DIR:=./backups/postgres}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${POSTGRES_SERVICE:=postgres}"

# The release env file pins image digests during deploys. It is optional for
# local/ops invocations: only pass it to docker compose when it exists.
release_env_file_args=""
if [ -f "${COMPOSE_RELEASE_ENV_FILE}" ]; then
  release_env_file_args="--env-file ${COMPOSE_RELEASE_ENV_FILE}"
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
backup_file="${BACKUP_DIR}/postgres-${timestamp}.dump"
trap 'rm -f "${backup_file}"' HUP INT TERM

# Intentional word splitting: release_env_file_args is empty or two words.
docker compose --env-file "${COMPOSE_ENV_FILE}" ${release_env_file_args} \
  -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  sh -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom' \
  > "${backup_file}"
chmod 600 "${backup_file}"
trap - HUP INT TERM

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
