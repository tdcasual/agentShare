#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="${ROOT_DIR}/apps/api"
WEB_DIR="${ROOT_DIR}/apps/control-plane-v3"

HOST="${HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
DEMO_DATABASE_PATH="${DEMO_DATABASE_PATH:-${ROOT_DIR}/agent_share_demo.db}"
DATABASE_URL="${DATABASE_URL:-sqlite:///${DEMO_DATABASE_PATH}}"
BACKEND_API_URL="${BACKEND_API_URL:-http://${HOST}:${API_PORT}}"
BOOTSTRAP_OWNER_KEY="${BOOTSTRAP_OWNER_KEY:-changeme-bootstrap-key}"
MANAGEMENT_SESSION_SECRET="${MANAGEMENT_SESSION_SECRET:-changeme-management-session-secret}"
DEMO_SEED_ENABLED="${DEMO_SEED_ENABLED:-true}"
NPM_BIN="${NPM_BIN:-npm}"
UV_BIN="${UV_BIN:-uv}"

print_help() {
  cat <<EOF
Usage: $(basename "$0") [--print-config] [--help]

Start the local demo stack for the current control plane:
- backend: ${API_DIR}
- frontend: ${WEB_DIR}

Default runtime:
- host: ${HOST}
- api:  http://${HOST}:${API_PORT}
- web:  http://${HOST}:${WEB_PORT}
- db:   ${DATABASE_URL}

The script enables persisted demo fixture mode so inbox, marketplace, and search
have real local data on startup.
EOF
}

print_config() {
  cat <<EOF
Control Plane Demo Stack
ROOT_DIR=${ROOT_DIR}
API_DIR=${API_DIR}
WEB_DIR=${WEB_DIR}
HOST=${HOST}
API_PORT=${API_PORT}
WEB_PORT=${WEB_PORT}
DATABASE_URL=${DATABASE_URL}
DEMO_SEED_ENABLED=${DEMO_SEED_ENABLED}
BOOTSTRAP_OWNER_KEY=${BOOTSTRAP_OWNER_KEY}
MANAGEMENT_SESSION_SECRET=${MANAGEMENT_SESSION_SECRET}
BACKEND_API_URL=${BACKEND_API_URL}

Demo login
email=owner@example.com
password=correct horse battery staple

Backend command
cd ${API_DIR}
APP_ENV=development DATABASE_URL=${DATABASE_URL} DEMO_SEED_ENABLED=${DEMO_SEED_ENABLED} BOOTSTRAP_OWNER_KEY=${BOOTSTRAP_OWNER_KEY} MANAGEMENT_SESSION_SECRET=${MANAGEMENT_SESSION_SECRET} ${UV_BIN} run uvicorn app.main:app --host ${HOST} --port ${API_PORT}

Frontend command
cd ${WEB_DIR}
BACKEND_API_URL=${BACKEND_API_URL} ${NPM_BIN} run dev -- --hostname ${HOST} --port ${WEB_PORT}
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

ensure_port_free() {
  local port="$1"

  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  if lsof -iTCP:"${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    printf 'Port %s is already in use. Override API_PORT or WEB_PORT and try again.\n' "${port}" >&2
    exit 1
  fi
}

# shellcheck disable=SC2317,SC2329
cleanup() {
  local exit_code=$?

  if [ -n "${API_PID:-}" ] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi

  if [ -n "${WEB_PID:-}" ] && kill -0 "${WEB_PID}" >/dev/null 2>&1; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
  fi

  wait "${API_PID:-}" >/dev/null 2>&1 || true
  wait "${WEB_PID:-}" >/dev/null 2>&1 || true

  exit "${exit_code}"
}

if [ "${1:-}" = "--help" ]; then
  print_help
  exit 0
fi

if [ "${1:-}" = "--print-config" ]; then
  print_config
  exit 0
fi

if [ "${1:-}" != "" ]; then
  printf 'Unknown option: %s\n\n' "$1" >&2
  print_help >&2
  exit 1
fi

require_command "${UV_BIN}"
require_command "${NPM_BIN}"

if [ ! -f "${API_DIR}/pyproject.toml" ]; then
  printf 'API project not found at %s\n' "${API_DIR}" >&2
  exit 1
fi

if [ ! -f "${WEB_DIR}/package.json" ]; then
  printf 'Frontend project not found at %s\n' "${WEB_DIR}" >&2
  exit 1
fi

ensure_port_free "${API_PORT}"
ensure_port_free "${WEB_PORT}"

mkdir -p "$(dirname "${DEMO_DATABASE_PATH}")"

if [ ! -d "${WEB_DIR}/node_modules" ]; then
  printf 'Installing frontend dependencies in %s\n' "${WEB_DIR}"
  (
    cd "${WEB_DIR}"
    "${NPM_BIN}" ci
  )
fi

printf 'Preparing API database at %s\n' "${DATABASE_URL}"
(
  cd "${API_DIR}"
  APP_ENV=development \
  DATABASE_URL="${DATABASE_URL}" \
  DEMO_SEED_ENABLED="${DEMO_SEED_ENABLED}" \
  BOOTSTRAP_OWNER_KEY="${BOOTSTRAP_OWNER_KEY}" \
  MANAGEMENT_SESSION_SECRET="${MANAGEMENT_SESSION_SECRET}" \
  "${UV_BIN}" run alembic upgrade head
)

trap cleanup EXIT INT TERM

printf 'Starting API on http://%s:%s\n' "${HOST}" "${API_PORT}"
(
  cd "${API_DIR}"
  APP_ENV=development \
  DATABASE_URL="${DATABASE_URL}" \
  DEMO_SEED_ENABLED="${DEMO_SEED_ENABLED}" \
  BOOTSTRAP_OWNER_KEY="${BOOTSTRAP_OWNER_KEY}" \
  MANAGEMENT_SESSION_SECRET="${MANAGEMENT_SESSION_SECRET}" \
  "${UV_BIN}" run uvicorn app.main:app --host "${HOST}" --port "${API_PORT}"
) &
API_PID=$!

printf 'Starting control plane on http://%s:%s\n' "${HOST}" "${WEB_PORT}"
(
  cd "${WEB_DIR}"
  BACKEND_API_URL="${BACKEND_API_URL}" \
  "${NPM_BIN}" run dev -- --hostname "${HOST}" --port "${WEB_PORT}"
) &
WEB_PID=$!

cat <<EOF

Demo stack is starting.
Web:      http://${HOST}:${WEB_PORT}
API:      http://${HOST}:${API_PORT}
API docs: http://${HOST}:${API_PORT}/docs

Demo login
email:    owner@example.com
password: correct horse battery staple

Press Ctrl+C to stop both processes.
EOF

while kill -0 "${API_PID}" >/dev/null 2>&1 && kill -0 "${WEB_PID}" >/dev/null 2>&1; do
  sleep 1
done

if kill -0 "${API_PID}" >/dev/null 2>&1; then
  kill "${API_PID}" >/dev/null 2>&1 || true
fi

if kill -0 "${WEB_PID}" >/dev/null 2>&1; then
  kill "${WEB_PID}" >/dev/null 2>&1 || true
fi

set +e
wait "${API_PID}"
API_STATUS=$?
wait "${WEB_PID}"
WEB_STATUS=$?
set -e

if [ "${API_STATUS}" -ne 0 ]; then
  exit "${API_STATUS}"
fi

exit "${WEB_STATUS}"
