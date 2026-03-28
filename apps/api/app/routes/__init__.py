"""Route modules."""

from fastapi import FastAPI

from app.mcp.server import router as mcp_router
from app.routes.agents import router as agents_router
from app.routes.approvals import router as approvals_router
from app.routes.capabilities import router as capabilities_router
from app.routes.intake_catalog import router as intake_catalog_router
from app.routes.invoke import router as invoke_router
from app.routes.leases import router as leases_router
from app.routes.metrics import router as metrics_router
from app.routes.playbooks import router as playbooks_router
from app.routes.runs import router as runs_router
from app.routes.secrets import router as secrets_router
from app.routes.session import router as session_router
from app.routes.tasks import router as tasks_router


def register_routes(app: FastAPI) -> None:
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
