from unittest.mock import patch

import httpx

from conftest import BOOTSTRAP_AGENT_KEY


def _create_runnable_capability(client, *, allowed_mode: str = "proxy_only") -> tuple[dict, dict]:
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()
    capability = client.post(
        "/api/capabilities",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
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
    task = client.post(
        "/api/tasks",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": allowed_mode == "proxy_or_lease",
        },
    ).json()
    claim_response = client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claim_response.status_code == 200
    return capability, task


@patch("app.services.adapters.generic_http.httpx.post")
def test_invoke_fails_closed_when_adapter_request_errors(mock_post, client):
    capability, task = _create_runnable_capability(client)
    mock_post.side_effect = httpx.ConnectError("boom")

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 502
    assert "adapter" in response.json()["detail"].lower()


def test_lease_response_explicitly_marks_placeholder_metadata(client):
    capability, task = _create_runnable_capability(client, allowed_mode="proxy_or_lease")

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "sdk call"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["lease_type"] == "metadata_placeholder"
    assert body["secret_value_included"] is False
