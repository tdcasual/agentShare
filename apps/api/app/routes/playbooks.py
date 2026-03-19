from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import require_bootstrap_agent
from app.db import get_db
from app.schemas.playbooks import PlaybookCreate
from app.services.audit_service import write_audit_event
from app.services.playbook_service import create_playbook, search_playbooks

router = APIRouter(prefix="/api/playbooks")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create a playbook",
    description="Write a reusable playbook entry through the bootstrap management credential.",
)
def create_playbook_route(
    payload: PlaybookCreate,
    agent=Depends(require_bootstrap_agent),
    session: Session = Depends(get_db),
) -> dict:
    record = create_playbook(session, payload)
    write_audit_event(session, "playbook_created", {
        "playbook_id": record["id"],
        "task_type": record["task_type"],
        "created_by": agent.id,
    })
    return record


@router.get(
    "/search",
    tags=["Management"],
    summary="Search playbooks",
    description="Search reusable playbooks by task type through the bootstrap management credential.",
)
def search_playbooks_route(
    task_type: str | None = Query(default=None),
    agent=Depends(require_bootstrap_agent),
    session: Session = Depends(get_db),
) -> dict:
    return {"items": search_playbooks(session, task_type)}
