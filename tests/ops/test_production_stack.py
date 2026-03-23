from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_production_compose_includes_caddy() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "caddy:" in compose
    assert "ports:" in compose
    assert '"80:80"' in compose or "'80:80'" in compose
    assert '"443:443"' in compose or "'443:443'" in compose
    assert "ops/caddy/Caddyfile" in compose
    assert "caddy-data" in compose
    assert "caddy-config" in compose


def test_production_compose_omits_openbao_dev_service() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "openbao:" not in compose
    assert "OPENBAO_ADDR=http://openbao:8200" not in compose


def test_production_env_requires_external_secret_backend() -> None:
    env_example = (ROOT / "ops/compose/prod.env.example").read_text()
    assert "SECRET_BACKEND_URL=" in env_example
    assert "SECRET_BACKEND_TOKEN=" in env_example


def test_production_compose_keeps_data_services_private() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "\n  postgres:\n" in compose
    assert "\n  redis:\n" in compose
    assert '  postgres:\n    image:' in compose
    assert '  redis:\n    image:' in compose
    assert '"5432:5432"' not in compose
    assert '"6379:6379"' not in compose
