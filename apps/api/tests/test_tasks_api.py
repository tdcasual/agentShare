import hashlib

from conftest import TEST_SETTINGS

from app.errors import ServiceUnavailableError
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository


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


def test_agent_cannot_claim_task_type_outside_allowlist(client, management_client, db_session):
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="limited-agent",
        name="Limited Agent",
        api_key_hash=hashlib.sha256("limited-agent-key".encode()).hexdigest(),
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=["account_read"],
        risk_tier="medium",
    ))
    db_session.flush()

    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
        },
    ).json()

    response = client.post(
        f"/api/tasks/{created['id']}/claim",
        headers={"Authorization": "Bearer limited-agent-key"},
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
