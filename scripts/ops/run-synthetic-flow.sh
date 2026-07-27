#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-vaultgate-synthetic}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-ZGV2LW9ubHktMzItYnl0ZS1lbmNyeXB0aW9uLWtleSE=}"
POSTGRES_PORT="${POSTGRES_PORT:-55432}"
API_PORT="${API_PORT:-58000}"
WEB_PORT="${WEB_PORT:-53100}"
SYNTHETIC_BASE_URL="${VAULTGATE_SYNTHETIC_BASE_URL:-http://127.0.0.1:${WEB_PORT}}"

cleanup() {
  if [ "${SYNTHETIC_FAILED:-0}" = "1" ]; then
    docker compose -p "${COMPOSE_PROJECT_NAME}" logs --no-color api web || true
  fi
  docker compose -p "${COMPOSE_PROJECT_NAME}" down -v --remove-orphans
}
trap 'SYNTHETIC_FAILED=1 cleanup' ERR
trap cleanup EXIT

cd "${ROOT_DIR}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  CORS_ALLOWED_ORIGINS="${SYNTHETIC_BASE_URL}" \
  POSTGRES_PORT="${POSTGRES_PORT}" \
  API_PORT="${API_PORT}" \
  WEB_PORT="${WEB_PORT}" \
  docker compose -p "${COMPOSE_PROJECT_NAME}" up -d --build --wait
LOAD_BASE_URL="${SYNTHETIC_BASE_URL}" node scripts/ops/load-smoke.mjs
(
  cd apps/control-plane-v3
  VAULTGATE_SYNTHETIC_BASE_URL="${SYNTHETIC_BASE_URL}" npm run test:integration
)
SYNTHETIC_FAILED=0
