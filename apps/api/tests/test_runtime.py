import importlib

import pytest
from fastapi import FastAPI
from fastapi import Depends, Request
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.factory import create_app
from app.repositories.agent_repo import AgentRepository
from app.runtime import build_runtime


def test_get_db_uses_request_runtime_session_factory(tmp_path):
    db_path = tmp_path / "runtime-request.db"
    app = create_app(Settings(database_url=f"sqlite:///{db_path}"))
    observed: dict[str, bool] = {}

    @app.get("/_runtime/db-check")
    def db_check(request: Request, session: Session = Depends(get_db)) -> dict[str, bool]:
        observed["uses_runtime_engine"] = session.get_bind() is request.app.state.runtime.engine
        return {"ok": True}

    with TestClient(app) as client:
        response = client.get("/_runtime/db-check")

    assert response.status_code == 200
    assert observed["uses_runtime_engine"] is True


def test_get_db_requires_runtime_attached_to_app_state():
    app = FastAPI()

    @app.get("/_runtime/db-check")
    def db_check(session: Session = Depends(get_db)) -> dict[str, bool]:
        del session
        return {"ok": True}

    with TestClient(app) as client, pytest.raises(RuntimeError, match="App runtime is not attached"):
        client.get("/_runtime/db-check")


def test_db_module_defers_default_runtime_until_needed(monkeypatch):
    import app.db as db_module
    import app.runtime as runtime_module

    original_build_runtime = runtime_module.build_runtime
    calls = 0

    def tracking_build_runtime(settings: Settings):
        nonlocal calls
        calls += 1
        return original_build_runtime(settings)

    with monkeypatch.context() as context:
        context.setattr(runtime_module, "build_runtime", tracking_build_runtime)
        reloaded_module = importlib.reload(db_module)

        assert calls == 0

        with reloaded_module.SessionLocal() as session:
            assert session.get_bind() is not None

        assert calls == 1

    importlib.reload(db_module)


def test_create_app_lifespan_uses_runtime_from_app_state(tmp_path):
    primary_db = tmp_path / "primary.db"
    runtime_db = tmp_path / "runtime.db"
    bootstrap_key = "runtime-bootstrap-key"

    app = create_app(Settings(
        database_url=f"sqlite:///{primary_db}",
        bootstrap_agent_key=bootstrap_key,
    ))
    runtime_settings = Settings(
        database_url=f"sqlite:///{runtime_db}",
        bootstrap_agent_key=bootstrap_key,
    )
    app.state.settings = runtime_settings
    app.state.runtime = build_runtime(runtime_settings)

    with TestClient(app) as client:
        assert client.get("/healthz").status_code == 200

    with app.state.runtime.session_factory() as runtime_session:
        assert AgentRepository(runtime_session).get("bootstrap") is not None

    primary_runtime = build_runtime(Settings(
        database_url=f"sqlite:///{primary_db}",
        bootstrap_agent_key=bootstrap_key,
    ))
    primary_tables = set(inspect(primary_runtime.engine).get_table_names())

    assert "agents" not in primary_tables
