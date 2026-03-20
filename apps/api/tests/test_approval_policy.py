from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import UUID

import pytest
from sqlalchemy import text

from app.repositories.approval_repo import ApprovalRequestRepository
from app.services.approval_service import (
    APPROVAL_TTL_SECONDS,
    approve_request,
    approval_required,
    expire_request_if_needed,
    list_approval_requests,
    reject_request,
    require_runtime_approval,
)
from app.schemas.tasks import TaskCreate
from app.services.task_service import claim_task, complete_task, create_task
from app.models.agent import AgentIdentity


def test_approval_required_only_when_task_or_capability_manual():
    assert approval_required("auto", "auto") is False
    assert approval_required("manual", "auto") is True
    assert approval_required("auto", "manual") is True
    assert approval_required("manual", "manual") is True


def test_require_runtime_approval_bypasses_auto_auto_mode(db_session):
    approval = require_runtime_approval(
        session=db_session,
        task_id="task-1",
        capability_id="capability-1",
        agent_id="agent-1",
        action_type="invoke",
        task_approval_mode="auto",
        capability_approval_mode="auto",
    )

    assert approval is None
    assert ApprovalRequestRepository(db_session).list_all() == []


def test_require_runtime_approval_creates_and_reuses_pending_request(db_session):
    created = require_runtime_approval(
        session=db_session,
        task_id="task-1",
        capability_id="capability-1",
        agent_id="agent-1",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    reused = require_runtime_approval(
        session=db_session,
        task_id="task-1",
        capability_id="capability-1",
        agent_id="agent-1",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )

    assert created is not None
    assert created.status == "pending"
    assert reused is not None
    assert reused.id == created.id
    assert len(ApprovalRequestRepository(db_session).list_all()) == 1


def test_approve_and_reject_update_status_and_metadata(db_session):
    pending_for_approve = require_runtime_approval(
        session=db_session,
        task_id="task-2",
        capability_id="capability-2",
        agent_id="agent-2",
        action_type="lease",
        task_approval_mode="auto",
        capability_approval_mode="manual",
    )
    assert pending_for_approve is not None

    approved = approve_request(
        session=db_session,
        approval_id=pending_for_approve.id,
        decided_by="management",
    )
    assert approved.status == "approved"
    assert approved.decided_by == "management"
    assert approved.expires_at is not None
    now = datetime.now(timezone.utc)
    assert approved.expires_at >= now + timedelta(seconds=APPROVAL_TTL_SECONDS - 3)
    assert approved.expires_at <= now + timedelta(seconds=APPROVAL_TTL_SECONDS + 3)

    pending_for_reject = require_runtime_approval(
        session=db_session,
        task_id="task-2b",
        capability_id="capability-2b",
        agent_id="agent-2b",
        action_type="lease",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending_for_reject is not None

    rejected = reject_request(
        session=db_session,
        approval_id=pending_for_reject.id,
        decided_by="management",
        reason="Policy denied",
    )
    assert rejected.status == "rejected"
    assert rejected.reason == "Policy denied"
    assert rejected.decided_by == "management"


def test_expire_request_if_needed_marks_stale_approval_as_expired(db_session):
    pending = require_runtime_approval(
        session=db_session,
        task_id="task-3",
        capability_id="capability-3",
        agent_id="agent-3",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending is not None

    approved = approve_request(
        session=db_session,
        approval_id=pending.id,
        decided_by="management",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    assert approved.status == "approved"

    expired = expire_request_if_needed(
        session=db_session,
        approval=approved,
        now=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=APPROVAL_TTL_SECONDS + 1),
    )

    assert expired.status == "expired"


def test_list_approval_requests_materializes_expired_status_before_filtering(db_session):
    pending = require_runtime_approval(
        session=db_session,
        task_id="task-expire-list",
        capability_id="capability-expire-list",
        agent_id="agent-expire-list",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending is not None

    approve_request(
        session=db_session,
        approval_id=pending.id,
        decided_by="management",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    approved_items = list_approval_requests(
        session=db_session,
        status="approved",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=APPROVAL_TTL_SECONDS + 1),
    )
    expired_items = list_approval_requests(
        session=db_session,
        status="expired",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=APPROVAL_TTL_SECONDS + 1),
    )

    assert approved_items == []
    assert [item.id for item in expired_items] == [pending.id]
    assert expired_items[0].status == "expired"


def test_list_approval_requests_handles_reloaded_expiry_timestamps(db_session):
    pending = require_runtime_approval(
        session=db_session,
        task_id="task-expire-reload",
        capability_id="capability-expire-reload",
        agent_id="agent-expire-reload",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending is not None

    approve_request(
        session=db_session,
        approval_id=pending.id,
        decided_by="management",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    approval_id = pending.id
    db_session.expunge_all()

    expired_items = list_approval_requests(
        session=db_session,
        status="expired",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=APPROVAL_TTL_SECONDS + 1),
    )

    assert [item.id for item in expired_items] == [approval_id]


def test_require_runtime_approval_replaces_rejected_and_expired_records(db_session):
    initial = require_runtime_approval(
        session=db_session,
        task_id="task-4",
        capability_id="capability-4",
        agent_id="agent-4",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert initial is not None

    reject_request(
        session=db_session,
        approval_id=initial.id,
        decided_by="management",
        reason="Denied once",
    )

    after_reject = require_runtime_approval(
        session=db_session,
        task_id="task-4",
        capability_id="capability-4",
        agent_id="agent-4",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert after_reject is not None
    assert after_reject.id != initial.id
    assert after_reject.status == "pending"

    approved = approve_request(
        session=db_session,
        approval_id=after_reject.id,
        decided_by="management",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    expired = expire_request_if_needed(
        session=db_session,
        approval=approved,
        now=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=APPROVAL_TTL_SECONDS + 1),
    )
    assert expired.status == "expired"

    after_expire = require_runtime_approval(
        session=db_session,
        task_id="task-4",
        capability_id="capability-4",
        agent_id="agent-4",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert after_expire is not None
    assert after_expire.id != after_reject.id
    assert after_expire.status == "pending"


def test_list_approval_requests_uses_id_tiebreaker_for_same_timestamp_records(db_session):
    repo = ApprovalRequestRepository(db_session)
    fixed_time = datetime(2026, 1, 2, tzinfo=timezone.utc)

    with patch(
        "app.services.approval_service.uuid4",
        side_effect=[
            UUID("00000000-0000-0000-0000-00000000000a"),
            UUID("00000000-0000-0000-0000-00000000000b"),
        ],
    ), patch(
        "app.services.approval_service.time_ns",
        side_effect=[10, 11],
    ):
        first = require_runtime_approval(
            session=db_session,
            task_id="task-order-a",
            capability_id="capability-order-a",
            agent_id="agent-order-a",
            action_type="invoke",
            task_approval_mode="manual",
            capability_approval_mode="auto",
        )
        second = require_runtime_approval(
            session=db_session,
            task_id="task-order-b",
            capability_id="capability-order-b",
            agent_id="agent-order-b",
            action_type="invoke",
            task_approval_mode="manual",
            capability_approval_mode="auto",
        )

    assert first is not None
    assert second is not None
    first.created_at = fixed_time
    second.created_at = fixed_time
    repo.update(first)
    repo.update(second)

    listed = list_approval_requests(session=db_session)

    assert [item.id for item in listed[:2]] == [second.id, first.id]


def test_approval_service_rejects_invalid_modes_and_action_type(db_session):
    with pytest.raises(ValueError):
        approval_required("manual", "sometimes")

    with pytest.raises(ValueError):
        require_runtime_approval(
            session=db_session,
            task_id="task-invalid",
            capability_id="capability-invalid",
            agent_id="agent-invalid",
            action_type="delete",
            task_approval_mode="manual",
            capability_approval_mode="auto",
        )


@patch("app.services.approval_service.write_audit_event")
def test_require_runtime_approval_still_returns_pending_when_audit_write_fails(mock_audit, db_session):
    mock_audit.side_effect = RuntimeError("audit unavailable")

    approval = require_runtime_approval(
        session=db_session,
        task_id="task-audit-failure",
        capability_id="capability-audit-failure",
        agent_id="agent-audit-failure",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )

    assert approval is not None
    assert approval.status == "pending"
    assert ApprovalRequestRepository(db_session).get(approval.id) is not None


@patch("app.services.approval_service.write_audit_event")
def test_require_runtime_approval_keeps_session_usable_when_audit_flush_fails(mock_audit, db_session):
    def _fail_inside_database(session, event_type, payload):
        del event_type, payload
        session.execute(text("INSERT INTO missing_audit_table DEFAULT VALUES"))

    mock_audit.side_effect = _fail_inside_database

    approval = require_runtime_approval(
        session=db_session,
        task_id="task-audit-db-failure",
        capability_id="capability-audit-db-failure",
        agent_id="agent-audit-db-failure",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )

    assert approval is not None
    db_session.commit()
    assert ApprovalRequestRepository(db_session).get(approval.id) is not None


def test_approval_service_rejects_invalid_state_transitions(db_session):
    pending = require_runtime_approval(
        session=db_session,
        task_id="task-state",
        capability_id="capability-state",
        agent_id="agent-state",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending is not None

    approved = approve_request(
        session=db_session,
        approval_id=pending.id,
        decided_by="management",
    )
    assert approved.status == "approved"

    with pytest.raises(ValueError):
        approve_request(
            session=db_session,
            approval_id=pending.id,
            decided_by="management",
        )

    with pytest.raises(ValueError):
        reject_request(
            session=db_session,
            approval_id=pending.id,
            decided_by="management",
            reason="Cannot reject approved request",
        )

    pending_for_reject = require_runtime_approval(
        session=db_session,
        task_id="task-state-reject",
        capability_id="capability-state-reject",
        agent_id="agent-state-reject",
        action_type="lease",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert pending_for_reject is not None

    rejected = reject_request(
        session=db_session,
        approval_id=pending_for_reject.id,
        decided_by="management",
        reason="Denied by policy",
    )
    assert rejected.status == "rejected"

    with pytest.raises(ValueError):
        reject_request(
            session=db_session,
            approval_id=pending_for_reject.id,
            decided_by="management",
            reason="Already rejected",
        )

    with pytest.raises(ValueError):
        approve_request(
            session=db_session,
            approval_id=pending_for_reject.id,
            decided_by="management",
        )


def test_task_completion_expires_pending_and_approved_requests(db_session):
    agent = AgentIdentity(
        id="agent-expire",
        name="Agent Expire",
        issuer="test",
        auth_method="test",
        allowed_task_types=["config_sync"],
    )
    task = create_task(
        db_session,
        TaskCreate(
            title="Expire approvals",
            task_type="config_sync",
            required_capability_ids=["capability-1"],
        ),
    )
    claim_task(db_session, task["id"], agent)

    pending = require_runtime_approval(
        session=db_session,
        task_id=task["id"],
        capability_id="capability-1",
        agent_id=agent.id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    approved_pending = require_runtime_approval(
        session=db_session,
        task_id=task["id"],
        capability_id="capability-2",
        agent_id=agent.id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    approved = approve_request(
        session=db_session,
        approval_id=approved_pending.id,
        decided_by="management",
    )

    assert pending.status == "pending"
    assert approved.status == "approved"

    complete_task(
        db_session,
        task["id"],
        agent,
        "done",
        {"ok": True},
    )

    repo = ApprovalRequestRepository(db_session)
    assert repo.get(pending.id).status == "expired"
    assert repo.get(approved.id).status == "expired"
