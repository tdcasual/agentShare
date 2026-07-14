from fastapi.testclient import TestClient
from test_admin_api import ADMIN_EMAIL, ADMIN_PASSWORD


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
