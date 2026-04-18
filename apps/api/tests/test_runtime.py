import importlib
from unittest.mock import MagicMock

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
        bootstrap_owner_key=bootstrap_key,
    ))
    runtime_settings = Settings(
        database_url=f"sqlite:///{runtime_db}",
        bootstrap_owner_key=bootstrap_key,
    )
    app.state.settings = runtime_settings
    app.state.runtime = build_runtime(runtime_settings)

    with TestClient(app) as client:
        assert client.get("/healthz").status_code == 200

    with app.state.runtime.session_factory() as runtime_session:
        assert AgentRepository(runtime_session).get("bootstrap") is not None

    primary_runtime = build_runtime(Settings(
        database_url=f"sqlite:///{primary_db}",
        bootstrap_owner_key=bootstrap_key,
    ))
    primary_tables = set(inspect(primary_runtime.engine).get_table_names())

    assert "agents" not in primary_tables


def test_runtime_database_supports_bootstrap_token_target_feedback_flow(tmp_path):
    db_path = tmp_path / "runtime-flow.db"
    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        bootstrap_owner_key="bootstrap-key-xyz",
        management_session_secret="session-secret",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        status_before = client.get("/api/bootstrap/status")
        assert status_before.status_code == 200
        assert status_before.json() == {"initialized": False}

        bootstrap_response = client.post(
            "/api/bootstrap/setup-owner",
            json={
                "bootstrap_key": "bootstrap-key-xyz",
                "email": "owner@example.com",
                "display_name": "Founding Owner",
                "password": "correct horse battery staple",
            },
        )
        assert bootstrap_response.status_code == 201, bootstrap_response.text

        closed_response = client.post(
            "/api/bootstrap/setup-owner",
            json={
                "bootstrap_key": "bootstrap-key-xyz",
                "email": "owner@example.com",
                "display_name": "Founding Owner",
                "password": "correct horse battery staple",
            },
        )
        assert closed_response.status_code == 409, closed_response.text

        login_response = client.post(
            "/api/session/login",
            json={
                "email": "owner@example.com",
                "password": "correct horse battery staple",
            },
        )
        assert login_response.status_code == 200, login_response.text

        agent_response = client.post(
            "/api/agents",
            json={
                "name": "deploy-bot",
                "risk_tier": "medium",
                "allowed_task_types": ["account_read"],
            },
        )
        assert agent_response.status_code == 201, agent_response.text
        agent_payload = agent_response.json()
        primary_token = agent_payload["api_key"]
        primary_token_id = agent_payload["token_id"]

        extra_token_response = client.post(
            f"/api/agents/{agent_payload['id']}/tokens",
            json={
                "display_name": "Staging worker token",
                "scopes": ["runtime"],
                "labels": {"environment": "staging"},
            },
        )
        assert extra_token_response.status_code == 201, extra_token_response.text
        extra_token_payload = extra_token_response.json()

        token_listing = client.get(f"/api/agents/{agent_payload['id']}/tokens")
        assert token_listing.status_code == 200, token_listing.text
        listed_token_ids = {item["id"] for item in token_listing.json()["items"]}
        assert listed_token_ids == {primary_token_id, extra_token_payload["id"]}

        targeted_task = client.post(
            "/api/tasks",
            json={
                "title": "Read account",
                "task_type": "account_read",
                "target_mode": "explicit_tokens",
                "target_token_ids": [extra_token_payload["id"]],
            },
        )
        assert targeted_task.status_code == 201, targeted_task.text
        targeted_payload = targeted_task.json()
        assert len(targeted_payload["target_ids"]) == 1
        assert targeted_payload["target_token_ids"] == [extra_token_payload["id"]]

        assigned_to_primary = client.get(
            "/api/tasks/assigned",
            headers={"Authorization": f"Bearer {primary_token}"},
        )
        assert assigned_to_primary.status_code == 200, assigned_to_primary.text
        assert assigned_to_primary.json()["items"] == []

        assigned_to_target = client.get(
            "/api/tasks/assigned",
            headers={"Authorization": f"Bearer {extra_token_payload['api_key']}"},
        )
        assert assigned_to_target.status_code == 200, assigned_to_target.text
        assigned_items = assigned_to_target.json()["items"]
        assert len(assigned_items) == 1
        target_id = assigned_items[0]["id"]
        assert assigned_items[0]["target_token_id"] == extra_token_payload["id"]

        claimed = client.post(
            f"/api/task-targets/{target_id}/claim",
            headers={"Authorization": f"Bearer {extra_token_payload['api_key']}"},
        )
        assert claimed.status_code == 200, claimed.text

        completed = client.post(
            f"/api/task-targets/{target_id}/complete",
            headers={"Authorization": f"Bearer {extra_token_payload['api_key']}"},
            json={
                "result_summary": "done",
                "output_payload": {"ok": True},
            },
        )
        assert completed.status_code == 200, completed.text
        completed_payload = completed.json()
        assert completed_payload["last_run_id"] is not None

        runs_response = client.get("/api/runs")
        assert runs_response.status_code == 200, runs_response.text
        run = runs_response.json()["items"][0]
        assert run["token_id"] == extra_token_payload["id"]
        assert run["task_target_id"] == target_id

        feedback_response = client.post(
            f"/api/task-targets/{target_id}/feedback",
            json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
        )
        assert feedback_response.status_code == 201, feedback_response.text

        refreshed_tokens = client.get(f"/api/agents/{agent_payload['id']}/tokens")
        assert refreshed_tokens.status_code == 200, refreshed_tokens.text
        target_token = next(item for item in refreshed_tokens.json()["items"] if item["id"] == extra_token_payload["id"])
        assert target_token["completed_runs"] == 1
        assert target_token["successful_runs"] == 1
        assert target_token["success_rate"] == 1.0
        assert target_token["trust_score"] == 1.0
        assert target_token["last_feedback_at"] is not None


def test_build_runtime_enables_pool_tuning_for_non_sqlite(monkeypatch):
    captured: dict[str, object] = {}
    fake_engine = MagicMock()

    def fake_create_engine(url: str, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return fake_engine

    monkeypatch.setattr("app.runtime.create_engine", fake_create_engine)

    runtime = build_runtime(Settings(
        app_env="development",
        database_url="postgresql://user:pass@db.example.com:5432/app",
    ))

    assert runtime.engine is fake_engine
    assert captured["url"] == "postgresql://user:pass@db.example.com:5432/app"
    assert captured["kwargs"] == {
        "echo": False,
        "connect_args": {},
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 1800,
    }


def test_build_runtime_keeps_sqlite_runtime_simple(monkeypatch):
    captured: dict[str, object] = {}
    fake_engine = MagicMock()

    def fake_create_engine(url: str, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return fake_engine

    monkeypatch.setattr("app.runtime.create_engine", fake_create_engine)

    runtime = build_runtime(Settings(database_url="sqlite:///:memory:"))

    assert runtime.engine is fake_engine
    assert captured["url"] == "sqlite:///:memory:"
    assert captured["kwargs"] == {
        "echo": False,
        "connect_args": {"check_same_thread": False},
    }
