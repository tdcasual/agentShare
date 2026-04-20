from conftest import TEST_ACCESS_TOKEN_ID, TEST_ACCESS_TOKEN_KEY


def test_task_targets_can_be_claimed_and_completed_by_the_assigned_token(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Assigned token work",
            "task_type": "account_read",
            "target_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201, created.text

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert assigned.status_code == 200, assigned.text
    target = assigned.json()["items"][0]
    assert target["task_id"] == created.json()["id"]
    assert target["target_token_id"] == TEST_ACCESS_TOKEN_ID

    claimed = client.post(
        f"/api/task-targets/{target['id']}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["status"] == "claimed"
    assert claimed.json()["claimed_by_token_id"] == TEST_ACCESS_TOKEN_ID

    completed = client.post(
        f"/api/task-targets/{target['id']}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "completed"
