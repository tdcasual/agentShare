"""Tests for VaultGate application factory."""
import pytest

from app.config import Settings
from app.factory import create_app


def test_create_app_registers_core_routes():
    app = create_app(Settings())
    route_paths = {route.path for route in app.routes}

    assert "/healthz" in route_paths
    assert "/version" in route_paths


def test_create_app_registers_vaultgate_routes():
    app = create_app(Settings())
    route_paths = {route.path for route in app.routes}

    # Auth routes
    assert "/api/session/login" in route_paths
    assert "/api/session/logout" in route_paths
    assert "/api/session/me" in route_paths

    # Bootstrap route
    assert "/api/bootstrap/init" in route_paths

    # Vault routes
    assert "/api/vault" in route_paths


def test_create_app_attaches_runtime_settings(tmp_path):
    db_path = tmp_path / "factory-test.db"
    settings = Settings(database_url=f"sqlite:///{db_path}")
    app = create_app(settings)

    assert app.state.settings is settings
    assert app.state.runtime is not None
    assert app.state.runtime.settings.database_url.endswith("factory-test.db")


def test_create_app_accepts_custom_route_registrar():
    def custom_registrar(app):
        pass  # No routes registered

    app = create_app(Settings(), route_registrar=custom_registrar)
    # Only core routes (healthz, version) + no vaultgate routes
    route_paths = {route.path for route in app.routes}
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
        runtime.engine.dispose()


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
