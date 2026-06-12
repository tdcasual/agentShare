"""VaultGate route modules.

This module registers all VaultGate API routes.
The old Agent Control Plane routes have been removed as part of the VaultGate in-place replacement.
"""

from fastapi import APIRouter, FastAPI

# VaultGate routes
from app.routes.auth import router as auth_router
from app.routes.bootstrap import router as bootstrap_router
from app.routes.secrets_mgmt import router as secrets_mgmt_router
from app.routes.tokens import router as tokens_router
from app.routes.vault import router as vault_router
from app.routes.runtime import router as runtime_router


def get_vaultgate_routers() -> tuple[APIRouter, ...]:
    """Get all VaultGate routers.

    Returns:
        Tuple of APIRouter instances
    """
    return (
        bootstrap_router,    # /api/bootstrap - initialize first user
        auth_router,         # /api/session - login/logout/me
        secrets_mgmt_router, # /api/secrets - secret CRUD (web UI)
        tokens_router,       # /api/tokens - token management
        vault_router,        # /api/vault - runtime API (Bearer token)
        runtime_router,      # /api/me - token verification
    )


def register_routes(app: FastAPI) -> None:
    """Register VaultGate routes with the FastAPI app."""
    for router in get_vaultgate_routers():
        app.include_router(router)
