from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_coolify_compose_omits_caddy_and_external_secret_backend() -> None:
    compose = (ROOT / "docker-compose.coolify.yml").read_text()
    assert "caddy:" not in compose
    assert "SECRET_BACKEND_URL" not in compose
    assert "SECRET_BACKEND_TOKEN" not in compose
    assert "OPENBAO_TOKEN_FILE" in compose
    assert "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}" in compose


def test_coolify_guide_explains_platform_responsibilities() -> None:
    guide = (ROOT / "docs/guides/coolify-deployment.md").read_text().lower()
    assert "coolify" in guide
    assert "openbao" in guide
    assert "tls" in guide
    assert "ingress" in guide
    assert "alembic upgrade head" in guide
    assert "public production" in guide
    assert "openai_api_key" in guide


def test_readme_links_coolify_path_without_replacing_production_baseline() -> None:
    readme = (ROOT / "README.md").read_text().lower()
    assert "coolify/self-host" in readme
    assert "docker-compose.coolify.yml" in readme
    assert "docker-compose.prod.yml" in readme
