def test_agent_request_requires_bearer_token(client):
    response = client.get("/api/agents/me")

    assert response.status_code == 401


def test_agent_request_returns_identity_for_known_token(client):
    response = client.get(
        "/api/agents/me",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == "agent-test"
