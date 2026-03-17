from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.agent import AgentIdentity
from app.schemas.invoke import InvokeRequest
from app.services.gateway import proxy_invoke

router = APIRouter(prefix="/api/capabilities", tags=["invoke"])


@router.post("/{capability_id}/invoke")
def invoke_capability_route(
    capability_id: str,
    payload: InvokeRequest,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    try:
        return proxy_invoke(session, capability_id, payload.task_id, payload.parameters, agent.id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Capability not found") from exc
