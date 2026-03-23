#!/usr/bin/env sh

set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:=./backups/postgres}"

# For containerized production usage, operators can source `.env.production` and
# run this script from the deploy directory instead of typing the full
# `docker compose --env-file .env.production -f docker-compose.prod.yml exec` command manually.

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

pg_dump \
  --format=custom \
  --file "${BACKUP_DIR}/postgres-${timestamp}.dump" \
  "${DATABASE_URL}"

echo "Postgres backup written to ${BACKUP_DIR}/postgres-${timestamp}.dump"
