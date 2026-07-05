"""Tests for Bearer token authentication on the runtime API."""


def test_runtime_request_requires_bearer_token(client):
    """GET /api/me without a token should return 401."""
    response = client.get("/api/me")
    assert response.status_code == 401


def test_runtime_request_rejects_invalid_token(client):
    """GET /api/me with an invalid token should return 401."""
    response = client.get(
        "/api/me",
        headers={"Authorization": "Bearer vg_invalid_token_that_does_not_exist"},
    )
    assert response.status_code == 401
