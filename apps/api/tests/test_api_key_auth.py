import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import get_db
from app.main import app
from app.orm.base import Base
from app.services.access_token_service import mint_access_token

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
    resp = client.get("/api/runtime/me")
    assert resp.status_code == 401


def test_invalid_key_returns_401(client):
    resp = client.get("/api/runtime/me", headers={"Authorization": "Bearer bad-key"})
    assert resp.status_code == 401


def test_access_token_authenticates_runtime_me(client, db_session):
    token, raw_token = mint_access_token(
        db_session,
        display_name="Test runner",
        subject_type="automation",
        subject_id="test-runner",
        scopes=["runtime"],
        labels={},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    resp = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["auth_method"] == "access_token"
    assert data["token_id"] == token.id


def test_access_token_without_runtime_scope_is_rejected(client, db_session):
    token, raw_token = mint_access_token(
        db_session,
        display_name="Reports only",
        subject_type="automation",
        subject_id="reports-runner",
        scopes=["reports"],
        labels={},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    resp = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 403
