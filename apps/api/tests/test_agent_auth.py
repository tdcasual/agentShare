def test_runtime_request_requires_bearer_token(client):
    response = client.get("/api/runtime/me")

    assert response.status_code == 401


def test_runtime_request_returns_identity_for_known_token(client):
    response = client.get(
        "/api/runtime/me",
        headers={"Authorization": "Bearer access-test-token"},
    )

    assert response.status_code == 200
    assert response.json()["token_id"] == "access-token-test-agent"
