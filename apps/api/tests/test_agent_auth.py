"""Tests for Bearer token authentication on the runtime API."""
from test_admin_api import bootstrap_and_login

from tests.asgi_client import TestClient


def test_runtime_request_requires_bearer_token(client):
    """GET /api/vault/me without a token should return 401."""
    response = client.get("/api/vault/me")
    assert response.status_code == 401


def test_runtime_request_rejects_invalid_token(client):
    """GET /api/vault/me with an invalid token should return 401."""
    response = client.get(
        "/api/vault/me",
        headers={"Authorization": "Bearer vg_invalid_token_that_does_not_exist"},
    )
    assert response.status_code == 401


def test_runtime_request_without_credentials_skips_audit(client: TestClient) -> None:
    """Requests with no Authorization header are rejected without an audit row,
    so unauthenticated clients cannot flood audit_logs."""
    bootstrap_and_login(client)

    response = client.get("/api/vault/secrets")
    assert response.status_code == 401

    denied = client.get("/api/admin/audit-logs", params={"result": "denied"})
    assert denied.status_code == 200
    assert denied.json()["total"] == 0


def test_runtime_request_with_malformed_credentials_writes_audit(client: TestClient) -> None:
    """Requests that do carry a (malformed) credential are still audited."""
    bootstrap_and_login(client)

    response = client.get("/api/vault/secrets", headers={"Authorization": "Basic abc"})
    assert response.status_code == 401

    denied = client.get("/api/admin/audit-logs", params={"result": "denied"})
    assert denied.status_code == 200
    assert denied.json()["total"] == 1
    assert denied.json()["items"][0]["reason"] == "agent_token_required"
