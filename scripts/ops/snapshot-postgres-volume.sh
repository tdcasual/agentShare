#!/usr/bin/env sh

set -eu

: "${SNAPSHOT_HOOK:?SNAPSHOT_HOOK must point to an executable storage-provider snapshot command}"
: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${POSTGRES_SERVICE:=postgres}"
: "${POSTGRES_DATA_LOCATION:=postgres-data}"

if [ ! -x "${SNAPSHOT_HOOK}" ]; then
  echo "SNAPSHOT_HOOK is not executable: ${SNAPSHOT_HOOK}" >&2
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV_FILE}" --env-file "${COMPOSE_RELEASE_ENV_FILE}" \
    -f "${COMPOSE_FILE}" "$@"
}

snapshot_id="vaultgate-$(date -u +%Y%m%dT%H%M%SZ)"
paused=false
resume_postgres() {
  if [ "${paused}" = "true" ]; then
    compose unpause "${POSTGRES_SERVICE}" >/dev/null
  fi
}
trap resume_postgres EXIT INT TERM

compose exec -T "${POSTGRES_SERVICE}" psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "CHECKPOINT" >/dev/null
compose pause "${POSTGRES_SERVICE}" >/dev/null
paused=true

"${SNAPSHOT_HOOK}" "${POSTGRES_DATA_LOCATION}" "${snapshot_id}"

compose unpause "${POSTGRES_SERVICE}" >/dev/null
paused=false
trap - EXIT INT TERM
echo "Crash-consistent PostgreSQL storage snapshot completed: ${snapshot_id}"
