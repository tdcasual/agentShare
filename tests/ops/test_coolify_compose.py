from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _read_compose() -> str:
    return (ROOT / "docker-compose.coolify.yml").read_text()


def _service_block(compose: str, service: str) -> str:
    """Return the YAML block of one top-level service (keys indented by two)."""
    match = re.search(
        rf"\n  {re.escape(service)}:\n(.*?)(?=\n  \S|\nvolumes:|\Z)",
        compose,
        re.DOTALL,
    )
    assert match, f"service {service} missing"
    return match.group(1)


def test_coolify_compose_exists() -> None:
    assert (ROOT / "docker-compose.coolify.yml").is_file()


def test_coolify_compose_has_no_caddy() -> None:
    compose = _read_compose()
    assert "caddy:" not in compose
    assert "caddy-data" not in compose
    assert "Caddyfile" not in compose


def test_coolify_compose_has_no_custom_networks_or_static_ips() -> None:
    compose = _read_compose()
    assert "\nnetworks:" not in compose
    assert "ipv4_address" not in compose
    assert "ipam:" not in compose


def test_coolify_compose_publishes_no_ports() -> None:
    compose = _read_compose()
    assert "\n    ports:" not in compose


def test_coolify_web_exposes_3000() -> None:
    block = _service_block(_read_compose(), "web")
    assert "expose:" in block
    assert '"3000"' in block
    assert "VAULTGATE_API_URL: ${VAULTGATE_API_URL:-http://api:8000}" in block


def test_coolify_api_exposes_8000() -> None:
    block = _service_block(_read_compose(), "api")
    assert "expose:" in block
    assert '"8000"' in block


def test_coolify_api_passes_required_environment_keys() -> None:
    block = _service_block(_read_compose(), "api")
    for key in (
        "ENCRYPTION_KEY:",
        "BOOTSTRAP_TOKEN:",
        "CORS_ALLOWED_ORIGINS:",
        "SESSION_SECURE:",
        "TRUSTED_PROXY_CIDRS:",
    ):
        assert key in block, f"{key} missing from api environment"


def test_coolify_postgres_volume() -> None:
    compose = _read_compose()
    block = _service_block(compose, "postgres")
    assert "postgres-data:/var/lib/postgresql/data" in block
    assert "\nvolumes:\n  postgres-data:" in compose


def test_coolify_services_wait_for_healthy_dependencies() -> None:
    compose = _read_compose()
    api_block = _service_block(compose, "api")
    web_block = _service_block(compose, "web")
    assert "condition: service_healthy" in api_block
    assert "condition: service_healthy" in web_block
