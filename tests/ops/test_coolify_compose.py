from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _read_compose() -> str:
    return (ROOT / "docker-compose.coolify.yml").read_text()


def _service_block(compose: str, service: str) -> str:
    """Return the YAML block of one top-level service (keys indented by two)."""
    match = re.search(
        rf"\n  {re.escape(service)}:\n(.*?)(?=\n  \S|\n\S|\Z)",
        compose,
        re.DOTALL,
    )
    assert match, f"service {service} missing"
    return match.group(1)


def _networks_block(compose: str) -> str:
    """Return the top-level networks section."""
    match = re.search(r"\nnetworks:\n(.*?)(?=\n\S|\Z)", compose, re.DOTALL)
    assert match, "top-level networks section missing"
    return match.group(1)


def test_coolify_compose_exists() -> None:
    assert (ROOT / "docker-compose.coolify.yml").is_file()


def test_coolify_compose_has_no_caddy() -> None:
    compose = _read_compose()
    assert "caddy:" not in compose
    assert "caddy-data" not in compose
    assert "Caddyfile" not in compose


def test_coolify_compose_declares_default_and_internal_networks() -> None:
    """Coolify owns routing on `default`; `internal` isolates api/postgres."""
    block = _networks_block(_read_compose())
    assert "default: {}" in block
    assert "internal: {}" in block


def test_coolify_compose_has_no_static_ips() -> None:
    compose = _read_compose()
    assert "ipv4_address" not in compose
    assert "ipv6_address" not in compose
    assert "ipam:" not in compose


def test_coolify_api_and_postgres_are_not_on_the_default_network() -> None:
    """Only web may sit on the proxy-reachable default network."""
    compose = _read_compose()
    for service in ("api", "postgres"):
        block = _service_block(compose, service)
        assert "networks:\n      - internal\n" in block, f"{service} must join internal"
        assert "- default" not in block, f"{service} must not join default"


def test_coolify_web_joins_default_and_internal() -> None:
    block = _service_block(_read_compose(), "web")
    assert "      - default\n" in block
    assert "      - internal\n" in block


def test_coolify_web_pins_traefik_to_resource_network() -> None:
    block = _service_block(_read_compose(), "web")
    assert 'traefik.docker.network=${COOLIFY_RESOURCE_UUID:-coolify}' in block


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
