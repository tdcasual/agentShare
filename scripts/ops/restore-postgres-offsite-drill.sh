#!/usr/bin/env bash
set -euo pipefail

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is required}"

RESTIC_TAG="${RESTIC_TAG:-vaultgate-postgres}"
RESTORE_IMAGE="${RESTORE_IMAGE:-postgres:16}"
DRILL_DIR="${RESTORE_DRILL_DIR:-/var/lib/vaultgate-restore-drill}"
container="vaultgate-restore-drill-$$"
archive="${DRILL_DIR}/vaultgate-postgres.dump"
database="vaultgate_restore"
drill_password="$(openssl rand -hex 24)"

restic_command() {
  if [ -n "${RESTIC_SFTP_ARGS:-}" ]; then
    command restic -o "sftp.args=${RESTIC_SFTP_ARGS}" "$@"
  else
    command restic "$@"
  fi
}

umask 077
install -d -m 0700 "${DRILL_DIR}"
cleanup() {
  docker rm -f "${container}" >/dev/null 2>&1 || true
  rm -f "${archive}"
}
trap cleanup EXIT

restic_command dump --tag "${RESTIC_TAG}" latest /vaultgate-postgres.dump >"${archive}"

docker run -d --name "${container}" \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=1g \
  -e "POSTGRES_PASSWORD=${drill_password}" \
  -e "POSTGRES_DB=${database}" \
  "${RESTORE_IMAGE}" >/dev/null

for _ in $(seq 1 30); do
  if docker exec "${container}" pg_isready -U postgres -d "${database}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${container}" pg_isready -U postgres -d "${database}" >/dev/null

docker cp "${archive}" "${container}:/tmp/vaultgate-postgres.dump"
docker exec "${container}" pg_restore \
  --no-owner \
  --no-privileges \
  --single-transaction \
  -U postgres \
  -d "${database}" \
  /tmp/vaultgate-postgres.dump

table_count="$(
  docker exec "${container}" psql -U postgres -d "${database}" -Atqc \
    "select count(*) from information_schema.tables where table_schema='public'"
)"
migration_count="$(
  docker exec "${container}" psql -U postgres -d "${database}" -Atqc \
    "select count(*) from alembic_version"
)"

if [ "${table_count}" -lt 1 ] || [ "${migration_count}" -ne 1 ]; then
  printf 'Restore drill validation failed: tables=%s migrations=%s\n' \
    "${table_count}" "${migration_count}" >&2
  exit 1
fi

printf 'Isolated offsite restore drill passed: tables=%s migrations=%s\n' \
  "${table_count}" "${migration_count}"
