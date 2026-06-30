"""VaultGate smoke tests.

Verifies the core application lifecycle: factory creation, health check,
bootstrap, login, secret CRUD, token management, and vault access.

Each test is fully self-contained with its own database via vg_client fixture.
"""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import reset_async_engine, reset_default_runtime
from app.factory import create_app
from app.runtime import build_runtime
from app.services.encryption import reset_encryption_service

# ---------------------------------------------------------------------------
# Isolated fixtures — fresh db per test, named to avoid conftest collision
# ---------------------------------------------------------------------------

@pytest.fixture()
def vg_env(tmp_path):
    """Create an isolated environment with a fresh database for each test."""
    db_file = str(tmp_path / "test.db")
    orig_env = {
        k: os.environ.get(k)
        for k in ["ENCRYPTION_KEY", "DATABASE_URL", "SESSION_SECRET", "APP_ENV"]
    }
    os.environ["ENCRYPTION_KEY"] = os.urandom(32).hex()
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"
    os.environ["SESSION_SECRET"] = "test-session-secret-for-smoke-tests"
    os.environ["APP_ENV"] = "development"
    reset_encryption_service()
    reset_async_engine()
    reset_default_runtime()
    yield
    for k, v in orig_env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    reset_encryption_service()
    reset_async_engine()
    reset_default_runtime()


@pytest.fixture()
def vg_app(vg_env):
    settings = Settings()
    runtime = build_runtime(settings)
    app = create_app(settings, runtime)
    yield app
    runtime.engine.dispose()


@pytest.fixture()
def vg_client(vg_app):
    with TestClient(vg_app) as c:
        yield c


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    with patch("app.rate_limit.check_rate_limit", return_value=None):
        yield


# ---------------------------------------------------------------------------
# Helper — bootstrap + login in one shot, returns the client
# ---------------------------------------------------------------------------

def _bootstrap_and_login(client, email="user@test.vg", password="Str0ng!Pass#2026"):
    """Create the first user and log in, leaving the client authenticated."""
    r = client.post("/api/bootstrap/init", json={"email": email, "password": password})
    assert r.status_code == 200, f"Bootstrap failed: {r.status_code} {r.text}"
    r = client.post("/api/session/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestAppStartup:
    def test_app_creates_without_error(self, vg_app):
        assert vg_app is not None

    def test_health_check(self, vg_client):
        resp = vg_client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_readiness_check(self, vg_client):
        resp = vg_client.get("/readyz")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["database"] == "ok"
        assert body["encryption"] == "ok"

    def test_openapi_schema_available(self, vg_client):
        resp = vg_client.get("/openapi.json")
        assert resp.status_code == 200
        paths = resp.json()["paths"]
        for expected in ["/api/session/login", "/api/secrets", "/api/tokens", "/api/vault", "/api/me"]:
            assert expected in paths, f"Missing route: {expected}"


class TestBootstrapAndLogin:
    def test_bootstrap_creates_first_user(self, vg_client):
        resp = vg_client.post(
            "/api/bootstrap/init",
            json={"email": "admin@test.vaultgate", "password": "Str0ng!Pass#2026"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.vaultgate"

    def test_bootstrap_rejects_weak_password(self, vg_client):
        resp = vg_client.post(
            "/api/bootstrap/init",
            json={"email": "weak@test.vg", "password": "short"},
        )
        assert resp.status_code == 422

    def test_login_returns_session_cookie(self, vg_client):
        _bootstrap_and_login(vg_client, email="login@test.vaultgate")
        # Client should now have the session cookie from login response
        assert "vaultgate_session" in vg_client.cookies

    def test_me_returns_user_info(self, vg_client):
        _bootstrap_and_login(vg_client, email="me@test.vaultgate")
        resp = vg_client.get("/api/session/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == "me@test.vaultgate"

    def test_login_rejects_wrong_password(self, vg_client):
        vg_client.post(
            "/api/bootstrap/init",
            json={"email": "wrong@test.vaultgate", "password": "Str0ng!Pass#2026"},
        )
        resp = vg_client.post(
            "/api/session/login",
            json={"email": "wrong@test.vaultgate", "password": "WrongPassword1!"},
        )
        assert resp.status_code == 401

    def test_logout_requires_auth(self, vg_client):
        resp = vg_client.post("/api/session/logout")
        assert resp.status_code == 401


class TestSecretCRUD:
    def test_create_and_list_secrets(self, vg_client):
        _bootstrap_and_login(vg_client, email="crud@test.vg")

        resp = vg_client.post(
            "/api/secrets",
            json={"type": "api_key", "name": "test-key", "value": "sk-12345", "tags": ["test"]},
        )
        assert resp.status_code == 200
        secret_id = resp.json()["id"]

        resp = vg_client.get("/api/secrets")
        assert resp.status_code == 200
        assert any(s["id"] == secret_id for s in resp.json()["items"])

    def test_get_secret_detail(self, vg_client):
        _bootstrap_and_login(vg_client, email="detail@test.vg")

        resp = vg_client.post(
            "/api/secrets",
            json={"type": "password", "name": "my-pass", "value": "s3cret"},
        )
        assert resp.status_code == 200
        secret_id = resp.json()["id"]

        resp = vg_client.get(f"/api/secrets/{secret_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "my-pass"
        # Value should NOT be returned in detail view
        assert "value" not in resp.json() or resp.json().get("value") is None

    def test_update_secret(self, vg_client):
        _bootstrap_and_login(vg_client, email="update@test.vg")

        resp = vg_client.post(
            "/api/secrets",
            json={"type": "api_key", "name": "original", "value": "val1"},
        )
        secret_id = resp.json()["id"]

        resp = vg_client.patch(
            f"/api/secrets/{secret_id}",
            json={"name": "renamed"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "renamed"

    def test_delete_secret(self, vg_client):
        _bootstrap_and_login(vg_client, email="del@test.vg")

        resp = vg_client.post(
            "/api/secrets",
            json={"type": "password", "name": "to-delete", "value": "val"},
        )
        assert resp.status_code == 200
        secret_id = resp.json()["id"]

        resp = vg_client.delete(f"/api/secrets/{secret_id}")
        assert resp.status_code == 200

        resp = vg_client.get(f"/api/secrets/{secret_id}")
        assert resp.status_code == 404


class TestTokenManagement:
    def test_create_and_list_tokens(self, vg_client):
        _bootstrap_and_login(vg_client, email="tok@test.vg")

        resp = vg_client.post(
            "/api/tokens",
            json={"name": "test-token", "description": "A test token"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "test-token"
        assert "token" in data
        assert data["token"].startswith("vg_")

        resp = vg_client.get("/api/tokens")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any(t["name"] == "test-token" for t in items)

    def test_revoke_token(self, vg_client):
        _bootstrap_and_login(vg_client, email="rev@test.vg")

        resp = vg_client.post("/api/tokens", json={"name": "revoke-me"})
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data, f"Unexpected response: {data}"
        token_id = data["id"]

        resp = vg_client.delete(f"/api/tokens/{token_id}")
        assert resp.status_code == 200

        resp = vg_client.get(f"/api/tokens/{token_id}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "revoked"

    def test_create_scope_on_token(self, vg_client):
        _bootstrap_and_login(vg_client, email="scope@test.vg")

        # Create a secret
        sec = vg_client.post(
            "/api/secrets",
            json={"type": "api_key", "name": "scoped-key", "value": "v"},
        ).json()

        # Create a token
        tok = vg_client.post("/api/tokens", json={"name": "scoped-tok"}).json()

        # Grant scope
        resp = vg_client.post(
            f"/api/tokens/{tok['id']}/scopes",
            json={"secret_id": sec["id"]},
        )
        assert resp.status_code == 200
        assert resp.json()["secret_id"] == sec["id"]
