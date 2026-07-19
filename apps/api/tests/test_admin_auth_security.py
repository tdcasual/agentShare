import bcrypt
import pytest
from fastapi.testclient import TestClient
from test_admin_api import ADMIN_EMAIL, ADMIN_PASSWORD, bootstrap_and_login


def test_login_rate_limit_is_scoped_by_ip_and_email(client: TestClient) -> None:
    created = client.post(
        "/api/admin/bootstrap/init",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert created.status_code == 201
    client.app.state.settings.auth_rate_limit_max_attempts = 2

    for _ in range(2):
        assert client.post(
            "/api/admin/session/login",
            json={"email": ADMIN_EMAIL, "password": "wrong-password"},
        ).status_code == 401

    blocked = client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert blocked.status_code == 429

    other_identity = client.post(
        "/api/admin/session/login",
        json={"email": "other@example.com", "password": "wrong-password"},
    )
    assert other_identity.status_code == 401


def test_sqlite_repeated_successful_logins_do_not_error(client: TestClient) -> None:
    """Regression: naive datetimes read back from SQLite must not break the
    persistent rate-limit window comparison after a successful login."""
    created = client.post(
        "/api/admin/bootstrap/init",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert created.status_code == 201
    # The first login sets a session cookie; subsequent state-changing
    # requests must carry a valid Origin to pass the CSRF middleware.
    client.headers["Origin"] = "http://localhost:3000"

    for _ in range(2):
        response = client.post(
            "/api/admin/session/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert response.status_code == 200


def test_login_rate_limit_counts_normalized_email_variants(client: TestClient) -> None:
    """Case/whitespace variants of the same email must share one failure count."""
    created = client.post(
        "/api/admin/bootstrap/init",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert created.status_code == 201
    client.app.state.settings.auth_rate_limit_max_attempts = 3

    for email in ("ADMIN@example.com", " admin@example.com ", "Admin@Example.Com"):
        assert client.post(
            "/api/admin/session/login",
            json={"email": email, "password": "wrong-password"},
        ).status_code == 401

    blocked = client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": "wrong-password"},
    )
    assert blocked.status_code == 429


def test_rate_limited_login_does_not_write_failure_audit(client: TestClient) -> None:
    """Blocked (429) attempts must not add audit rows, otherwise they would
    count towards the limit and keep the account locked forever."""
    bootstrap_and_login(client)
    client.app.state.settings.auth_rate_limit_max_attempts = 2

    for _ in range(2):
        assert client.post(
            "/api/admin/session/login",
            json={"email": ADMIN_EMAIL, "password": "wrong-password"},
        ).status_code == 401

    for _ in range(2):
        assert client.post(
            "/api/admin/session/login",
            json={"email": ADMIN_EMAIL, "password": "wrong-password"},
        ).status_code == 429

    denied = client.get("/api/admin/audit-logs", params={"action": "admin.login.failed"})
    assert denied.status_code == 200
    assert denied.json()["total"] == 2
    assert {item["reason"] for item in denied.json()["items"]} == {"invalid_credentials"}


def test_unknown_email_login_performs_dummy_password_check(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Unknown emails must still pay one bcrypt verification to avoid a
    user-enumeration timing side channel."""
    created = client.post(
        "/api/admin/bootstrap/init",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert created.status_code == 201

    checkpw_calls = 0
    real_checkpw = bcrypt.checkpw

    def spy_checkpw(*args, **kwargs):
        nonlocal checkpw_calls
        checkpw_calls += 1
        return real_checkpw(*args, **kwargs)

    monkeypatch.setattr("app.modules.admin_auth.service.bcrypt.checkpw", spy_checkpw)

    response = client.post(
        "/api/admin/session/login",
        json={"email": "ghost@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert checkpw_calls == 1
