from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_admin_management_session
from app.db import get_db
from app.schemas.access_token_feedback import (
    AccessTokenFeedbackBulkListResponse,
    AccessTokenFeedbackCreate,
    AccessTokenFeedbackListResponse,
    AccessTokenFeedbackResponse,
)
from app.services.audit_service import write_audit_event
from app.services.event_service import record_event
from app.services.access_token_feedback_service import (
    create_access_token_feedback,
    list_access_token_feedback,
    list_access_token_feedback_bulk,
)

router = APIRouter()


@router.post(
    "/api/task-targets/{task_target_id}/feedback",
    response_model=AccessTokenFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Attach human feedback to a completed task target",
    description="Record review feedback for a completed access-token-targeted execution result and roll up access token trust aggregates.",
)
def create_access_token_feedback_route(
    task_target_id: str,
    payload: AccessTokenFeedbackCreate,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    feedback = create_access_token_feedback(
        session,
        task_target_id=task_target_id,
        score=payload.score,
        verdict=payload.verdict,
        summary=payload.summary,
        created_by_actor_type=manager.actor_type,
        created_by_actor_id=manager.id,
    )
    record_event(
        session,
        event_type="task_feedback_posted",
        actor_type=manager.actor_type,
        actor_id=manager.id,
        subject_type="task_target",
        subject_id=task_target_id,
        summary=f"{manager.email} posted feedback for task target {task_target_id}",
        details=payload.summary,
        action_url="/tasks",
        metadata={
            "access_token_id": feedback["access_token_id"],
            "run_id": feedback["run_id"],
            "score": payload.score,
            "verdict": payload.verdict,
        },
    )
    write_audit_event(session, "access_token_feedback_created", {
        "task_target_id": task_target_id,
        "access_token_id": feedback["access_token_id"],
        "run_id": feedback["run_id"],
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return feedback


@router.get(
    "/api/access-token-feedback/bulk",
    response_model=AccessTokenFeedbackBulkListResponse,
    tags=["Management"],
    summary="List access token feedback in bulk",
    description="Return feedback records grouped by access token id for bulk dashboard views.",
)
def list_access_token_feedback_bulk_route(
    access_token_id: list[str] = Query(default_factory=list),
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return {"items_by_access_token": list_access_token_feedback_bulk(session, access_token_id)}


@router.get(
    "/api/access-tokens/{token_id}/feedback",
    response_model=AccessTokenFeedbackListResponse,
    tags=["Management"],
    summary="List feedback attached to a standalone access token",
    description="Return feedback records associated with a managed standalone access token.",
)
def list_access_token_feedback_route(
    token_id: str,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return {"items": list_access_token_feedback(session, token_id)}
