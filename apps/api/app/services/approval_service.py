from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.orm import Session

from app.orm.approval_request import ApprovalRequestModel
from app.repositories.approval_repo import ApprovalRequestRepository

ApprovalMode = Literal["auto", "manual"]
ApprovalActionType = Literal["invoke", "lease"]
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]

APPROVAL_TTL_SECONDS = 900

_VALID_MODES = {"auto", "manual"}
_VALID_ACTION_TYPES = {"invoke", "lease"}


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
    now: datetime | None = None,
) -> ApprovalRequestModel:
    repo = ApprovalRequestRepository(session)
    approval = _require_existing(repo, approval_id)
    _require_pending_state(approval, operation="approve")
    current_time = _utc_now() if now is None else now
    approval.status = "approved"
    approval.decided_by = decided_by
    approval.expires_at = current_time + timedelta(seconds=APPROVAL_TTL_SECONDS)
    return repo.update(approval)


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
    approval.status = "rejected"
    approval.reason = reason
    approval.decided_by = decided_by
    approval.expires_at = None
    return repo.update(approval)


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
    return repo.create(model)


def _validate_mode(mode: str, *, field_name: str) -> None:
    if mode not in _VALID_MODES:
        raise ValueError(f"Unsupported {field_name}: {mode}")


def _validate_action_type(action_type: str) -> None:
    if action_type not in _VALID_ACTION_TYPES:
        raise ValueError(f"Unsupported action_type: {action_type}")


def _require_existing(repo: ApprovalRequestRepository, approval_id: str) -> ApprovalRequestModel:
    approval = repo.get(approval_id)
    if approval is None:
        raise KeyError(f"Approval request {approval_id} not found")
    return approval


def _require_pending_state(approval: ApprovalRequestModel, *, operation: str) -> None:
    if approval.status != "pending":
        raise ValueError(f"Cannot {operation} approval request in status '{approval.status}'")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)
