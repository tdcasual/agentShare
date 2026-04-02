from app.services.event_service import record_event


def test_grouped_search_returns_expected_top_level_groups(management_client):
    response = management_client.get("/api/search", params={"q": "no-match-expected"})

    assert response.status_code == 200, response.text
    assert response.json() == {
        "identities": [],
        "tasks": [],
        "assets": [],
        "skills": [],
        "events": [],
    }


def test_grouped_search_returns_matching_identities_tasks_assets_and_events(management_client, db_session):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Signal Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    created_task = management_client.post(
        "/api/tasks",
        json={
            "title": "Signal Task",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert created_task.status_code == 201, created_task.text

    created_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Signal Secret",
            "kind": "api_token",
            "value": "signal-secret-value",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "resource_selector": "project:signal",
        },
    )
    assert created_secret.status_code == 201, created_secret.text

    created_capability = management_client.post(
        "/api/capabilities",
        json={
            "name": "signal.skill.invoke",
            "secret_id": created_secret.json()["id"],
            "risk_level": "low",
            "required_provider": "openai",
        },
    )
    assert created_capability.status_code == 201, created_capability.text

    record_event(
        db_session,
        event_type="task_completed",
        actor_type="agent",
        actor_id="test-agent",
        subject_type="task",
        subject_id=created_task.json()["id"],
        summary="Signal event",
    )
    db_session.commit()

    response = management_client.get("/api/search", params={"q": "signal"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["identities"]
    assert payload["tasks"]
    assert payload["assets"]
    assert payload["skills"]
    assert payload["events"]
    assert payload["identities"][0]["title"] == "Signal Agent"
    assert payload["identities"][0]["href"] == f"/identities?agentId={created_agent.json()['id']}"
    assert payload["tasks"][0]["title"] == "Signal Task"
    assert payload["tasks"][0]["href"] == f"/tasks?taskId={created_task.json()['id']}"
    assert payload["assets"][0]["title"] == "Signal Secret"
    assert payload["assets"][0]["href"] == f"/assets?resourceKind=secret&resourceId={created_secret.json()['id']}"
    assert payload["skills"][0]["title"] == "signal.skill.invoke"
    assert payload["skills"][0]["href"] == f"/assets?resourceKind=capability&resourceId={created_capability.json()['id']}"
    assert payload["events"][0]["title"] == "Signal event"
    assert payload["events"][0]["href"] == f"/inbox?eventId={payload['events'][0]['id']}"


def test_grouped_search_links_agent_published_assets_into_marketplace_context(client, management_client):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Market Search Secret",
            "kind": "api_token",
            "value": "market-search-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    capability = client.post(
        "/api/capabilities",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "name": "market.search.capability",
            "secret_id": secret.json()["id"],
            "risk_level": "low",
        },
    )
    assert capability.status_code == 202, capability.text

    assert management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={}).status_code == 200
    assert management_client.post(
        f"/api/reviews/capability/{capability.json()['id']}/approve",
        json={},
    ).status_code == 200

    response = management_client.get("/api/search", params={"q": "market"})

    assert response.status_code == 200, response.text
    payload = response.json()
    secret_match = next(item for item in payload["assets"] if item["id"] == secret.json()["id"])
    capability_match = next(item for item in payload["skills"] if item["id"] == capability.json()["id"])
    assert secret_match["href"] == f"/marketplace?resourceKind=secret&resourceId={secret.json()['id']}"
    assert capability_match["href"] == f"/marketplace?resourceKind=capability&resourceId={capability.json()['id']}"
