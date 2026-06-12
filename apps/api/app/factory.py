"""VaultGate application factory.

This module creates and configures the FastAPI application for VaultGate.
"""
import json
import logging
import uuid
from collections.abc import Callable, Iterable
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from sqlalchemy.engine import make_url

from app import db as db_module
from app.config import Settings
from app.errors import DomainError
from app.observability import build_request_log_event, record_http_request
from app.routes import register_routes
from app.runtime import AppRuntime, build_runtime

request_logger = logging.getLogger("app.request")
startup_logger = logging.getLogger("app.startup")
AppConfigurer = Callable[[FastAPI, Settings], None]
RouteRegistrar = Callable[[FastAPI], None]


def _uses_embedded_sqlite(database_url: str) -> bool:
    return make_url(database_url).get_backend_name() == "sqlite"


def add_request_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_request(request: Request, call_next):
        started_at = monotonic()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            response = JSONResponse(
                status_code=status_code,
                content={"detail": "Internal Server Error"},
            )
            request_logger.exception(
                "Unhandled request failure",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                },
            )

        duration_ms = round((monotonic() - started_at) * 1000, 3)
        response.headers["x-request-id"] = request_id
        record_http_request(request.method, request.url.path, status_code)
        request_logger.info(json.dumps(build_request_log_event(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=status_code,
            duration_ms=duration_ms,
        )))
        return response


def register_core_routes(app: FastAPI) -> None:
    @app.get("/healthz", tags=["Bootstrap"], summary="Health check", description="Lightweight liveness probe.")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/version", tags=["Bootstrap"], summary="Version info", description="Application version information.")
    def version() -> dict[str, str]:
        return {
            "version": "1.0.0",
            "name": "VaultGate",
            "description": "极简易密钥保管与Token签发服务",
        }


def add_security_headers_middleware(app: FastAPI, settings: Settings) -> None:
    """Add security response headers (CSP, HSTS, X-Content-Type-Options, etc.)."""

    @app.middleware("http")
    async def inject_security_headers(request: Request, call_next):
        response = await call_next(request)

        # X-Content-Type-Options: prevent MIME-type sniffing
        response.headers["x-content-type-options"] = "nosniff"

        # X-Frame-Options: prevent clickjacking
        response.headers["x-frame-options"] = "DENY"

        # Referrer-Policy: minimize referrer leakage
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy: disable unnecessary browser features
        response.headers["permissions-policy"] = "camera=(), microphone=(), geolocation=()"

        # HSTS: only in production (requires HTTPS)
        if settings.is_production_like():
            response.headers["strict-transport-security"] = (
                f"max-age={settings.hsts_max_age}; includeSubDomains; preload"
            )

        # Content-Security-Policy
        csp = _build_csp(settings)
        if settings.csp_report_only:
            response.headers["content-security-policy-report-only"] = csp
        else:
            response.headers["content-security-policy"] = csp

        return response


def _build_csp(settings: Settings) -> str:
    """Build Content-Security-Policy header value based on environment."""
    # In development: allow inline scripts/styles for hot-reload DX
    if not settings.is_production_like():
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* ws://localhost:*; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

    # Production: strict CSP
    return (
        "default-src 'none'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self'; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )


def add_cors_middleware(app: FastAPI, settings: Settings) -> None:
    allowed_origins = [origin.strip() for origin in settings.cors_allowed_origins.split(",") if origin.strip()]
    if not allowed_origins:
        return
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
        max_age=600,
    )


# Methods that change server state and require Origin validation
_CSRF_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
# Paths that accept requests without cookies (machine-to-machine) and skip CSRF
_CSRF_EXEMPT_PREFIXES = ("/healthz", "/version", "/docs", "/openapi.json", "/redoc")


def add_csrf_middleware(app: FastAPI, settings: Settings) -> None:
    """Validate Origin/Referer header on state-changing requests from authenticated sessions.

    Protects against CSRF attacks by ensuring the Origin or Referer header matches
    a configured allowed origin.  Requests without a session cookie (machine-to-machine
    bearer-token calls) are not checked — CSRF is a browser-specific attack vector.
    """

    allowed_origins = frozenset(
        origin.strip().rstrip("/")
        for origin in settings.cors_allowed_origins.split(",")
        if origin.strip()
    )

    @app.middleware("http")
    async def enforce_csrf_origin(request: Request, call_next):
        # 1) Safe methods always pass through
        if request.method in _CSRF_SAFE_METHODS:
            return await call_next(request)

        # 2) Exempt public paths (health, docs)
        path = request.url.path
        if any(path.startswith(prefix) for prefix in _CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        # 3) Only check requests that carry a session cookie (browser-initiated)
        session_cookie = request.cookies.get(settings.session_cookie_name)
        if not session_cookie:
            # No session cookie → machine-to-machine (Bearer token); CSRF doesn't apply
            return await call_next(request)

        # 4) Extract Origin (preferred) or fall back to Referer
        origin = request.headers.get("origin") or ""
        if not origin:
            referer = request.headers.get("referer") or ""
            # Referer is a full URL; extract the origin part
            if referer:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(referer)
                    origin = f"{parsed.scheme}://{parsed.netloc}"
                except Exception:
                    origin = ""

        # 5) In development with no CORS configured, allow through with a warning
        if not allowed_origins:
            if not settings.is_production_like():
                return await call_next(request)
            # Production with no configured origins is a misconfiguration
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF check failed: no allowed origins configured"},
            )

        # 6) Validate origin against allowed list
        normalized = origin.rstrip("/")
        if normalized not in allowed_origins:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF check failed: invalid origin"},
            )

        return await call_next(request)


def configure_default_app(app: FastAPI, settings: Settings) -> None:
    add_cors_middleware(app, settings)
    add_csrf_middleware(app, settings)
    add_security_headers_middleware(app, settings)
    add_request_logging_middleware(app)
    add_domain_error_handlers(app)
    add_runtime_openapi_customizer(app)
    register_core_routes(app)


def add_domain_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
        response = JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            response.headers["x-request-id"] = request_id
        return response


def add_runtime_openapi_customizer(app: FastAPI) -> None:
    def custom_openapi():
        if app.openapi_schema is not None:
            return app.openapi_schema

        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
            tags=app.openapi_tags,
        )
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]


def create_app(
    settings: Settings | None = None,
    runtime: AppRuntime | None = None,
    *,
    app_configurers: Iterable[AppConfigurer] | None = None,
    route_registrar: RouteRegistrar | None = register_routes,
) -> FastAPI:
    """Create VaultGate FastAPI application.

    Args:
        settings: Application settings
        runtime: Application runtime
        app_configurers: Optional configurers
        route_registrar: Route registrar function

    Returns:
        Configured FastAPI application
    """
    if settings is not None and runtime is not None and runtime.settings != settings:
        raise ValueError("create_app settings and runtime must describe the same configuration")

    if settings is not None:
        current_settings = settings
    elif runtime is not None:
        current_settings = runtime.settings
    else:
        current_settings = Settings()
    current_runtime = runtime or build_runtime(current_settings)

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        settings = app_instance.state.settings

        # Ephemeral SQLite app starts need in-process migration
        if _uses_embedded_sqlite(settings.database_url):
            db_module.migrate_db(settings.database_url)
        yield

    app = FastAPI(
        title="VaultGate",
        description=(
            "极简易密钥保管与Token签发服务。"
            "存储账号、密码、API密钥等敏感信息，签发和管理访问Token。"
            "API文档公开访问，Agent通过Bearer Token获取权限内的密钥信息。"
        ),
        openapi_tags=[
            {"name": "Bootstrap", "description": "健康检查和公开API文档。"},
            {"name": "Authentication", "description": "用户登录和会话管理。"},
            {"name": "Secrets", "description": "密钥CRUD操作（Web UI使用）。"},
            {"name": "Tokens", "description": "Token管理和权限配置。"},
            {"name": "Vault", "description": "运行时API（Agent通过Bearer Token访问）。"},
            {"name": "Runtime", "description": "Token验证端点。"},
        ],
        lifespan=lifespan,
    )
    app.state.settings = current_settings
    app.state.runtime = current_runtime

    for configure_app in app_configurers or (configure_default_app,):
        configure_app(app, current_settings)
    if route_registrar is not None:
        route_registrar(app)

    return app
