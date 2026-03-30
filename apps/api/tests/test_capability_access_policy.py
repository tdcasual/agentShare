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
        "selectors": [],
    }


def test_capability_creation_accepts_agent_and_token_label_selectors(management_client):
    agent = management_client.post(
        "/api/agents",
        json={
            "name": "Selector Agent",
            "risk_tier": "medium",
            "allowed_task_types": ["prompt_run"],
        },
    ).json()
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
            "name": "openai.chat.invoke.selector",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "required_provider": "openai",
            "access_policy": {
                "mode": "selectors",
                "selectors": [
                    {"kind": "agent", "ids": [agent["id"]]},
                    {"kind": "token_label", "key": "environment", "values": ["prod"]},
                ],
            },
        },
    )

    assert response.status_code == 201
    assert response.json()["access_policy"] == {
        "mode": "selectors",
        "selectors": [
            {"kind": "agent", "ids": [agent["id"]]},
            {"kind": "token_label", "key": "environment", "values": ["prod"]},
        ],
    }


def test_capability_creation_rejects_unknown_token_selector_target(management_client):
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
                "mode": "selectors",
                "selectors": [
                    {"kind": "token", "ids": ["token-missing"]},
                ],
            },
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown target token: token-missing"


def test_capability_creation_rejects_unknown_agent_selector_target(management_client):
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
                "mode": "selectors",
                "selectors": [
                    {"kind": "agent", "ids": ["agent-missing"]},
                ],
            },
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown target agent: agent-missing"
