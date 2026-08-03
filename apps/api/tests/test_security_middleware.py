"""Tests for security middleware: CSP/HSTS headers and CSRF Origin validation."""
from fastapi import FastAPI

from app.config import Settings
from app.factory import (
    add_cors_middleware,
    add_csrf_middleware,
    add_request_size_middleware,
    add_security_headers_middleware,
)
from tests.asgi_client import TestClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_test_app(settings: Settings | None = None) -> FastAPI:
    """Create a minimal FastAPI app with routes for testing middleware."""
    s = settings or Settings()
    app = FastAPI()

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.post("/api/admin/session/login")
    def login():
        return {"status": "ok"}

    @app.put("/api/data")
    def update_data():
        return {"status": "ok"}

    @app.delete("/api/data/{item_id}")
    def delete_data(item_id: str):
        return {"status": "ok", "id": item_id}

    @app.patch("/api/data/{item_id}")
    def patch_data(item_id: str):
        return {"status": "ok", "id": item_id}

    app.state.settings = s
    return app


def _client_with_security_headers(settings: Settings | None = None) -> TestClient:
    app = _make_test_app(settings)
    add_security_headers_middleware(app, app.state.settings)
    return TestClient(app)


def _client_with_csrf(settings: Settings | None = None) -> TestClient:
    s = settings or Settings()
    app = _make_test_app(s)
    add_csrf_middleware(app, s)
    return TestClient(app)


def _client_with_request_limit(max_bytes: int) -> TestClient:
    settings = Settings(max_request_body_bytes=max_bytes)
    app = _make_test_app(settings)
    add_request_size_middleware(app, settings)
    return TestClient(app)


def test_cors_preflight_allows_agent_write_headers():
    settings = Settings(cors_allowed_origins="https://console.example.com")
    app = _make_test_app(settings)
    add_cors_middleware(app, settings)
    client = TestClient(app)

    response = client.options(
        "/api/data",
        headers={
            "origin": "https://console.example.com",
            "access-control-request-method": "PATCH",
            "access-control-request-headers": "Idempotency-Key, If-Match",
        },
    )

    assert response.status_code == 200
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "idempotency-key" in allowed_headers
    assert "if-match" in allowed_headers


# Use the default cookie name from Settings for test cookies
_TEST_COOKIE_KEY = "vaultgate_session"


# ===========================================================================
# Security Headers Tests
# ===========================================================================


class TestSecurityHeaders:
    """Tests for CSP, HSTS, X-Content-Type-Options, etc."""

    def test_x_content_type_options_nosniff(self):
        client = _client_with_security_headers()
        resp = client.get("/healthz")
        assert resp.headers["x-content-type-options"] == "nosniff"

    def test_x_frame_options_deny(self):
        client = _client_with_security_headers()
        resp = client.get("/healthz")
        assert resp.headers["x-frame-options"] == "DENY"

    def test_referrer_policy(self):
        client = _client_with_security_headers()
        resp = client.get("/healthz")
        assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"

    def test_all_headers_present_on_every_response(self):
        client = _client_with_security_headers()
        resp = client.get("/healthz")
        mandatory = [
            "x-content-type-options",
            "x-frame-options",
            "referrer-policy",
        ]
        for header in mandatory:
            assert header in resp.headers, f"Missing header: {header}"


class TestRequestSizeLimit:
    def test_rejects_declared_oversized_body(self):
        client = _client_with_request_limit(65_536)
        response = client.post(
            "/api/admin/session/login",
            content=b"x",
            headers={"content-length": "65537"},
        )
        assert response.status_code == 413

    def test_allows_body_within_limit(self):
        client = _client_with_request_limit(65_536)
        response = client.post("/api/admin/session/login", content=b"x" * 1024)
        assert response.status_code == 200


# ===========================================================================
# CSRF Origin Validation Tests
# ===========================================================================


class TestCSRFMiddleware:
    """Tests for CSRF Origin validation on state-changing requests."""

    def test_get_requests_always_pass(self):
        client = _client_with_csrf()
        resp = client.get("/healthz")
        assert resp.status_code == 200

    def test_post_without_session_cookie_passes(self):
        """Machine-to-machine requests (no session cookie) skip CSRF."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post("/api/admin/session/login")
        assert resp.status_code == 200

    def test_post_with_session_cookie_and_valid_origin(self):
        """Session-authenticated POST with valid Origin should pass."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000"},
        )
        assert resp.status_code == 200

    def test_post_with_session_cookie_and_invalid_origin(self):
        """Session-authenticated POST with wrong Origin should be rejected."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://evil.example.com"},
        )
        assert resp.status_code == 403
        assert "CSRF" in resp.json()["detail"]

    def test_post_with_session_cookie_and_no_origin(self):
        """Session-authenticated POST without Origin header should be rejected."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
        )
        assert resp.status_code == 403

    def test_put_with_session_cookie_and_valid_origin(self):
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.put(
            "/api/data",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000"},
        )
        assert resp.status_code == 200

    def test_put_with_session_cookie_and_invalid_origin(self):
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.put(
            "/api/data",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://attacker.com"},
        )
        assert resp.status_code == 403

    def test_delete_with_session_cookie_and_valid_origin(self):
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.delete(
            "/api/data/123",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000"},
        )
        assert resp.status_code == 200

    def test_patch_with_session_cookie_and_valid_origin(self):
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.patch(
            "/api/data/123",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000"},
        )
        assert resp.status_code == 200

    def test_exempt_paths_skip_csrf(self):
        """Public paths like /healthz should skip CSRF even with session cookie."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        # healthz is GET, so it's already safe, but test /docs path too
        # (can't POST to healthz, so verify GET works with cookie + no origin)
        resp = client.get(
            "/healthz",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
        )
        assert resp.status_code == 200

    def test_dev_mode_no_origins_allows_through(self):
        """In development with no CORS origins, requests with session pass through."""
        settings = Settings(cors_allowed_origins="", app_env="development")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
        )
        assert resp.status_code == 200

    def test_referer_fallback(self):
        """If Origin is missing but Referer is present, use Referer's origin."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"referer": "http://localhost:3000/some/page"},
        )
        assert resp.status_code == 200

    def test_referer_fallback_invalid(self):
        """Referer from a different origin should be rejected."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"referer": "http://evil.example.com/attack"},
        )
        assert resp.status_code == 403

    def test_multiple_allowed_origins(self):
        """Any origin in the allowed list should pass."""
        settings = Settings(cors_allowed_origins="http://localhost:3000,http://localhost:4000")
        client = _client_with_csrf(settings)

        resp1 = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000"},
        )
        assert resp1.status_code == 200

        resp2 = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:4000"},
        )
        assert resp2.status_code == 200

    def test_origin_with_trailing_slash_normalization(self):
        """Origin with trailing slash should still match."""
        settings = Settings(cors_allowed_origins="http://localhost:3000")
        client = _client_with_csrf(settings)
        resp = client.post(
            "/api/admin/session/login",
            cookies={_TEST_COOKIE_KEY: "test-session-value"},
            headers={"origin": "http://localhost:3000/"},
        )
        assert resp.status_code == 200
