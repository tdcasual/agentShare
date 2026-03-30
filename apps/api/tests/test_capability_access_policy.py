def test_capability_creation_defaults_to_all_tokens_access_policy(management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI production key",
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
    assert response.json()["access_policy"] == {
        "mode": "all_tokens",
        "token_ids": [],
    }


def test_capability_creation_rejects_unknown_explicit_token_target(management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI production key",
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
            "access_policy": {
                "mode": "explicit_tokens",
                "token_ids": ["token-missing"],
            },
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown target token: token-missing"
