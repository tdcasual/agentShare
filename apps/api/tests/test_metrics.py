from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.services.idempotency import IdempotencyMiddleware
from app.services.redis_client import get_redis


ROOT = Path(__file__).resolve().parents[3]


def test_metrics_endpoint_exposes_prometheus_text(client) -> None:
    client.get("/healthz")
    client.get("/does-not-exist")
    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "agent_control_plane_up 1" in response.text
    assert "agent_control_plane_uptime_seconds" in response.text
    assert "agent_control_plane_http_requests_total" in response.text
    assert "agent_control_plane_http_errors_total" in response.text


def test_metrics_endpoint_respects_runtime_settings(tmp_path) -> None:
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'metrics.db'}",
        metrics_enabled=False,
    ))

    with TestClient(app) as client:
        response = client.get("/metrics")

    assert response.status_code == 404


def test_get_redis_uses_explicit_settings(monkeypatch) -> None:
    captured: list[str] = []

    class FakeRedis:
        pass

    def fake_from_url(url: str, decode_responses: bool):
        captured.append(url)
        return FakeRedis()

    monkeypatch.setattr("redis.from_url", fake_from_url)

    client = get_redis(Settings(redis_url="redis://example:6380/9"))

    assert isinstance(client, FakeRedis)
    assert captured == ["redis://example:6380/9"]


def test_create_app_wires_idempotency_with_runtime_redis_settings(monkeypatch, tmp_path) -> None:
    captured: list[str] = []

    def fake_get_redis(settings: Settings):
        captured.append(settings.redis_url)
        return object()

    monkeypatch.setattr("app.services.redis_client.get_redis", fake_get_redis)

    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'idempotency.db'}",
        redis_url="redis://example:6380/9",
    ))

    assert captured == ["redis://example:6380/9"]
    assert any(middleware.cls is IdempotencyMiddleware for middleware in app.user_middleware)


def test_prod_compose_enables_metrics_collection() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()

    assert "METRICS_ENABLED: ${METRICS_ENABLED:-true}" in compose


def test_production_docs_reference_metrics_and_incident_entrypoints() -> None:
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text()
    operations_guide = (ROOT / "docs/guides/production-operations.md").read_text()
    quickstart = (ROOT / "docs/guides/agent-quickstart.md").read_text()

    assert "metrics" in deployment_guide.lower()
    assert "incident" in operations_guide.lower()
    assert "local development" in quickstart.lower()
