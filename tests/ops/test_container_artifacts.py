from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_container_artifacts_exist() -> None:
    assert (ROOT / ".github/workflows/docker-images.yml").exists()
    assert (ROOT / "apps/api/Dockerfile").exists()
    assert (ROOT / "apps/web/Dockerfile").exists()


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


def test_readme_documents_compose_and_image_pipeline() -> None:
    readme = (ROOT / "README.md").read_text()
    assert "docker compose up -d" in readme
    assert "GitHub Actions" in readme
    assert "ghcr.io" in readme
    assert "API_IMAGE" in readme
