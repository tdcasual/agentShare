from unittest.mock import MagicMock, patch


def test_openclaw_migration_keeps_runtime_identity_task_flow_and_playbook_search(
    client, management_client
):
    created_playbook = management_client.post(
        "/api/playbooks",
        json={
            "title": "Runtime Config Sync",
            "task_type": "config_sync",
            "body": "Step 1: Check drift.\nStep 2: Sync configuration.",
            "tags": ["runtime", "sync"],
        },
    )
    assert created_playbook.status_code == 201, created_playbook.text

    created_task = management_client.post(
        "/api/tasks",
        json={
            "title": "OpenClaw migration task flow",
            "task_type": "config_sync",
            "input": {"provider": "openclaw"},
            "required_capability_ids": [],
        },
    )
    assert created_task.status_code == 201, created_task.text

    identity_response = client.get(
        "/api/runtime/me",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert identity_response.status_code == 200, identity_response.text

    task_list_response = client.get(
        "/api/tasks",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert task_list_response.status_code == 200, task_list_response.text
    assert any(item["id"] == created_task.json()["id"] for item in task_list_response.json()["items"])

    claim_response = client.post(
        f"/api/tasks/{created_task.json()['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claim_response.status_code == 200, claim_response.text
    assert claim_response.json()["status"] == "claimed"

    complete_response = client.post(
        f"/api/tasks/{created_task.json()['id']}/complete",
        headers={"Authorization": "Bearer access-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert complete_response.status_code == 200, complete_response.text
    assert complete_response.json()["status"] == "completed"

    playbook_search_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "playbooks.search",
                "arguments": {"task_type": "config_sync", "q": "sync"},
            },
        },
    )
    assert playbook_search_response.status_code == 200, playbook_search_response.text
    result = playbook_search_response.json()["result"]
    payload = result.get("structuredContent") or result.get("content", [{}])[0].get("text", {})
    if isinstance(payload, str):
        import json
        payload = json.loads(payload)
    items = payload.get("items", payload.get("results", []))
    assert len(items) > 0, f"No playbook search results. Payload keys: {list(payload.keys())}, payload: {payload}"
    assert items[0]["title"] == "Runtime Config Sync"


@patch("app.services.adapters.generic_http.GenericHttpAdapter._request")
def test_openclaw_migration_keeps_capability_policy_and_approval_gates(
    mock_post, client, management_client
):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "ok"}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Approval-gated secret",
            "kind": "api_token",
            "value": "sk-live-openclaw",
            "provider": "openai",
        },
    )
    assert secret.status_code == 201, secret.text

    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openclaw.gated.invoke",
            "secret_id": secret.json()["id"],
            "risk_level": "high",
            "required_provider": "openai",
            "adapter_type": "generic_http",
            "adapter_config": {"url": "https://api.example.com/v1/run", "method": "POST"},
            "approval_mode": "manual",
        },
    )
    assert capability.status_code == 201, capability.text

    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Approval-gated invocation",
            "task_type": "prompt_run",
            "required_capability_ids": [capability.json()["id"]],
        },
    )
    assert task.status_code == 201, task.text

    claim_response = client.post(
        f"/api/tasks/{task.json()['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claim_response.status_code == 200, claim_response.text

    invoke_response = client.post(
        f"/api/capabilities/{capability.json()['id']}/invoke",
        headers={"Authorization": "Bearer access-test-token"},
        json={"task_id": task.json()["id"], "parameters": {"prompt": "hello"}},
    )

    assert invoke_response.status_code == 409, invoke_response.text
    assert invoke_response.json()["detail"]["status"] == "pending"
