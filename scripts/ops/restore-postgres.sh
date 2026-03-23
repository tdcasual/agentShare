#!/usr/bin/env sh

set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "Restore starting from ${BACKUP_FILE}"
echo "Restore safety: Stop API writes before restore and verify the target database is disposable or in maintenance mode."

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname "${DATABASE_URL}" \
  "${BACKUP_FILE}"

echo "Restore completed for ${DATABASE_URL}"
