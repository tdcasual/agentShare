"""VaultGate smoke tests.

Verifies the core application lifecycle: factory creation, health check,
bootstrap, login, secret CRUD, token management, and vault access.
"""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import reset_async_engine
from app.factory import create_app
from app.runtime import build_runtime
from app.services.encryption import reset_encryption_service


# ---------------------------------------------------------------------------
# Module-scoped fixtures — one app/client for all tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def _env(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("vaultgate")
    db_file = str(tmp / "test.db")
    # Save original env
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
    yield
    # Restore original env
    for k, v in orig_env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


@pytest.fixture(scope="module")
def app(_env):
    settings = Settings()
    runtime = build_runtime(settings)
    return create_app(settings, runtime)


@pytest.fixture(scope="module")
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    with patch("app.rate_limit.check_rate_limit", return_value=None):
        yield


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestAppStartup:
    def test_app_creates_without_error(self, app):
        assert app is not None

    def test_health_check(self, client):
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_openapi_schema_available(self, client):
        resp = client.get("/openapi.json")
        assert resp.status_code == 200
        paths = resp.json()["paths"]
        for expected in ["/api/session/login", "/api/secrets", "/api/tokens", "/api/vault", "/api/me"]:
            assert expected in paths, f"Missing route: {expected}"


class TestBootstrapAndLogin:
    def test_bootstrap_creates_first_user(self, client):
        resp = client.post(
            "/api/bootstrap/init",
            json={"email": "admin@test.vaultgate", "password": "Str0ng!Pass#2026"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.vaultgate"

    def test_bootstrap_rejects_weak_password(self, client):
        resp = client.post(
            "/api/bootstrap/init",
            json={"email": "weak@test.vg", "password": "short"},
        )
        assert resp.status_code == 422

    def test_login_returns_session_cookie(self, client):
        resp = client.post(
            "/api/session/login",
            json={"email": "admin@test.vaultgate", "password": "Str0ng!Pass#2026"},
        )
        assert resp.status_code == 200
        assert "vaultgate_session" in resp.cookies

    def test_me_returns_user_info(self, client):
        resp = client.get("/api/session/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.vaultgate"

    def test_login_rejects_wrong_password(self, client):
        resp = client.post(
            "/api/session/login",
            json={"email": "admin@test.vaultgate", "password": "WrongPassword1!"},
        )
        assert resp.status_code == 401


class TestSecretCRUD:
    def test_create_and_list_secrets(self, client):
        resp = client.post(
            "/api/secrets",
            json={"type": "api_key", "name": "test-key", "value": "sk-12345", "tags": ["test"]},
        )
        assert resp.status_code == 200
        secret_id = resp.json()["id"]

        resp = client.get("/api/secrets")
        assert resp.status_code == 200
        assert any(s["id"] == secret_id for s in resp.json()["items"])

    def test_delete_secret(self, client):
        resp = client.post(
            "/api/secrets",
            json={"type": "password", "name": "to-delete", "value": "val"},
        )
        assert resp.status_code == 200
        secret_id = resp.json()["id"]

        resp = client.delete(f"/api/secrets/{secret_id}")
        assert resp.status_code == 200

        resp = client.get(f"/api/secrets/{secret_id}")
        assert resp.status_code == 404


class TestTokenManagement:
    def test_create_and_list_tokens(self, client):
        resp = client.post(
            "/api/tokens",
            json={"name": "test-token", "description": "A test token"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "test-token"
        assert "token" in data
        assert data["token"].startswith("vg_")

        resp = client.get("/api/tokens")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_revoke_token(self, client):
        resp = client.post("/api/tokens", json={"name": "revoke-me"})
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data, f"Unexpected response: {data}"
        token_id = data["id"]

        resp = client.delete(f"/api/tokens/{token_id}")
        assert resp.status_code == 200

        resp = client.get(f"/api/tokens/{token_id}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "revoked"
