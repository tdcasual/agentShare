#!/usr/bin/env sh

set -eu

: "${DRILL_PROJECT_NAME:=vaultgate-durability-drill}"
: "${DRILL_COMPOSE_FILE:=docker-compose.prod.yml}"
: "${DRILL_ENV_FILE:=.env.durability-drill}"
: "${DRILL_RELEASE_ENV_FILE:=.release.env}"
: "${KEEP_DRILL_STACK:=false}"

case "${DRILL_PROJECT_NAME}" in
  *production*|vaultgate|agentShare)
    echo "Refusing to run a destructive durability drill with project name ${DRILL_PROJECT_NAME}." >&2
    exit 1
    ;;
esac

for required_file in "${DRILL_COMPOSE_FILE}" "${DRILL_ENV_FILE}" "${DRILL_RELEASE_ENV_FILE}"; do
  if [ ! -f "${required_file}" ]; then
    echo "Required drill file not found: ${required_file}" >&2
    exit 1
  fi
done

export COMPOSE_PROJECT_NAME="${DRILL_PROJECT_NAME}"
export COMPOSE_FILE="${DRILL_COMPOSE_FILE}"
export COMPOSE_ENV_FILE="${DRILL_ENV_FILE}"
export COMPOSE_RELEASE_ENV_FILE="${DRILL_RELEASE_ENV_FILE}"

compose() {
  docker compose --env-file "${DRILL_ENV_FILE}" --env-file "${DRILL_RELEASE_ENV_FILE}" \
    -f "${DRILL_COMPOSE_FILE}" "$@"
}

cleanup() {
  if [ "${KEEP_DRILL_STACK}" != "true" ]; then
    compose down -v --remove-orphans >/dev/null
  fi
}
trap cleanup EXIT INT TERM

compose up -d --wait
marker="durability-$(date -u +%Y%m%dT%H%M%SZ)"
compose exec -T postgres psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" <<SQL
CREATE TABLE IF NOT EXISTS vaultgate_durability_probe (
  marker text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO vaultgate_durability_probe(marker) VALUES ('${marker}');
CHECKPOINT;
SQL

./scripts/ops/check-postgres-durability.sh
./scripts/ops/verify-key-recovery.sh

compose stop postgres >/dev/null
compose start postgres >/dev/null
compose up -d --wait

persisted="$(compose exec -T postgres psql -v ON_ERROR_STOP=1 -At \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT COUNT(*) FROM vaultgate_durability_probe WHERE marker = '${marker}'")"
if [ "${persisted}" != "1" ]; then
  echo "Durability marker did not survive the PostgreSQL restart." >&2
  exit 1
fi

if [ -n "${DRILL_SNAPSHOT_HOOK:-}" ]; then
  SNAPSHOT_HOOK="${DRILL_SNAPSHOT_HOOK}" ./scripts/ops/snapshot-postgres-volume.sh
fi

if [ -n "${DRILL_SMOKE_BASE_URL:-}" ] && [ -n "${DRILL_SMOKE_PUBLIC_HOST:-}" ]; then
  PUBLIC_HOST="${DRILL_SMOKE_PUBLIC_HOST}" APP_BASE_URL="${DRILL_SMOKE_BASE_URL}" \
    ./scripts/ops/smoke-test.sh
fi

echo "Durability drill passed for marker ${marker}."
