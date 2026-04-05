from conftest import TEST_SETTINGS

from app.errors import ServiceUnavailableError


def test_agent_can_claim_eligible_task(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
            "required_capability_ids": ["qq.account.configure"],
            "lease_allowed": False,
        },
    )
    created_id = created.json()["id"]

    response = client.post(
        f"/api/tasks/{created_id}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert created_id.startswith("task-")
    assert created_id != "task-1"
    assert response.status_code == 200
    assert response.json()["status"] == "claimed"
    assert response.json()["claimed_by"] == "test-agent"


def test_agent_claim_uses_runtime_settings_for_redis_lock(client, management_client, monkeypatch):
    captured: list[str] = []

    def fake_acquire_lock(key: str, ttl_seconds: int, settings):
        captured.append(settings.redis_url)
        return True

    def fake_release_lock(key: str, settings):
        captured.append(settings.redis_url)

    monkeypatch.setattr("app.services.task_service.acquire_lock", fake_acquire_lock)
    monkeypatch.setattr("app.services.task_service.release_lock", fake_release_lock)

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Runtime lock claim",
            "task_type": "config_sync",
        },
    )

    response = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 200
    assert captured == [TEST_SETTINGS.redis_url, TEST_SETTINGS.redis_url]


def test_agent_claim_returns_503_when_coordination_is_unavailable(client, management_client, monkeypatch):
    def fail_acquire_lock(key: str, ttl_seconds: int, settings):
        del key, ttl_seconds, settings
        raise ServiceUnavailableError("Runtime coordination is unavailable")

    monkeypatch.setattr("app.services.task_service.acquire_lock", fail_acquire_lock)

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Coordination blocked claim",
            "task_type": "config_sync",
        },
    ).json()

    response = client.post(
        f"/api/tasks/{created['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Runtime coordination is unavailable"}


def test_management_can_publish_task_with_playbook_references(management_client):
    playbook = management_client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync playbook",
            "task_type": "config_sync",
            "body": "Validate provider state and sync it.",
            "tags": ["qq"],
        },
    ).json()

    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
            "required_capability_ids": ["qq.account.configure"],
            "playbook_ids": [playbook["id"]],
            "lease_allowed": False,
        },
    )

    assert response.status_code == 201
    assert response.json()["playbook_ids"] == [playbook["id"]]
    assert response.json()["publication_status"] == "active"


def test_management_cannot_publish_task_with_missing_playbook_references(management_client):
    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Broken task",
            "task_type": "config_sync",
            "playbook_ids": ["playbook-missing"],
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unknown playbook reference: playbook-missing"}


def test_claiming_unknown_task_returns_clean_not_found(client):
    response = client.post(
        "/api/tasks/task-missing/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found"}


def test_agent_can_complete_claimed_task(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Fetch account status",
            "task_type": "account_read",
            "input": {"provider": "qq"},
            "required_capability_ids": [],
            "lease_allowed": False,
        },
    ).json()
    client.post(
        f"/api/tasks/{created['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/tasks/{created['id']}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "Configuration synced", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_agent_cannot_claim_task_type_outside_allowlist(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={
            "name": "Limited Agent",
            "risk_tier": "medium",
            "allowed_task_types": ["account_read"],
        },
    )
    assert created_agent.status_code == 201, created_agent.text

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
        },
    ).json()

    response = client.post(
        f"/api/tasks/{created['id']}/claim",
        headers={"Authorization": f"Bearer {created_agent.json()['api_key']}"},
    )

    assert response.status_code == 403


def test_runtime_created_task_starts_pending_review(client):
    response = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Runtime submitted task",
            "task_type": "prompt_run",
            "input": {"prompt": "hello"},
        },
    )

    assert response.status_code == 202
    assert response.json()["publication_status"] == "pending_review"


def test_runtime_pending_review_task_materializes_explicit_targets_only_after_approval(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Deferred Target Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Deferred target token"},
    )
    assert minted.status_code == 201, minted.text

    created = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Deferred targeted review task",
            "task_type": "account_read",
            "target_mode": "explicit_tokens",
            "target_token_ids": [minted.json()["id"]],
        },
    )
    assert created.status_code == 202, created.text
    assert created.json()["publication_status"] == "pending_review"
    assert created.json()["target_ids"] == []
    assert created.json()["target_token_ids"] == [minted.json()["id"]]

    assigned_before = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )
    assert assigned_before.status_code == 200, assigned_before.text
    assert assigned_before.json()["items"] == []

    approved = management_client.post(
        f"/api/reviews/task/{created.json()['id']}/approve",
        json={},
    )
    assert approved.status_code == 200, approved.text

    assigned_after = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )
    assert assigned_after.status_code == 200, assigned_after.text
    assert [item["task_id"] for item in assigned_after.json()["items"]] == [created.json()["id"]]


def test_runtime_pending_review_broadcast_task_targets_active_tokens_at_approval_time(client, management_client):
    created = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Deferred broadcast review task",
            "task_type": "account_read",
            "target_mode": "broadcast",
        },
    )
    assert created.status_code == 202, created.text
    assert created.json()["publication_status"] == "pending_review"
    assert created.json()["target_ids"] == []
    assert created.json()["target_token_ids"] == []

    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Late Join Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Late join token"},
    )
    assert minted.status_code == 201, minted.text

    approved = management_client.post(
        f"/api/reviews/task/{created.json()['id']}/approve",
        json={},
    )
    assert approved.status_code == 200, approved.text

    seeded_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    minted_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )

    assert seeded_queue.status_code == 200, seeded_queue.text
    assert minted_queue.status_code == 200, minted_queue.text
    assert {item["task_id"] for item in seeded_queue.json()["items"]} >= {created.json()["id"]}
    assert {item["task_id"] for item in minted_queue.json()["items"]} >= {created.json()["id"]}


def test_task_listing_requires_authenticated_actor(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Visible task",
            "task_type": "account_read",
        },
    )
    assert created.status_code == 201, created.text

    anonymous = client.get("/api/tasks")
    runtime = client.get(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    management = management_client.get("/api/tasks")

    assert anonymous.status_code == 401
    assert runtime.status_code == 200
    assert management.status_code == 200


def test_runtime_task_listing_only_returns_claimable_tasks_for_current_token(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Other Queue Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Other queue token"},
    )
    assert minted.status_code == 201, minted.text

    visible = management_client.post(
        "/api/tasks",
        json={
            "title": "Visible to current token",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert visible.status_code == 201, visible.text

    hidden = management_client.post(
        "/api/tasks",
        json={
            "title": "Only for other token",
            "task_type": "account_read",
            "target_token_ids": [minted.json()["id"]],
            "target_mode": "explicit_tokens",
        },
    )
    assert hidden.status_code == 201, hidden.text

    claimed = management_client.post(
        "/api/tasks",
        json={
            "title": "Already claimed by current token",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert claimed.status_code == 201, claimed.text
    claimed_response = client.post(
        f"/api/tasks/{claimed.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claimed_response.status_code == 200, claimed_response.text

    runtime = client.get(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert runtime.status_code == 200, runtime.text
    assert [item["title"] for item in runtime.json()["items"]] == ["Visible to current token"]
    assert runtime.json()["items"][0]["target_token_ids"] == ["token-test-agent"]


def test_task_creation_rejects_broadcast_mode_with_explicit_target_tokens(management_client):
    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Conflicting target mode",
            "task_type": "account_read",
            "target_mode": "broadcast",
            "target_token_ids": ["token-test-agent"],
        },
    )

    assert response.status_code == 422


def test_untargeted_token_cannot_claim_explicitly_targeted_task(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Targeted Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Only target token"},
    )
    assert minted.status_code == 201, minted.text

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Explicitly targeted work",
            "task_type": "account_read",
            "target_token_ids": [minted.json()["id"]],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201, created.text

    response = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 403


def test_completed_target_cannot_be_completed_twice(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "One-shot target",
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

    first = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    second = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done again", "output_payload": {"ok": True}},
    )

    assert first.status_code == 200, first.text
    assert second.status_code == 409

    runs = management_client.get("/api/runs")
    assert runs.status_code == 200, runs.text
    assert len(runs.json()["items"]) == 1


def test_completed_target_disappears_from_assigned_queue(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Queue cleanup target",
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

    claim = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert claim.status_code == 200, claim.text

    complete = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert complete.status_code == 200, complete.text

    refreshed = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["items"] == []


def test_duplicate_target_tokens_are_rejected(client, management_client):
    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Bad explicit targets",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent", "token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )

    assert response.status_code == 422


def test_runtime_assigned_queue_only_returns_tasks_for_current_token(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Queue Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Queue token"},
    )
    assert minted.status_code == 201, minted.text

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Token-targeted work",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent", minted.json()["id"]],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201, created.text

    seeded_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    minted_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )

    assert seeded_queue.status_code == 200
    assert {item["target_token_id"] for item in seeded_queue.json()["items"]} == {"token-test-agent"}
    assert minted_queue.status_code == 200
    assert {item["target_token_id"] for item in minted_queue.json()["items"]} == {minted.json()["id"]}


def test_multi_target_task_clears_parent_claimed_by_when_multiple_agents_claim_it(client, management_client):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Parallel Claim Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    minted = management_client.post(
        f"/api/agents/{created_agent.json()['id']}/tokens",
        json={"display_name": "Parallel claim token"},
    )
    assert minted.status_code == 201, minted.text

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Parallel claim task",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent", minted.json()["id"]],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201, created.text

    first_claim = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )
    assert first_claim.status_code == 200, first_claim.text

    second_claim = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": f"Bearer {minted.json()['api_key']}"},
    )
    assert second_claim.status_code == 200, second_claim.text

    listed = management_client.get("/api/tasks")
    assert listed.status_code == 200, listed.text
    task = next(item for item in listed.json()["items"] if item["id"] == created.json()["id"])

    assert task["status"] == "claimed"
    assert task["claimed_by"] is None
