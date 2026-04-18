from app.orm.openclaw_agent_file import OpenClawAgentFileModel
from app.orm.openclaw_dream_run import OpenClawDreamRunModel
from app.orm.openclaw_dream_step import OpenClawDreamStepModel
from app.orm.openclaw_memory_note import OpenClawMemoryNoteModel
from app.orm.openclaw_session import OpenClawSessionModel
from app.orm.openclaw_tool_binding import OpenClawToolBindingModel


def test_management_can_create_list_update_and_delete_openclaw_agents(
    management_client, owner_management_client
):
    created = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Workspace Agent",
            "workspace_root": "/srv/openclaw/workspace-agent",
            "agent_dir": ".openclaw/agents/workspace-agent",
            "model": "gpt-5",
            "thinking_level": "high",
            "sandbox_mode": "workspace-write",
            "risk_tier": "medium",
            "allowed_task_types": ["config_sync"],
        },
    )
    assert created.status_code == 201, created.text

    listing = management_client.get("/api/openclaw/agents")
    assert listing.status_code == 200, listing.text
    assert any(item["id"] == created.json()["id"] for item in listing.json()["items"])

    updated = management_client.patch(
        f"/api/openclaw/agents/{created.json()['id']}",
        json={
            "thinking_level": "balanced",
            "sandbox_mode": "read-only",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["thinking_level"] == "balanced"
    assert updated.json()["sandbox_mode"] == "read-only"

    deleted = owner_management_client.delete(f"/api/openclaw/agents/{created.json()['id']}")
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {"id": created.json()["id"], "status": "deleted"}


def test_management_can_read_one_openclaw_agent(management_client):
    created = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Detail Agent",
            "workspace_root": "/srv/openclaw/detail-agent",
            "agent_dir": ".openclaw/agents/detail-agent",
            "model": "gpt-5",
            "thinking_level": "high",
            "sandbox_mode": "workspace-write",
            "allowed_capability_ids": ["capability-1"],
        },
    )
    assert created.status_code == 201, created.text

    detail = management_client.get(f"/api/openclaw/agents/{created.json()['id']}")

    assert detail.status_code == 200, detail.text
    assert detail.json()["id"] == created.json()["id"]
    assert detail.json()["workspace_root"] == "/srv/openclaw/detail-agent"
    assert detail.json()["allowed_capability_ids"] == ["capability-1"]


def test_management_can_manage_openclaw_agent_workspace_files(management_client):
    created = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Workspace File Agent",
            "workspace_root": "/srv/openclaw/workspace-file-agent",
            "agent_dir": ".openclaw/agents/workspace-file-agent",
        },
    )
    assert created.status_code == 201, created.text

    upsert = management_client.put(
        f"/api/openclaw/agents/{created.json()['id']}/files/AGENTS.md",
        json={"content": "# Workspace File Agent\n\nYou are a management-friendly OpenClaw agent.\n"},
    )
    assert upsert.status_code == 200, upsert.text
    assert upsert.json()["file_name"] == "AGENTS.md"

    listing = management_client.get(f"/api/openclaw/agents/{created.json()['id']}/files")
    assert listing.status_code == 200, listing.text
    assert listing.json()["items"][0]["content"].startswith("# Workspace File Agent")


def test_management_can_read_openclaw_agent_detail(management_client):
    created = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Detail Agent",
            "workspace_root": "/srv/openclaw/detail-agent",
            "agent_dir": ".openclaw/agents/detail-agent",
            "model": "gpt-5",
        },
    )
    assert created.status_code == 201, created.text

    detail = management_client.get(f"/api/openclaw/agents/{created.json()['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["id"] == created.json()["id"]
    assert detail.json()["name"] == "Detail Agent"
    assert detail.json()["workspace_root"] == "/srv/openclaw/detail-agent"


def test_openclaw_agent_detail_returns_not_found_for_unknown_agent(management_client):
    detail = management_client.get("/api/openclaw/agents/openclaw-agent-missing")
    assert detail.status_code == 404, detail.text


def test_openclaw_agent_workspace_files_return_not_found_for_unknown_agent(management_client):
    listing = management_client.get("/api/openclaw/agents/openclaw-agent-missing/files")
    assert listing.status_code == 404, listing.text

    upsert = management_client.put(
        "/api/openclaw/agents/openclaw-agent-missing/files/AGENTS.md",
        json={"content": "# Missing Agent\n"},
    )
    assert upsert.status_code == 404, upsert.text


def test_deleting_openclaw_agent_cleans_up_child_records(
    management_client,
    owner_management_client,
    client,
    db_session,
):
    created = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Cleanup Agent",
            "workspace_root": "/srv/openclaw/cleanup-agent",
            "agent_dir": ".openclaw/agents/cleanup-agent",
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
    assert created.status_code == 201, created.text
    agent_id = created.json()["id"]

    session_response = management_client.post(
        f"/api/openclaw/agents/{agent_id}/sessions",
        json={
            "session_key": "sess_cleanup_agent",
            "display_name": "Cleanup Session",
            "channel": "chat",
        },
    )
    assert session_response.status_code == 201, session_response.text
    session_id = session_response.json()["id"]

    file_response = management_client.put(
        f"/api/openclaw/agents/{agent_id}/files/AGENTS.md",
        json={"content": "# Cleanup Agent\n"},
    )
    assert file_response.status_code == 200, file_response.text

    run_response = client.post(
        "/api/openclaw/dream-runs",
        headers={"Authorization": "Bearer sess_cleanup_agent"},
        json={"objective": "Clean up dependent rows"},
    )
    assert run_response.status_code == 201, run_response.text
    run_id = run_response.json()["id"]

    step_response = client.post(
        f"/api/openclaw/dream-runs/{run_id}/steps",
        headers={"Authorization": "Bearer sess_cleanup_agent"},
        json={
            "step_type": "plan",
            "status": "completed",
            "input_payload": {"prompt": "plan cleanup"},
            "output_payload": {"summary": "cleanup next"},
            "token_usage": {"input": 1, "output": 1},
        },
    )
    assert step_response.status_code == 201, step_response.text

    memory_response = client.post(
        "/api/openclaw/memory",
        headers={"Authorization": "Bearer sess_cleanup_agent"},
        json={
            "scope": "agent",
            "kind": "working_note",
            "importance": "medium",
            "tags": ["cleanup"],
            "content": "Child rows should be cleaned when the agent is deleted.",
        },
    )
    assert memory_response.status_code == 201, memory_response.text

    db_session.add(
        OpenClawToolBindingModel(
            id="binding-cleanup-agent",
            agent_id=agent_id,
            name="dream.memory.search",
            binding_kind="builtin",
            binding_target="dream.memory.search",
            approval_mode="auto",
            enabled=True,
        )
    )
    db_session.commit()

    deleted = owner_management_client.delete(f"/api/openclaw/agents/{agent_id}")
    assert deleted.status_code == 200, deleted.text

    sessions_listing = management_client.get("/api/openclaw/sessions")
    assert sessions_listing.status_code == 200, sessions_listing.text
    assert all(item["agent_id"] != agent_id for item in sessions_listing.json()["items"])

    dream_runs_listing = management_client.get("/api/openclaw/dream-runs")
    assert dream_runs_listing.status_code == 200, dream_runs_listing.text
    assert all(item["agent_id"] != agent_id for item in dream_runs_listing.json()["items"])

    assert db_session.query(OpenClawSessionModel).filter_by(agent_id=agent_id).count() == 0
    assert db_session.query(OpenClawAgentFileModel).filter_by(agent_id=agent_id).count() == 0
    assert db_session.query(OpenClawMemoryNoteModel).filter_by(agent_id=agent_id).count() == 0
    assert db_session.query(OpenClawDreamRunModel).filter_by(agent_id=agent_id).count() == 0
    assert db_session.query(OpenClawDreamStepModel).filter_by(run_id=run_id).count() == 0
    assert db_session.query(OpenClawToolBindingModel).filter_by(agent_id=agent_id).count() == 0
    assert db_session.query(OpenClawSessionModel).filter_by(id=session_id).count() == 0
