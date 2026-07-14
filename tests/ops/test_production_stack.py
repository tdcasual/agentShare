from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_production_compose_includes_caddy() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    caddyfile = (ROOT / "ops/caddy/Caddyfile").read_text()
    assert "caddy:" in compose
    assert "ports:" in compose
    assert '"80:80"' in compose or "'80:80'" in compose
    assert '"443:443"' in compose or "'443:443'" in compose
    assert "ops/caddy/Caddyfile" in compose
    assert "caddy-data" in compose
    assert "caddy-config" in compose
    assert "header" in caddyfile
    assert "Strict-Transport-Security" in caddyfile
    assert "handle /readyz" in caddyfile


def test_caddy_image_is_rebuilt_with_patched_go_toolchain() -> None:
    dockerfile = (ROOT / "apps/caddy/Dockerfile").read_text()

    assert "FROM golang:1.26.5-alpine3.23 AS builder" in dockerfile
    assert "github.com/caddyserver/caddy/v2/cmd/caddy@v2.11.4" in dockerfile
    assert "FROM alpine:3.23" in dockerfile
    assert "apk upgrade" in dockerfile
    assert 'CMD ["caddy", "run"' in dockerfile


def test_production_caddy_has_only_bind_service_capability() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    caddy_block = compose.split("\n  web:\n", 1)[0]

    assert "cap_drop:\n      - ALL" in caddy_block
    assert "cap_add:\n      - NET_BIND_SERVICE" in caddy_block


def test_production_compose_omits_openbao_and_redis() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "openbao:" not in compose
    assert "OPENBAO_ADDR=http://openbao:8200" not in compose
    assert "redis:" not in compose
    assert "REDIS_URL" not in compose


def test_production_compose_uses_server_side_sessions_without_signing_secret() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    env_example = (ROOT / "ops/compose/prod.env.example").read_text()

    assert "SESSION_SECRET" not in compose
    assert "SESSION_SECRET" not in env_example
    assert 'SESSION_SECURE: "true"' in compose
    assert "BOOTSTRAP_TOKEN: ${BOOTSTRAP_TOKEN:?BOOTSTRAP_TOKEN is required}" in compose


def test_production_compose_keeps_data_services_private() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "\n  postgres:\n" in compose
    assert '  postgres:\n    image:' in compose
    assert '"5432:5432"' not in compose
