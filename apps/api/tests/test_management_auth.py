import hashlib

from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository

from conftest import BOOTSTRAP_AGENT_KEY, TEST_AGENT_KEY


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def test_secret_routes_require_management_bootstrap_key(client):
    missing = client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )
    assert missing.status_code == 401

    non_bootstrap = client.post(
        "/api/secrets",
        headers=_auth_header(TEST_AGENT_KEY),
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )
    assert non_bootstrap.status_code == 403

    allowed = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    )
    assert allowed.status_code == 201


def test_capability_and_task_creation_require_management_bootstrap_key(client):
    secret = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
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
    assert capability.status_code == 403

    task = client.post(
        "/api/tasks",
        headers=_auth_header(TEST_AGENT_KEY),
        json={
            "title": "Fetch repo metadata",
            "task_type": "account_read",
            "input": {"provider": "github"},
        },
    )
    assert task.status_code == 403


def test_agent_management_routes_require_bootstrap_identity(client, db_session):
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
    assert list_response.status_code == 403

    create_response = client.post(
        "/api/agents",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"name": "Blocked Agent", "risk_tier": "low"},
    )
    assert create_response.status_code == 403

    delete_response = client.delete(
        "/api/agents/agent-delete",
        headers=_auth_header(TEST_AGENT_KEY),
    )
    assert delete_response.status_code == 403

    allowed = client.get("/api/agents", headers=_auth_header(BOOTSTRAP_AGENT_KEY))
    assert allowed.status_code == 200
