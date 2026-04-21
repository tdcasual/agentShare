from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from conftest import TEST_SETTINGS

from app.errors import ServiceUnavailableError
from app.repositories.approval_repo import ApprovalRequestRepository


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_returns_sanitized_result(mock_post, client, management_client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

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
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "proxy"
    assert body["capability_id"] == capability["id"]
    assert body["adapter_type"] == "generic_http"
    assert body["upstream_status"] == 200
    assert "sk-live-example" not in str(body)
    assert body["result"] == {"result": "ok"}


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_rejects_token_outside_access_token_selector_access_policy(
    mock_post,
    client,
    management_client,
    mint_standalone_access_token,
):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    allowed_token = mint_standalone_access_token(
        display_name="Restricted capability token",
        subject_id="test-agent",
    )
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
            "name": "openai.chat.invoke.restricted",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Capability is not accessible to this access token"


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_allows_access_token_selector_matches(
    mock_post,
    client,
    management_client,
    mint_standalone_access_token,
):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    runtime_token = mint_standalone_access_token(
        display_name="Selector Runtime Token",
        subject_id="test-agent",
    )
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
            "name": "openai.chat.invoke.agent-selector",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    assert response.json()["capability_id"] == capability["id"]


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_allows_access_token_label_selector_matches(
    mock_post,
    client,
    management_client,
):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    runtime_token = management_client.post(
        "/api/access-tokens",
        json={
            "display_name": "Prod runtime token",
            "subject_type": "automation",
            "subject_id": "test-agent",
            "scopes": ["runtime"],
            "labels": {"environment": "prod"},
        },
    ).json()
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
            "name": "openai.chat.invoke.label-selector",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": f"Bearer {runtime_token['api_key']}"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    assert response.json()["capability_id"] == capability["id"]


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_uses_runtime_settings_for_secret_backend(mock_post, client, management_client, monkeypatch):
    captured: list[str] = []
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    class FakeBackend:
        def read_secret(self, secret_id: str, backend_ref: str) -> str:
            return "sk-live-example"

    def fake_get_secret_backend_for_ref(backend_ref: str, settings):
        captured.append(settings.secret_backend)
        return FakeBackend()

    monkeypatch.setattr("app.services.gateway.get_secret_backend_for_ref", fake_get_secret_backend_for_ref)

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
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    assert captured == [TEST_SETTINGS.secret_backend]


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_uses_runtime_settings_for_coordination_lock(
    mock_post,
    client,
    management_client,
    monkeypatch,
):
    captured: list[tuple[str, str]] = []
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

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
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke.locked",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run with coordination",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    expected_key = f"task:{task['id']}:capability:{capability['id']}:invoke"
    assert response.status_code == 200
    assert captured == [
        (expected_key, TEST_SETTINGS.redis_url),
        (expected_key, TEST_SETTINGS.redis_url),
    ]


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_returns_503_when_coordination_is_unavailable(
    mock_post,
    client,
    management_client,
    monkeypatch,
):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    def fail_acquire_lock(key: str, ttl_seconds: int, settings):
        del key, ttl_seconds, settings
        raise ServiceUnavailableError("Runtime coordination is unavailable")

    monkeypatch.setattr("app.services.gateway.acquire_lock", fail_acquire_lock, raising=False)

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
            "name": "openai.chat.invoke.unavailable",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run coordination down",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Runtime coordination is unavailable"}
    mock_post.assert_not_called()


@patch("app.services.gateway.write_audit_event")
@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_still_returns_success_when_audit_write_fails(mock_post, mock_audit, client, management_client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response
    mock_audit.side_effect = RuntimeError("audit unavailable")

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
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    assert response.json()["upstream_status"] == 200
    assert response.json()["result"] == {"result": "ok"}


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_proxy_invocation_requires_manual_approval_returns_409(
    mock_post,
    client,
    management_client,
    db_session,
):
    mock_post.return_value = MagicMock()

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
            "approval_mode": "manual",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "approval_required"
    assert detail["approval_request_id"].startswith("approval-")
    assert detail["status"] == "pending"
    assert detail["action_type"] == "invoke"
    assert ApprovalRequestRepository(db_session).get(detail["approval_request_id"]) is not None
    mock_post.assert_not_called()


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_policy_rule_requires_manual_approval_even_when_approval_modes_are_auto(
    mock_post,
    client,
    management_client,
    db_session,
):
    mock_post.return_value = MagicMock()

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "high",
            "approval_mode": "auto",
            "approval_rules": [
                {
                    "decision": "manual",
                    "reason": "High-risk production invokes require review",
                    "action_types": ["invoke"],
                    "risk_levels": ["high"],
                    "providers": ["openai"],
                    "environments": ["production"],
                    "task_types": ["prompt_run"],
                }
            ],
            "required_provider": "openai",
            "allowed_environments": ["production"],
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "approval_mode": "auto",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "approval_required"
    assert detail["policy_reason"] == "High-risk production invokes require review"
    assert detail["policy_source"] == "capability"
    approval = ApprovalRequestRepository(db_session).get(detail["approval_request_id"])
    assert approval is not None
    assert approval.policy_reason == "High-risk production invokes require review"
    mock_post.assert_not_called()


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_policy_rule_can_deny_invoke_without_creating_approval(
    mock_post,
    client,
    management_client,
    db_session,
):
    mock_post.return_value = MagicMock()

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "high",
            "approval_rules": [
                {
                    "decision": "deny",
                    "reason": "Production invoke is denied for this capability",
                    "action_types": ["invoke"],
                    "providers": ["openai"],
                    "environments": ["production"],
                }
            ],
            "required_provider": "openai",
            "allowed_environments": ["production"],
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "policy_denied"
    assert detail["policy_reason"] == "Production invoke is denied for this capability"
    assert ApprovalRequestRepository(db_session).list_all() == []
    mock_post.assert_not_called()
@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_approved_request_past_expiry_is_blocked_again(mock_post, client, management_client, db_session):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

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
            "approval_mode": "manual",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
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
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    pending_response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert pending_response.status_code == 409
    approval_id = pending_response.json()["detail"]["approval_request_id"]

    approval_response = management_client.post(
        f"/api/approvals/{approval_id}/approve",
        json={"reason": ""},
    )
    assert approval_response.status_code == 200

    approved_response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )
    assert approved_response.status_code == 200
    assert mock_post.call_count == 1

    repo = ApprovalRequestRepository(db_session)
    approval = repo.get(approval_id)
    approval.expires_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
    repo.update(approval)

    expired_response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert expired_response.status_code == 409
    detail = expired_response.json()["detail"]
    assert detail["approval_request_id"] != approval_id
    assert detail["status"] == "pending"
    assert detail["action_type"] == "invoke"
    assert mock_post.call_count == 1


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_completed_task_cannot_request_new_approval_or_invoke(
    mock_post,
    client,
    management_client,
    db_session,
):
    mock_post.return_value = MagicMock()

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Completed task secret",
            "kind": "api_token",
            "value": "sk-completed-example",
            "provider": "openai",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke.completed",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "approval_mode": "manual",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Completed prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    completed = client.post(
        f"/api/tasks/{task['id']}/complete",
        headers={"Authorization": "Bearer access-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403
    assert ApprovalRequestRepository(db_session).list_all() == []
    mock_post.assert_not_called()
