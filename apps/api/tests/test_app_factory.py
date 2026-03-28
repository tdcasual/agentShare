from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.runtime import build_runtime


def test_create_app_registers_core_routes():
    app = create_app(Settings())
    route_paths = {route.path for route in app.routes}

    assert "/healthz" in route_paths
    assert "/metrics" in route_paths
    assert "/api/session/login" in route_paths
    assert "/api/intake-catalog" in route_paths


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
