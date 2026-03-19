from app.orm.secret import SecretModel

from conftest import BOOTSTRAP_AGENT_KEY, TEST_AGENT_KEY


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def test_capability_creation_rejects_wrong_provider_binding(client):
    secret = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()

    response = client.post(
        "/api/capabilities",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "github",
        },
    )

    assert response.status_code == 400


def test_capability_creation_rejects_missing_provider_scopes(client):
    secret = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["read:org"],
        },
    ).json()

    response = client.post(
        "/api/capabilities",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "name": "github.repo.sync",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    )

    assert response.status_code == 400


def test_runtime_invoke_rechecks_secret_scope_compatibility(client, db_session):
    secret = client.post(
        "/api/secrets",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = client.post(
        "/api/capabilities",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = client.post(
        "/api/tasks",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers=_auth_header(TEST_AGENT_KEY),
    )

    model = db_session.get(SecretModel, secret["id"])
    assert model is not None
    model.provider_scopes = []
    db_session.flush()

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"task_id": task["id"], "parameters": {"repo": "agent-share"}},
    )

    assert response.status_code == 403
