import hashlib

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

    response = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "claimed"
    assert response.json()["claimed_by"] == "test-agent"


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
    assert "playbook" in response.json()["detail"].lower()


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
