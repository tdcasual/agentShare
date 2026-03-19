from conftest import BOOTSTRAP_AGENT_KEY


def test_completed_task_creates_run_record(client):
    task = client.post(
        "/api/tasks",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
            "required_capability_ids": [],
            "lease_allowed": False,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    client.post(
        f"/api/tasks/{task['id']}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "Done", "output_payload": {"ok": True}},
    )

    response = client.get(
        "/api/runs",
        headers={"Authorization": f"Bearer {BOOTSTRAP_AGENT_KEY}"},
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["task_id"] == task["id"]
