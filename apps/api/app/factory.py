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
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app import db as db_module
from app.config import Settings
from app.observability import build_request_log_event
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

    @app.get("/readyz", response_model=None, tags=["Bootstrap"], summary="Readiness probe", description="Deep health check verifying database and encryption service.")
    async def readiness_check(request: Request) -> JSONResponse | dict[str, str]:
        """Verify all critical dependencies are available.

        Returns 200 if the service is ready to accept traffic, 503 otherwise.
        Checks: database connectivity, encryption key availability.
        """
        checks: dict[str, str] = {}

        # Check database connectivity
        try:
            runtime: AppRuntime = request.app.state.runtime
            async with runtime.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception:
            startup_logger.exception("Readiness check: database failed")
            checks["database"] = "unavailable"

        # Check encryption service
        try:
            from app.services.encryption import get_encryption_service
            svc = get_encryption_service()
            svc.encrypt("healthcheck")  # round-trip test
            checks["encryption"] = "ok"
        except Exception:
            startup_logger.exception("Readiness check: encryption failed")
            checks["encryption"] = "unavailable"

        if all(v == "ok" for v in checks.values()):
            return {"status": "ok", **checks}
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", **checks},
        )

    @app.get("/version", tags=["Bootstrap"], summary="Version info", description="Application version information.")
    def version() -> dict[str, str]:
        return {
            "version": "1.0.0",
            "name": "VaultGate",
            "description": "极简易密钥保管与Token签发服务",
        }


def add_security_headers_middleware(app: FastAPI, settings: Settings) -> None:
    """Add core security response headers."""

    @app.middleware("http")
    async def inject_security_headers(request: Request, call_next):
        response = await call_next(request)

        # X-Content-Type-Options: prevent MIME-type sniffing
        response.headers["x-content-type-options"] = "nosniff"

        # X-Frame-Options: prevent clickjacking
        response.headers["x-frame-options"] = "DENY"

        # Referrer-Policy: minimize referrer leakage
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"

        return response


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
    register_core_routes(app)


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
        startup_logger.info("VaultGate starting (env=%s)", settings.app_env)

        # Ephemeral SQLite app starts need in-process migration
        if _uses_embedded_sqlite(settings.database_url):
            db_module.migrate_db(settings.database_url)

        yield

        # Graceful shutdown: dispose engines and release connections
        startup_logger.info("VaultGate shutting down — disposing database engines")
        try:
            runtime_obj: AppRuntime = app_instance.state.runtime
            await runtime_obj.dispose()
        except Exception:
            startup_logger.exception("Error disposing async runtime during shutdown")
        startup_logger.info("VaultGate shutdown complete")

    app = FastAPI(
        title="VaultGate",
        description=(
            "极简易密钥保管与Token签发服务。"
            "存储账号、密码、API密钥等敏感信息，签发和管理访问Token。"
            "API文档公开访问，Agent通过Bearer Token获取权限内的密钥信息。"
        ),
        openapi_tags=[
            {"name": "Admin", "description": "单管理员初始化、会话与管理 Token。"},
            {"name": "Admin Secrets", "description": "管理员 Secret 管理。"},
            {"name": "Admin Agents", "description": "Agent 生命周期。"},
            {"name": "Admin Tokens", "description": "Agent Token 与逐 Secret 授权。"},
            {"name": "Admin Audit", "description": "结构化审计查询与统计。"},
            {"name": "Vault", "description": "仅供 vg_ Agent Token 使用的运行时 API。"},
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
