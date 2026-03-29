def test_task_targets_can_be_claimed_and_completed_by_the_assigned_token(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Assigned token work",
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
    target = assigned.json()["items"][0]
    assert target["task_id"] == created.json()["id"]
    assert target["target_token_id"] == "token-test-agent"

    claimed = client.post(
        f"/api/task-targets/{target['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["status"] == "claimed"
    assert claimed.json()["claimed_by_token_id"] == "token-test-agent"

    completed = client.post(
        f"/api/task-targets/{target['id']}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "completed"
