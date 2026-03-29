from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app


BOOTSTRAP_KEY = "bootstrap-test-token"
OWNER_EMAIL = "owner@example.com"
OWNER_PASSWORD = "correct horse battery staple"


def make_client(tmp_path) -> TestClient:
    db_path = tmp_path / "admin-accounts.db"
    settings = Settings(
        _env_file=None,
        app_env="development",
        database_url=f"sqlite:///{db_path}",
        bootstrap_agent_key=BOOTSTRAP_KEY,
        management_session_secret="session-secret",
    )
    app = create_app(settings)
    return TestClient(app)


def bootstrap_owner(client: TestClient) -> None:
    response = client.post(
        "/api/bootstrap/setup-owner",
        json={
            "bootstrap_key": BOOTSTRAP_KEY,
            "email": OWNER_EMAIL,
            "display_name": "Founding Owner",
            "password": OWNER_PASSWORD,
        },
    )
    assert response.status_code == 201, response.text


def login_owner(client: TestClient):
    return client.post(
        "/api/session/login",
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
    )


def test_management_login_uses_persisted_account_credentials(tmp_path) -> None:
    with make_client(tmp_path) as client:
        bootstrap_owner(client)
        response = login_owner(client)

    assert response.status_code == 200
    assert response.json()["role"] == "owner"
    assert response.json()["actor_type"] == "human"
    assert response.json()["email"] == OWNER_EMAIL


def test_management_login_rejects_when_bootstrap_is_not_complete(tmp_path) -> None:
    with make_client(tmp_path) as client:
        response = client.post(
            "/api/session/login",
            json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "Bootstrap setup is required before management login"


def test_admin_accounts_are_invite_only(tmp_path) -> None:
    with make_client(tmp_path) as client:
        bootstrap_owner(client)
        login_response = login_owner(client)
        assert login_response.status_code == 200, login_response.text

        anonymous = client.post(
            "/api/admin-accounts",
            json={
                "email": "viewer@example.com",
                "display_name": "Viewer User",
                "password": "viewer-pass-123",
                "role": "viewer",
            },
        )
        listing = client.get("/api/admin-accounts")

    assert anonymous.status_code == 201
    assert listing.status_code == 200
    assert {item["email"] for item in listing.json()["items"]} == {
        OWNER_EMAIL,
        "viewer@example.com",
    }
