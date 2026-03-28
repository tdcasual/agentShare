from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app


def test_create_app_registers_core_routes():
    app = create_app(Settings())
    route_paths = {route.path for route in app.routes}

    assert "/healthz" in route_paths
    assert "/metrics" in route_paths
    assert "/api/session/login" in route_paths
    assert "/api/intake-catalog" in route_paths


def test_create_app_runs_bootstrap_initializer_once(monkeypatch):
    calls: list[Settings] = []

    def fake_initializer(settings: Settings) -> None:
        calls.append(settings)

    monkeypatch.setattr("app.factory.ensure_bootstrap_agent", fake_initializer)

    app = create_app(Settings())
    with TestClient(app):
        pass

    assert len(calls) == 1
