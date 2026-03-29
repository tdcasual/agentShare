from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.routes import register_routes
from app.runtime import build_runtime


def test_create_app_registers_core_routes():
    app = create_app(Settings())
    route_paths = {route.path for route in app.routes}

    assert "/healthz" in route_paths
    assert "/api/bootstrap/status" in route_paths
    assert "/api/bootstrap/setup-owner" in route_paths
    assert "/metrics" in route_paths
    assert "/api/session/login" in route_paths
    assert "/api/session/logout" in route_paths
    assert "/api/admin-accounts" in route_paths
    assert "/api/agents/{agent_id}/tokens" in route_paths
    assert "/api/agent-tokens/{token_id}/revoke" in route_paths
    assert "/api/intake-catalog" in route_paths
    assert "/api/reviews" in route_paths
    assert "/api/task-targets/{target_id}/claim" in route_paths
    assert "/api/task-targets/{target_id}/complete" in route_paths
    assert "/api/task-targets/{task_target_id}/feedback" in route_paths


def test_create_app_runs_bootstrap_initializer_once(monkeypatch):
    calls: list[Settings] = []

    def fake_initializer(settings: Settings, session_factory) -> None:
        calls.append(settings)

    monkeypatch.setattr("app.factory.ensure_bootstrap_agent", fake_initializer)

    app = create_app(Settings())
    with TestClient(app):
        pass

    assert len(calls) == 1


def test_create_app_attaches_runtime_settings(tmp_path):
    db_path = tmp_path / "runtime.db"
    app = create_app(Settings(database_url=f"sqlite:///{db_path}"))

    runtime = app.state.runtime
    assert str(runtime.engine.url).endswith("runtime.db")
    assert runtime.settings.database_url.endswith("runtime.db")


def test_create_app_uses_runtime_engine_for_bootstrap_routes(tmp_path):
    db_path = tmp_path / "bootstrap-runtime.db"
    app = create_app(Settings(database_url=f"sqlite:///{db_path}", management_session_secret="session-secret"))

    with TestClient(app) as client:
        status_response = client.get("/api/bootstrap/status")

    assert status_response.status_code == 200
    assert status_response.json() == {"initialized": False}


def test_create_app_accepts_prebuilt_runtime_without_rebuilding(tmp_path, monkeypatch):
    db_path = tmp_path / "prebuilt-runtime.db"
    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        bootstrap_agent_key="runtime-bootstrap-key",
    )
    runtime = build_runtime(settings)

    def fail_build_runtime(_settings: Settings):
        raise AssertionError("create_app should use the provided runtime")

    monkeypatch.setattr("app.factory.build_runtime", fail_build_runtime)

    app = create_app(settings, runtime=runtime)

    assert app.state.runtime is runtime
    assert app.state.settings is settings


def test_create_app_accepts_custom_route_registrar():
    app = create_app(
        Settings(),
        route_registrar=lambda fastapi_app: register_routes(fastapi_app, include_mcp=False),
    )
    route_paths = {route.path for route in app.routes}

    assert "/api/session/login" in route_paths
    assert "/mcp" not in route_paths


def test_create_app_accepts_custom_app_configurers():
    def configure_specialized_app(app: FastAPI, settings: Settings) -> None:
        del settings

        @app.get("/_custom/healthz")
        def custom_healthcheck() -> dict[str, str]:
            return {"status": "ok"}

    app = create_app(
        Settings(),
        app_configurers=(configure_specialized_app,),
        route_registrar=lambda app: None,
    )
    route_paths = {route.path for route in app.routes}

    assert "/_custom/healthz" in route_paths
    assert "/healthz" not in route_paths
