import os
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path

import fakeredis
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import get_db
from app.factory import create_app
from app.orm import Base  # noqa: F401 — import triggers all model registration
from app.orm.agent import AgentIdentityModel
from app.orm.agent_token import AgentTokenModel
from app.repositories.agent_repo import AgentRepository
from app.runtime import AppRuntime
from app.observability import reset_metrics
from app.services.agent_token_service import hash_token
from app.services.secret_backend import InMemorySecretBackend

ROOT = Path(__file__).resolve().parents[3]
API_ROOT = ROOT / "apps/api"

TEST_AGENT_KEY = "agent-test-token"
BOOTSTRAP_OWNER_KEY = "bootstrap-test-token"
OWNER_EMAIL = "owner@example.com"
OWNER_PASSWORD = "correct horse battery staple"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin-password-123"
TEST_SETTINGS = Settings(
    database_url="sqlite:///./pytest-placeholder.db",
    bootstrap_owner_key=BOOTSTRAP_OWNER_KEY,
)


def _run_alembic_upgrade(database_url: str) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url

    subprocess.run(
        [
            sys.executable,
            "-c",
            "from alembic.config import main; main(argv=['-c', 'alembic.ini', 'upgrade', 'head'])",
        ],
        cwd=API_ROOT,
        check=True,
        env=env,
    )


def _build_test_app(
    engine,
    session_factory,
    settings: Settings,
):
    runtime = AppRuntime(
        settings=settings,
        engine=engine,
        session_factory=session_factory,
    )
    return create_app(settings, runtime=runtime)


@pytest.fixture
def test_database_url(tmp_path):
    db_path = tmp_path / "pytest.db"
    database_url = f"sqlite:///{db_path}"
    _run_alembic_upgrade(database_url)
    return database_url


@pytest.fixture
def test_settings(test_database_url):
    return TEST_SETTINGS.model_copy(update={"database_url": test_database_url})


@pytest.fixture
def test_engine(test_database_url):
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},
    )
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def test_session_factory(test_engine):
    return sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def db_session(test_session_factory):
    InMemorySecretBackend.reset_store()
    session = test_session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def reset_observability_metrics():
    reset_metrics()


@pytest.fixture
def seeded_app(db_session, test_engine, test_session_factory, test_settings):
    app = _build_test_app(test_engine, test_session_factory, test_settings)

    # Seed a test agent for auth
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="test-agent",
        name="Test Agent",
        api_key_hash=None,
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=["config_sync", "account_read", "prompt_run"],
        risk_tier="medium",
    ))
    db_session.add(AgentTokenModel(
        id="token-test-agent",
        agent_id="test-agent",
        display_name="Test agent token",
        token_hash=hash_token(TEST_AGENT_KEY),
        token_prefix=TEST_AGENT_KEY[:10],
        status="active",
        issued_by_actor_type="system",
        issued_by_actor_id="test-fixture",
        scopes=[],
        labels={},
    ))
    db_session.commit()

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield app
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def client(seeded_app):
    with TestClient(seeded_app) as test_client:
        yield test_client


def bootstrap_owner_account(client: TestClient) -> dict:
    status_response = client.get("/api/bootstrap/status")
    assert status_response.status_code == 200, status_response.text
    if status_response.json()["initialized"]:
        return {"initialized": True}

    response = client.post(
        "/api/bootstrap/setup-owner",
        json={
            "bootstrap_key": BOOTSTRAP_OWNER_KEY,
            "email": OWNER_EMAIL,
            "display_name": "Founding Owner",
            "password": OWNER_PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def login_management_account(
    client: TestClient,
    *,
    email: str = OWNER_EMAIL,
    password: str = OWNER_PASSWORD,
):
    return client.post(
        "/api/session/login",
        json={"email": email, "password": password},
    )


@pytest.fixture
def anonymous_client(client):
    return client


@pytest.fixture
def management_client(seeded_app):
    """Log in to the management UI and return a client with the session cookie."""
    with TestClient(seeded_app) as test_client:
        bootstrap_owner_account(test_client)
        owner_login_response = login_management_account(test_client)
        assert owner_login_response.status_code == 200, owner_login_response.text
        create_response = test_client.post(
            "/api/admin-accounts",
            json={
                "email": ADMIN_EMAIL,
                "display_name": "Admin User",
                "password": ADMIN_PASSWORD,
                "role": "admin",
            },
        )
        assert create_response.status_code in {201, 409}, create_response.text
        logout_response = test_client.post("/api/session/logout")
        assert logout_response.status_code == 200, logout_response.text
        login_response = login_management_account(
            test_client,
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
        )
        assert login_response.status_code == 200, login_response.text
        assert login_response.cookies, "management login should issue a cookie"
        yield test_client


@pytest.fixture
def management_client_for_role(db_session):
    @contextmanager
    def _client(role: str):
        engine = db_session.get_bind()
        settings = TEST_SETTINGS.model_copy(
            update={
                "database_url": str(engine.url),
            }
        )
        session_factory = sessionmaker(bind=engine, expire_on_commit=False)
        app = _build_test_app(engine, session_factory, settings)

        def _override_get_db():
            try:
                yield db_session
            finally:
                pass

        app.dependency_overrides[get_db] = _override_get_db
        try:
            with TestClient(app) as test_client:
                bootstrap_owner_account(test_client)
                login_response = login_management_account(test_client)
                assert login_response.status_code == 200, login_response.text
                assert login_response.cookies, "management login should issue a cookie"
                if role != "owner":
                    create_response = test_client.post(
                        "/api/admin-accounts",
                        json={
                            "email": f"{role}@example.com",
                            "display_name": role.title(),
                            "password": f"{role}-password-123",
                            "role": role,
                        },
                    )
                    assert create_response.status_code in {201, 409}, create_response.text
                    logout_response = test_client.post("/api/session/logout")
                    assert logout_response.status_code == 200, logout_response.text
                    role_login_response = login_management_account(
                        test_client,
                        email=f"{role}@example.com",
                        password=f"{role}-password-123",
                    )
                    assert role_login_response.status_code == 200, role_login_response.text
                yield test_client
        finally:
            app.dependency_overrides.clear()

    return _client


@pytest.fixture
def owner_management_client(management_client_for_role):
    with management_client_for_role("owner") as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def fake_redis_for_all(monkeypatch):
    """Ensure all tests use fakeredis instead of real Redis."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.redis_client._redis_clients", {TEST_SETTINGS.redis_url: fake})
    yield fake
