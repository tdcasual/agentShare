def test_proxy_invocation_returns_sanitized_result(client):
    secret = client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "scope": {"provider": "openai"},
        },
    ).json()
    capability = client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
        },
    ).json()

    response = client.post(
        f"/api/capabilities/{capability['id']}/invoke",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": "task-123", "parameters": {"prompt": "hi"}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "proxy"
    assert body["capability_id"] == capability["id"]
    assert "sk-live-example" not in str(body)
