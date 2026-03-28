#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PLAYWRIGHT_BIN="${ROOT_DIR}/apps/web/node_modules/.bin/playwright"

if [ ! -d "${VENV_DIR}" ]; then
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/pip" install -e "${ROOT_DIR}/apps/api[dev]"

(
  cd "${ROOT_DIR}/apps/web"
  npm ci
)

if [ -x "${PLAYWRIGHT_BIN}" ]; then
  "${PLAYWRIGHT_BIN}" install chromium
fi

printf 'Bootstrapped dev runtime at %s\n' "${ROOT_DIR}"
printf 'Python env: %s\n' "${VENV_DIR}"
printf 'Web deps: %s\n' "${ROOT_DIR}/apps/web/node_modules"
