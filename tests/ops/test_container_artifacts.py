from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_container_artifacts_exist() -> None:
    assert (ROOT / ".github/workflows/docker-images.yml").exists()
    assert (ROOT / ".github/workflows/deploy.yml").exists()
    assert (ROOT / "apps/api/Dockerfile").exists()
    assert (ROOT / "apps/web/Dockerfile").exists()
    assert (ROOT / "docker-compose.prod.yml").exists()
    assert (ROOT / ".env.production.example").exists()


def test_compose_includes_web_and_api_services() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "\n  web:\n" in compose or "\nweb:\n" in compose
    assert "\n  api:\n" in compose or "\napi:\n" in compose


def test_api_dockerfile_exposes_runtime_contract() -> None:
    dockerfile = (ROOT / "apps/api/Dockerfile").read_text()
    assert "FROM python:3.12-slim" in dockerfile
    assert "pip install --no-cache-dir ./apps/api" in dockerfile
    assert 'EXPOSE 8000' in dockerfile
    assert 'uvicorn' in dockerfile


def test_web_dockerfile_builds_next_app() -> None:
    dockerfile = (ROOT / "apps/web/Dockerfile").read_text()
    assert "FROM node:22-bookworm-slim AS deps" in dockerfile
    assert "npm ci" in dockerfile
    assert "npm run build" in dockerfile
    assert "EXPOSE 3000" in dockerfile
    assert 'npm", "run", "start"' in dockerfile


def test_compose_defines_complete_stack() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    for service in ("openbao", "postgres", "redis", "api", "web"):
      assert f"\n  {service}:\n" in compose or compose.startswith(f"{service}:\n")

    assert "depends_on:\n      api:" in compose
    assert "depends_on:\n      openbao:" in compose
    assert "postgres-data:" in compose
    assert "redis-data:" in compose
    assert "AGENT_CONTROL_PLANE_API_URL" in compose


def test_docker_workflow_builds_both_images_with_ghcr() -> None:
    workflow = (ROOT / ".github/workflows/docker-images.yml").read_text()
    assert "docker/login-action" in workflow
    assert "ghcr.io/" in workflow
    assert "apps/api/Dockerfile" in workflow
    assert "apps/web/Dockerfile" in workflow
    assert "push: ${{ github.event_name != 'pull_request' }}" in workflow
    assert "docker/metadata-action" in workflow


def test_deploy_workflow_syncs_and_restarts_remote_stack() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
    assert "workflow_dispatch" in workflow
    assert "workflow_run" in workflow
    assert 'workflows: ["Docker Images"]' in workflow
    assert "appleboy/scp-action" in workflow
    assert "appleboy/ssh-action" in workflow
    assert "docker compose -f docker-compose.yml -f docker-compose.prod.yml pull" in workflow
    assert "docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans" in workflow
    assert ".env.production" in workflow
    assert "DEPLOY_ENV_FILE" in workflow


def test_prod_compose_uses_published_images() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "${API_IMAGE:" in compose
    assert "${WEB_IMAGE:" in compose
    assert "restart: unless-stopped" in compose
    assert "MANAGEMENT_SESSION_SECURE: ${MANAGEMENT_SESSION_SECURE:-true}" in compose


def test_production_env_template_includes_runtime_placeholders() -> None:
    env_example = (ROOT / ".env.production.example").read_text()
    assert "DATABASE_URL=" in env_example
    assert "BOOTSTRAP_AGENT_KEY=" in env_example
    assert "MANAGEMENT_SESSION_SECRET=" in env_example
    assert "NEXT_PUBLIC_API_BASE_URL=" in env_example
    assert "API_IMAGE=" in env_example
    assert "WEB_IMAGE=" in env_example


def test_readme_documents_compose_and_image_pipeline() -> None:
    readme = (ROOT / "README.md").read_text()
    assert "docker compose up -d" in readme
    assert "GitHub Actions" in readme
    assert "ghcr.io" in readme
    assert "API_IMAGE" in readme
    assert "DEPLOY_HOST" in readme
    assert "DEPLOY_ENV_FILE" in readme
    assert "docker compose -f docker-compose.yml -f docker-compose.prod.yml pull" in readme
    assert "workflow_dispatch" in readme
    assert "rollback" in readme.lower()
