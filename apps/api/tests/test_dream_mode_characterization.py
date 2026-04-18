import pytest
from sqlalchemy.exc import IntegrityError

from app.errors import ConflictError
from app.models.agent import AgentIdentity
from app.orm.openclaw_dream_run import OpenClawDreamRunModel
from app.repositories.openclaw_dream_run_repo import OpenClawDreamRunRepository
from app.repositories.openclaw_dream_step_repo import OpenClawDreamStepRepository
from app.services.openclaw_dream_service import (
    pause_dream_run,
    record_dream_step,
    resume_dream_run,
    stop_dream_run,
    stop_dream_run_with_event,
)


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


def _write_memory_via_mcp(client, session_key: str, *, content: str, run_id: str | None = None) -> dict:
    arguments = {
        "scope": "agent",
        "kind": "working_note",
        "importance": "medium",
        "tags": ["memory"],
        "content": content,
    }
    if run_id is not None:
        arguments["run_id"] = run_id

    response = client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {session_key}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "dream.memory.write",
                "arguments": arguments,
            },
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["result"]


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


def test_dream_memory_write_tool_rejects_unknown_run_ids(client, management_client):
    agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, agent["id"], "sess_dream_memory_missing_run")

    result = _write_memory_via_mcp(
        client,
        "sess_dream_memory_missing_run",
        content="This note should not attach to a missing run.",
        run_id="dream-run-missing",
    )

    assert result["isError"] is True
    assert result["structuredContent"]["status_code"] == 404
    assert result["structuredContent"]["detail"] == "Dream run not found"


def test_dream_memory_write_tool_rejects_runs_owned_by_another_agent(client, management_client):
    first_agent = _create_openclaw_agent(management_client)
    second_agent = _create_openclaw_agent(management_client)
    _create_openclaw_session(management_client, first_agent["id"], "sess_dream_memory_owner")
    _create_openclaw_session(management_client, second_agent["id"], "sess_dream_memory_other")

    run_response = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": "Bearer sess_dream_memory_owner"},
        json={"objective": "Own one run for memory scoping"},
    )
    assert run_response.status_code == 201, run_response.text

    result = _write_memory_via_mcp(
        client,
        "sess_dream_memory_other",
        content="This note should not attach to another agent's run.",
        run_id=run_response.json()["id"],
    )

    assert result["isError"] is True
    assert result["structuredContent"]["status_code"] == 403
    assert result["structuredContent"]["detail"] == "Dream run does not belong to this agent"

    search_response = client.get(
        "/api/openclaw/memory",
        headers={"Authorization": "Bearer sess_dream_memory_other"},
    )
    assert search_response.status_code == 200, search_response.text
    assert search_response.json()["items"] == []


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


def test_record_dream_step_translates_duplicate_step_races_into_conflicts(db_session, monkeypatch):
    db_session.add(
        OpenClawDreamRunModel(
            id="dream-run-race",
            agent_id="openclaw-agent-race",
            session_id="openclaw-session-race",
            objective="Handle concurrent step recording safely",
            status="active",
            step_budget=3,
            consumed_steps=0,
            created_followup_tasks=0,
            started_by_actor_type="agent",
            started_by_actor_id="openclaw-agent-race",
            runtime_metadata={},
        )
    )
    db_session.commit()

    agent = AgentIdentity(
        id="openclaw-agent-race",
        name="Dream Agent",
        issuer="openclaw",
        auth_method="bearer",
        session_id="openclaw-session-race",
        labels={},
    )

    def raise_duplicate_step(self, model):
        raise IntegrityError("insert", {}, Exception("duplicate dream step index"))

    monkeypatch.setattr(OpenClawDreamStepRepository, "create", raise_duplicate_step)

    with pytest.raises(ConflictError, match="Dream run step is already being recorded"):
        record_dream_step(
            db_session,
            run_id="dream-run-race",
            agent=agent,
            step_type="plan",
            status="completed",
            input_payload={"prompt": "plan"},
            output_payload={"summary": "step"},
            token_usage={"input": 1, "output": 1},
        )


def test_stop_dream_run_reads_the_run_with_a_lock(db_session, monkeypatch):
    db_session.add(
        OpenClawDreamRunModel(
            id="dream-run-stop-lock",
            agent_id="openclaw-agent-stop-lock",
            session_id="openclaw-session-stop-lock",
            objective="Stop safely under concurrent updates",
            status="active",
            step_budget=3,
            consumed_steps=0,
            created_followup_tasks=0,
            started_by_actor_type="agent",
            started_by_actor_id="openclaw-agent-stop-lock",
            runtime_metadata={},
        )
    )
    db_session.commit()

    agent = AgentIdentity(
        id="openclaw-agent-stop-lock",
        name="Dream Agent",
        issuer="openclaw",
        auth_method="bearer",
        session_id="openclaw-session-stop-lock",
        labels={},
    )

    original_get_for_update = OpenClawDreamRunRepository.get_for_update
    calls: list[str] = []

    def fail_unlocked_get(self, run_id):
        raise AssertionError("stop_dream_run should lock the run row before mutating it")

    def tracked_get_for_update(self, run_id):
        calls.append(run_id)
        return original_get_for_update(self, run_id)

    monkeypatch.setattr(OpenClawDreamRunRepository, "get", fail_unlocked_get)
    monkeypatch.setattr(OpenClawDreamRunRepository, "get_for_update", tracked_get_for_update)

    stopped = stop_dream_run(
        db_session,
        run_id="dream-run-stop-lock",
        agent=agent,
        stop_reason="operator_stopped",
    )

    assert stopped["status"] == "stopped"
    assert stopped["stop_reason"] == "operator_stopped"
    assert calls == ["dream-run-stop-lock"]


def test_pause_and_resume_dream_run_read_the_run_with_a_lock(db_session, monkeypatch):
    db_session.add(
        OpenClawDreamRunModel(
            id="dream-run-pause-lock",
            agent_id="openclaw-agent-pause-lock",
            session_id="openclaw-session-pause-lock",
            objective="Pause and resume safely under concurrent updates",
            status="active",
            step_budget=3,
            consumed_steps=0,
            created_followup_tasks=0,
            started_by_actor_type="agent",
            started_by_actor_id="openclaw-agent-pause-lock",
            runtime_metadata={},
        )
    )
    db_session.commit()

    original_get_for_update = OpenClawDreamRunRepository.get_for_update
    calls: list[str] = []

    def fail_unlocked_get(self, run_id):
        raise AssertionError("dream-run state transitions should lock the run row before mutating it")

    def tracked_get_for_update(self, run_id):
        calls.append(run_id)
        return original_get_for_update(self, run_id)

    monkeypatch.setattr(OpenClawDreamRunRepository, "get", fail_unlocked_get)
    monkeypatch.setattr(OpenClawDreamRunRepository, "get_for_update", tracked_get_for_update)

    paused = pause_dream_run(db_session, run_id="dream-run-pause-lock", reason="operator_paused")
    resumed = resume_dream_run(db_session, run_id="dream-run-pause-lock")

    assert paused["status"] == "paused"
    assert resumed["status"] == "active"
    assert calls == ["dream-run-pause-lock", "dream-run-pause-lock"]


def test_stop_dream_run_with_event_reads_the_run_with_a_lock(db_session, monkeypatch):
    db_session.add(
        OpenClawDreamRunModel(
            id="dream-run-stop-event-lock",
            agent_id="openclaw-agent-stop-event-lock",
            session_id="openclaw-session-stop-event-lock",
            objective="Stop with event safely under concurrent updates",
            status="active",
            step_budget=3,
            consumed_steps=0,
            created_followup_tasks=0,
            started_by_actor_type="agent",
            started_by_actor_id="openclaw-agent-stop-event-lock",
            runtime_metadata={},
        )
    )
    db_session.commit()

    agent = AgentIdentity(
        id="openclaw-agent-stop-event-lock",
        name="Dream Agent",
        issuer="openclaw",
        auth_method="bearer",
        session_id="openclaw-session-stop-event-lock",
        labels={},
    )

    original_get_for_update = OpenClawDreamRunRepository.get_for_update
    calls: list[str] = []

    def fail_unlocked_get(self, run_id):
        raise AssertionError("stop_dream_run_with_event should lock the run row before mutating it")

    def tracked_get_for_update(self, run_id):
        calls.append(run_id)
        return original_get_for_update(self, run_id)

    monkeypatch.setattr(OpenClawDreamRunRepository, "get", fail_unlocked_get)
    monkeypatch.setattr(OpenClawDreamRunRepository, "get_for_update", tracked_get_for_update)

    stopped = stop_dream_run_with_event(
        db_session,
        run_id="dream-run-stop-event-lock",
        agent=agent,
        stop_reason="task_proposal_disallowed",
        detail="Agent policy denied the proposal",
    )

    assert stopped["status"] == "stopped"
    assert stopped["stop_reason"] == "task_proposal_disallowed"
    assert calls == ["dream-run-stop-event-lock"]
