from conftest import BOOTSTRAP_AGENT_KEY


def test_create_secret_returns_reference_only(client):
    response = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "metadata": {"owner": "ml-platform"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "OpenAI prod key"
    assert "value" not in body
    assert body["backend_ref"].startswith("memory:")


def test_list_secrets_returns_redacted_metadata(client):
    client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "display_name": "QQ token",
            "kind": "api_token",
            "value": "qq-secret",
            "provider": "qq",
        },
    )

    response = client.get("/api/secrets", headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"})

    assert response.status_code == 200
    assert response.json()["items"][0]["display_name"] == "QQ token"
    assert "value" not in response.json()["items"][0]
