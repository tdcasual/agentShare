"""Route modules."""

from fastapi import APIRouter, FastAPI

from app.mcp.server import router as mcp_router
from app.routes.agents import router as agents_router
from app.routes.admin_accounts import router as admin_accounts_router
from app.routes.agent_tokens import router as agent_tokens_router
from app.routes.approvals import router as approvals_router
from app.routes.capabilities import router as capabilities_router
from app.routes.intake_catalog import router as intake_catalog_router
from app.routes.invoke import router as invoke_router
from app.routes.leases import router as leases_router
from app.routes.metrics import router as metrics_router
from app.routes.playbooks import router as playbooks_router
from app.routes.runs import router as runs_router
from app.routes.reviews import router as reviews_router
from app.routes.secrets import router as secrets_router
from app.routes.session import router as session_router
from app.routes.search import router as search_router
from app.routes.tasks import router as tasks_router, task_targets_router
from app.routes.token_feedback import router as token_feedback_router
from app.routes.bootstrap import router as bootstrap_router
from app.routes.events import router as events_router


def get_default_routers(*, include_mcp: bool = True) -> tuple[APIRouter, ...]:
    routers: list[APIRouter] = [
        agents_router,
        agent_tokens_router,
        bootstrap_router,
        session_router,
        search_router,
        admin_accounts_router,
        approvals_router,
        reviews_router,
        events_router,
        intake_catalog_router,
        secrets_router,
        capabilities_router,
        tasks_router,
        task_targets_router,
        token_feedback_router,
        invoke_router,
        leases_router,
    ]
    if include_mcp:
        routers.append(mcp_router)
    routers.extend([
        metrics_router,
        runs_router,
        playbooks_router,
    ])
    return tuple(routers)


def register_routes(app: FastAPI, *, include_mcp: bool = True) -> None:
    for router in get_default_routers(include_mcp=include_mcp):
        app.include_router(router)
