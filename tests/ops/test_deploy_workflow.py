from __future__ import annotations

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]


def test_deploy_workflow_only_uploads_existing_local_assets() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
    source_match = re.search(r'^\s+source: "([^"]+)"$', workflow, re.MULTILINE)

    assert source_match is not None
    sources = source_match.group(1).split(",")
    generated_sources = re.findall(r"cat > ([^ ]+) <<", workflow)
    missing_sources = [
        source for source in sources if not (ROOT / source).exists() and source not in generated_sources
    ]
    assert missing_sources == []


def test_deploy_workflow_validates_remote_stack_and_runs_smoke_checks() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    assert "script_stop: true" in workflow
    assert "set -euo pipefail" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml config >/dev/null" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml pull" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans" in workflow
    assert "./scripts/ops/smoke-test.sh" in workflow
    assert "CADDY_IMAGE=ghcr.io/" in workflow
    assert "POSTGRES_IMAGE=ghcr.io/" in workflow
    assert "VAULTGATE_ADMIN_EMAIL" not in workflow
    assert "VAULTGATE_ADMIN_PASSWORD" not in workflow


def test_deploy_backs_up_postgres_before_startup_migrations() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    backup_call = workflow.index("./scripts/ops/backup-postgres.sh")
    restart_call = workflow.index(
        "docker compose --env-file .env.production -f docker-compose.prod.yml up"
    )
    assert backup_call < restart_call
    assert "scripts/ops/backup-postgres.sh" in workflow
    assert "scripts/ops/restore-postgres.sh" in workflow


def test_smoke_script_supports_public_base_url_alias() -> None:
    script = (ROOT / "scripts/ops/smoke-test.sh").read_text()

    assert "PUBLIC_BASE_URL" in script
    assert 'APP_BASE_URL="${APP_BASE_URL:-${PUBLIC_BASE_URL:-https://${PUBLIC_HOST}}}"' in script


def test_production_deployment_guide_matches_smoke_contract() -> None:
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text().lower()

    assert "caddy" in deployment_guide
    assert "smoke" in deployment_guide
