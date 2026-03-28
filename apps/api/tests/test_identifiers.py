from app.services.identifiers import new_resource_id


def test_new_resource_id_uses_prefix_and_unique_suffix():
    first = new_resource_id("task")
    second = new_resource_id("task")

    assert first.startswith("task-")
    assert second.startswith("task-")
    assert first != second
    assert first != "task-1"


def test_agent_ids_do_not_reuse_deleted_suffixes(management_client):
    first = management_client.post(
        "/api/agents",
        json={"name": "First Agent", "risk_tier": "low"},
    )
    assert first.status_code == 201
    first_id = first.json()["id"]

    deleted = management_client.delete(f"/api/agents/{first_id}")
    assert deleted.status_code == 200

    second = management_client.post(
        "/api/agents",
        json={"name": "Second Agent", "risk_tier": "low"},
    )
    assert second.status_code == 201
    second_id = second.json()["id"]

    assert first_id.startswith("agent-")
    assert second_id.startswith("agent-")
    assert second_id != first_id
