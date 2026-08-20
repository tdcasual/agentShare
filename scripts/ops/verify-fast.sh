#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERIFY_PYTHON="${VERIFY_PYTHON:-${ROOT_DIR}/.venv/bin/python}"

if [ ! -x "${VERIFY_PYTHON}" ]; then
  printf 'Missing Python runtime at %s\n' "${VERIFY_PYTHON}" >&2
  printf 'Run ./scripts/ops/bootstrap-dev-runtime.sh first.\n' >&2
  exit 1
fi

(
  cd "${ROOT_DIR}/apps/api"
  PYTHONPATH=. "${VERIFY_PYTHON}" -m mypy app/
)

(
  cd "${ROOT_DIR}"
  PYTHONPATH=apps/api "${VERIFY_PYTHON}" -m ruff check apps/api/app apps/api/tests
  "${VERIFY_PYTHON}" scripts/ops/check_migration_policy.py
  PYTHONPATH=apps/api "${VERIFY_PYTHON}" \
    "${ROOT_DIR}/scripts/ops/run-pytest.py" apps/api/tests tests/ops -q
)

(
  cd "${ROOT_DIR}/apps/control-plane-v3"
  npm run check:api-types
  npm run typecheck
  npm run lint
  npm test -- --run
  npm run test:coverage
)

printf 'Fast verification passed in %s\n' "${ROOT_DIR}"
printf 'NOTE: browser tests (e2e/a11y/visual/performance), the production\n'
printf 'build, and deploy-config checks are NOT included. Run\n'
printf 'scripts/ops/verify-control-plane.sh before merging.\n'
