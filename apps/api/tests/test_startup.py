import hashlib
import importlib

from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

from app.repositories.agent_repo import AgentRepository


def test_init_db_creates_expected_tables(monkeypatch, tmp_path):
    db_path = tmp_path / "startup.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    from app import db as db_module

    db_module = importlib.reload(db_module)
    db_module.init_db()

    inspector = inspect(db_module.engine)
    assert {
        "agents",
        "agent_tokens",
        "human_accounts",
        "management_sessions",
        "system_settings",
        "secrets",
        "capabilities",
        "tasks",
        "task_targets",
        "runs",
        "token_feedback",
        "playbooks",
        "audit_events",
    }.issubset(set(inspector.get_table_names()))


def test_app_startup_seeds_bootstrap_agent(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-seed.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_AGENT_KEY", bootstrap_key)

    from app import db as db_module
    from app import main as main_module

    db_module = importlib.reload(db_module)
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        assert client.get("/healthz").status_code == 200

    session = db_module.SessionLocal()
    try:
        model = AgentRepository(session).get("bootstrap")
        assert model is not None
        assert model.api_key_hash == hashlib.sha256(bootstrap_key.encode()).hexdigest()
    finally:
        session.close()


def test_app_startup_bootstrap_route_initializes_once(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-bootstrap-route.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_AGENT_KEY", bootstrap_key)
    monkeypatch.setenv("MANAGEMENT_SESSION_SECRET", "session-secret")

    from app import db as db_module
    from app import main as main_module

    db_module = importlib.reload(db_module)
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        status_before = client.get("/api/bootstrap/status")
        first = client.post(
            "/api/bootstrap/setup-owner",
            json={
                "bootstrap_key": bootstrap_key,
                "email": "owner@example.com",
                "display_name": "Founding Owner",
                "password": "correct horse battery staple",
            },
        )
        status_after = client.get("/api/bootstrap/status")
        second = client.post(
            "/api/bootstrap/setup-owner",
            json={
                "bootstrap_key": bootstrap_key,
                "email": "owner@example.com",
                "display_name": "Founding Owner",
                "password": "correct horse battery staple",
            },
        )

    assert status_before.status_code == 200
    assert status_before.json() == {"initialized": False}
    assert first.status_code == 201
    assert status_after.status_code == 200
    assert status_after.json() == {"initialized": True}
    assert second.status_code == 409


def test_init_db_does_not_backfill_legacy_task_columns(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-legacy.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    from app import db as db_module

    db_module = importlib.reload(db_module)
    with db_module.engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE tasks (
                id VARCHAR PRIMARY KEY,
                title VARCHAR NOT NULL,
                task_type VARCHAR NOT NULL,
                input JSON,
                required_capability_ids JSON,
                lease_allowed BOOLEAN,
                approval_mode VARCHAR,
                priority VARCHAR,
                status VARCHAR,
                created_by VARCHAR,
                claimed_by VARCHAR
            )
            """
        )

    db_module.init_db()

    with db_module.engine.connect() as connection:
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(tasks)")).all()
        }

    assert "playbook_ids" not in columns


def test_app_startup_upgrades_legacy_schema_with_alembic(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-legacy-migrate.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_AGENT_KEY", bootstrap_key)

    from app import db as db_module
    from app import main as main_module

    db_module = importlib.reload(db_module)
    with db_module.engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE tasks (
                id VARCHAR PRIMARY KEY,
                title VARCHAR NOT NULL,
                task_type VARCHAR NOT NULL,
                input JSON,
                required_capability_ids JSON,
                lease_allowed BOOLEAN,
                approval_mode VARCHAR,
                priority VARCHAR,
                status VARCHAR,
                created_by VARCHAR,
                claimed_by VARCHAR
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE runs (
                id VARCHAR PRIMARY KEY,
                task_id VARCHAR NOT NULL,
                agent_id VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                started_at DATETIME,
                finished_at DATETIME,
                summary VARCHAR
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE secrets (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                scope VARCHAR NOT NULL,
                kind VARCHAR NOT NULL,
                backend_ref VARCHAR NOT NULL,
                value_ref VARCHAR NOT NULL
            )
            """
        )

    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        assert client.get("/healthz").status_code == 200

    with db_module.engine.connect() as connection:
        task_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(tasks)")).all()
        }
        run_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(runs)")).all()
        }
        secret_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(secrets)")).all()
        }
        migrated_revision = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()

    assert {
        "created_by_actor_type",
        "created_by_actor_id",
        "created_via_token_id",
        "publication_status",
        "reviewed_by_actor_id",
        "reviewed_at",
    }.issubset(task_columns)
    assert {"token_id", "task_target_id"}.issubset(run_columns)
    assert {
        "created_by_actor_type",
        "created_by_actor_id",
        "created_via_token_id",
        "publication_status",
        "reviewed_by_actor_id",
        "reviewed_at",
    }.issubset(secret_columns)
    assert migrated_revision == "20260330_01"
