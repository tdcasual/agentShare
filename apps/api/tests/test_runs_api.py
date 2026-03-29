def test_completed_task_creates_run_record(client, management_client):
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
            "required_capability_ids": [],
            "lease_allowed": False,
        },
    ).json()
    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert assigned.status_code == 200
    target_id = assigned.json()["items"][0]["id"]
    client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "Done", "output_payload": {"ok": True}},
    )

    response = management_client.get("/api/runs")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["task_id"] == task["id"]
    assert items[0]["token_id"] == "token-test-agent"
    assert items[0]["task_target_id"] == target_id
