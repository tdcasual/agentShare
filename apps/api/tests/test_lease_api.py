from conftest import TEST_SETTINGS

from app.errors import ServiceUnavailableError
from app.repositories.approval_repo import ApprovalRequestRepository


def test_proxy_only_capability_cannot_issue_lease(client, management_client):
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
            "allowed_mode": "proxy_only",
            "required_provider": "openai",
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "local sdk call"},
    )

    assert response.status_code == 403


def test_lease_capability_can_issue_short_lived_lease(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 201
    assert response.json()["expires_in"] == 120
    assert response.json()["lease_type"] == "metadata_placeholder"
    assert response.json()["secret_value_included"] is False


def test_lease_rejects_token_outside_access_token_selector_access_policy(
    client,
    management_client,
    mint_standalone_access_token,
):
    allowed_token = mint_standalone_access_token(
        display_name="Lease restricted token",
        subject_id="test-agent",
    )
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.restricted",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "access_policy": {
                "mode": "selectors",
                "selectors": [
                    {"kind": "access_token", "ids": [allowed_token["id"]]},
                ],
            },
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Capability is not accessible to this access token"


def test_lease_allows_access_token_selector_matches(
    client,
    management_client,
    mint_standalone_access_token,
):
    runtime_token = mint_standalone_access_token(
        display_name="Lease selector token",
        subject_id="test-agent",
    )
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.agent-selector",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "access_policy": {
                "mode": "selectors",
                "selectors": [
                    {"kind": "access_token", "ids": [runtime_token["id"]]},
                ],
            },
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 201
    assert response.json()["capability_id"] == capability["id"]


def test_lease_allows_access_token_label_selector_matches(client, management_client):
    runtime_token = management_client.post(
        "/api/access-tokens",
        json={
            "display_name": "Prod lease token",
            "subject_type": "automation",
            "subject_id": "test-agent",
            "scopes": ["runtime"],
            "labels": {"environment": "prod"},
        },
    ).json()
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.label-selector",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "access_policy": {
                "mode": "selectors",
                "selectors": [
                    {"kind": "access_token_label", "key": "environment", "values": ["prod"]},
                ],
            },
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 201
    assert response.json()["capability_id"] == capability["id"]


def test_lease_uses_runtime_settings_for_coordination_lock(client, management_client, monkeypatch):
    captured: list[tuple[str, str]] = []

    def fake_acquire_lock(key: str, ttl_seconds: int, settings):
        del ttl_seconds
        captured.append((key, settings.redis_url))
        return "lock-token"

    def fake_release_lock(key: str, lock_token: str, settings):
        assert lock_token == "lock-token"
        captured.append((key, settings.redis_url))

    monkeypatch.setattr("app.services.gateway.acquire_lock", fake_acquire_lock, raising=False)
    monkeypatch.setattr("app.services.gateway.release_lock", fake_release_lock, raising=False)

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.locked",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata with coordination",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    expected_key = f"task:{task['id']}:capability:{capability['id']}:lease"
    assert response.status_code == 201
    assert captured == [
        (expected_key, TEST_SETTINGS.redis_url),
        (expected_key, TEST_SETTINGS.redis_url),
    ]


def test_lease_returns_503_when_coordination_is_unavailable(client, management_client, monkeypatch):
    def fail_acquire_lock(key: str, ttl_seconds: int, settings):
        del key, ttl_seconds, settings
        raise ServiceUnavailableError("Runtime coordination is unavailable")

    monkeypatch.setattr("app.services.gateway.acquire_lock", fail_acquire_lock, raising=False)

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.unavailable",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata when coordination is down",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Runtime coordination is unavailable"}

def test_lease_requires_manual_approval_returns_409(client, management_client, db_session):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "approval_mode": "manual",
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "approval_required"
    assert detail["approval_request_id"].startswith("approval-")
    assert detail["status"] == "pending"
    assert detail["action_type"] == "lease"
    assert ApprovalRequestRepository(db_session).get(detail["approval_request_id"]) is not None


def test_same_task_generates_distinct_lease_ids_per_capability(client, management_client):
    first_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token one",
            "kind": "api_token",
            "value": "ghp_example_one",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    second_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token two",
            "kind": "api_token",
            "value": "ghp_example_two",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    first_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.one",
            "secret_id": first_secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    second_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.two",
            "secret_id": second_secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata twice",
            "task_type": "account_read",
            "required_capability_ids": [first_capability["id"], second_capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    first_response = client.post(
        f"/api/capabilities/{first_capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )
    second_response = client.post(
        f"/api/capabilities/{second_capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["lease_id"] != second_response.json()["lease_id"]
