import pytest

from app.repositories.access_token_repo import AccessTokenRepository
from app.services import policy_service
from app.services.access_token_service import hash_access_token, mint_access_token

from conftest import TEST_ACCESS_TOKEN_KEY


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def _seed_access_token(
    db_session,
    *,
    subject_id: str,
    scopes: list[str] | None = None,
) -> str:
    token, raw_key = mint_access_token(
        db_session,
        display_name=subject_id,
        subject_type="automation",
        subject_id=subject_id,
        scopes=scopes or ["runtime"],
        labels={},
        issued_by_actor_type="system",
        issued_by_actor_id="test-fixture",
    )
    db_session.flush()
    return raw_key


def test_invoke_requires_claimed_task_ownership(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403


def test_invoke_rejects_capabilities_outside_task_contract(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": ["capability-other"],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers=_auth_header(TEST_ACCESS_TOKEN_KEY),
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403


def test_management_action_policy_declares_expected_minimum_roles():
    assert hasattr(policy_service, "minimum_role_for_management_action")
    assert policy_service.minimum_role_for_management_action("reviews:decide") == "operator"
    assert policy_service.minimum_role_for_management_action("tasks:create") == "operator"
    assert policy_service.minimum_role_for_management_action("admin_accounts:create") == "admin"


def test_management_action_policy_rejects_viewer_for_task_creation():
    assert hasattr(policy_service, "ensure_management_action_allowed")
    with pytest.raises(PermissionError, match="operator role required"):
        policy_service.ensure_management_action_allowed("viewer", "tasks:create")
