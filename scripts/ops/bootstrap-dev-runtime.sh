#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PLAYWRIGHT_BIN="${ROOT_DIR}/apps/control-plane-v3/node_modules/.bin/playwright"
DEV_DATABASE_URL="${DEV_DATABASE_URL:-sqlite:///./vaultgate.db}"
REQUIRED_PYTHON_MINOR="3.12"

selected_python_minor="$("${PYTHON_BIN}" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
if [ "${selected_python_minor}" != "${REQUIRED_PYTHON_MINOR}" ]; then
  printf 'VaultGate development locks and CI require Python %s; %s provides %s.\n' \
    "${REQUIRED_PYTHON_MINOR}" "${PYTHON_BIN}" "${selected_python_minor}" >&2
  exit 1
fi

if [ ! -d "${VENV_DIR}" ]; then
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
else
  venv_python_minor="$("${VENV_DIR}/bin/python" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [ "${venv_python_minor}" != "${REQUIRED_PYTHON_MINOR}" ]; then
    printf 'Existing %s uses Python %s; move it aside and rerun with Python %s.\n' \
      "${VENV_DIR}" "${venv_python_minor}" "${REQUIRED_PYTHON_MINOR}" >&2
    exit 1
  fi
fi

"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/pip" install --require-hashes -r "${ROOT_DIR}/apps/api/requirements-dev.lock"
"${VENV_DIR}/bin/pip" install --no-deps -e "${ROOT_DIR}/apps/api"
"${VENV_DIR}/bin/pip" check

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
  if command -v google-chrome >/dev/null 2>&1; then
    printf 'Using system Chrome for Playwright: %s\n' "$(command -v google-chrome)"
  else
    "${PLAYWRIGHT_BIN}" install chromium
  fi
fi

printf 'Bootstrapped dev runtime at %s\n' "${ROOT_DIR}"
printf 'Python env: %s\n' "${VENV_DIR}"
printf 'Web deps: %s\n' "${ROOT_DIR}/apps/control-plane-v3/node_modules"
printf 'Migrated dev database: %s\n' "${DEV_DATABASE_URL}"
printf 'Next step: %s\n' "./scripts/ops/verify-control-plane.sh"
