def test_agent_can_hold_multiple_active_tokens(management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Multi Token Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text
    agent_id = created_agent.json()["id"]
    primary_token_id = created_agent.json()["token_id"]

    minted = management_client.post(
        f"/api/agents/{agent_id}/tokens",
        json={"display_name": "Secondary token"},
    )

    assert minted.status_code == 201, minted.text

    listing = management_client.get(f"/api/agents/{agent_id}/tokens")
    assert listing.status_code == 200, listing.text
    token_ids = {item["id"] for item in listing.json()["items"]}
    assert token_ids == {primary_token_id, minted.json()["id"]}


def test_runtime_auth_returns_token_provenance_for_minted_token(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Runtime Token Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text
    agent_id = created_agent.json()["id"]

    minted = management_client.post(
        f"/api/agents/{agent_id}/tokens",
        json={"display_name": "Runtime token"},
    )
    assert minted.status_code == 201, minted.text

    response = client.get(
        "/api/agents/me",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == agent_id
    assert response.json()["token_id"] == minted.json()["id"]


def test_revoked_token_fails_auth_without_deleting_parent_agent(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Revocable Token Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text
    agent_id = created_agent.json()["id"]

    minted = management_client.post(
        f"/api/agents/{agent_id}/tokens",
        json={"display_name": "Revocable token"},
    )
    assert minted.status_code == 201, minted.text

    revoke = management_client.post(f"/api/agent-tokens/{minted.json()['id']}/revoke")
    assert revoke.status_code == 200, revoke.text

    auth = client.get(
        "/api/agents/me",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )
    assert auth.status_code == 401

    listed = management_client.get("/api/agents")
    assert listed.status_code == 200
    assert agent_id in {item["id"] for item in listed.json()["items"]}


def test_token_without_runtime_scope_cannot_access_runtime_routes(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Scoped Token Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text
    agent_id = created_agent.json()["id"]

    minted = management_client.post(
        f"/api/agents/{agent_id}/tokens",
        json={"display_name": "Non-runtime token", "scopes": ["reports"]},
    )
    assert minted.status_code == 201, minted.text

    response = client.get(
        "/api/agents/me",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Agent token lacks runtime scope"}


def test_bulk_token_listing_groups_tokens_by_agent(management_client):
    first_agent = management_client.post(
        "/api/agents",
        json={"name": "Bulk One", "risk_tier": "medium"},
    )
    assert first_agent.status_code == 201, first_agent.text

    second_agent = management_client.post(
        "/api/agents",
        json={"name": "Bulk Two", "risk_tier": "medium"},
    )
    assert second_agent.status_code == 201, second_agent.text

    extra_token = management_client.post(
        f"/api/agents/{first_agent.json()['id']}/tokens",
        json={"display_name": "Extra token"},
    )
    assert extra_token.status_code == 201, extra_token.text

    response = management_client.get(
        "/api/agent-tokens/bulk",
        params=[
            ("agent_id", first_agent.json()["id"]),
            ("agent_id", second_agent.json()["id"]),
            ("agent_id", "agent-missing"),
        ],
    )

    assert response.status_code == 200, response.text
    payload = response.json()["items_by_agent"]
    assert {item["id"] for item in payload[first_agent.json()["id"]]} == {
        first_agent.json()["token_id"],
        extra_token.json()["id"],
    }
    assert {item["id"] for item in payload[second_agent.json()["id"]]} == {
        second_agent.json()["token_id"]
    }
    assert payload["agent-missing"] == []


def test_bulk_token_listing_transport_uses_snake_case_fields(management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Transport Token Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    response = management_client.get(
        "/api/agent-tokens/bulk",
        params=[("agent_id", created_agent.json()["id"])],
    )

    assert response.status_code == 200, response.text
    item = response.json()["items_by_agent"][created_agent.json()["id"]][0]
    assert "agent_id" in item
    assert "display_name" in item
    assert "token_prefix" in item
    assert "trust_score" in item
    assert "displayName" not in item
    assert "tokenPrefix" not in item
    assert "trustScore" not in item
