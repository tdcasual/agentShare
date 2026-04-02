from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.orm.capability import CapabilityModel
from app.orm.playbook import PlaybookModel
from app.orm.secret import SecretModel
from app.orm.task import TaskModel
from app.services.catalog_service import ensure_catalog_release
from app.services.space_service import project_review_decision_to_spaces

REVIEW_PENDING = "pending_review"
REVIEW_ACTIVE = "active"
REVIEW_REJECTED = "rejected"

REVIEWABLE_MODELS: dict[str, type] = {
    "secret": SecretModel,
    "capability": CapabilityModel,
    "playbook": PlaybookModel,
    "task": TaskModel,
}


def publication_status_for_actor(actor_type: str) -> str:
    return REVIEW_ACTIVE if actor_type == "human" else REVIEW_PENDING


def list_pending_reviews(session: Session) -> list[dict]:
    items: list[dict] = []
    for resource_kind, model in REVIEWABLE_MODELS.items():
        rows = (
            session.query(model)
            .filter(model.publication_status == REVIEW_PENDING)
            .all()
        )
        items.extend(_to_review_dict(resource_kind, row) for row in rows)
    return items


def approve_review(
    session: Session,
    *,
    resource_kind: str,
    resource_id: str,
    reviewer_id: str,
) -> dict:
    model = _get_reviewable(session, resource_kind, resource_id)
    if model.publication_status != REVIEW_PENDING:
        raise ConflictError("Resource is not pending review")
    model.publication_status = REVIEW_ACTIVE
    model.reviewed_by_actor_id = reviewer_id
    model.reviewed_at = datetime.now(timezone.utc)
    session.flush()
    ensure_catalog_release(session, resource_kind=resource_kind, model=model)
    project_review_decision_to_spaces(
        session,
        created_by_actor_type=getattr(model, "created_by_actor_type", None),
        created_by_actor_id=getattr(model, "created_by_actor_id", None),
        entry_type="review_approved",
        subject_type=resource_kind,
        subject_id=model.id,
        summary=f"Review approved for {_to_review_dict(resource_kind, model)['title']}",
    )
    return _to_review_dict(resource_kind, model)


def reject_review(
    session: Session,
    *,
    resource_kind: str,
    resource_id: str,
    reviewer_id: str,
) -> dict:
    model = _get_reviewable(session, resource_kind, resource_id)
    if model.publication_status != REVIEW_PENDING:
        raise ConflictError("Resource is not pending review")
    model.publication_status = REVIEW_REJECTED
    model.reviewed_by_actor_id = reviewer_id
    model.reviewed_at = datetime.now(timezone.utc)
    session.flush()
    project_review_decision_to_spaces(
        session,
        created_by_actor_type=getattr(model, "created_by_actor_type", None),
        created_by_actor_id=getattr(model, "created_by_actor_id", None),
        entry_type="review_rejected",
        subject_type=resource_kind,
        subject_id=model.id,
        summary=f"Review rejected for {_to_review_dict(resource_kind, model)['title']}",
    )
    return _to_review_dict(resource_kind, model)


def _get_reviewable(session: Session, resource_kind: str, resource_id: str) -> Any:
    model_class = REVIEWABLE_MODELS.get(resource_kind)
    if model_class is None:
        raise NotFoundError("Reviewable resource not found")
    model = session.get(model_class, resource_id)
    if model is None:
        raise NotFoundError("Reviewable resource not found")
    return model


def _to_review_dict(resource_kind: str, model: Any) -> dict:
    title = getattr(model, "display_name", None) or getattr(model, "name", None) or getattr(model, "title", None) or model.id
    return {
        "resource_kind": resource_kind,
        "resource_id": model.id,
        "title": title,
        "publication_status": model.publication_status,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "reviewed_by_actor_id": model.reviewed_by_actor_id,
        "reviewed_at": model.reviewed_at,
    }
