def test_create_capability_defaults_to_proxy_only(management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()

    response = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    )

    assert response.status_code == 201
    assert response.json()["allowed_mode"] == "proxy_only"


def test_list_capabilities_returns_created_items(management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    )

    response = management_client.get("/api/capabilities")

    assert response.status_code == 200
    assert response.json()["items"][0]["name"] == "github.repo.read"
