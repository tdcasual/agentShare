def test_capability_creation_defaults_to_all_access_tokens_access_policy(management_client):
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
        "mode": "all_access_tokens",
        "selectors": [],
    }


def test_capability_creation_accepts_access_token_and_label_selectors(
    management_client,
    mint_standalone_access_token,
):
    token = mint_standalone_access_token(
        display_name="Selector token",
        subject_type="automation",
        subject_id="selector-runtime",
        labels={"environment": "prod"},
    )
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
                    {"kind": "access_token", "ids": [token["id"]]},
                    {"kind": "access_token_label", "key": "environment", "values": ["prod"]},
                ],
            },
        },
    )

    assert response.status_code == 201
    assert response.json()["access_policy"] == {
        "mode": "selectors",
        "selectors": [
            {"kind": "access_token", "ids": [token["id"]]},
            {"kind": "access_token_label", "key": "environment", "values": ["prod"]},
        ],
    }


def test_capability_creation_rejects_unknown_access_token_selector_target(management_client):
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
                    {"kind": "access_token", "ids": ["access-token-missing"]},
                ],
            },
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown target access token: access-token-missing"


def test_access_policy_rejects_legacy_agent_selector():
    from pydantic import ValidationError

    from app.models.access_policy import CapabilityAccessPolicy

    try:
        CapabilityAccessPolicy.model_validate({
            "mode": "selectors",
            "selectors": [{"kind": "agent", "ids": ["agent-1"]}],
        })
    except ValidationError:
        return

    raise AssertionError("legacy agent selector should be rejected")
