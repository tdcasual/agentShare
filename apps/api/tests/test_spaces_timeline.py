from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.services.event_service import record_event
from app.services.space_service import _append_timeline_entry


def _create_space_with_agent_member(management_client, agent_id: str = "test-agent") -> str:
    created = management_client.post(
        "/api/spaces",
        json={"name": "Ops Space", "summary": "Coordinate operational work"},
    )
    assert created.status_code == 201, created.text
    space_id = created.json()["id"]

    attached = management_client.post(
        f"/api/spaces/{space_id}/members",
        json={"member_type": "agent", "member_id": agent_id, "role": "participant"},
    )
    assert attached.status_code == 201, attached.text
    return space_id


def test_task_completion_projects_into_space_timeline(client, management_client):
    space_id = _create_space_with_agent_member(management_client)

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Fetch account status",
            "task_type": "account_read",
            "input": {"provider": "qq"},
            "required_capability_ids": [],
            "lease_allowed": False,
        },
    )
    assert created.status_code == 201, created.text
    task_id = created.json()["id"]

    claimed = client.post(
        f"/api/tasks/{task_id}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claimed.status_code == 200, claimed.text

    completed = client.post(
        f"/api/tasks/{task_id}/complete",
        headers={"Authorization": "Bearer access-test-token"},
        json={"result_summary": "Configuration synced", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200, completed.text

    space = management_client.get(f"/api/spaces/{space_id}")
    assert space.status_code == 200, space.text
    assert any(
        item["entry_type"] == "task_completed"
        and item["subject_type"] == "task"
        and item["subject_id"] == task_id
        for item in space.json()["timeline"]
    )


def test_review_approval_projects_into_space_timeline(client, management_client):
    space_id = _create_space_with_agent_member(management_client)

    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "display_name": "Timeline Secret",
            "kind": "api_token",
            "value": "sk-timeline-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    approved = management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={})
    assert approved.status_code == 200, approved.text

    space = management_client.get(f"/api/spaces/{space_id}")
    assert space.status_code == 200, space.text
    assert any(
        item["entry_type"] == "review_approved"
        and item["subject_type"] == "secret"
        and item["subject_id"] == secret.json()["id"]
        for item in space.json()["timeline"]
    )


def test_record_event_projects_once_per_matching_space(db_session, management_client):
    space_id = _create_space_with_agent_member(management_client)

    first = record_event(
        db_session,
        event_type="task_completed",
        actor_type="agent",
        actor_id="test-agent",
        subject_type="task",
        subject_id="task-dedup",
        summary="Test Agent completed task-dedup",
    )
    second = record_event(
        db_session,
        event_type="task_completed",
        actor_type="agent",
        actor_id="test-agent",
        subject_type="task",
        subject_id="task-dedup",
        summary="Test Agent completed task-dedup",
    )
    db_session.commit()

    assert first["subject_id"] == second["subject_id"]

    space = management_client.get(f"/api/spaces/{space_id}")
    assert space.status_code == 200, space.text
    matching = [
        item for item in space.json()["timeline"]
        if item["entry_type"] == "task_completed" and item["subject_id"] == "task-dedup"
    ]
    assert len(matching) == 1


def test_append_timeline_entry_reuses_existing_row_after_unique_conflict():
    existing = object()

    class FakeRepo:
        def find_timeline_entry(self, **kwargs):
            if getattr(self, "created_once", False):
                return existing
            return None

        def create_timeline_entry(self, model):
            self.created_once = True
            raise IntegrityError("insert", {}, Exception("duplicate timeline row"))

    repo = FakeRepo()

    created = _append_timeline_entry(
        repo,
        space_id="space-1",
        entry_type="task_completed",
        subject_type="task",
        subject_id="task-1",
        summary="done",
    )

    assert created is existing
