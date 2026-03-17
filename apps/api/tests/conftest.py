import hashlib

import fakeredis
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.orm import Base  # noqa: F401 — import triggers all model registration
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository
from app.services.secret_backend import InMemorySecretBackend, reset_secret_counter

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
_TestSession = sessionmaker(bind=_test_engine, expire_on_commit=False)

TEST_AGENT_KEY = "agent-test-token"


@pytest.fixture(autouse=True)
def db_session():
    """Create tables fresh for every test, yield session, then drop."""
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


@pytest.fixture
def client(db_session):
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
    db_session.flush()

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = _override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def fake_redis_for_all(monkeypatch):
    """Ensure all tests use fakeredis instead of real Redis."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.redis_client._redis_client", fake)
    yield fake
