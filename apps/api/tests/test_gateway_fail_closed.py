from unittest.mock import MagicMock, patch

import httpx


def _create_runnable_capability(management_client, client, *, allowed_mode: str = "proxy_only") -> tuple[dict, dict]:
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
            "allowed_mode": allowed_mode,
            "lease_ttl_seconds": 120,
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
            "lease_allowed": allowed_mode == "proxy_or_lease",
        },
    ).json()
    claim_response = client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claim_response.status_code == 200
    return capability, task


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_invoke_fails_closed_when_adapter_request_errors(mock_post, client, management_client):
    capability, task = _create_runnable_capability(management_client, client)
    mock_post.side_effect = httpx.ConnectError("boom")

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 502
    assert "adapter" in response.json()["detail"].lower()


@patch("app.services.gateway.get_secret_backend_for_ref")
def test_invoke_returns_bad_gateway_when_secret_backend_read_fails(mock_backend_factory, client, management_client):
    capability, task = _create_runnable_capability(management_client, client)
    backend = MagicMock()
    backend.read_secret.side_effect = RuntimeError("backend unavailable")
    mock_backend_factory.return_value = backend

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 502
    assert "backend" in response.json()["detail"].lower()


def test_invoke_returns_internal_error_for_unknown_adapter_type(client, management_client):
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
            "adapter_type": "unknown_adapter",
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
    claim_response = client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claim_response.status_code == 200

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 500
    assert "unknown capability adapter" in response.json()["detail"].lower()


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_invoke_treats_invalid_upstream_json_as_bad_gateway(mock_post, client, management_client):
    capability, task = _create_runnable_capability(management_client, client)
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.side_effect = ValueError("invalid json")
    mock_post.return_value = mock_response

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 502
    assert "adapter" in response.json()["detail"].lower()


def test_lease_response_explicitly_marks_placeholder_metadata(client, management_client):
    capability, task = _create_runnable_capability(management_client, client, allowed_mode="proxy_or_lease")

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task["id"], "purpose": "sdk call"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["lease_type"] == "metadata_placeholder"
    assert body["secret_value_included"] is False
