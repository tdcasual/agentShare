def _create_openclaw_agent(management_client):
    response = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Runtime Session Agent",
            "workspace_root": "/srv/openclaw/runtime-session-agent",
            "agent_dir": ".openclaw/agents/runtime-session-agent",
            "risk_tier": "medium",
            "allowed_task_types": ["config_sync", "account_read", "prompt_run"],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_management_can_create_and_list_openclaw_sessions(management_client):
    agent = _create_openclaw_agent(management_client)

    created = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/sessions",
        json={
            "session_key": "sess_workspace_agent_primary",
            "display_name": "Primary Session",
            "channel": "chat",
            "subject": "triage",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["session_key"] == "sess_workspace_agent_primary"
    assert created.json()["agent_id"] == agent["id"]

    listing = management_client.get("/api/openclaw/sessions")
    assert listing.status_code == 200, listing.text
    assert any(item["id"] == created.json()["id"] for item in listing.json()["items"])

    detail = management_client.get(f"/api/openclaw/sessions/{created.json()['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["session_key"] == "sess_workspace_agent_primary"


def test_openclaw_session_key_can_authenticate_runtime_routes(client, management_client):
    agent = _create_openclaw_agent(management_client)
    session_response = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/sessions",
        json={
            "session_key": "sess_runtime_route_auth",
            "display_name": "Runtime Auth Session",
            "channel": "chat",
        },
    )
    assert session_response.status_code == 201, session_response.text

    identity_response = client.get(
        "/api/agents/me",
        headers={"Authorization": "Bearer sess_runtime_route_auth"},
    )

    assert identity_response.status_code == 200, identity_response.text
    assert identity_response.json()["id"] == agent["id"]
    assert identity_response.json()["session_key"] == "sess_runtime_route_auth"


def test_management_can_list_sessions_for_one_openclaw_agent(management_client):
    primary_agent = _create_openclaw_agent(management_client)
    secondary_agent = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Secondary Runtime Agent",
            "workspace_root": "/srv/openclaw/secondary-runtime-agent",
            "agent_dir": ".openclaw/agents/secondary-runtime-agent",
        },
    )
    assert secondary_agent.status_code == 201, secondary_agent.text

    first_session = management_client.post(
        f"/api/openclaw/agents/{primary_agent['id']}/sessions",
        json={
            "session_key": "sess_primary_agent_only",
            "display_name": "Primary Agent Session",
            "channel": "chat",
        },
    )
    assert first_session.status_code == 201, first_session.text

    second_session = management_client.post(
        f"/api/openclaw/agents/{secondary_agent.json()['id']}/sessions",
        json={
            "session_key": "sess_secondary_agent_only",
            "display_name": "Secondary Agent Session",
            "channel": "chat",
        },
    )
    assert second_session.status_code == 201, second_session.text

    listing = management_client.get(f"/api/openclaw/agents/{primary_agent['id']}/sessions")
    assert listing.status_code == 200, listing.text
    assert [item["agent_id"] for item in listing.json()["items"]] == [primary_agent["id"]]
    assert [item["session_key"] for item in listing.json()["items"]] == ["sess_primary_agent_only"]


def test_openclaw_session_key_does_not_act_as_remote_access_token_for_targeted_routes(
    client,
    management_client,
):
    agent = _create_openclaw_agent(management_client)
    session_response = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/sessions",
        json={
            "session_key": "sess_no_remote_token_binding",
            "display_name": "No Remote Token Binding",
            "channel": "chat",
        },
    )
    assert session_response.status_code == 201, session_response.text

    targeted_task = management_client.post(
        "/api/tasks",
        json={
            "title": "Remote token only work",
            "task_type": "account_read",
            "target_mode": "explicit_tokens",
            "target_token_ids": ["token-test-agent"],
        },
    )
    assert targeted_task.status_code == 201, targeted_task.text
    target_id = targeted_task.json()["target_ids"][0]

    assigned = client.get(
        "/api/tasks/assigned",
        headers={"Authorization": "Bearer sess_no_remote_token_binding"},
    )
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["items"] == []

    claim_response = client.post(
        f"/api/task-targets/{target_id}/claim",
        headers={"Authorization": "Bearer sess_no_remote_token_binding"},
    )
    assert claim_response.status_code == 403, claim_response.text
    assert claim_response.json()["detail"] == "Remote access token is required"
