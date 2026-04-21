from app.services.identifiers import new_resource_id


def test_new_resource_id_uses_prefix_and_unique_suffix():
    first = new_resource_id("task")
    second = new_resource_id("task")

    assert first.startswith("task-")
    assert second.startswith("task-")
    assert first != second
    assert first != "task-1"


def test_access_token_ids_do_not_reuse_revoked_suffixes(owner_management_client):
    first = owner_management_client.post(
        "/api/access-tokens",
        json={"display_name": "First Token", "subject_type": "automation", "subject_id": "runner-1"},
    )
    assert first.status_code == 201
    first_id = first.json()["id"]

    revoked = owner_management_client.post(f"/api/access-tokens/{first_id}/revoke")
    assert revoked.status_code == 200

    second = owner_management_client.post(
        "/api/access-tokens",
        json={"display_name": "Second Token", "subject_type": "automation", "subject_id": "runner-2"},
    )
    assert second.status_code == 201
    second_id = second.json()["id"]

    assert first_id.startswith("access-token-") or first_id.startswith("at-")
    assert second_id.startswith("access-token-") or second_id.startswith("at-")
    assert second_id != first_id
