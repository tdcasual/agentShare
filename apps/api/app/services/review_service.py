from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings
from app.errors import ConflictError, NotFoundError
from app.orm.capability import CapabilityModel
from app.orm.playbook import PlaybookModel
from app.orm.secret import SecretModel
from app.orm.task import TaskModel
from app.orm.task_target import TaskTargetModel
from app.repositories.access_token_repo import AccessTokenRepository
from app.repositories.task_target_repo import TaskTargetRepository
from app.services.pending_secret_service import (
    discard_pending_secret_material,
    promote_pending_secret_material,
)
from app.services.catalog_service import ensure_catalog_release
from app.services.identifiers import new_resource_id
from app.services.redis_client import acquire_lock, release_lock
from app.services.secret_backend import get_secret_backend_for_ref
from app.services.space_service import project_review_decision_to_spaces

REVIEW_PENDING = "pending_review"
REVIEW_ACTIVE = "active"
REVIEW_REJECTED = "rejected"
logger = logging.getLogger(__name__)

REVIEWABLE_MODELS: dict[str, type] = {
    "secret": SecretModel,
    "capability": CapabilityModel,
    "playbook": PlaybookModel,
    "task": TaskModel,
}


def acquire_review_lock(
    *,
    resource_kind: str,
    resource_id: str,
    settings: Settings | None = None,
) -> tuple[str, str]:
    lock_key = f"review:{resource_kind}:{resource_id}:decision"
    lock_token = acquire_lock(lock_key, ttl_seconds=30, settings=settings)
    if not lock_token:
        raise ConflictError("Review decision is being processed by another operator")
    return lock_key, lock_token


def release_review_lock(lock_key: str, lock_token: str, *, settings: Settings | None = None) -> None:
    release_lock(lock_key, lock_token, settings=settings)


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
    reason: str | None = None,
    settings: Settings | None = None,
) -> dict:
    model = _get_reviewable(session, resource_kind, resource_id)
    if model.publication_status != REVIEW_PENDING:
        raise ConflictError("Resource is not pending review")
    normalized_reason = _normalize_review_reason(reason)
    promoted_backend_ref: str | None = None
    try:
        if resource_kind == "secret":
            if settings is None:
                raise RuntimeError("Secret review approval requires runtime settings")
            promoted_backend_ref = promote_pending_secret_material(
                session,
                secret=model,
                settings=settings,
            )
        model.publication_status = REVIEW_ACTIVE
        model.reviewed_by_actor_id = reviewer_id
        model.reviewed_at = datetime.now(timezone.utc)
        model.review_reason = normalized_reason
        if resource_kind == "task":
            _materialize_reviewed_task_targets(session, model)
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
        reviewed = _to_review_dict(resource_kind, model)
        if promoted_backend_ref is not None:
            reviewed["_cleanup_secret_backend_ref"] = promoted_backend_ref
        return reviewed
    except Exception:
        if promoted_backend_ref is not None and settings is not None:
            try:
                backend = get_secret_backend_for_ref(promoted_backend_ref, settings)
                backend.delete_secret(model.id, promoted_backend_ref)
            except Exception:
                logger.exception(
                    "Failed to clean up promoted secret during review approval rollback",
                    extra={"resource_id": model.id},
                )
        raise


def reject_review(
    session: Session,
    *,
    resource_kind: str,
    resource_id: str,
    reviewer_id: str,
    reason: str | None = None,
) -> dict:
    model = _get_reviewable(session, resource_kind, resource_id)
    if model.publication_status != REVIEW_PENDING:
        raise ConflictError("Resource is not pending review")
    normalized_reason = _normalize_review_reason(reason)
    if resource_kind == "secret":
        discard_pending_secret_material(session, secret_id=model.id)
    model.publication_status = REVIEW_REJECTED
    model.reviewed_by_actor_id = reviewer_id
    model.reviewed_at = datetime.now(timezone.utc)
    model.review_reason = normalized_reason
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
        "review_reason": getattr(model, "review_reason", ""),
    }


def _normalize_review_reason(reason: str | None) -> str:
    if reason is None:
        return ""
    return reason.strip()


def _materialize_reviewed_task_targets(session: Session, task: TaskModel) -> None:
    repo = TaskTargetRepository(session)
    if repo.list_by_task(task.id):
        return

    token_ids: list[str]
    token_repo = AccessTokenRepository(session)
    if task.target_mode == "explicit_tokens":
        token_ids = []
        for token_id in task.target_token_ids or []:
            token = token_repo.get(token_id)
            if token is None or token.status != "active":
                raise ConflictError(f"Task target token is no longer active: {token_id}")
            token_ids.append(token_id)
    else:
        token_ids = [token.id for token in token_repo.list_active()]

    for token_id in token_ids:
        try:
            repo.create(TaskTargetModel(
                id=new_resource_id("target"),
                task_id=task.id,
                target_token_id=token_id,
                status="pending",
            ))
        except IntegrityError:
            if repo.find_by_task_and_token(task.id, token_id) is None:
                raise
