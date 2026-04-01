from app.services.event_service import record_event


def test_management_can_list_persisted_events(management_client):
    response = management_client.get("/api/events")

    assert response.status_code == 200, response.text
    assert response.json() == {"items": []}


def test_management_can_mark_an_event_read(management_client, db_session):
    event = record_event(
        db_session,
        event_type="task_completed",
        actor_type="agent",
        actor_id="test-agent",
        subject_type="task",
        subject_id="task-123",
        summary="Analyzer Agent completed task-123",
    )
    db_session.commit()

    listed = management_client.get("/api/events")

    assert listed.status_code == 200, listed.text
    event_id = listed.json()["items"][0]["id"]
    assert event_id == event["id"]
    assert listed.json()["items"][0]["read_at"] is None
    assert listed.json()["items"][0]["action_url"] == "/tasks?taskId=task-123"

    marked = management_client.post(f"/api/events/{event_id}/read")

    assert marked.status_code == 200, marked.text
    assert marked.json()["id"] == event_id
    assert marked.json()["read_at"] is not None


def test_task_target_completion_creates_event(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Inbox event task",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201, created.text

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert assigned.status_code == 200, assigned.text
    target_id = assigned.json()["items"][0]["id"]

    claimed = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claimed.status_code == 200, claimed.text

    completed = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200, completed.text

    events = management_client.get("/api/events")

    assert events.status_code == 200, events.text
    assert any(
        item["event_type"] == "task_completed"
        and item["action_url"] == f"/tasks?taskId={created.json()['id']}"
        for item in events.json()["items"]
    )
