#!/usr/bin/env sh

set -eu

: "${REDIS_HOST:=127.0.0.1}"
: "${REDIS_PORT:=6379}"
: "${BACKUP_DIR:=./backups/redis}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

redis-cli \
  --host "${REDIS_HOST}" \
  --port "${REDIS_PORT}" \
  --rdb "${BACKUP_DIR}/redis-${timestamp}.rdb"

echo "Redis backup written to ${BACKUP_DIR}/redis-${timestamp}.rdb"
