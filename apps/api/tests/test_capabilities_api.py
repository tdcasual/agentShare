def test_create_capability_defaults_to_proxy_only(client):
    secret = client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "scope": {"provider": "openai"},
        },
    ).json()

    response = client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
        },
    )

    assert response.status_code == 201
    assert response.json()["allowed_mode"] == "proxy_only"


def test_list_capabilities_returns_created_items(client):
    secret = client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "scope": {"provider": "github"},
        },
    ).json()
    client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
        },
    )

    response = client.get("/api/capabilities")

    assert response.status_code == 200
    assert response.json()["items"][0]["name"] == "github.repo.read"
