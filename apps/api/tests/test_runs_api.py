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


def test_runs_listing_supports_limit_and_offset(client, management_client):
    for idx in range(3):
        task = management_client.post(
            "/api/tasks",
            json={
                "title": f"Paged run task {idx}",
                "task_type": "config_sync",
                "input": {"provider": f"provider-{idx}"},
                "required_capability_ids": [],
                "lease_allowed": False,
            },
        ).json()
        claim = client.post(
            f"/api/tasks/{task['id']}/claim",
            headers={"Authorization": "Bearer agent-test-token"},
        )
        assert claim.status_code == 200, claim.text
        complete = client.post(
            f"/api/tasks/{task['id']}/complete",
            headers={"Authorization": "Bearer agent-test-token"},
            json={"result_summary": f"Done {idx}", "output_payload": {"ok": True}},
        )
        assert complete.status_code == 200, complete.text

    full_response = management_client.get("/api/runs")
    assert full_response.status_code == 200, full_response.text
    expected_ids = [item["id"] for item in full_response.json()["items"][1:3]]

    response = management_client.get(
        "/api/runs",
        params={"limit": 2, "offset": 1},
    )

    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()["items"]] == expected_ids
