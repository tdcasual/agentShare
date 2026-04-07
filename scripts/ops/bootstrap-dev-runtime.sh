#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PLAYWRIGHT_BIN="${ROOT_DIR}/apps/control-plane-v3/node_modules/.bin/playwright"
DEV_DATABASE_URL="${DEV_DATABASE_URL:-sqlite:///./agent_share.db}"

if [ ! -d "${VENV_DIR}" ]; then
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/pip" install -e "${ROOT_DIR}/apps/api[dev]"

(
  cd "${ROOT_DIR}/apps/control-plane-v3"
  npm ci
)

(
  cd "${ROOT_DIR}/apps/api"
  DATABASE_URL="${DEV_DATABASE_URL}" "${VENV_DIR}/bin/python" -c \
    "import os; from app.db import migrate_db; backup = migrate_db(os.environ['DATABASE_URL'], recover_default_dev_sqlite=True); print(f'Backed up stale dev database to {backup}') if backup else None"
)

if [ -x "${PLAYWRIGHT_BIN}" ]; then
  "${PLAYWRIGHT_BIN}" install chromium
fi

printf 'Bootstrapped dev runtime at %s\n' "${ROOT_DIR}"
printf 'Python env: %s\n' "${VENV_DIR}"
printf 'Web deps: %s\n' "${ROOT_DIR}/apps/control-plane-v3/node_modules"
printf 'Migrated dev database: %s\n' "${DEV_DATABASE_URL}"
printf 'Next step: %s\n' "./scripts/ops/verify-control-plane.sh"
