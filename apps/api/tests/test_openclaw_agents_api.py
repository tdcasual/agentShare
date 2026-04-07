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
