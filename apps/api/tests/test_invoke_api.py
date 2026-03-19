from conftest import BOOTSTRAP_AGENT_KEY


def test_proxy_invocation_returns_sanitized_result(client):
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
        },
    ).json()
    task = client.post(
        "/api/tasks",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
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
