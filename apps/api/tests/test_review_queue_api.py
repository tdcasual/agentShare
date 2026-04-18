def test_review_queue_can_approve_and_reject_agent_created_assets(client, management_client):
    playbook = client.post(
        "/api/playbooks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Queued playbook",
            "task_type": "prompt_run",
            "body": "Review me",
            "tags": ["queued"],
        },
    )
    assert playbook.status_code == 202, playbook.text

    task = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Queued task",
            "task_type": "prompt_run",
            "input": {"prompt": "hello"},
        },
    )
    assert task.status_code == 202, task.text

    listing = management_client.get("/api/reviews")
    assert listing.status_code == 200, listing.text
    items = listing.json()["items"]
    assert {item["resource_id"] for item in items} >= {playbook.json()["id"], task.json()["id"]}

    approved = management_client.post(
        f"/api/reviews/playbook/{playbook.json()['id']}/approve",
        json={"reason": "Playbook content approved"},
    )
    rejected = management_client.post(
        f"/api/reviews/task/{task.json()['id']}/reject",
        json={"reason": "Task contract rejected"},
    )

    assert approved.status_code == 200, approved.text
    assert approved.json()["publication_status"] == "active"
    assert approved.json()["review_reason"] == "Playbook content approved"
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["publication_status"] == "rejected"
    assert rejected.json()["review_reason"] == "Task contract rejected"


def test_review_decision_returns_operator_reason(client, management_client):
    playbook = client.post(
        "/api/playbooks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Review reason playbook",
            "task_type": "prompt_run",
            "body": "Reason required",
            "tags": ["review"],
        },
    )
    assert playbook.status_code == 202, playbook.text

    approved = management_client.post(
        f"/api/reviews/playbook/{playbook.json()['id']}/approve",
        json={"reason": "Matches governance rules"},
    )

    assert approved.status_code == 200, approved.text
    assert approved.json()["review_reason"] == "Matches governance rules"

    task = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Review reason task",
            "task_type": "prompt_run",
            "input": {"prompt": "hello"},
        },
    )
    assert task.status_code == 202, task.text

    rejected = management_client.post(
        f"/api/reviews/task/{task.json()['id']}/reject",
        json={"reason": "Needs a tighter scope"},
    )

    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["review_reason"] == "Needs a tighter scope"


def test_review_queue_transport_uses_runtime_review_fields(client, management_client):
    task = client.post(
        "/api/tasks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Queued review transport task",
            "task_type": "prompt_run",
            "input": {"prompt": "hello"},
        },
    )
    assert task.status_code == 202, task.text

    listing = management_client.get("/api/reviews")

    assert listing.status_code == 200, listing.text
    item = next(entry for entry in listing.json()["items"] if entry["resource_id"] == task.json()["id"])
    assert item["resource_kind"] == "task"
    assert item["publication_status"] == "pending_review"
    assert item["created_by_actor_type"] == "agent"
    assert item["created_by_actor_id"] == "test-agent"
    assert item["created_via_token_id"] == "token-test-agent"
    assert "submitted_by" not in item
    assert "submitted_at" not in item
    assert "status" not in item
    assert "reviewed_by" not in item


def test_review_decision_transport_uses_review_reason_fields(client, management_client):
    playbook = client.post(
        "/api/playbooks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Review transport playbook",
            "task_type": "prompt_run",
            "body": "Review me",
            "tags": ["transport"],
        },
    )
    assert playbook.status_code == 202, playbook.text

    approved = management_client.post(
        f"/api/reviews/playbook/{playbook.json()['id']}/approve",
        json={"reason": "Transport shape approved"},
    )

    assert approved.status_code == 200, approved.text
    payload = approved.json()
    assert payload["resource_kind"] == "playbook"
    assert payload["resource_id"] == playbook.json()["id"]
    assert payload["publication_status"] == "active"
    assert payload["review_reason"] == "Transport shape approved"
    assert "status" not in payload
    assert "reviewed_by" not in payload


def test_review_decision_returns_409_when_same_resource_is_already_being_decided(
    client, management_client, monkeypatch
):
    playbook = client.post(
        "/api/playbooks",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "title": "Locked review playbook",
            "task_type": "prompt_run",
            "body": "Review lock me",
            "tags": ["review"],
        },
    )
    assert playbook.status_code == 202, playbook.text

    monkeypatch.setattr("app.services.review_service.acquire_lock", lambda *args, **kwargs: False)

    blocked = management_client.post(
        f"/api/reviews/playbook/{playbook.json()['id']}/approve",
        json={},
    )

    assert blocked.status_code == 409, blocked.text
    assert blocked.json()["detail"] == "Review decision is being processed by another operator"
