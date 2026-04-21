from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth import require_agent
from app.models.runtime_principal import RuntimePrincipal

router = APIRouter(prefix="/api/runtime")


@router.get(
    "/me",
    tags=["Agent Runtime"],
    summary="Inspect the current runtime principal",
    description="Authenticate with a session key or access token and return the normalized runtime principal.",
)
def get_current_runtime_principal(agent: RuntimePrincipal = Depends(require_agent)) -> dict:
    return agent.model_dump()
