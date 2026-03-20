from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.orm import Session

from app.orm.approval_request import ApprovalRequestModel
from app.repositories.approval_repo import ApprovalRequestRepository
from app.services.audit_service import write_audit_event

logger = logging.getLogger(__name__)

ApprovalMode = Literal["auto", "manual"]
ApprovalActionType = Literal["invoke", "lease"]
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]

APPROVAL_TTL_SECONDS = 900

_VALID_MODES = {"auto", "manual"}
_VALID_ACTION_TYPES = {"invoke", "lease"}
_VALID_STATUSES = {"pending", "approved", "rejected", "expired"}


def approval_required(task_mode: str, capability_mode: str) -> bool:
    _validate_mode(task_mode, field_name="task_mode")
    _validate_mode(capability_mode, field_name="capability_mode")
    return task_mode == "manual" or capability_mode == "manual"


def require_runtime_approval(
    *,
    session: Session,
    task_id: str,
    capability_id: str,
    agent_id: str,
    action_type: str,
    task_approval_mode: str,
    capability_approval_mode: str,
) -> ApprovalRequestModel | None:
    _validate_action_type(action_type)
    if not approval_required(task_approval_mode, capability_approval_mode):
        return None

    repo = ApprovalRequestRepository(session)
    latest = repo.get_latest_for_scope(
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        action_type=action_type,
    )
    if latest is None:
        return _create_pending_request(
            repo=repo,
            task_id=task_id,
            capability_id=capability_id,
            agent_id=agent_id,
            action_type=action_type,
        )

    latest = expire_request_if_needed(session=session, approval=latest)
    if latest.status == "approved":
        return None
    if latest.status == "pending":
        return latest

    return _create_pending_request(
        repo=repo,
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        action_type=action_type,
    )


def approve_request(
    *,
    session: Session,
    approval_id: str,
    decided_by: str,
    reason: str = "",
    now: datetime | None = None,
) -> ApprovalRequestModel:
    repo = ApprovalRequestRepository(session)
    approval = _require_existing(repo, approval_id)
    _require_pending_state(approval, operation="approve")
    current_time = _utc_now() if now is None else now
    normalized_reason = _normalize_reason(reason)
    approval.status = "approved"
    approval.decided_by = decided_by
    approval.reason = normalized_reason
    approval.expires_at = current_time + timedelta(seconds=APPROVAL_TTL_SECONDS)
    updated = repo.update(approval)
    _write_audit_event_best_effort(session, "approval_approved", {
        "approval_id": updated.id,
        "task_id": updated.task_id,
        "capability_id": updated.capability_id,
        "agent_id": updated.agent_id,
        "action_type": updated.action_type,
        "decided_by": decided_by,
    })
    return updated


def reject_request(
    *,
    session: Session,
    approval_id: str,
    decided_by: str,
    reason: str = "",
) -> ApprovalRequestModel:
    repo = ApprovalRequestRepository(session)
    approval = _require_existing(repo, approval_id)
    _require_pending_state(approval, operation="reject")
    normalized_reason = _normalize_reason(reason)
    if not normalized_reason:
        raise ValueError("Rejection reason is required")
    approval.status = "rejected"
    approval.reason = normalized_reason
    approval.decided_by = decided_by
    approval.expires_at = None
    updated = repo.update(approval)
    _write_audit_event_best_effort(session, "approval_rejected", {
        "approval_id": updated.id,
        "task_id": updated.task_id,
        "capability_id": updated.capability_id,
        "agent_id": updated.agent_id,
        "action_type": updated.action_type,
        "decided_by": decided_by,
        "reason": normalized_reason,
    })
    return updated


def list_approval_requests(
    *,
    session: Session,
    status: str | None = None,
    now: datetime | None = None,
) -> list[ApprovalRequestModel]:
    repo = ApprovalRequestRepository(session)
    if status is not None:
        _validate_status(status)

    items = [
        expire_request_if_needed(session=session, approval=model, now=now)
        for model in repo.list_all()
    ]
    if status is not None:
        items = [model for model in items if model.status == status]

    # Ensure deterministic newest-first ordering for management list views.
    return sorted(
        items,
        key=_approval_sort_key,
        reverse=True,
    )


def approval_to_dict(model: ApprovalRequestModel) -> dict:
    return {
        "id": model.id,
        "task_id": model.task_id,
        "capability_id": model.capability_id,
        "agent_id": model.agent_id,
        "action_type": model.action_type,
        "status": model.status,
        "reason": model.reason,
        "requested_by": model.requested_by,
        "decided_by": model.decided_by,
        "expires_at": model.expires_at,
    }


def expire_request_if_needed(
    *,
    session: Session,
    approval: ApprovalRequestModel,
    now: datetime | None = None,
) -> ApprovalRequestModel:
    if approval.status != "approved" or approval.expires_at is None:
        return approval

    current_time = _utc_now() if now is None else now
    if approval.expires_at > current_time:
        return approval

    approval.status = "expired"
    return ApprovalRequestRepository(session).update(approval)


def _create_pending_request(
    *,
    repo: ApprovalRequestRepository,
    task_id: str,
    capability_id: str,
    agent_id: str,
    action_type: str,
) -> ApprovalRequestModel:
    approval_id = f"approval-{len(repo.list_all()) + 1}"
    model = ApprovalRequestModel(
        id=approval_id,
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        action_type=action_type,
        status="pending",
        reason="Awaiting manual approval",
        requested_by=agent_id,
    )
    created = repo.create(model)
    _write_audit_event_best_effort(repo.session, "approval_requested", {
        "approval_id": created.id,
        "task_id": created.task_id,
        "capability_id": created.capability_id,
        "agent_id": created.agent_id,
        "action_type": created.action_type,
        "requested_by": created.requested_by,
    })
    return created


def _validate_mode(mode: str, *, field_name: str) -> None:
    if mode not in _VALID_MODES:
        raise ValueError(f"Unsupported {field_name}: {mode}")


def _validate_action_type(action_type: str) -> None:
    if action_type not in _VALID_ACTION_TYPES:
        raise ValueError(f"Unsupported action_type: {action_type}")


def _validate_status(status: str) -> None:
    if status not in _VALID_STATUSES:
        raise ValueError(f"Unsupported status: {status}")


def _require_existing(repo: ApprovalRequestRepository, approval_id: str) -> ApprovalRequestModel:
    approval = repo.get(approval_id)
    if approval is None:
        raise KeyError(f"Approval request {approval_id} not found")
    return approval


def _require_pending_state(approval: ApprovalRequestModel, *, operation: str) -> None:
    if approval.status != "pending":
        raise ValueError(f"Cannot {operation} approval request in status '{approval.status}'")


def _normalize_reason(reason: str) -> str:
    return reason.strip()


def _approval_sort_key(model: ApprovalRequestModel) -> tuple[datetime, int]:
    return _normalize_datetime(model.created_at), _approval_sequence(model.id)


def _approval_sequence(approval_id: str) -> int:
    try:
        return int(approval_id.rsplit("-", 1)[1])
    except (IndexError, ValueError):
        return -1


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _write_audit_event_best_effort(session: Session, event_type: str, payload: dict) -> None:
    try:
        write_audit_event(session, event_type, payload)
    except Exception:
        logger.exception("Failed to write approval audit event", extra={"event_type": event_type})


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)
