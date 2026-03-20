from conftest import TEST_AGENT_KEY

from app.repositories.audit_repo import AuditEventRepository
from app.services.approval_service import require_runtime_approval


def _auth_header(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def _create_pending_approval(
    db_session,
    *,
    task_id: str,
    capability_id: str,
    agent_id: str,
    action_type: str = "invoke",
):
    approval = require_runtime_approval(
        session=db_session,
        task_id=task_id,
        capability_id=capability_id,
        agent_id=agent_id,
        action_type=action_type,
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    assert approval is not None
    return approval


def test_approval_routes_require_management_session_cookie(client, management_client, db_session):
    pending = _create_pending_approval(
        db_session,
        task_id="task-auth",
        capability_id="capability-auth",
        agent_id="agent-auth",
    )

    blocked_list = client.get("/api/approvals", headers=_auth_header(TEST_AGENT_KEY))
    assert blocked_list.status_code == 401

    allowed_list = management_client.get("/api/approvals")
    assert allowed_list.status_code == 200

    blocked_approve = client.post(
        f"/api/approvals/{pending.id}/approve",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"reason": "should be blocked"},
    )
    assert blocked_approve.status_code == 401

    blocked_reject = client.post(
        f"/api/approvals/{pending.id}/reject",
        headers=_auth_header(TEST_AGENT_KEY),
        json={"reason": "should be blocked"},
    )
    assert blocked_reject.status_code == 401


def test_list_approvals_supports_status_filter_and_newest_first(management_client, db_session):
    older = _create_pending_approval(
        db_session,
        task_id="task-list-1",
        capability_id="capability-list-1",
        agent_id="agent-list-1",
    )
    newer = _create_pending_approval(
        db_session,
        task_id="task-list-2",
        capability_id="capability-list-2",
        agent_id="agent-list-2",
    )

    management_client.post(
        f"/api/approvals/{older.id}/reject",
        json={"reason": "Older request rejected"},
    )

    listed = management_client.get("/api/approvals")
    assert listed.status_code == 200
    payload = listed.json()
    assert [item["id"] for item in payload["items"]][:2] == [newer.id, older.id]

    pending_only = management_client.get("/api/approvals", params={"status": "pending"})
    assert pending_only.status_code == 200
    assert [item["id"] for item in pending_only.json()["items"]] == [newer.id]

    rejected_only = management_client.get("/api/approvals", params={"status": "rejected"})
    assert rejected_only.status_code == 200
    assert [item["id"] for item in rejected_only.json()["items"]] == [older.id]


def test_approval_decision_routes_update_state_and_handle_errors(management_client, db_session):
    to_approve = _create_pending_approval(
        db_session,
        task_id="task-approve",
        capability_id="capability-approve",
        agent_id="agent-approve",
    )
    to_reject = _create_pending_approval(
        db_session,
        task_id="task-reject",
        capability_id="capability-reject",
        agent_id="agent-reject",
    )

    approved_response = management_client.post(
        f"/api/approvals/{to_approve.id}/approve",
        json={},
    )
    assert approved_response.status_code == 200
    approved = approved_response.json()
    assert approved["status"] == "approved"
    assert approved["decided_by"] == "management"
    assert approved["expires_at"] is not None
    assert approved["reason"] == ""

    rejected_response = management_client.post(
        f"/api/approvals/{to_reject.id}/reject",
        json={"reason": "Rejected due to scope mismatch"},
    )
    assert rejected_response.status_code == 200
    rejected = rejected_response.json()
    assert rejected["status"] == "rejected"
    assert rejected["decided_by"] == "management"
    assert rejected["reason"] == "Rejected due to scope mismatch"
    assert rejected["expires_at"] is None

    missing = management_client.post(
        "/api/approvals/approval-missing/reject",
        json={"reason": "not found"},
    )
    assert missing.status_code == 404


def test_reject_route_requires_human_readable_reason(management_client, db_session):
    pending = _create_pending_approval(
        db_session,
        task_id="task-reject-reason",
        capability_id="capability-reject-reason",
        agent_id="agent-reject-reason",
    )

    blank_reason = management_client.post(
        f"/api/approvals/{pending.id}/reject",
        json={"reason": "   "},
    )

    assert blank_reason.status_code == 422


def test_approval_routes_emit_lifecycle_audit_events(management_client, db_session):
    to_approve = _create_pending_approval(
        db_session,
        task_id="task-audit-approve",
        capability_id="capability-audit-approve",
        agent_id="agent-audit-approve",
    )
    to_reject = _create_pending_approval(
        db_session,
        task_id="task-audit-reject",
        capability_id="capability-audit-reject",
        agent_id="agent-audit-reject",
    )

    approve_response = management_client.post(
        f"/api/approvals/{to_approve.id}/approve",
        json={},
    )
    reject_response = management_client.post(
        f"/api/approvals/{to_reject.id}/reject",
        json={"reason": "Rejected by operator"},
    )

    assert approve_response.status_code == 200
    assert reject_response.status_code == 200

    approval_events = [
        event.event_type
        for event in AuditEventRepository(db_session).list_all()
        if event.event_type.startswith("approval_")
    ]
    assert approval_events.count("approval_requested") == 2
    assert approval_events.count("approval_approved") == 1
    assert approval_events.count("approval_rejected") == 1
