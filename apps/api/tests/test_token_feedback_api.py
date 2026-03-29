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
