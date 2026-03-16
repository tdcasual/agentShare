def test_proxy_only_capability_cannot_issue_lease(client):
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
            "allowed_mode": "proxy_only",
        },
    ).json()

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": "task-123", "purpose": "local sdk call"},
    )

    assert response.status_code == 403


def test_lease_capability_can_issue_short_lived_lease(client):
    secret = client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "scope": {"provider": "github"},
        },
    ).json()
    capability = client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
        },
    ).json()

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": "task-123", "purpose": "git cli"},
    )

    assert response.status_code == 201
    assert response.json()["expires_in"] == 120
