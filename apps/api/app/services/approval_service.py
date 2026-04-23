from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from time import time_ns
from typing import Literal
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError
from app.orm.approval_request import ApprovalRequestModel
from app.observability import record_approval_decision, record_approval_requested
from app.repositories.approval_repo import ApprovalRequestRepository
from app.services.audit_service import write_audit_event
from app.services.policy_service import PolicyContext, evaluate_policy
from app.services.redis_client import acquire_lock, release_lock

logger = logging.getLogger(__name__)

ApprovalMode = Literal["auto", "manual"]
ApprovalActionType = Literal["invoke", "lease"]
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]

APPROVAL_TTL_SECONDS = 900

_VALID_MODES = {"auto", "manual"}
_VALID_ACTION_TYPES = {"invoke", "lease"}
_VALID_STATUSES = {"pending", "approved", "rejected", "expired"}


class ApprovalRequiredError(RuntimeError):
    def __init__(self, approval: ApprovalRequestModel, action_type: str) -> None:
        self.approval = approval
        self.action_type = action_type
        super().__init__("Approval required")

    @property
    def detail(self) -> dict:
        return {
            "code": "approval_required",
            "approval_request_id": self.approval.id,
            "status": self.approval.status,
            "action_type": self.action_type,
            "policy_reason": self.approval.policy_reason,
            "policy_source": self.approval.policy_source,
        }


class PolicyDeniedError(PermissionError):
    def __init__(self, *, action_type: str, policy_reason: str, policy_source: str) -> None:
        self.action_type = action_type
        self.policy_reason = policy_reason
        self.policy_source = policy_source
        super().__init__(policy_reason)

    @property
    def detail(self) -> dict:
        return {
            "code": "policy_denied",
            "action_type": self.action_type,
            "policy_reason": self.policy_reason,
            "policy_source": self.policy_source,
        }


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
    token_id: str | None = None,
    task_target_id: str | None = None,
    action_type: str,
    task_approval_mode: str,
    capability_approval_mode: str,
    task_rules: list[dict] | None = None,
    capability_rules: list[dict] | None = None,
    context: PolicyContext | dict | None = None,
) -> ApprovalRequestModel | None:
    _validate_action_type(action_type)
    outcome = evaluate_policy(
        task_rules=task_rules or [],
        capability_rules=capability_rules or [],
        context=_coerce_context(context, action_type),
        task_approval_mode=task_approval_mode,
        capability_approval_mode=capability_approval_mode,
    )
    if outcome.decision == "allow":
        return None
    if outcome.decision == "deny":
        raise PolicyDeniedError(
            action_type=action_type,
            policy_reason=outcome.reason,
            policy_source=outcome.source,
        )

    repo = ApprovalRequestRepository(session)
    approval_scope = _approval_scope(
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        token_id=token_id,
        task_target_id=task_target_id,
        action_type=action_type,
    )
    latest = _get_latest_request(
        repo=repo,
        session=session,
        **approval_scope,
    )
    if latest is None:
        return _create_pending_request_with_dedupe(
            session=session,
            repo=repo,
            **approval_scope,
            policy_reason=outcome.reason,
            policy_source=outcome.source,
        )
    if latest.status == "approved":
        return None
    if latest.status == "pending":
        return latest

    return _create_pending_request_with_dedupe(
        session=session,
        repo=repo,
        **approval_scope,
        policy_reason=outcome.reason,
        policy_source=outcome.source,
    )


def approve_request(
    *,
    session: Session,
    approval_id: str,
    decided_by: str,
    reason: str = "",
    now: datetime | None = None,
) -> ApprovalRequestModel:
    lock_key = f"approval:{approval_id}:decide"
    lock_token = acquire_lock(lock_key, ttl_seconds=10)
    if not lock_token:
        raise ConflictError("Approval decision is being processed by another operator")
    try:
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
        record_approval_decision(True)
        _write_audit_event_best_effort(session, "approval_approved", {
            "approval_id": updated.id,
            "task_id": updated.task_id,
            "capability_id": updated.capability_id,
            "agent_id": updated.agent_id,
            "action_type": updated.action_type,
            "decided_by": decided_by,
        })
        return updated
    finally:
        release_lock(lock_key, lock_token)


def reject_request(
    *,
    session: Session,
    approval_id: str,
    decided_by: str,
    reason: str = "",
) -> ApprovalRequestModel:
    lock_key = f"approval:{approval_id}:decide"
    lock_token = acquire_lock(lock_key, ttl_seconds=10)
    if not lock_token:
        raise ConflictError("Approval decision is being processed by another operator")
    try:
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
        record_approval_decision(False)
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
    finally:
        release_lock(lock_key, lock_token)


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
        "token_id": model.token_id,
        "task_target_id": model.task_target_id,
        "action_type": model.action_type,
        "status": model.status,
        "reason": model.reason,
        "policy_reason": model.policy_reason,
        "policy_source": model.policy_source,
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

    current_time = _normalize_datetime(_utc_now() if now is None else now)
    expires_at = _normalize_datetime(approval.expires_at)
    if expires_at > current_time:
        return approval

    approval.status = "expired"
    return ApprovalRequestRepository(session).update(approval)


def _create_pending_request(
    *,
    repo: ApprovalRequestRepository,
    task_id: str,
    capability_id: str,
    agent_id: str,
    token_id: str,
    task_target_id: str,
    action_type: str,
    policy_reason: str,
    policy_source: str,
) -> ApprovalRequestModel:
    model = ApprovalRequestModel(
        id=_new_approval_id(),
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        token_id=token_id,
        task_target_id=task_target_id,
        action_type=action_type,
        status="pending",
        reason="Awaiting manual approval",
        policy_reason=policy_reason,
        policy_source=policy_source,
        requested_by=agent_id,
    )
    created = repo.create(model)
    record_approval_requested()
    _write_audit_event_best_effort(repo.session, "approval_requested", {
        "approval_id": created.id,
        "task_id": created.task_id,
        "capability_id": created.capability_id,
        "agent_id": created.agent_id,
        "action_type": created.action_type,
        "requested_by": created.requested_by,
    })
    return created


def _get_latest_request(
    *,
    repo: ApprovalRequestRepository,
    session: Session,
    task_id: str,
    capability_id: str,
    agent_id: str,
    token_id: str,
    task_target_id: str,
    action_type: str,
) -> ApprovalRequestModel | None:
    latest = repo.get_latest_for_scope(
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        token_id=token_id,
        task_target_id=task_target_id,
        action_type=action_type,
    )
    if latest is None:
        return None

    return expire_request_if_needed(session=session, approval=latest)


def _create_pending_request_with_dedupe(
    *,
    session: Session,
    repo: ApprovalRequestRepository,
    task_id: str,
    capability_id: str,
    agent_id: str,
    token_id: str,
    task_target_id: str,
    action_type: str,
    policy_reason: str,
    policy_source: str,
) -> ApprovalRequestModel:
    try:
        with session.begin_nested():
            return _create_pending_request(
                repo=repo,
                task_id=task_id,
                capability_id=capability_id,
                agent_id=agent_id,
                token_id=token_id,
                task_target_id=task_target_id,
                action_type=action_type,
                policy_reason=policy_reason,
                policy_source=policy_source,
            )
    except IntegrityError:
        latest = repo.get_latest_for_scope(
            task_id=task_id,
            capability_id=capability_id,
            agent_id=agent_id,
            token_id=token_id,
            task_target_id=task_target_id,
            action_type=action_type,
        )
        if latest is not None and latest.status == "pending":
            return latest
        raise


def _approval_scope(
    *,
    task_id: str,
    capability_id: str,
    agent_id: str,
    token_id: str | None,
    task_target_id: str | None,
    action_type: str,
) -> dict[str, str]:
    return {
        "task_id": task_id,
        "capability_id": capability_id,
        "agent_id": agent_id,
        "token_id": token_id or "",
        "task_target_id": task_target_id or "",
        "action_type": action_type,
    }


def _coerce_context(context: PolicyContext | dict | None, action_type: str) -> PolicyContext:
    if isinstance(context, PolicyContext):
        return context
    if isinstance(context, dict):
        return PolicyContext(
            action_type=context.get("action_type", action_type),
            risk_level=context.get("risk_level", ""),
            provider=context.get("provider"),
            environment=context.get("environment"),
            task_type=context.get("task_type", ""),
            capability_name=context.get("capability_name", ""),
        )
    return PolicyContext(
        action_type=action_type,
        risk_level="",
        provider=None,
        environment=None,
        task_type="",
        capability_name="",
    )


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
    return _normalize_datetime(model.created_at), model.id


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _new_approval_id() -> str:
    return f"approval-{time_ns():020d}-{uuid4().hex[:12]}"


def _write_audit_event_best_effort(session: Session, event_type: str, payload: dict) -> None:
    try:
        with session.begin_nested():
            write_audit_event(session, event_type, payload)
    except Exception:
        logger.exception("Failed to write approval audit event", extra={"event_type": event_type})


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)
