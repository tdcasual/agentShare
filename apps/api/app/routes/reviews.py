from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.schemas.review_queue import (
    ReviewDecisionRequest,
    ReviewDecisionResponse,
    ReviewQueueResponse,
)
from app.services.audit_service import write_audit_event
from app.services.review_service import approve_review, list_pending_reviews, reject_review

router = APIRouter(prefix="/api/reviews")


@router.get(
    "",
    response_model=ReviewQueueResponse,
    tags=["Management"],
    summary="List pending review items",
    description="Return governed assets that were created by runtime tokens and are awaiting human review. Requires an operator-or-higher management role.",
)
def list_reviews_route(
    manager: ManagementIdentity = Depends(require_management_action("reviews:list")),
    session: Session = Depends(get_db),
) -> dict:
    items = list_pending_reviews(session)
    write_audit_event(session, "review_queue_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
    return {"items": items}


@router.post(
    "/{resource_kind}/{resource_id}/approve",
    response_model=ReviewDecisionResponse,
    tags=["Management"],
    summary="Approve a pending governed asset",
    description="Promote a pending_review governed asset to active. Requires an operator-or-higher management role.",
)
def approve_review_route(
    resource_kind: str,
    resource_id: str,
    payload: ReviewDecisionRequest,
    manager: ManagementIdentity = Depends(require_management_action("reviews:decide")),
    session: Session = Depends(get_db),
) -> dict:
    del payload
    reviewed = approve_review(
        session,
        resource_kind=resource_kind,
        resource_id=resource_id,
        reviewer_id=manager.id,
    )
    write_audit_event(session, "review_approved", {
        "resource_kind": resource_kind,
        "resource_id": resource_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return reviewed


@router.post(
    "/{resource_kind}/{resource_id}/reject",
    response_model=ReviewDecisionResponse,
    tags=["Management"],
    summary="Reject a pending governed asset",
    description="Mark a pending_review governed asset as rejected. Requires an operator-or-higher management role.",
)
def reject_review_route(
    resource_kind: str,
    resource_id: str,
    payload: ReviewDecisionRequest,
    manager: ManagementIdentity = Depends(require_management_action("reviews:decide")),
    session: Session = Depends(get_db),
) -> dict:
    del payload
    reviewed = reject_review(
        session,
        resource_kind=resource_kind,
        resource_id=resource_id,
        reviewer_id=manager.id,
    )
    write_audit_event(session, "review_rejected", {
        "resource_kind": resource_kind,
        "resource_id": resource_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return reviewed
