import hashlib
from contextlib import contextmanager

import fakeredis
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
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

_test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(bind=_test_engine, expire_on_commit=False)

TEST_AGENT_KEY = "agent-test-token"
BOOTSTRAP_AGENT_KEY = "bootstrap-test-token"
TEST_SETTINGS = Settings(
    database_url="sqlite://",
    bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
)


def _build_test_app(settings: Settings = TEST_SETTINGS):
    runtime = AppRuntime(
        settings=settings,
        engine=_test_engine,
        session_factory=_TestSession,
    )
    return create_app(settings, runtime=runtime)


@pytest.fixture(autouse=True)
def db_session():
    """Create tables fresh for every test, yield session, then drop."""
    Base.metadata.drop_all(bind=_test_engine)

    # Use a single connection so in-memory SQLite tables are visible to the session
    connection = _test_engine.connect()
    Base.metadata.create_all(bind=connection)
    InMemorySecretBackend.reset_store()
    reset_secret_counter()
    session = _TestSession(bind=connection)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=connection)
        connection.close()


@pytest.fixture(autouse=True)
def reset_observability_metrics():
    reset_metrics()


@pytest.fixture
def seeded_app(db_session):
    app = _build_test_app()

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
    bootstrap_hash = hashlib.sha256(BOOTSTRAP_AGENT_KEY.encode()).hexdigest()
    repo.create(AgentIdentityModel(
        id="bootstrap",
        name="Bootstrap Agent",
        api_key_hash=bootstrap_hash,
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=[],
        risk_tier="high",
    ))
    db_session.flush()

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
        settings = TEST_SETTINGS.model_copy(update={"management_operator_role": role})
        app = _build_test_app(settings)

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
