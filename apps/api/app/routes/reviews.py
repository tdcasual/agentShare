from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.schemas.review_queue import (
    ReviewDecisionRequest,
    ReviewDecisionResponse,
    ReviewQueueResponse,
)
from app.services.audit_service import write_audit_event
from app.services.secret_backend import get_secret_backend_for_ref
from app.services.review_service import approve_review, list_pending_reviews, reject_review

router = APIRouter(prefix="/api/reviews")
logger = logging.getLogger(__name__)


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
    settings: Settings = Depends(get_settings),
) -> dict:
    reviewed: dict | None = None
    try:
        reviewed = approve_review(
            session,
            resource_kind=resource_kind,
            resource_id=resource_id,
            reviewer_id=manager.id,
            reason=payload.reason,
            settings=settings,
        )
        write_audit_event(session, "review_approved", {
            "resource_kind": resource_kind,
            "resource_id": resource_id,
            "actor_type": manager.actor_type,
            "actor_id": manager.id,
            "reason": (payload.reason or "").strip(),
        })
        session.commit()
    except Exception:
        session.rollback()
        cleanup_backend_ref = reviewed.get("_cleanup_secret_backend_ref") if reviewed else None
        if cleanup_backend_ref is not None:
            try:
                backend = get_secret_backend_for_ref(cleanup_backend_ref, settings)
                backend.delete_secret(resource_id, cleanup_backend_ref)
            except Exception:
                logger.exception(
                    "Failed to clean up promoted secret after review approval failure",
                    extra={"resource_id": resource_id},
                )
        raise
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
    reviewed = reject_review(
        session,
        resource_kind=resource_kind,
        resource_id=resource_id,
        reviewer_id=manager.id,
        reason=payload.reason,
    )
    write_audit_event(session, "review_rejected", {
        "resource_kind": resource_kind,
        "resource_id": resource_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "reason": (payload.reason or "").strip(),
    })
    return reviewed
