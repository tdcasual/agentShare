from conftest import (
    TEST_ACCESS_TOKEN_ID,
    TEST_ACCESS_TOKEN_KEY,
    TEST_SETTINGS,
)
from app.repositories.approval_repo import ApprovalRequestRepository
from app.services.approval_service import approve_request, require_runtime_approval

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
        headers={"Authorization": "Bearer access-test-token"},
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
        return "lock-token"

    def fake_release_lock(key: str, lock_token: str, settings):
        assert lock_token == "lock-token"
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
        headers={"Authorization": "Bearer access-test-token"},
    )

    assert response.status_code == 200
    assert captured == [TEST_SETTINGS.redis_url] * 4


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
        headers={"Authorization": "Bearer access-test-token"},
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
        headers={"Authorization": "Bearer access-test-token"},
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
        headers={"Authorization": "Bearer access-test-token"},
    )

    response = client.post(
        f"/api/tasks/{created['id']}/complete",
        headers={"Authorization": "Bearer access-test-token"},
        json={"result_summary": "Configuration synced", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_agent_complete_uses_runtime_settings_for_redis_lock(client, management_client, monkeypatch):
    captured: list[str] = []

    def fake_acquire_lock(key: str, ttl_seconds: int, settings):
        captured.append(settings.redis_url)
        return "lock-token"

    def fake_release_lock(key: str, lock_token: str, settings):
        assert lock_token == "lock-token"
        captured.append(settings.redis_url)

    monkeypatch.setattr("app.services.task_service.acquire_lock", fake_acquire_lock)
    monkeypatch.setattr("app.services.task_service.release_lock", fake_release_lock)

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Runtime lock complete",
            "task_type": "config_sync",
        },
    )
    assert created.status_code == 201, created.text

    claimed = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )
    assert claimed.status_code == 200, claimed.text
    captured.clear()

    response = client.post(
        f"/api/tasks/{created.json()['id']}/complete",
        headers={"Authorization": "Bearer access-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200
    assert captured == [TEST_SETTINGS.redis_url] * 4


def test_task_target_complete_uses_runtime_settings_for_redis_lock(
    client, management_client, monkeypatch
):
    captured: list[str] = []

    def fake_acquire_lock(key: str, ttl_seconds: int, settings):
        captured.append(settings.redis_url)
        return "lock-token"

    def fake_release_lock(key: str, lock_token: str, settings):
        assert lock_token == "lock-token"
        captured.append(settings.redis_url)

    monkeypatch.setattr("app.services.task_service.acquire_lock", fake_acquire_lock)
    monkeypatch.setattr("app.services.task_service.release_lock", fake_release_lock)

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Target runtime lock complete",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert assigned.status_code == 200, assigned.text
    target_id = assigned.json()["items"][0]["id"]

    claimed = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert claimed.status_code == 200, claimed.text
    captured.clear()

    response = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200
    assert captured == [TEST_SETTINGS.redis_url] * 4


def test_management_task_listing_supports_limit_and_offset(management_client):
    for idx in range(3):
        created = management_client.post(
            "/api/tasks",
            json={
                "title": f"Paged Task {idx}",
                "task_type": "account_read",
            },
        )
        assert created.status_code == 201, created.text

    full_response = management_client.get("/api/tasks")
    assert full_response.status_code == 200, full_response.text
    expected_ids = [item["id"] for item in full_response.json()["items"][1:3]]

    response = management_client.get(
        "/api/tasks",
        params={"limit": 2, "offset": 1},
    )

    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()["items"]] == expected_ids


def test_task_listing_transport_uses_snake_case_fields(management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Transport task",
            "task_type": "account_read",
            "target_mode": "explicit_access_tokens",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
        },
    )
    assert created.status_code == 201, created.text

    response = management_client.get("/api/tasks")

    assert response.status_code == 200, response.text
    item = next(entry for entry in response.json()["items"] if entry["id"] == created.json()["id"])
    assert item["task_type"] == "account_read"
    assert item["publication_status"] == "active"
    assert item["target_mode"] == "explicit_access_tokens"
    assert item["target_access_token_ids"] == [TEST_ACCESS_TOKEN_ID]
    assert "taskType" not in item
    assert "publicationStatus" not in item
    assert "targetMode" not in item
    assert "targetTokenIds" not in item


def test_runtime_created_task_starts_pending_review(client):
    response = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "title": "Runtime submitted task",
            "task_type": "prompt_run",
            "input": {"prompt": "hello"},
        },
    )

    assert response.status_code == 202
    assert response.json()["publication_status"] == "pending_review"


def test_runtime_pending_review_task_materializes_explicit_targets_only_after_approval(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(display_name="Deferred target token")

    created = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "title": "Deferred targeted review task",
            "task_type": "account_read",
            "target_mode": "explicit_access_tokens",
            "target_access_token_ids": [minted["id"]],
        },
    )
    assert created.status_code == 202, created.text
    assert created.json()["publication_status"] == "pending_review"
    assert created.json()["target_ids"] == []
    assert created.json()["target_access_token_ids"] == [minted["id"]]

    assigned_before = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
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
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    )
    assert assigned_after.status_code == 200, assigned_after.text
    assert [item["task_id"] for item in assigned_after.json()["items"]] == [created.json()["id"]]


def test_runtime_pending_review_broadcast_task_targets_active_tokens_at_approval_time(
    client,
    management_client,
    mint_standalone_access_token,
):
    created = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "title": "Deferred broadcast review task",
            "task_type": "account_read",
            "target_mode": "broadcast",
        },
    )
    assert created.status_code == 202, created.text
    assert created.json()["publication_status"] == "pending_review"
    assert created.json()["target_ids"] == []
    assert created.json()["target_access_token_ids"] == []

    minted = mint_standalone_access_token(
        display_name="Late join token",
        subject_id="late-join-agent",
    )

    approved = management_client.post(
        f"/api/reviews/task/{created.json()['id']}/approve",
        json={},
    )
    assert approved.status_code == 200, approved.text

    seeded_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    minted_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
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
        headers={"Authorization": "Bearer access-test-token"},
    )
    management = management_client.get("/api/tasks")

    assert anonymous.status_code == 401
    assert runtime.status_code == 200
    assert management.status_code == 200


def test_runtime_task_listing_only_returns_claimable_tasks_for_current_token(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(
        display_name="Other queue token",
        subject_id="other-queue-agent",
    )

    visible = management_client.post(
        "/api/tasks",
        json={
            "title": "Visible to current token",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert visible.status_code == 201, visible.text

    hidden = management_client.post(
        "/api/tasks",
        json={
            "title": "Only for other token",
            "task_type": "account_read",
            "target_access_token_ids": [minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert hidden.status_code == 201, hidden.text

    claimed = management_client.post(
        "/api/tasks",
        json={
            "title": "Already claimed by current token",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert claimed.status_code == 201, claimed.text
    claimed_response = client.post(
        f"/api/tasks/{claimed.json()['id']}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert claimed_response.status_code == 200, claimed_response.text

    runtime = client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )

    assert runtime.status_code == 200, runtime.text
    titles = [item["title"] for item in runtime.json()["items"]]
    assert titles == [
        "Visible to current token",
        "Already claimed by current token",
    ]


def test_task_creation_rejects_broadcast_mode_with_explicit_target_tokens(management_client):
    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Conflicting target mode",
            "task_type": "account_read",
            "target_mode": "broadcast",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
        },
    )

    assert response.status_code == 422


def test_untargeted_token_cannot_claim_explicitly_targeted_task(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(
        display_name="Only target token",
        subject_id="targeted-agent",
    )

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Explicitly targeted work",
            "task_type": "account_read",
            "target_access_token_ids": [minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    response = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer access-test-token"},
    )

    assert response.status_code == 403


def test_completed_target_cannot_be_completed_twice(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "One-shot target",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert assigned.status_code == 200, assigned.text
    target_id = assigned.json()["items"][0]["id"]

    claimed = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert claimed.status_code == 200, claimed.text

    first = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    second = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
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
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert assigned.status_code == 200, assigned.text
    target_id = assigned.json()["items"][0]["id"]

    claim = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert claim.status_code == 200, claim.text

    complete = client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    assert complete.status_code == 200, complete.text

    refreshed = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["items"] == []


def test_duplicate_target_tokens_are_rejected(client, management_client):
    response = management_client.post(
        "/api/tasks",
        json={
            "title": "Bad explicit targets",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID, TEST_ACCESS_TOKEN_ID],
            "target_mode": "explicit_access_tokens",
        },
    )

    assert response.status_code == 422


def test_runtime_assigned_queue_only_returns_tasks_for_current_token(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(
        display_name="Queue token",
        subject_id="queue-agent",
    )

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Token-targeted work",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID, minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    seeded_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    minted_queue = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    )

    assert seeded_queue.status_code == 200
    assert {item["target_access_token_id"] for item in seeded_queue.json()["items"]} == {TEST_ACCESS_TOKEN_ID}
    assert minted_queue.status_code == 200
    assert {item["target_access_token_id"] for item in minted_queue.json()["items"]} == {minted["id"]}


def test_multi_target_task_clears_parent_claimed_by_when_multiple_agents_claim_it(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(
        display_name="Parallel claim token",
        subject_id="parallel-claim-agent",
    )

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Parallel claim task",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID, minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    first_claim = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    assert first_claim.status_code == 200, first_claim.text

    second_claim = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    )
    assert second_claim.status_code == 200, second_claim.text

    listed = management_client.get("/api/tasks")
    assert listed.status_code == 200, listed.text
    task = next(item for item in listed.json()["items"] if item["id"] == created.json()["id"])

    assert task["status"] == "claimed"
    assert task["claimed_by"] is None


def test_target_completion_only_expires_approvals_for_the_completing_agent(
    client, management_client, db_session, mint_standalone_access_token
):
    minted = mint_standalone_access_token(
        display_name="Parallel approval token",
        subject_id="parallel-approval-agent",
    )

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Parallel approval task",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID, minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    first_assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    second_assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    )
    assert first_assigned.status_code == 200, first_assigned.text
    assert second_assigned.status_code == 200, second_assigned.text

    first_target_id = first_assigned.json()["items"][0]["id"]
    second_target_id = second_assigned.json()["items"][0]["id"]

    assert client.post(
        f"/api/task-targets/{first_target_id}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    ).status_code == 200
    assert client.post(
        f"/api/task-targets/{second_target_id}/claim",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    ).status_code == 200

    first_pending = require_runtime_approval(
        session=db_session,
        task_id=created.json()["id"],
        capability_id="capability-first",
        agent_id="test-agent",
        token_id=TEST_ACCESS_TOKEN_ID,
        task_target_id=first_target_id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    second_pending = require_runtime_approval(
        session=db_session,
        task_id=created.json()["id"],
        capability_id="capability-second",
        agent_id=minted["subject_id"],
        token_id=minted["id"],
        task_target_id=second_target_id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    approve_request(session=db_session, approval_id=first_pending.id, decided_by="management")
    approve_request(session=db_session, approval_id=second_pending.id, decided_by="management")

    response = client.post(
        f"/api/task-targets/{first_target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200, response.text

    repo = ApprovalRequestRepository(db_session)
    assert repo.get(first_pending.id).status == "expired"
    assert repo.get(second_pending.id).status == "approved"


def test_target_completion_only_expires_approvals_for_the_completing_token_scope(
    client, management_client, db_session, mint_standalone_access_token
):
    minted = mint_standalone_access_token(
        display_name="Second standby credential",
        subject_id="test-agent",
    )

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Same agent multi-token approval task",
            "task_type": "account_read",
            "target_access_token_ids": [TEST_ACCESS_TOKEN_ID, minted["id"]],
            "target_mode": "explicit_access_tokens",
        },
    )
    assert created.status_code == 201, created.text

    first_assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    )
    second_assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    )
    assert first_assigned.status_code == 200, first_assigned.text
    assert second_assigned.status_code == 200, second_assigned.text

    first_target_id = first_assigned.json()["items"][0]["id"]
    second_target_id = second_assigned.json()["items"][0]["id"]

    assert client.post(
        f"/api/task-targets/{first_target_id}/claim",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
    ).status_code == 200
    assert client.post(
        f"/api/task-targets/{second_target_id}/claim",
        headers={"Authorization": f"Bearer {minted['api_key']}"},
    ).status_code == 200

    first_pending = require_runtime_approval(
        session=db_session,
        task_id=created.json()["id"],
        capability_id="capability-shared-agent-first",
        agent_id="test-agent",
        token_id=TEST_ACCESS_TOKEN_ID,
        task_target_id=first_target_id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    second_pending = require_runtime_approval(
        session=db_session,
        task_id=created.json()["id"],
        capability_id="capability-shared-agent-second",
        agent_id="test-agent",
        token_id=minted["id"],
        task_target_id=second_target_id,
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
    )
    approve_request(session=db_session, approval_id=first_pending.id, decided_by="management")
    approve_request(session=db_session, approval_id=second_pending.id, decided_by="management")

    response = client.post(
        f"/api/task-targets/{first_target_id}/complete",
        headers={"Authorization": f"Bearer {TEST_ACCESS_TOKEN_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )

    assert response.status_code == 200, response.text

    repo = ApprovalRequestRepository(db_session)
    assert repo.get(first_pending.id).status == "expired"
    assert repo.get(second_pending.id).status == "approved"


def test_runtime_task_submission_rejects_foreign_target_tokens(
    client,
    management_client,
    mint_standalone_access_token,
):
    minted = mint_standalone_access_token(
        display_name="Foreign target token",
        subject_id="foreign-target-agent",
    )

    response = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer access-test-token"},
        json={
            "title": "Cross-agent runtime task",
            "task_type": "account_read",
            "target_mode": "explicit_access_tokens",
            "target_access_token_ids": [minted["id"]],
        },
    )

    assert response.status_code == 403
