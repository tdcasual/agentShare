from conftest import BOOTSTRAP_AGENT_KEY


def test_create_capability_defaults_to_proxy_only(client):
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

    response = client.post(
        "/api/capabilities",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
        },
    )

    assert response.status_code == 201
    assert response.json()["allowed_mode"] == "proxy_only"


def test_list_capabilities_returns_created_items(client):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    client.post(
        "/api/capabilities",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
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

    response = client.get("/api/capabilities", headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"})

    assert response.status_code == 200
    assert response.json()["items"][0]["name"] == "github.repo.read"
