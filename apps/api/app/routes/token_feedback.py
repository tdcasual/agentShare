from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_admin_management_session
from app.db import get_db
from app.schemas.token_feedback import TokenFeedbackCreate, TokenFeedbackListResponse, TokenFeedbackResponse
from app.services.audit_service import write_audit_event
from app.services.event_service import record_event
from app.services.token_feedback_service import create_token_feedback, list_token_feedback

router = APIRouter()


@router.post(
    "/api/task-targets/{task_target_id}/feedback",
    response_model=TokenFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Attach human feedback to a completed task target",
    description="Record review feedback for a completed token-targeted execution result and roll up token trust aggregates.",
)
def create_token_feedback_route(
    task_target_id: str,
    payload: TokenFeedbackCreate,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    feedback = create_token_feedback(
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
            "token_id": feedback["token_id"],
            "run_id": feedback["run_id"],
            "score": payload.score,
            "verdict": payload.verdict,
        },
    )
    write_audit_event(session, "token_feedback_created", {
        "task_target_id": task_target_id,
        "token_id": feedback["token_id"],
        "run_id": feedback["run_id"],
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return feedback


@router.get(
    "/api/agent-tokens/{token_id}/feedback",
    response_model=TokenFeedbackListResponse,
    tags=["Management"],
    summary="List feedback attached to a token",
    description="Return feedback records associated with an agent token.",
)
def list_token_feedback_route(
    token_id: str,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return {"items": list_token_feedback(session, token_id)}
