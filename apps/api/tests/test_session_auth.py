from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.repositories.management_session_repo import ManagementSessionRepository
from app.services.session_service import revoke_management_session
from conftest import (
    BOOTSTRAP_AGENT_KEY,
    OWNER_EMAIL,
    OWNER_PASSWORD,
    bootstrap_owner_account,
    login_management_account,
)


def test_management_login_sets_cookie_and_allows_session_introspection(anonymous_client):
    bootstrap = bootstrap_owner_account(anonymous_client)
    login = login_management_account(anonymous_client)

    assert login.status_code == 200
    assert "management_session=" in login.headers["set-cookie"]

    session_me = anonymous_client.get("/api/session/me")
    assert session_me.status_code == 200
    assert session_me.json()["actor_id"] == bootstrap["account"]["id"]
    assert session_me.json()["actor_type"] == "human"
    assert session_me.json()["auth_method"] == "session"
    assert session_me.json()["role"] == "owner"
    assert session_me.json()["email"] == OWNER_EMAIL
    assert session_me.json()["session_id"]
    assert session_me.json()["issued_at"] > 0
    assert session_me.json()["expires_at"] > session_me.json()["issued_at"]


def test_management_login_persists_server_side_session_record(anonymous_client, db_session):
    bootstrap_owner_account(anonymous_client)
    login = login_management_account(anonymous_client)

    assert login.status_code == 200

    session_id = login.json()["session_id"]
    record = ManagementSessionRepository(db_session).get(session_id)

    assert record is not None
    assert record.session_id == session_id
    assert record.revoked_at is None


def test_management_login_rejects_invalid_bootstrap_credential(anonymous_client):
    bootstrap_owner_account(anonymous_client)
    response = login_management_account(anonymous_client, password="wrong-password")

    assert response.status_code == 401


def test_management_logout_revokes_server_session_and_clears_cookie(anonymous_client, db_session):
    bootstrap_owner_account(anonymous_client)
    login = login_management_account(anonymous_client)
    assert login.status_code == 200
    session_id = login.json()["session_id"]

    logout = anonymous_client.post("/api/session/logout")
    assert logout.status_code == 200

    record = ManagementSessionRepository(db_session).get(session_id)
    assert record is not None
    assert record.revoked_at is not None

    session_me = anonymous_client.get("/api/session/me")
    assert session_me.status_code == 401


def test_revoked_management_cookie_is_rejected(anonymous_client, db_session):
    bootstrap_owner_account(anonymous_client)
    login = login_management_account(anonymous_client)
    assert login.status_code == 200

    revoke_management_session(db_session, login.json()["session_id"])

    session_me = anonymous_client.get("/api/session/me")
    assert session_me.status_code == 401


def test_management_login_uses_runtime_cookie_name(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'cookie.db'}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
        management_session_cookie_name="ops_session",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        bootstrap_owner_account(client)
        response = login_management_account(client)

    assert response.status_code == 200
    assert "ops_session" in response.cookies
    assert "ops_session=" in response.headers["set-cookie"]


def test_management_login_sets_secure_cookie_when_enabled(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'secure-cookie.db'}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
        management_session_secure=True,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        bootstrap_owner_account(client)
        response = login_management_account(client)

    assert response.status_code == 200
    assert "secure" in response.headers["set-cookie"].lower()


def test_management_login_returns_bootstrapped_owner_identity(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'operator.db'}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        bootstrap = bootstrap_owner_account(client)
        response = login_management_account(client)
        session_me = client.get("/api/session/me")

    assert response.status_code == 200
    assert response.json()["actor_id"] == bootstrap["account"]["id"]
    assert response.json()["role"] == "owner"
    assert response.json()["email"] == OWNER_EMAIL
    assert response.json()["session_id"]
    assert session_me.status_code == 200
    assert session_me.json()["actor_id"] == bootstrap["account"]["id"]
    assert session_me.json()["role"] == "owner"
    assert session_me.json()["email"] == OWNER_EMAIL
