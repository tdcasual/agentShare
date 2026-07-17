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
    compose = "docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml"
    assert f"{compose} config >/dev/null" in workflow
    assert f"{compose} pull" in workflow
    resolved_compose = "docker compose --env-file .env.production --env-file .resolved-release.env -f docker-compose.prod.yml"
    assert f"{resolved_compose} up -d --remove-orphans" in workflow
    assert ". ./.env.production" not in workflow
    assert ". ./.release.env" not in workflow
    assert "./scripts/ops/smoke-test.sh" in workflow
    assert "CADDY_IMAGE=ghcr.io/" in workflow
    assert "POSTGRES_IMAGE=ghcr.io/" in workflow
    assert "VAULTGATE_ADMIN_EMAIL" not in workflow
    assert "VAULTGATE_ADMIN_PASSWORD" not in workflow


def test_deploy_requires_scanned_sha_tags_and_pins_images_by_digest() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    assert "^sha-[0-9a-f]{7,40}$" in workflow
    assert "docker image inspect" in workflow
    assert ".resolved-release.env" in workflow
    assert "RepoDigests" in workflow


def test_deploy_rolls_back_running_images_when_smoke_checks_fail() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    assert ".rollback.env" in workflow
    assert "ROLLBACK_AVAILABLE" in workflow
    assert "Smoke checks failed; restoring previous images." in workflow
    assert "--env-file .rollback.env" in workflow
    assert "Deployment failed and the previous stack was restored." in workflow


def test_deploy_keeps_logical_backup_optional_and_before_startup_migrations() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    backup_call = workflow.index("./scripts/ops/backup-postgres.sh")
    restart_call = workflow.index(
        "docker compose --env-file .env.production --env-file .resolved-release.env -f docker-compose.prod.yml up"
    )
    assert backup_call < restart_call
    assert "ENABLE_LOGICAL_BACKUP" in workflow
    assert "snapshot/PITR policy" in workflow
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
