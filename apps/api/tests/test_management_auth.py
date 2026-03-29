import hashlib

from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository
from app.services.session_service import revoke_management_session

from conftest import BOOTSTRAP_AGENT_KEY, TEST_AGENT_KEY


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

    non_bootstrap = client.post("/api/secrets", headers=_auth_header(TEST_AGENT_KEY), json=payload)
    assert non_bootstrap.status_code == 202
    assert non_bootstrap.json()["publication_status"] == "pending_review"

    allowed = management_client.post("/api/secrets", json=payload)
    assert allowed.status_code == 201


def test_management_bootstrap_bearer_no_longer_authorizes(client):
    response = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )
    assert response.status_code == 401


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
        headers=_auth_header(TEST_AGENT_KEY),
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
        headers=_auth_header(TEST_AGENT_KEY),
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


def test_agent_management_routes_require_bootstrap_identity(client, management_client, db_session):
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="agent-delete",
        name="Delete Me",
        api_key_hash=hashlib.sha256("delete-me".encode()).hexdigest(),
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=[],
        risk_tier="low",
    ))
    db_session.flush()

    list_response = client.get("/api/agents", headers=_auth_header(TEST_AGENT_KEY))
    assert list_response.status_code == 401

    create_response = client.post(
        "/api/agents",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"name": "Blocked Agent", "risk_tier": "low"},
    )
    assert create_response.status_code == 401

    delete_response = client.delete(
        "/api/agents/agent-delete",
        headers=_auth_header(TEST_AGENT_KEY),
    )
    assert delete_response.status_code == 401

    allowed = management_client.get("/api/agents")
    assert allowed.status_code == 200

    creation = management_client.post("/api/agents", json={"name": "New Agent", "risk_tier": "low"})
    assert creation.status_code == 201

    deletion = management_client.delete("/api/agents/agent-delete")
    assert deletion.status_code == 403
    assert deletion.json()["detail"] == "owner role required"


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
