from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app


BOOTSTRAP_KEY = "bootstrap-test-token"


def make_client(tmp_path) -> TestClient:
    db_path = tmp_path / "bootstrap.db"
    settings = Settings(
        _env_file=None,
        app_env="development",
        database_url=f"sqlite:///{db_path}",
        bootstrap_owner_key=BOOTSTRAP_KEY,
        management_session_secret="session-secret",
    )
    app = create_app(settings)
    return TestClient(app)


def test_bootstrap_status_reports_uninitialized_before_first_owner_setup(tmp_path) -> None:
    with make_client(tmp_path) as client:
        response = client.get("/api/bootstrap/status")

    assert response.status_code == 200
    assert response.json() == {"initialized": False}
    assert "bootstrapped" not in response.json()
    assert "has_valid_bootstrap_key" not in response.json()
    assert "setup_required" not in response.json()


def test_setup_owner_only_works_once(tmp_path) -> None:
    payload = {
        "bootstrap_key": BOOTSTRAP_KEY,
        "email": "owner@example.com",
        "display_name": "Founding Owner",
        "password": "correct horse battery staple",
    }

    with make_client(tmp_path) as client:
        first = client.post("/api/bootstrap/setup-owner", json=payload)
        status_after_first = client.get("/api/bootstrap/status")
        second = client.post("/api/bootstrap/setup-owner", json=payload)

    assert first.status_code == 201
    assert first.json()["account"]["email"] == "owner@example.com"
    assert first.json()["account"]["role"] == "owner"
    assert status_after_first.status_code == 200
    assert status_after_first.json() == {"initialized": True}
    assert "bootstrapped" not in status_after_first.json()
    assert "has_valid_bootstrap_key" not in status_after_first.json()
    assert "setup_required" not in status_after_first.json()
    assert second.status_code == 409


def test_setup_owner_rejects_short_password(tmp_path) -> None:
    payload = {
        "bootstrap_key": BOOTSTRAP_KEY,
        "email": "owner@example.com",
        "display_name": "Founding Owner",
        "password": "shortpass",
    }

    with make_client(tmp_path) as client:
        response = client.post("/api/bootstrap/setup-owner", json=payload)

    assert response.status_code == 422
