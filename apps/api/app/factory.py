import json
import logging
import uuid
from collections.abc import Callable, Iterable
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from sqlalchemy.engine import make_url

from app import db as db_module
from app.config import Settings
from app.errors import DomainError
from app.observability import build_request_log_event, record_http_request
from app.runtime import AppRuntime, build_runtime
from app.routes import register_routes
from app.services.demo_seed_service import seed_demo_fixture_data
from app.services.secret_backend import validate_secret_backend_settings

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


def add_idempotency_middleware(app: FastAPI, settings: Settings) -> None:
    # Idempotency middleware — only acts when Idempotency-Key header is present.
    try:
        from app.services.idempotency import IdempotencyMiddleware
        from app.services.redis_client import get_redis

        app.add_middleware(
            IdempotencyMiddleware,
            redis_client=get_redis(settings),
            ttl_seconds=300,
        )
    except Exception as exc:
        message = f"Idempotency middleware disabled because Redis initialization failed: {exc}"
        if settings.is_production_like():
            raise RuntimeError(message) from exc
        startup_logger.warning(message)


def register_core_routes(app: FastAPI) -> None:
    @app.get("/healthz", tags=["Bootstrap"], summary="Health check", description="Lightweight liveness probe.")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}


def configure_default_app(app: FastAPI, settings: Settings) -> None:
    add_request_logging_middleware(app)
    add_idempotency_middleware(app, settings)
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
        management_scheme = schema.get("components", {}).get("securitySchemes", {}).get("ManagementSession")
        if management_scheme is not None:
            management_scheme["name"] = app.state.settings.management_session_cookie_name
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi


def create_app(
    settings: Settings | None = None,
    runtime: AppRuntime | None = None,
    *,
    app_configurers: Iterable[AppConfigurer] | None = None,
    route_registrar: RouteRegistrar | None = register_routes,
) -> FastAPI:
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

        validate_secret_backend_settings(settings)
        # Ephemeral SQLite app starts do not go through the container entrypoint,
        # so they still need an in-process migration step before bootstrap seeding.
        if _uses_embedded_sqlite(settings.database_url):
            db_module.migrate_db(settings.database_url)
        seed_demo_fixture_data(settings, app_instance.state.runtime.session_factory)
        yield

    app = FastAPI(
        title="Agent Control Plane",
        description=(
            "Coordinate humans, agents, secrets, and lightweight tasks through a single control plane usable by new agents without source diving. "
            "Humans should exchange the bootstrap credential once for a short-lived management session cookie, then use that cookie on management routes. "
            "Agents should self-discover request details from /docs and /openapi.json, then authenticate "
            "with bearer API keys on runtime routes."
        ),
        openapi_tags=[
            {"name": "Bootstrap", "description": "Health and login/bootstrap surfaces needed to start the system."},
            {"name": "Management", "description": "Cookie-authenticated human management routes used by the console."},
            {"name": "Agent Runtime", "description": "Agent-authenticated runtime routes for claiming work and using capabilities."},
            {"name": "Knowledge", "description": "Reusable playbooks that agents may search without management credentials."},
            {"name": "Observability", "description": "Run history and audit-friendly state for operators."},
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
