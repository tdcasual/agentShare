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
    assert {"agents", "secrets", "capabilities", "tasks", "runs", "playbooks"}.issubset(
        set(inspector.get_table_names())
    )


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
