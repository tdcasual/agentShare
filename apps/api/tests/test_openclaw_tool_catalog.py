from conftest import TEST_ACCESS_TOKEN_KEY


def _mcp_request(method: str, params: dict | None = None, request_id: int = 1) -> dict:
    payload = {"jsonrpc": "2.0", "id": request_id, "method": method}
    if params is not None:
        payload["params"] = params
    return payload


def test_openclaw_tool_catalog_lists_namespaced_business_tools(client):
    response = client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json=_mcp_request("tools/list"),
    )

    assert response.status_code == 200, response.text
    tools = response.json()["result"]["tools"]
    tool_names = {tool["name"] for tool in tools}
    assert {
        "tasks.list",
        "tasks.claim",
        "tasks.complete",
        "playbooks.search",
        "capabilities.invoke",
        "capabilities.request_lease",
        "dream.runs.start",
        "dream.runs.record_step",
        "dream.runs.stop",
        "dream.memory.search",
        "dream.memory.write",
        "dream.tasks.propose_followup",
    }.issubset(tool_names)
    assert all("legacyName" not in tool for tool in tools)


def test_openclaw_tool_catalog_supports_namespaced_tool_invocation(client, management_client):
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Namespaced tool task",
            "task_type": "config_sync",
        },
    ).json()

    claim_response = client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json=_mcp_request(
            "tools/call",
            {"name": "tasks.claim", "arguments": {"task_id": task["id"]}},
            request_id=2,
        ),
    )

    assert claim_response.status_code == 200, claim_response.text
    payload = claim_response.json()["result"]
    assert payload["isError"] is False
    assert payload["structuredContent"]["id"] == task["id"]
    assert payload["structuredContent"]["status"] == "claimed"
