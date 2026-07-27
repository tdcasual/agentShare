#!/usr/bin/env bash
set -euo pipefail

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is required}"

RESOURCE_UUID="${VAULTGATE_RESOURCE_UUID:-tr01vb13cz2sj4wrm4y009cr}"
STAGING_DIR="${OFFSITE_BACKUP_STAGING_DIR:-/var/lib/vaultgate-offsite}"
RESTIC_TAG="${RESTIC_TAG:-vaultgate-postgres}"

restic_command() {
  if [ -n "${RESTIC_SFTP_ARGS:-}" ]; then
    command restic -o "sftp.args=${RESTIC_SFTP_ARGS}" "$@"
  else
    command restic "$@"
  fi
}

umask 077
install -d -m 0700 "${STAGING_DIR}"
exec 9>"${STAGING_DIR}/backup.lock"
flock -n 9 || { printf 'An offsite backup is already running.\n' >&2; exit 1; }

mapfile -t containers < <(
  docker ps \
    --filter "label=com.docker.compose.project=${RESOURCE_UUID}" \
    --filter "label=com.docker.compose.service=postgres" \
    --format '{{.ID}}'
)
if [ "${#containers[@]}" -ne 1 ]; then
  printf 'Expected exactly one PostgreSQL container for %s, found %s.\n' \
    "${RESOURCE_UUID}" "${#containers[@]}" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${STAGING_DIR}/vaultgate-postgres-${timestamp}.dump"
cleanup() { rm -f "${backup_file}"; }
trap cleanup EXIT

docker exec "${containers[0]}" sh -ec \
  'pg_dump -U"$POSTGRES_USER" -Fc "$POSTGRES_DB"' >"${backup_file}"
docker exec -i "${containers[0]}" pg_restore -l >/dev/null <"${backup_file}"

restic_command backup \
  --host "${RESOURCE_UUID}" \
  --tag "${RESTIC_TAG}" \
  --stdin \
  --stdin-filename vaultgate-postgres.dump <"${backup_file}"
restic_command forget \
  --host "${RESOURCE_UUID}" \
  --tag "${RESTIC_TAG}" \
  --keep-daily 14 \
  --keep-weekly 8 \
  --keep-monthly 12 \
  --prune

if [ "${RESTIC_CHECK:-0}" = "1" ]; then
  restic_command check --read-data-subset="${RESTIC_CHECK_SUBSET:-5%}"
fi

printf 'Encrypted offsite PostgreSQL backup completed at %s.\n' "${timestamp}"
