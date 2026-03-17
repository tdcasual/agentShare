import fakeredis
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.orm import Base  # noqa: F401 — import triggers all model registration
from app.services.secret_backend import InMemorySecretBackend, reset_secret_counter

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
_TestSession = sessionmaker(bind=_test_engine, expire_on_commit=False)


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
