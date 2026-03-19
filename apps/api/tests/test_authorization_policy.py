import hashlib

from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository

from conftest import BOOTSTRAP_AGENT_KEY, TEST_AGENT_KEY


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def _seed_agent(
    db_session,
    *,
    agent_id: str,
    api_key: str,
    allowed_task_types: list[str] | None = None,
    allowed_capability_ids: list[str] | None = None,
) -> None:
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id=agent_id,
        name=agent_id,
        api_key_hash=hashlib.sha256(api_key.encode()).hexdigest(),
        status="active",
        allowed_capability_ids=allowed_capability_ids or [],
        allowed_task_types=allowed_task_types or [],
        risk_tier="medium",
    ))
    db_session.flush()


def test_claim_rejects_task_types_outside_agent_allowlist(client, db_session):
    _seed_agent(
        db_session,
        agent_id="restricted-agent",
        api_key="restricted-key",
        allowed_task_types=["account_read"],
    )

    task = client.post(
        "/api/tasks",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
        },
    ).json()

    response = client.post(
        f"/api/tasks/{task['id']}/claim",
        headers=_auth_header("restricted-key"),
    )

    assert response.status_code == 403


def test_invoke_requires_claimed_task_ownership(client):
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
    capability = client.post(
        "/api/capabilities",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    ).json()
    task = client.post(
        "/api/tasks",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403


def test_invoke_rejects_capabilities_outside_task_contract(client):
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
    capability = client.post(
        "/api/capabilities",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    ).json()
    task = client.post(
        "/api/tasks",
        headers=_auth_header(BOOTSTRAP_AGENT_KEY),
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": ["capability-other"],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers=_auth_header(TEST_AGENT_KEY),
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403


def test_lease_rejects_capabilities_outside_agent_allowlist(client, db_session):
    _seed_agent(
        db_session,
        agent_id="cap-restricted",
        api_key="cap-restricted-key",
        allowed_capability_ids=["capability-allowlisted"],
        allowed_task_types=["account_read"],
    )

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
            "allowed_mode": "proxy_or_lease",
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
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers=_auth_header("cap-restricted-key"),
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers=_auth_header("cap-restricted-key"),
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 403
