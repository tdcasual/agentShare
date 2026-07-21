#!/usr/bin/env sh

set -eu

: "${BACKUP_FILE:?BACKUP_FILE is required}"
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

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "Restore starting from ${BACKUP_FILE}"
echo "Restore safety: Stop API writes before restore and verify the target database is disposable or in maintenance mode."

# Intentional word splitting: release_env_file_args is empty or two words.
docker compose --env-file "${COMPOSE_ENV_FILE}" ${release_env_file_args} \
  -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  sh -c 'exec pg_restore --clean --if-exists --no-owner --single-transaction --exit-on-error --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"' \
  < "${BACKUP_FILE}"

echo "Restore completed"
