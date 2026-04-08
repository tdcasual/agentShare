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
                "max_steps_per_run": 2,
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


def test_openclaw_runtime_can_start_and_bound_a_dream_run(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_runtime")

    created = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": "Bearer sess_dream_runtime"},
        json={"objective": "Inspect config drift and suggest next action"},
    )
    assert created.status_code == 201, created.text
    assert created.json()["objective"] == "Inspect config drift and suggest next action"
    assert created.json()["status"] == "active"
    assert created.json()["step_budget"] == 2

    first_step = client.post(
        f"/api/openclaw/dream-runs/{created.json()['id']}/steps",
        headers={"Authorization": "Bearer sess_dream_runtime"},
        json={
            "step_type": "plan",
            "status": "completed",
            "input_payload": {"prompt": "plan next move"},
            "output_payload": {"summary": "check playbooks first"},
            "token_usage": {"input": 10, "output": 5},
        },
    )
    assert first_step.status_code == 201, first_step.text
    assert first_step.json()["step"]["step_index"] == 1

    second_step = client.post(
        f"/api/openclaw/dream-runs/{created.json()['id']}/steps",
        headers={"Authorization": "Bearer sess_dream_runtime"},
        json={
            "step_type": "reflect",
            "status": "completed",
            "input_payload": {"prompt": "reflect"},
            "output_payload": {"summary": "budget reached"},
            "token_usage": {"input": 8, "output": 4},
        },
    )
    assert second_step.status_code == 201, second_step.text
    assert second_step.json()["run"]["status"] == "stopped"
    assert second_step.json()["run"]["stop_reason"] == "budget_exhausted"


def test_dream_mode_can_persist_explicit_memory_notes(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_memory")

    write_response = client.post(
        "/api/openclaw/memory",
        headers={"Authorization": "Bearer sess_dream_memory"},
        json={
            "scope": "agent",
            "kind": "working_note",
            "importance": "medium",
            "tags": ["config", "drift"],
            "content": "Config drift usually starts in the staging overlay.",
        },
    )
    assert write_response.status_code == 201, write_response.text
    assert write_response.json()["content"] == "Config drift usually starts in the staging overlay."

    search_response = client.get(
        "/api/openclaw/memory?scope=agent&tag=config&q=overlay",
        headers={"Authorization": "Bearer sess_dream_memory"},
    )
    assert search_response.status_code == 200, search_response.text
    assert [item["id"] for item in search_response.json()["items"]] == [write_response.json()["id"]]


def test_dream_mode_followup_task_proposal_is_budgeted(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_followup")

    created = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": "Bearer sess_dream_followup"},
        json={"objective": "Generate a follow-up task"},
    )
    assert created.status_code == 201, created.text

    first_task = client.post(
        "/mcp",
        headers={"Authorization": "Bearer sess_dream_followup"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "dream.tasks.propose_followup",
                "arguments": {
                    "run_id": created.json()["id"],
                    "title": "Investigate config drift",
                    "task_type": "config_sync",
                    "input": {"source": "dream"},
                },
            },
        },
    )
    assert first_task.status_code == 200, first_task.text
    assert first_task.json()["result"]["isError"] is False

    second_task = client.post(
        "/mcp",
        headers={"Authorization": "Bearer sess_dream_followup"},
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "dream.tasks.propose_followup",
                "arguments": {
                    "run_id": created.json()["id"],
                    "title": "Second follow-up task",
                    "task_type": "config_sync",
                    "input": {"source": "dream"},
                },
            },
        },
    )
    assert second_task.status_code == 200, second_task.text
    assert second_task.json()["result"]["isError"] is True
    assert second_task.json()["result"]["structuredContent"]["status_code"] == 409
    assert second_task.json()["result"]["structuredContent"]["detail"] == "Dream run follow-up task budget exhausted"


def test_management_can_pause_and_resume_a_dream_run(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_pause")

    created = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": "Bearer sess_dream_pause"},
        json={"objective": "Pause and resume safely"},
    )
    assert created.status_code == 201, created.text

    paused = management_client.post(
        f"/api/openclaw/dream-runs/{created.json()['id']}/pause",
        json={"reason": "operator_paused"},
    )
    assert paused.status_code == 200, paused.text
    assert paused.json()["status"] == "paused"
    assert paused.json()["stop_reason"] == "operator_paused"

    blocked_step = client.post(
        f"/api/openclaw/dream-runs/{created.json()['id']}/steps",
        headers={"Authorization": "Bearer sess_dream_pause"},
        json={
            "step_type": "plan",
            "status": "completed",
            "input_payload": {"prompt": "plan next move"},
            "output_payload": {"summary": "should be blocked"},
            "token_usage": {"input": 10, "output": 5},
        },
    )
    assert blocked_step.status_code == 409, blocked_step.text
    assert blocked_step.json()["detail"] == "Dream run is not active"

    resumed = management_client.post(
        f"/api/openclaw/dream-runs/{created.json()['id']}/resume",
    )
    assert resumed.status_code == 200, resumed.text
    assert resumed.json()["status"] == "active"
    assert resumed.json()["stop_reason"] is None

    detail = management_client.get(f"/api/openclaw/dream-runs/{created.json()['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["id"] == created.json()["id"]
    assert detail.json()["steps"] == []
