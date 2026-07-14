"""Tests for VaultGate application factory."""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine

from app.config import Settings
from app.factory import create_app


def _collect_route_paths(app) -> set[str]:
    """Collect paths from both direct routes and included routers."""
    paths: set[str] = set()
    for route in app.routes:
        if hasattr(route, "path"):
            paths.add(route.path)
        elif hasattr(route, "original_router"):
            for sub_route in route.original_router.routes:
                if hasattr(sub_route, "path"):
                    paths.add(sub_route.path)
    return paths


def test_create_app_registers_core_routes():
    app = create_app(Settings())
    route_paths = _collect_route_paths(app)

    assert "/healthz" in route_paths
    assert "/version" in route_paths


def test_create_app_registers_vaultgate_routes():
    app = create_app(Settings())
    route_paths = _collect_route_paths(app)

    assert "/api/admin/session/login" in route_paths
    assert "/api/admin/session" in route_paths
    assert "/api/admin/bootstrap/init" in route_paths
    assert "/api/admin/secrets" in route_paths
    assert "/api/admin/agents" in route_paths
    assert "/api/vault/secrets" in route_paths


def test_create_app_attaches_runtime_settings(tmp_path):
    db_path = tmp_path / "factory-test.db"
    settings = Settings(database_url=f"sqlite:///{db_path}")
    app = create_app(settings)

    assert app.state.settings is settings
    assert app.state.runtime is not None
    assert isinstance(app.state.runtime.engine, AsyncEngine)
    assert app.state.runtime.settings.database_url.endswith("factory-test.db")


def test_create_app_accepts_custom_route_registrar():
    def custom_registrar(app):
        pass  # No routes registered

    app = create_app(Settings(), route_registrar=custom_registrar)
    # Only core routes (healthz, version) + no vaultgate routes
    route_paths = _collect_route_paths(app)
    assert "/healthz" in route_paths
    assert "/version" in route_paths


def test_create_app_rejects_conflicting_settings_and_runtime(tmp_path):
    from app.runtime import build_runtime

    settings = Settings(database_url=f"sqlite:///{tmp_path / 'settings.db'}")
    runtime = build_runtime(Settings(database_url=f"sqlite:///{tmp_path / 'runtime.db'}"))

    try:
        with pytest.raises(ValueError, match="settings and runtime"):
            create_app(settings, runtime=runtime)
    finally:
        asyncio.run(runtime.dispose())


def test_lifespan_disposes_the_attached_async_engine(tmp_path):
    from app.runtime import build_runtime

    settings = Settings(database_url=f"sqlite:///{tmp_path / 'lifespan.db'}")
    runtime = build_runtime(settings)
    with patch("app.runtime.AppRuntime.dispose", new_callable=AsyncMock) as dispose:
        app = create_app(
            settings,
            runtime=runtime,
            app_configurers=(),
            route_registrar=None,
        )

        with TestClient(app):
            pass

        dispose.assert_awaited_once_with()


def test_healthz_endpoint(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version_endpoint(client):
    response = client.get("/version")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["name"] == "VaultGate"


def test_readiness_endpoint_checks_database_and_encryption(client):
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ok",
        "encryption": "ok",
    }


def test_readiness_endpoint_does_not_expose_dependency_errors(client):
    class BrokenEngine:
        def connect(self):
            raise RuntimeError("postgresql://admin:secret-password@internal-db/vaultgate")

    runtime = client.app.state.runtime
    client.app.state.runtime = type("BrokenRuntime", (), {"engine": BrokenEngine()})()
    try:
        response = client.get("/readyz")
    finally:
        client.app.state.runtime = runtime

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "database": "unavailable",
        "encryption": "ok",
    }
    assert "secret-password" not in response.text
