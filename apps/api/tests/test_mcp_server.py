from unittest.mock import MagicMock, patch


def _mcp_request(method: str, params: dict | None = None, request_id: int = 1) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
    }
    if params is not None:
        payload["params"] = params
    return payload


def test_mcp_requires_agent_bearer_auth(client):
    response = client.post("/mcp", json=_mcp_request("initialize"))

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"


def test_mcp_initialize_and_list_tools(client):
    init_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request("initialize"),
    )

    assert init_response.status_code == 200
    init_payload = init_response.json()
    assert init_payload["result"]["serverInfo"]["name"] == "agent-control-plane-mcp"
    assert "tools" in init_payload["result"]["capabilities"]

    tools_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request("tools/list", request_id=2),
    )

    assert tools_response.status_code == 200
    tool_names = {tool["name"] for tool in tools_response.json()["result"]["tools"]}
    assert {
        "tasks.list",
        "tasks.claim",
        "tasks.complete",
        "playbooks.search",
        "capabilities.invoke",
        "capabilities.request_lease",
    }.issubset(tool_names)


def test_mcp_claim_complete_and_search_playbooks_tools(client, management_client):
    playbook = management_client.post(
        "/api/playbooks",
        json={
            "title": "Repo sync guide",
            "task_type": "config_sync",
            "body": "Sync the repo, verify checks, then report status.",
            "tags": ["github", "ops"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "playbook_ids": [playbook["id"]],
        },
    ).json()

    search_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request(
            "tools/call",
            {
                "name": "search_playbooks",
                "arguments": {"task_type": "config_sync", "q": "repo", "tag": "github"},
            },
            request_id=3,
        ),
    )

    assert search_response.status_code == 200
    search_result = search_response.json()["result"]
    assert search_result["isError"] is False
    assert search_result["structuredContent"]["items"][0]["id"] == playbook["id"]

    claim_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request(
            "tools/call",
            {"name": "claim_task", "arguments": {"task_id": task["id"]}},
            request_id=4,
        ),
    )

    assert claim_response.status_code == 200
    claimed_task = claim_response.json()["result"]["structuredContent"]
    assert claimed_task["id"] == task["id"]
    assert claimed_task["status"] == "claimed"

    complete_response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request(
            "tools/call",
            {
                "name": "complete_task",
                "arguments": {
                    "task_id": task["id"],
                    "result_summary": "Sync complete",
                    "output_payload": {"ok": True},
                },
            },
            request_id=5,
        ),
    )

    assert complete_response.status_code == 200
    completed_task = complete_response.json()["result"]["structuredContent"]
    assert completed_task["id"] == task["id"]
    assert completed_task["status"] == "completed"


def test_mcp_list_tasks_only_returns_tasks_visible_to_current_token(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Other MCP Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Other MCP token"},
    )
    assert minted.status_code == 201, minted.text

    visible = management_client.post(
        "/api/tasks",
        json={
            "title": "Visible MCP task",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert visible.status_code == 201, visible.text

    hidden = management_client.post(
        "/api/tasks",
        json={
            "title": "Hidden MCP task",
            "task_type": "account_read",
            "target_token_ids": [minted.json()["id"]],
            "target_mode": "explicit_tokens",
        },
    )
    assert hidden.status_code == 201, hidden.text

    response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request(
            "tools/call",
            {"name": "list_tasks", "arguments": {}},
            request_id=7,
        ),
    )

    assert response.status_code == 200
    payload = response.json()["result"]
    assert payload["isError"] is False
    items = payload["structuredContent"]["items"]
    assert [item["id"] for item in items] == [visible.json()["id"]]


@patch("app.services.adapters.generic_http.httpx.post")
def test_mcp_invoke_capability_returns_policy_block_with_runtime_semantics(
    mock_post,
    client,
    management_client,
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
                    "decision": "manual",
                    "reason": "Production prompts require review",
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
            "required_capability_ids": [capability["id"]],
        },
    ).json()
    claim_response = client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claim_response.status_code == 200

    response = client.post(
        "/mcp",
        headers={"Authorization": "Bearer agent-test-token"},
        json=_mcp_request(
            "tools/call",
            {
                "name": "invoke_capability",
                "arguments": {
                    "capability_id": capability["id"],
                    "task_id": task["id"],
                    "parameters": {"prompt": "hello"},
                },
            },
            request_id=6,
        ),
    )

    assert response.status_code == 200
    payload = response.json()["result"]
    assert payload["isError"] is True
    assert payload["structuredContent"]["status_code"] == 409
    assert payload["structuredContent"]["detail"]["code"] == "approval_required"
    assert payload["structuredContent"]["detail"]["policy_reason"] == "Production prompts require review"
    mock_post.assert_not_called()
