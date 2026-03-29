import hashlib

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.orm.base import Base
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository

OWNER_EMAIL = "owner@example.com"
OWNER_PASSWORD = "correct horse battery staple"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin-password-123"


_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
_Session = sessionmaker(bind=_engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def setup_db():
    connection = _engine.connect()
    Base.metadata.create_all(bind=connection)
    yield connection
    Base.metadata.drop_all(bind=connection)
    connection.close()


@pytest.fixture
def db_session(setup_db):
    session = _Session(bind=setup_db)
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    def _override():
        yield db_session
    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def _login_management_session(client, bootstrap_key: str) -> None:
    status_response = client.get("/api/bootstrap/status")
    assert status_response.status_code == 200
    if not status_response.json()["initialized"]:
        bootstrap_response = client.post(
            "/api/bootstrap/setup-owner",
            json={
                "bootstrap_key": bootstrap_key,
                "email": OWNER_EMAIL,
                "display_name": "Founding Owner",
                "password": OWNER_PASSWORD,
            },
        )
        assert bootstrap_response.status_code == 201, bootstrap_response.text
    owner_response = client.post(
        "/api/session/login",
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
    )
    assert owner_response.status_code == 200
    create_response = client.post(
        "/api/admin-accounts",
        json={
            "email": ADMIN_EMAIL,
            "display_name": "Admin User",
            "password": ADMIN_PASSWORD,
            "role": "admin",
        },
    )
    assert create_response.status_code in {201, 409}, create_response.text
    logout_response = client.post("/api/session/logout")
    assert logout_response.status_code == 200
    response = client.post(
        "/api/session/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200


def test_missing_auth_returns_401(client):
    resp = client.get("/api/agents/me")
    assert resp.status_code == 401


def test_invalid_key_returns_401(client):
    resp = client.get("/api/agents/me", headers={"Authorization": "Bearer bad-key"})
    assert resp.status_code == 401


def test_valid_api_key_returns_agent(client, db_session):
    api_key = "test-api-key-12345"
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="agent-1", name="Test Bot", api_key_hash=_hash_key(api_key),
        status="active", allowed_capability_ids=[], allowed_task_types=[], risk_tier="medium",
    ))
    db_session.flush()
    resp = client.get("/api/agents/me", headers={"Authorization": f"Bearer {api_key}"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Bot"


def test_create_agent_returns_api_key(client, db_session):
    bootstrap_key = "bootstrap-key-xyz"
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="bootstrap", name="Bootstrap", api_key_hash=_hash_key(bootstrap_key),
        status="active", allowed_capability_ids=[], allowed_task_types=[], risk_tier="high",
    ))
    db_session.flush()
    _login_management_session(client, bootstrap_key)
    resp = client.post(
        "/api/agents",
        json={"name": "New Agent", "risk_tier": "low"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "api_key" in data
    assert "token_id" in data
    assert data["name"] == "New Agent"


def test_delete_agent_requires_owner_role(client, db_session):
    bootstrap_key = "bootstrap-key-xyz"
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="bootstrap", name="Bootstrap", api_key_hash=_hash_key(bootstrap_key),
        status="active", allowed_capability_ids=[], allowed_task_types=[], risk_tier="high",
    ))
    repo.create(AgentIdentityModel(
        id="agent-del", name="Deletable", api_key_hash=_hash_key("x"),
        status="active", allowed_capability_ids=[], allowed_task_types=[], risk_tier="low",
    ))
    db_session.flush()
    _login_management_session(client, bootstrap_key)
    resp = client.delete(
        "/api/agents/agent-del",
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "owner role required"
