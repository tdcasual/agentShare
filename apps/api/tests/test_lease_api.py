def test_proxy_only_capability_cannot_issue_lease(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "openai.chat.invoke",
            "secret_id": secret["id"],
            "risk_level": "medium",
            "allowed_mode": "proxy_only",
            "required_provider": "openai",
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Prompt run",
            "task_type": "prompt_run",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "local sdk call"},
    )

    assert response.status_code == 403


def test_lease_capability_can_issue_short_lived_lease(client, management_client):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 201
    assert response.json()["expires_in"] == 120
    assert response.json()["lease_type"] == "metadata_placeholder"
    assert response.json()["secret_value_included"] is False


from app.repositories.approval_repo import ApprovalRequestRepository


def test_lease_requires_manual_approval_returns_409(client, management_client, db_session):
    secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token",
            "kind": "api_token",
            "value": "ghp_example",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read",
            "secret_id": secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "approval_mode": "manual",
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata",
            "task_type": "account_read",
            "required_capability_ids": [capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    response = client.post(
        f"/api/capabilities/{capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "approval_required"
    assert detail["approval_request_id"].startswith("approval-")
    assert detail["status"] == "pending"
    assert detail["action_type"] == "lease"
    assert ApprovalRequestRepository(db_session).get(detail["approval_request_id"]) is not None


def test_same_task_generates_distinct_lease_ids_per_capability(client, management_client):
    first_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token one",
            "kind": "api_token",
            "value": "ghp_example_one",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    second_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "GitHub token two",
            "kind": "api_token",
            "value": "ghp_example_two",
            "provider": "github",
            "provider_scopes": ["repo"],
        },
    ).json()
    first_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.one",
            "secret_id": first_secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    second_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "github.repo.read.two",
            "secret_id": second_secret["id"],
            "risk_level": "low",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
        },
    ).json()
    task = management_client.post(
        "/api/tasks",
        json={
            "title": "Read repo metadata twice",
            "task_type": "account_read",
            "required_capability_ids": [first_capability["id"], second_capability["id"]],
            "lease_allowed": True,
        },
    ).json()
    client.post(
        f"/api/tasks/{task['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    first_response = client.post(
        f"/api/capabilities/{first_capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )
    second_response = client.post(
        f"/api/capabilities/{second_capability['id']}/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": task["id"], "purpose": "git cli"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["lease_id"] != second_response.json()["lease_id"]
