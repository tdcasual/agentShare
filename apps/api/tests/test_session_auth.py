from conftest import BOOTSTRAP_AGENT_KEY


def test_management_login_sets_cookie_and_allows_session_introspection(anonymous_client):
    login = anonymous_client.post(
        "/api/session/login",
        json={"bootstrap_key": BOOTSTRAP_AGENT_KEY},
    )

    assert login.status_code == 200
    assert "management_session=" in login.headers["set-cookie"]

    session_me = anonymous_client.get("/api/session/me")
    assert session_me.status_code == 200
    assert session_me.json()["actor_id"] == "management"
    assert session_me.json()["actor_type"] == "human"


def test_management_login_rejects_invalid_bootstrap_credential(anonymous_client):
    response = anonymous_client.post(
        "/api/session/login",
        json={"bootstrap_key": "wrong-key"},
    )

    assert response.status_code == 401


def test_management_logout_clears_cookie(anonymous_client):
    login = anonymous_client.post(
        "/api/session/login",
        json={"bootstrap_key": BOOTSTRAP_AGENT_KEY},
    )
    assert login.status_code == 200

    logout = anonymous_client.post("/api/session/logout")
    assert logout.status_code == 200

    session_me = anonymous_client.get("/api/session/me")
    assert session_me.status_code == 401
