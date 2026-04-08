def _create_openclaw_agent(management_client):
    response = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Dream Runtime Agent",
            "workspace_root": "/srv/openclaw/dream-runtime-agent",
            "agent_dir": ".openclaw/agents/dream-runtime-agent",
            "risk_tier": "medium",
            "allowed_task_types": ["config_sync", "account_read", "prompt_run"],
            "dream_policy": {
                "enabled": True,
                "max_steps_per_run": 3,
                "max_followup_tasks": 1,
                "allow_task_proposal": True,
                "allow_memory_write": True,
                "max_context_tokens": 4096,
            },
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_openclaw_session(management_client, agent_id: str, session_key: str) -> dict:
    response = management_client.post(
        f"/api/openclaw/agents/{agent_id}/sessions",
        json={
            "session_key": session_key,
            "display_name": "Dream Session",
            "channel": "chat",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _start_dream_run(client, session_key: str, objective: str) -> dict:
    response = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": f"Bearer {session_key}"},
        json={"objective": objective},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _propose_followup_task(client, session_key: str, run_id: str, *, title: str, task_type: str) -> dict:
    response = client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {session_key}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "dream.tasks.propose_followup",
                "arguments": {
                    "run_id": run_id,
                    "title": title,
                    "task_type": task_type,
                    "input": {"source": "dream"},
                },
            },
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["result"]


def test_followup_task_proposal_creates_pending_review_task_and_links_created_task_id(
    client,
    management_client,
):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_followup_success")
    run = _start_dream_run(client, "sess_dream_followup_success", "Generate one follow-up task")

    result = _propose_followup_task(
        client,
        "sess_dream_followup_success",
        run["id"],
        title="Investigate config drift",
        task_type="config_sync",
    )

    assert result["isError"] is False
    created_task = result["structuredContent"]["task"]
    assert created_task["publication_status"] == "pending_review"

    review_queue = management_client.get("/api/reviews")
    assert review_queue.status_code == 200, review_queue.text
    assert any(
        item["resource_kind"] == "task" and item["resource_id"] == created_task["id"]
        for item in review_queue.json()["items"]
    )

    run_detail = management_client.get(f"/api/openclaw/dream-runs/{run['id']}")
    assert run_detail.status_code == 200, run_detail.text
    assert run_detail.json()["steps"][-1]["created_task_id"] == created_task["id"]


def test_exhausted_followup_budget_stops_dream_run_and_emits_event(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_followup_budget")
    run = _start_dream_run(client, "sess_dream_followup_budget", "Generate bounded follow-up tasks")

    first_result = _propose_followup_task(
        client,
        "sess_dream_followup_budget",
        run["id"],
        title="Investigate config drift",
        task_type="config_sync",
    )
    assert first_result["isError"] is False

    second_result = _propose_followup_task(
        client,
        "sess_dream_followup_budget",
        run["id"],
        title="Propose another task",
        task_type="config_sync",
    )

    assert second_result["isError"] is True
    assert second_result["structuredContent"]["status_code"] == 409
    assert second_result["structuredContent"]["detail"] == "Dream run follow-up task budget exhausted"

    run_detail = management_client.get(f"/api/openclaw/dream-runs/{run['id']}")
    assert run_detail.status_code == 200, run_detail.text
    assert run_detail.json()["status"] == "stopped"
    assert run_detail.json()["stop_reason"] == "budget_exhausted"

    events = management_client.get("/api/events")
    assert events.status_code == 200, events.text
    assert any(
        item["event_type"] == "dream_run_stopped"
        and item["subject_id"] == run["id"]
        and item["details"] == "Dream run follow-up task budget exhausted"
        for item in events.json()["items"]
    )


def test_disallowed_followup_task_proposal_stops_dream_run_and_emits_event(client, management_client):
    agent_response = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Dream Runtime Agent",
            "workspace_root": "/srv/openclaw/dream-runtime-agent",
            "agent_dir": ".openclaw/agents/dream-runtime-agent",
            "risk_tier": "medium",
            "allowed_task_types": ["config_sync"],
            "dream_policy": {
                "enabled": True,
                "max_steps_per_run": 3,
                "max_followup_tasks": 1,
                "allow_task_proposal": False,
                "allow_memory_write": True,
                "max_context_tokens": 4096,
            },
        },
    )
    assert agent_response.status_code == 201, agent_response.text
    agent = agent_response.json()
    _create_openclaw_session(management_client, agent["id"], "sess_dream_followup_disallowed")
    run = _start_dream_run(
        client,
        "sess_dream_followup_disallowed",
        "Generate a follow-up task that policy should reject",
    )

    result = _propose_followup_task(
        client,
        "sess_dream_followup_disallowed",
        run["id"],
        title="Blocked follow-up task",
        task_type="config_sync",
    )

    assert result["isError"] is True
    assert result["structuredContent"]["status_code"] == 403
    assert result["structuredContent"]["detail"] == "Dream mode task proposals are disabled for this agent"

    run_detail = management_client.get(f"/api/openclaw/dream-runs/{run['id']}")
    assert run_detail.status_code == 200, run_detail.text
    assert run_detail.json()["status"] == "stopped"
    assert run_detail.json()["stop_reason"] == "task_proposal_disallowed"

    events = management_client.get("/api/events")
    assert events.status_code == 200, events.text
    assert any(
        item["event_type"] == "dream_run_stopped"
        and item["subject_id"] == run["id"]
        and item["details"] == "Dream mode task proposals are disabled for this agent"
        for item in events.json()["items"]
    )
