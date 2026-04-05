from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedActor,
    ManagementIdentity,
    require_management_or_agent_action,
    require_management_session,
)
from app.db import get_db
from app.schemas.playbooks import PlaybookCreate, PlaybookResponse, PlaybookSearchResponse
from app.services.audit_service import actor_payload, write_audit_event
from app.services.playbook_service import create_playbook, get_playbook, search_playbooks
from app.services.review_service import publication_status_for_actor

router = APIRouter(prefix="/api/playbooks")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PlaybookResponse,
    tags=["Management", "Agent Runtime"],
    summary="Create or submit a playbook",
    description=(
        "Management sessions may create an active reusable playbook immediately. "
        "Authenticated runtime agents may submit a pending-review playbook draft."
    ),
)
def create_playbook_route(
    payload: PlaybookCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_management_or_agent_action("playbooks:create")),
    session: Session = Depends(get_db),
) -> dict:
    record = create_playbook(session, payload, actor=actor)
    if publication_status_for_actor(actor.actor_type) == "pending_review":
        response.status_code = status.HTTP_202_ACCEPTED
    write_audit_event(session, "playbook_created", {
        "playbook_id": record["id"],
        "task_type": record["task_type"],
        **actor_payload(actor),
    })
    return record


@router.get(
    "/search",
    response_model=PlaybookSearchResponse,
    tags=["Management"],
    summary="Search playbooks",
    description="Search reusable playbooks by task type, text query, and tag through the management session.",
)
def search_playbooks_route(
    task_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager  # managed by dependency; kept to enforce session auth
    result = search_playbooks(session, task_type=task_type, query=q, tag=tag)
    return {
        "items": result.items,
        "meta": {
            "total": result.total,
            "items_count": len(result.items),
            "applied_filters": result.applied_filters,
        },
    }


@router.get(
    "/{playbook_id}",
    response_model=PlaybookResponse,
    tags=["Management"],
    summary="Get a playbook by id",
    description="Read one playbook record through the management session for detail views.",
)
def get_playbook_route(
    playbook_id: str,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager  # managed by dependency; kept to enforce session auth
    return get_playbook(session, playbook_id)
