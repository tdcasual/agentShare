import json
import hashlib
import logging
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request

from app.config import Settings
from app.db import SessionLocal, init_db
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository
from app.routes.agents import router as agents_router
from app.routes.approvals import router as approvals_router
from app.routes.capabilities import router as capabilities_router
from app.routes.invoke import router as invoke_router
from app.routes.intake_catalog import router as intake_catalog_router
from app.routes.leases import router as leases_router
from app.mcp.server import router as mcp_router
from app.routes.metrics import router as metrics_router
from app.routes.playbooks import router as playbooks_router
from app.routes.runs import router as runs_router
from app.routes.session import router as session_router
from app.routes.secrets import router as secrets_router
from app.routes.tasks import router as tasks_router
from app.services.secret_backend import validate_secret_backend_settings

request_logger = logging.getLogger("app.request")


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    settings = Settings()
    validate_secret_backend_settings(settings)
    init_db()
    session = SessionLocal()
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


@app.middleware("http")
async def log_request(request: Request, call_next):
    started_at = monotonic()
    response = await call_next(request)
    duration_ms = round((monotonic() - started_at) * 1000, 3)
    request_logger.info(
        json.dumps(
            {
                "event": "http_request",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        )
    )
    return response

# Idempotency middleware — only acts when Idempotency-Key header is present
try:
    from app.services.idempotency import IdempotencyMiddleware
    from app.services.redis_client import get_redis

    app.add_middleware(IdempotencyMiddleware, redis_client=get_redis(), ttl_seconds=300)
except Exception:
    pass  # Redis not available in test/dev without docker — middleware is a no-op


@app.get("/healthz", tags=["Bootstrap"], summary="Health check", description="Lightweight liveness probe.")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(agents_router)
app.include_router(session_router)
app.include_router(approvals_router)
app.include_router(intake_catalog_router)
app.include_router(secrets_router)
app.include_router(capabilities_router)
app.include_router(tasks_router)
app.include_router(invoke_router)
app.include_router(leases_router)
app.include_router(mcp_router)
app.include_router(metrics_router)
app.include_router(runs_router)
app.include_router(playbooks_router)
