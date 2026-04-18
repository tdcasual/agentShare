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


def test_grouped_search_returns_openclaw_agents_as_identities(management_client):
    created_agent = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Workspace Signal Agent",
            "workspace_root": "/srv/openclaw/workspace-signal-agent",
            "agent_dir": ".openclaw/agents/workspace-signal-agent",
            "model": "gpt-5",
            "sandbox_mode": "workspace-write",
        },
    )
    assert created_agent.status_code == 201, created_agent.text

    response = management_client.get("/api/search", params={"q": "workspace signal"})

    assert response.status_code == 200, response.text
    payload = response.json()
    match = next(item for item in payload["identities"] if item["id"] == created_agent.json()["id"])
    assert match["title"] == "Workspace Signal Agent"
    assert match["href"] == f"/identities?agentId={created_agent.json()['id']}"


def test_grouped_search_hides_admin_only_hits_from_operator_sessions(
    management_client_for_role,
    db_session,
):
    with management_client_for_role("admin") as admin_client:
        created_agent = admin_client.post(
            "/api/agents",
            json={"name": "Restricted Signal Agent", "risk_tier": "medium"},
        )
        assert created_agent.status_code == 201, created_agent.text

        created_task = admin_client.post(
            "/api/tasks",
            json={
                "title": "Restricted Signal Task",
                "task_type": "account_read",
            },
        )
        assert created_task.status_code == 201, created_task.text

        created_secret = admin_client.post(
            "/api/secrets",
            json={
                "display_name": "Restricted Signal Secret",
                "kind": "api_token",
                "value": "restricted-signal-secret",
                "provider": "openai",
                "environment": "production",
                "provider_scopes": ["responses.read"],
                "resource_selector": "project:restricted-signal",
            },
        )
        assert created_secret.status_code == 201, created_secret.text

        created_capability = admin_client.post(
            "/api/capabilities",
            json={
                "name": "restricted.signal.skill",
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
            summary="Restricted signal event",
        )
        db_session.commit()

    with management_client_for_role("operator") as operator_client:
        response = operator_client.get("/api/search", params={"q": "restricted signal"})

    assert response.status_code == 200, response.text
    assert response.json() == {
        "identities": [],
        "tasks": [],
        "assets": [],
        "skills": [],
        "events": [],
    }


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


def test_grouped_search_keeps_marketplace_hits_visible_to_operator_sessions(
    client,
    management_client,
    management_client_for_role,
):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Operator Market Search Secret",
            "kind": "api_token",
            "value": "operator-market-search-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    capability = client.post(
        "/api/capabilities",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "name": "operator.market.search.capability",
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

    with management_client_for_role("operator") as operator_client:
        response = operator_client.get("/api/search", params={"q": "market"})

    assert response.status_code == 200, response.text
    payload = response.json()
    secret_match = next(item for item in payload["assets"] if item["id"] == secret.json()["id"])
    capability_match = next(item for item in payload["skills"] if item["id"] == capability.json()["id"])
    assert secret_match["href"] == f"/marketplace?resourceKind=secret&resourceId={secret.json()['id']}"
    assert capability_match["href"] == f"/marketplace?resourceKind=capability&resourceId={capability.json()['id']}"


def test_grouped_search_supports_limit_per_group(management_client):
    for idx in range(2):
        created = management_client.post(
            "/api/agents",
            json={"name": f"Signal limit agent {idx}", "risk_tier": "medium"},
        )
        assert created.status_code == 201, created.text

    response = management_client.get("/api/search", params={"q": "signal limit", "limit_per_group": 1})

    assert response.status_code == 200, response.text
    assert len(response.json()["identities"]) == 1


def test_grouped_search_uses_targeted_repository_queries_instead_of_list_all(
    management_client,
    db_session,
    monkeypatch,
):
    created_agent = management_client.post(
        "/api/agents",
        json={"name": "Targeted Signal Agent", "risk_tier": "medium"},
    )
    assert created_agent.status_code == 201, created_agent.text

    created_task = management_client.post(
        "/api/tasks",
        json={"title": "Targeted Signal Task", "task_type": "account_read"},
    )
    assert created_task.status_code == 201, created_task.text

    created_secret = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Targeted Signal Secret",
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
            "name": "Targeted Signal Skill",
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
        summary="Targeted signal event",
    )
    db_session.commit()

    def fail_list_all(*args, **kwargs):
        del args, kwargs
        raise AssertionError("search should not call list_all/list_recent fallbacks")

    monkeypatch.setattr("app.repositories.agent_repo.AgentRepository.list_all", fail_list_all)
    monkeypatch.setattr("app.repositories.openclaw_agent_repo.OpenClawAgentRepository.list_all", fail_list_all)
    monkeypatch.setattr("app.repositories.task_repo.TaskRepository.list_all", fail_list_all)
    monkeypatch.setattr("app.repositories.secret_repo.SecretRepository.list_all", fail_list_all)
    monkeypatch.setattr("app.repositories.capability_repo.CapabilityRepository.list_all", fail_list_all)
    monkeypatch.setattr("app.repositories.event_repo.EventRepository.list_recent", fail_list_all)

    response = management_client.get("/api/search", params={"q": "targeted signal"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["identities"]
    assert payload["tasks"]
    assert payload["assets"]
    assert payload["skills"]
    assert payload["events"]
