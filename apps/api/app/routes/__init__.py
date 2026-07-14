"""Register the supported VaultGate API surface."""

from fastapi import APIRouter, FastAPI

from app.modules.admin_auth.routes import router as admin_auth_router
from app.modules.agents.routes import router as admin_agents_router
from app.modules.audit.routes import router as admin_audit_router
from app.modules.secrets.routes import router as admin_secrets_router
from app.modules.tokens.routes import router as admin_tokens_router
from app.modules.vault.routes import router as vault_router


def get_vaultgate_routers() -> tuple[APIRouter, ...]:
    return (
        admin_auth_router,
        admin_secrets_router,
        admin_agents_router,
        admin_tokens_router,
        admin_audit_router,
        vault_router,
    )


def register_routes(app: FastAPI) -> None:
    for router in get_vaultgate_routers():
        app.include_router(router)
