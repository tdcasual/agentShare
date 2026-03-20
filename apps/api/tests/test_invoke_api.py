from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.repositories.approval_repo import ApprovalRequestRepository


@patch("app.services.adapters.generic_http.httpx.post")
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
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "proxy"
    assert body["capability_id"] == capability["id"]
    assert "sk-live-example" not in str(body)
    assert body["result"] == {"result": "ok"}


@patch("app.services.gateway.write_audit_event")
@patch("app.services.adapters.generic_http.httpx.post")
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
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    assert response.json()["result"] == {"result": "ok"}


@patch("app.services.adapters.generic_http.httpx.post")
def test_proxy_invocation_requires_manual_approval_returns_409(mock_post, client, management_client):
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
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "approval_required"
    assert detail["approval_request_id"].startswith("approval-")
    assert detail["status"] == "pending"
    assert detail["action_type"] == "invoke"
    mock_post.assert_not_called()


@patch("app.services.adapters.generic_http.httpx.post")
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
        headers={"Authorization": "Bearer agent-test-token"},
    )

    pending_response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
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
        headers={"Authorization": "Bearer agent-test-token"},
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
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert expired_response.status_code == 409
    detail = expired_response.json()["detail"]
    assert detail["approval_request_id"] != approval_id
    assert detail["status"] == "pending"
    assert detail["action_type"] == "invoke"
    assert mock_post.call_count == 1


@patch("app.services.adapters.generic_http.httpx.post")
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
        headers={"Authorization": "Bearer agent-test-token"},
    )
    completed = client.post(
        f"/api/tasks/{task['id']}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 403
    assert ApprovalRequestRepository(db_session).list_all() == []
    mock_post.assert_not_called()
