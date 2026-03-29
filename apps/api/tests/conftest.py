import hashlib
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
from app.repositories.agent_repo import AgentRepository
from app.runtime import AppRuntime
from app.observability import reset_metrics
from app.services.secret_backend import InMemorySecretBackend, reset_secret_counter

ROOT = Path(__file__).resolve().parents[3]
API_ROOT = ROOT / "apps/api"

TEST_AGENT_KEY = "agent-test-token"
BOOTSTRAP_AGENT_KEY = "bootstrap-test-token"
TEST_SETTINGS = Settings(
    database_url="sqlite:///./pytest-placeholder.db",
    bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
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
    reset_secret_counter()
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
    key_hash = hashlib.sha256(TEST_AGENT_KEY.encode()).hexdigest()
    repo.create(AgentIdentityModel(
        id="test-agent",
        name="Test Agent",
        api_key_hash=key_hash,
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=["config_sync", "account_read", "prompt_run"],
        risk_tier="medium",
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


@pytest.fixture
def anonymous_client(client):
    return client


@pytest.fixture
def management_client(seeded_app):
    """Log in to the management UI and return a client with the session cookie."""
    with TestClient(seeded_app) as test_client:
        login_response = test_client.post(
            "/api/session/login",
            json={"bootstrap_key": BOOTSTRAP_AGENT_KEY},
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
                "management_operator_role": role,
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
                login_response = test_client.post(
                    "/api/session/login",
                    json={"bootstrap_key": BOOTSTRAP_AGENT_KEY},
                )
                assert login_response.status_code == 200, login_response.text
                assert login_response.cookies, "management login should issue a cookie"
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
