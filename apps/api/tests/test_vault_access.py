"""Integration tests for Vault Bearer token access and permission enforcement.

Tests the full vault access flow: create user → create secret → create token →
grant scope → access vault via Bearer token → verify permission enforcement.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import reset_async_engine, reset_default_runtime
from app.factory import create_app
from app.runtime import build_runtime
from app.services.encryption import reset_encryption_service


@pytest.fixture()
def vault_env(tmp_path):
    db_file = str(tmp_path / "vault_test.db")
    orig = {k: os.environ.get(k) for k in ["ENCRYPTION_KEY", "DATABASE_URL", "SESSION_SECRET", "APP_ENV"]}
    os.environ["ENCRYPTION_KEY"] = os.urandom(32).hex()
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"
    os.environ["SESSION_SECRET"] = "vault-test-session-secret"
    os.environ["APP_ENV"] = "development"
    reset_encryption_service()
    reset_async_engine()
    reset_default_runtime()
    yield
    for k, v in orig.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    reset_encryption_service()
    reset_async_engine()
    reset_default_runtime()


@pytest.fixture()
def vault_app(vault_env):
    settings = Settings()
    runtime = build_runtime(settings)
    app = create_app(settings, runtime)
    yield app
    runtime.engine.dispose()


@pytest.fixture()
def vault_client(vault_app):
    with TestClient(vault_app) as c:
        yield c


def _setup_user_and_secret(client, email="vault@test.vg"):
    """Bootstrap, login, create a secret, return secret_id."""
    client.post("/api/bootstrap/init", json={"email": email, "password": "Str0ng!Pass#2026"})
    client.post("/api/session/login", json={"email": email, "password": "Str0ng!Pass#2026"})

    resp = client.post("/api/secrets", json={
        "type": "api_key",
        "name": "test-api-key",
        "value": "sk-test-secret-value",
        "tags": ["test"],
    })
    assert resp.status_code == 200
    return resp.json()["id"]


def _create_token_with_scope(client, secret_id, token_name="test-tok"):
    """Create a token and grant scope to the given secret."""
    resp = client.post("/api/tokens", json={"name": token_name})
    assert resp.status_code == 200
    token_data = resp.json()
    token_value = token_data["token"]
    token_id = token_data["id"]

    resp = client.post(f"/api/tokens/{token_id}/scopes", json={
        "secret_id": secret_id,
    })
    assert resp.status_code == 200
    return token_value, token_id


class TestVaultAccess:
    def test_vault_list_with_valid_token(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, _ = _create_token_with_scope(vault_client, secret_id)

        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) >= 1
        assert items[0]["id"] == secret_id

    def test_vault_list_without_token(self, vault_client):
        resp = vault_client.get("/api/vault")
        assert resp.status_code == 401

    def test_vault_list_with_invalid_token(self, vault_client):
        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": "Bearer vg_invalid_token_here"},
        )
        assert resp.status_code == 401

    def test_vault_get_secret_details(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, _ = _create_token_with_scope(vault_client, secret_id)

        resp = vault_client.get(
            f"/api/vault/{secret_id}",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "test-api-key"
        assert data["type"] == "api_key"
        assert "value" not in data

    def test_vault_get_secret_value_endpoint(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, _ = _create_token_with_scope(vault_client, secret_id)

        resp = vault_client.get(
            f"/api/vault/{secret_id}/value",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert resp.json()["value"] == "sk-test-secret-value"

    def test_vault_access_denied_without_scope(self, vault_client):
        """Token without scope should get 403 on value endpoint and empty list."""
        _setup_user_and_secret(vault_client)
        resp = vault_client.post("/api/tokens", json={"name": "no-scope"})
        token_value = resp.json()["token"]

        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_vault_access_denied_without_scope_record(self, vault_client):
        """No scope record should deny access."""
        secret_id = _setup_user_and_secret(vault_client)
        resp = vault_client.post("/api/tokens", json={"name": "denied-tok"})
        token_value = resp.json()["token"]

        resp = vault_client.get(
            f"/api/vault/{secret_id}",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 403

    def test_vault_nonexistent_secret_returns_403(self, vault_client):
        """Should return 403, not 404, to prevent info leakage."""
        _setup_user_and_secret(vault_client)
        resp = vault_client.post("/api/tokens", json={"name": "ghost-tok"})
        token_value = resp.json()["token"]

        resp = vault_client.get(
            "/api/vault/nonexistent-secret-id",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 403

    def test_vault_type_filter(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, _ = _create_token_with_scope(vault_client, secret_id)

        # Filter by matching type
        resp = vault_client.get(
            "/api/vault?type=api_key",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 1

        # Filter by non-matching type
        resp = vault_client.get(
            "/api/vault?type=password",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 0

    def test_token_search_in_vault(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, _ = _create_token_with_scope(vault_client, secret_id)

        resp = vault_client.get(
            "/api/vault?search=test",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 1

        resp = vault_client.get(
            "/api/vault?search=nonexistent",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 0


class TestTokenValidation:
    def test_revoked_token_denied(self, vault_client):
        secret_id = _setup_user_and_secret(vault_client)
        token_value, token_id = _create_token_with_scope(vault_client, secret_id)

        # Revoke the token
        vault_client.delete(f"/api/tokens/{token_id}")

        # Try to access vault with revoked token
        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": f"Bearer {token_value}"},
        )
        assert resp.status_code == 401

    def test_token_without_vg_prefix_rejected(self, vault_client):
        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": "Bearer invalid_no_prefix"},
        )
        assert resp.status_code == 401

    def test_bearer_without_bearer_prefix_rejected(self, vault_client):
        resp = vault_client.get(
            "/api/vault",
            headers={"Authorization": "vg_some_token_value"},
        )
        assert resp.status_code == 401
