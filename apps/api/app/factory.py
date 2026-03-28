import json
import hashlib
import logging
import uuid
from collections.abc import Callable
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request
from sqlalchemy.orm import Session

from app import db as db_module
from app.config import Settings
from app.observability import record_http_request
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository
from app.runtime import build_runtime
from app.routes import register_routes
from app.services.secret_backend import validate_secret_backend_settings

request_logger = logging.getLogger("app.request")


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def ensure_bootstrap_agent(settings: Settings, session_factory: Callable[[], Session]) -> None:
    session = session_factory()
    try:
        repo = AgentRepository(session)
        existing = repo.get("bootstrap")
        if existing is None:
            repo.create(AgentIdentityModel(
                id="bootstrap",
                name="Bootstrap Agent",
                api_key_hash=_hash_key(settings.bootstrap_agent_key),
                status="active",
                allowed_capability_ids=[],
                allowed_task_types=[],
                risk_tier="high",
            ))
            session.commit()
    finally:
        session.close()


def add_request_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_request(request: Request, call_next):
        started_at = monotonic()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        response = await call_next(request)
        duration_ms = round((monotonic() - started_at) * 1000, 3)
        response.headers["x-request-id"] = request_id
        record_http_request(response.status_code)
        request_logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            )
        )
        return response


def add_idempotency_middleware(app: FastAPI) -> None:
    # Idempotency middleware — only acts when Idempotency-Key header is present.
    try:
        from app.services.idempotency import IdempotencyMiddleware
        from app.services.redis_client import get_redis

        app.add_middleware(IdempotencyMiddleware, redis_client=get_redis(), ttl_seconds=300)
    except Exception:
        pass


def register_core_routes(app: FastAPI) -> None:
    @app.get("/healthz", tags=["Bootstrap"], summary="Health check", description="Lightweight liveness probe.")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}


def create_app(settings: Settings | None = None) -> FastAPI:
    current_settings = settings or Settings()
    runtime = build_runtime(current_settings)

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        validate_secret_backend_settings(current_settings)
        db_module.init_db(runtime.engine)
        ensure_bootstrap_agent(current_settings, runtime.session_factory)
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
    app.state.runtime = runtime

    add_request_logging_middleware(app)
    add_idempotency_middleware(app)
    register_core_routes(app)
    register_routes(app)

    return app
