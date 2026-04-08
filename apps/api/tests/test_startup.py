import hashlib
import importlib

from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

from app.repositories.agent_repo import AgentRepository


CURRENT_ALEMBIC_HEAD = "20260408_01"


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
        "openclaw_agents",
        "openclaw_agent_files",
        "openclaw_sessions",
        "openclaw_tool_bindings",
        "openclaw_dream_runs",
        "openclaw_dream_steps",
        "openclaw_memory_notes",
        "system_settings",
        "secrets",
        "pending_secret_materials",
        "capabilities",
        "tasks",
        "task_targets",
        "runs",
        "token_feedback",
        "playbooks",
        "audit_events",
        "approval_requests",
        "events",
        "spaces",
        "space_members",
        "space_timeline_entries",
        "catalog_releases",
    }.issubset(set(inspector.get_table_names()))


def test_app_startup_runs_current_baseline_only(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-baseline.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", bootstrap_key)

    from app import db as db_module
    from app import main as main_module

    db_module = importlib.reload(db_module)
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        assert client.get("/healthz").status_code == 200

    with db_module.engine.connect() as connection:
        migrated_revision = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()

    assert migrated_revision == CURRENT_ALEMBIC_HEAD


def test_app_startup_seeds_bootstrap_agent(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-seed.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", bootstrap_key)

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


def test_app_startup_refreshes_bootstrap_agent_hash_when_config_changes(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-bootstrap-refresh.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", "old-bootstrap-key")

    from app import db as db_module
    from app import main as main_module

    db_module = importlib.reload(db_module)
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        assert client.get("/healthz").status_code == 200

    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", "new-bootstrap-key")
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        assert client.get("/healthz").status_code == 200

    session = db_module.SessionLocal()
    try:
        model = AgentRepository(session).get("bootstrap")
        assert model is not None
        assert model.api_key_hash == hashlib.sha256("new-bootstrap-key".encode()).hexdigest()
    finally:
        session.close()


def test_app_startup_bootstrap_route_initializes_once(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-bootstrap-route.db"
    bootstrap_key = "bootstrap-key-xyz"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", bootstrap_key)
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


def test_app_startup_can_seed_demo_fixture_data(monkeypatch, tmp_path):
    db_path = tmp_path / "startup-demo-seed.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", "bootstrap-key-xyz")
    monkeypatch.setenv("MANAGEMENT_SESSION_SECRET", "session-secret")
    monkeypatch.setenv("DEMO_SEED_ENABLED", "true")

    from app import main as main_module
    from app.repositories.capability_repo import CapabilityRepository
    from app.repositories.secret_repo import SecretRepository
    main_module = importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        bootstrap_status = client.get("/api/bootstrap/status")
        assert bootstrap_status.status_code == 200, bootstrap_status.text
        assert bootstrap_status.json() == {"initialized": True}

        login = client.post(
            "/api/session/login",
            json={
                "email": "owner@example.com",
                "password": "correct horse battery staple",
            },
        )
        assert login.status_code == 200, login.text

        search = client.get("/api/search", params={"q": "market"})
        assert search.status_code == 200, search.text
        search_payload = search.json()
        assert search_payload["assets"]
        assert search_payload["skills"]
        assert search_payload["events"]
        assert search_payload["events"][0]["href"].startswith("/inbox?eventId=")

        reviews = client.get("/api/reviews")
        assert reviews.status_code == 200, reviews.text
        assert reviews.json()["items"]

        events = client.get("/api/events")
        assert events.status_code == 200, events.text
        assert events.json()["items"]

    session = main_module.app.state.runtime.session_factory()
    try:
        pending_secret = SecretRepository(session).get("secret-demo-market-pending")
        pending_capability = CapabilityRepository(session).get("capability-demo-market-risk")

        assert pending_secret is not None
        assert pending_capability is not None
        assert pending_capability.secret_id == pending_secret.id
        assert pending_capability.required_provider == pending_secret.provider
    finally:
        session.close()
