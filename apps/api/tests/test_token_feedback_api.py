def _create_completed_target(client, management_client) -> tuple[str, str]:
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Feedback target",
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
    return target_id, completed.json()["last_run_id"]


def test_feedback_is_linked_to_token_target_and_run(client, management_client):
    target_id, run_id = _create_completed_target(client, management_client)

    feedback = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )

    assert feedback.status_code == 201, feedback.text
    payload = feedback.json()
    assert payload["token_id"] == "token-test-agent"
    assert payload["task_target_id"] == target_id
    assert payload["run_id"] == run_id


def test_feedback_rolls_up_to_token_metrics(client, management_client):
    target_id, _ = _create_completed_target(client, management_client)

    created = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )
    assert created.status_code == 201, created.text

    tokens = management_client.get("/api/agents/test-agent/tokens")
    assert tokens.status_code == 200, tokens.text
    token = next(item for item in tokens.json()["items"] if item["id"] == "token-test-agent")
    assert token["completed_runs"] == 1
    assert token["successful_runs"] == 1
    assert token["success_rate"] == 1.0
    assert token["last_feedback_at"] is not None
    assert token["trust_score"] == 1.0


def test_feedback_creation_emits_event(client, management_client):
    target_id, _ = _create_completed_target(client, management_client)

    created = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )

    assert created.status_code == 201, created.text

    events = management_client.get("/api/events")

    assert events.status_code == 200, events.text
    assert any(item["event_type"] == "task_feedback_posted" for item in events.json()["items"])


def test_feedback_cannot_be_created_twice_for_the_same_target(client, management_client):
    target_id, _ = _create_completed_target(client, management_client)

    first = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )
    second = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 1, "verdict": "rejected", "summary": "Duplicate"},
    )

    assert first.status_code == 201, first.text
    assert second.status_code == 409, second.text


def test_bulk_feedback_listing_groups_records_by_token(client, management_client):
    first_target_id, _ = _create_completed_target(client, management_client)
    created = management_client.post(
        f"/api/task-targets/{first_target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )
    assert created.status_code == 201, created.text

    response = management_client.get(
        "/api/token-feedback/bulk",
        params=[
            ("token_id", "token-test-agent"),
            ("token_id", "token-missing"),
        ],
    )

    assert response.status_code == 200, response.text
    payload = response.json()["items_by_token"]
    assert [item["id"] for item in payload["token-test-agent"]] == [created.json()["id"]]
    assert payload["token-missing"] == []


def test_bulk_feedback_listing_transport_uses_snake_case_fields(client, management_client):
    target_id, _ = _create_completed_target(client, management_client)
    created = management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )
    assert created.status_code == 201, created.text

    response = management_client.get(
        "/api/token-feedback/bulk",
        params=[("token_id", "token-test-agent")],
    )

    assert response.status_code == 200, response.text
    item = response.json()["items_by_token"]["token-test-agent"][0]
    assert "token_id" in item
    assert "task_target_id" in item
    assert "created_at" in item
    assert "tokenId" not in item
    assert "taskTargetId" not in item
    assert "createdAt" not in item
