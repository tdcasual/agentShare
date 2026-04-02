#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_PYTEST="${ROOT_DIR}/.venv/bin/pytest"

if [ ! -x "${VENV_PYTEST}" ]; then
  printf 'Missing test runner at %s\n' "${VENV_PYTEST}" >&2
  printf 'Run ./scripts/ops/bootstrap-dev-runtime.sh first.\n' >&2
  exit 1
fi

(
  cd "${ROOT_DIR}"
  PYTHONPATH=apps/api "${VENV_PYTEST}" apps/api/tests tests/ops -q
)

(
  cd "${ROOT_DIR}/apps/control-plane-v3"
  npm run typecheck
  npm run lint
  npm run test:contracts
  npm test -- --run
  npm run build
)

(
  cd "${ROOT_DIR}"
  docker compose config >/dev/null
)

printf 'Control plane verification passed in %s\n' "${ROOT_DIR}"
