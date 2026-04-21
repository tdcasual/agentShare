from app.services.session_service import revoke_management_session

from conftest import BOOTSTRAP_OWNER_KEY, TEST_ACCESS_TOKEN_KEY


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def test_secret_routes_require_management_session_cookie_or_runtime_agent(client, management_client):
    payload = {
        "display_name": "OpenAI prod key",
        "kind": "api_token",
        "value": "sk-live-example",
        "provider": "openai",
    }

    missing = client.post("/api/secrets", json=payload)
    assert missing.status_code == 401

    non_bootstrap = client.post("/api/secrets", headers=_auth_header(TEST_ACCESS_TOKEN_KEY), json=payload)
    assert non_bootstrap.status_code == 202
    assert non_bootstrap.json()["publication_status"] == "pending_review"

    allowed = management_client.post("/api/secrets", json=payload)
    assert allowed.status_code == 201


def test_management_bootstrap_bearer_no_longer_authorizes(client):
    response = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_OWNER_KEY),
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )
    assert response.status_code == 401


def test_bootstrap_bearer_cannot_access_runtime_routes(client):
    runtime_me = client.get(
        "/api/runtime/me",
        headers=_auth_header(BOOTSTRAP_OWNER_KEY),
    )
    assigned = client.get(
        "/api/tasks/assigned",
        headers=_auth_header(BOOTSTRAP_OWNER_KEY),
    )

    assert runtime_me.status_code == 401
    assert assigned.status_code == 401


def test_capability_and_task_creation_allow_runtime_submission_but_keep_management_active_publish(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
        },
    ).json()

    capability = client.post(
        "/api/capabilities",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
        },
    )
    assert capability.status_code == 202
    assert capability.json()["publication_status"] == "pending_review"

    task = client.post(
        "/api/tasks",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
        json={
            "title": "Fetch repo metadata",
            "task_type": "account_read",
            "input": {"provider": "github"},
        },
    )
    assert task.status_code == 202
    assert task.json()["publication_status"] == "pending_review"

    allowed_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
        },
    )
    assert allowed_capability.status_code == 201

    allowed_task = management_client.post(
        "/api/tasks",
        json={
            "title": "Fetch repo metadata",
            "task_type": "account_read",
            "input": {"provider": "github"},
        },
    )
    assert allowed_task.status_code == 201


def test_access_token_routes_require_management_session(client, management_client):
    list_response = client.get("/api/access-tokens", headers=_auth_header(TEST_ACCESS_TOKEN_KEY))
    assert list_response.status_code == 401

    create_response = client.post(
        "/api/access-tokens",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
        json={"display_name": "Blocked token", "subject_type": "automation", "subject_id": "test"},
    )
    assert create_response.status_code == 401

    allowed = management_client.get("/api/access-tokens")
    assert allowed.status_code == 200


def test_revoked_management_session_cookie_no_longer_authorizes_management_routes(management_client, db_session):
    session_me = management_client.get("/api/session/me")
    assert session_me.status_code == 200

    revoke_management_session(db_session, session_me.json()["session_id"])

    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )

    assert response.status_code == 401


def test_management_cookie_can_fallback_when_bearer_token_is_invalid(management_client):
    response = management_client.get(
        "/api/tasks",
        headers=_auth_header("invalid-runtime-token"),
    )

    assert response.status_code == 200
    assert response.json() == {"items": []}
