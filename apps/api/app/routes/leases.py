from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.agent import AgentIdentity
from app.schemas.invoke import LeaseRequest
from app.services.gateway import issue_lease

router = APIRouter(prefix="/api/capabilities")


@router.post(
    "/{capability_id}/lease",
    status_code=status.HTTP_201_CREATED,
    tags=["Agent Runtime"],
    summary="Request a capability lease",
    description="Authenticate as the claiming agent and request a short-lived lease when both the task and capability permit it.",
)
def issue_lease_route(
    capability_id: str,
    payload: LeaseRequest,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    try:
        return issue_lease(session, capability_id, payload.task_id, payload.purpose, agent)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
