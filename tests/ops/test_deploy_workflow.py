from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_deploy_workflow_validates_remote_stack_and_runs_smoke_checks() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    assert "script_stop: true" in workflow
    assert "set -euo pipefail" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml config >/dev/null" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml pull" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans" in workflow
    assert "./scripts/ops/smoke-test.sh" in workflow


def test_smoke_script_supports_public_base_url_alias() -> None:
    script = (ROOT / "scripts/ops/smoke-test.sh").read_text()

    assert "PUBLIC_BASE_URL" in script
    assert 'APP_BASE_URL="${APP_BASE_URL:-${PUBLIC_BASE_URL:-https://${PUBLIC_HOST}}}"' in script
