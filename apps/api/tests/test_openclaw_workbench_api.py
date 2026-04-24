from app.orm.capability import CapabilityModel
from app.orm.secret import SecretModel
from app.services.secret_backend import InMemorySecretBackend


def _create_openclaw_agent(management_client, *, allowed_capability_ids=None):
    response = management_client.post(
        "/api/openclaw/agents",
        json={
            "name": "Workbench Agent",
            "workspace_root": "/srv/openclaw/workbench-agent",
            "agent_dir": ".openclaw/agents/workbench-agent",
            "risk_tier": "medium",
            "allowed_capability_ids": allowed_capability_ids or [],
            "allowed_task_types": ["prompt_run"],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _seed_openai_capability(db_session, test_settings, *, capability_id="capability-workbench-openai", adapter_type="openai"):
    backend = InMemorySecretBackend(test_settings)
    secret_id, backend_ref = backend.write_secret("sk-test-workbench", secret_id="secret-workbench-openai")
    db_session.add(
        SecretModel(
            id=secret_id,
            display_name="Workbench Secret",
            kind="api_token",
            provider="openai",
            scope={},
            metadata_json={},
            backend_ref=backend_ref,
            created_by="human",
            created_by_actor_type="human",
            created_by_actor_id="test-admin",
            publication_status="active",
        )
    )
    db_session.add(
        CapabilityModel(
            id=capability_id,
            name="openai.workbench.chat",
            secret_id=secret_id,
            allowed_mode="proxy_only",
            lease_ttl_seconds=60,
            risk_level="medium",
            approval_mode="auto",
            approval_rules=[],
            allowed_audience=[],
            access_policy={},
            required_provider="openai",
            required_provider_scopes=[],
            allowed_environments=[],
            adapter_type=adapter_type,
            adapter_config={"model": "gpt-4.1-mini"},
            created_by_actor_type="human",
            created_by_actor_id="test-admin",
            publication_status="active",
        )
    )
    db_session.commit()
    return capability_id


def test_management_can_create_list_and_chat_in_openclaw_workbench(
    management_client,
    db_session,
    test_settings,
    monkeypatch,
):
    capability_id = _seed_openai_capability(db_session, test_settings)
    agent = _create_openclaw_agent(management_client, allowed_capability_ids=[capability_id])
    workspace_file = management_client.put(
        f"/api/openclaw/agents/{agent['id']}/files/AGENTS.md",
        json={"content": "# Workbench Agent\nPrefer concise deployment advice.\n"},
    )
    assert workspace_file.status_code == 200, workspace_file.text

    create_response = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/workbench/sessions",
        json={"capability_id": capability_id},
    )
    assert create_response.status_code == 201, create_response.text
    conversation = create_response.json()
    assert conversation["agent_id"] == agent["id"]
    assert conversation["capability_id"] == capability_id
    assert conversation["title"] == "New conversation"

    listing = management_client.get(f"/api/openclaw/agents/{agent['id']}/workbench/sessions")
    assert listing.status_code == 200, listing.text
    assert [item["id"] for item in listing.json()["items"]] == [conversation["id"]]

    messages_before = management_client.get(f"/api/openclaw/workbench/sessions/{conversation['id']}/messages")
    assert messages_before.status_code == 200, messages_before.text
    assert [item["role"] for item in messages_before.json()["items"]] == ["system"]
    assert "AGENTS.md" in messages_before.json()["items"][0]["content"]

    captured = {}

    def fake_invoke(*, session, capability, messages, payload):
        captured["capability_id"] = capability.id
        captured["roles"] = [message.role for message in messages]
        captured["system_content"] = messages[0].content
        captured["user_content"] = messages[-1].content
        captured["temperature"] = payload.temperature
        return {
            "adapter_type": "openai",
            "upstream_status": 200,
            "body": {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Deployment risk is moderate. Validate env vars first.",
                        }
                    }
                ],
                "usage": {"prompt_tokens": 11, "completion_tokens": 9, "total_tokens": 20},
            },
        }

    monkeypatch.setattr("app.routes.openclaw_workbench._invoke_workbench_capability", fake_invoke)

    message_response = management_client.post(
        f"/api/openclaw/workbench/sessions/{conversation['id']}/messages",
        json={"content": "Please summarize deployment risk and next actions.", "temperature": 0.2},
    )
    assert message_response.status_code == 200, message_response.text
    payload = message_response.json()
    assert payload["user_message"]["role"] == "user"
    assert payload["assistant_message"]["role"] == "assistant"
    assert payload["assistant_message"]["content"] == "Deployment risk is moderate. Validate env vars first."
    assert payload["session"]["title"] == "Please summarize deployment risk and next actions."
    assert captured["capability_id"] == capability_id
    assert captured["roles"] == ["system", "user"]
    assert "Prefer concise deployment advice." in captured["system_content"]
    assert captured["user_content"] == "Please summarize deployment risk and next actions."
    assert captured["temperature"] == 0.2

    messages_after = management_client.get(f"/api/openclaw/workbench/sessions/{conversation['id']}/messages")
    assert messages_after.status_code == 200, messages_after.text
    assert [item["role"] for item in messages_after.json()["items"]] == ["system", "user", "assistant"]
    assert messages_after.json()["items"][-1]["message_metadata"]["usage"]["total_tokens"] == 20

    detail = management_client.get(f"/api/openclaw/workbench/sessions/{conversation['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["capability_name"] == "openai.workbench.chat"


def test_workbench_rejects_capabilities_outside_agent_allowlist(management_client, db_session, test_settings):
    capability_id = _seed_openai_capability(db_session, test_settings)
    agent = _create_openclaw_agent(management_client, allowed_capability_ids=["capability-somewhere-else"])

    response = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/workbench/sessions",
        json={"capability_id": capability_id},
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Capability is not allowed for this agent"


def test_workbench_rejects_non_openai_capabilities(management_client, db_session, test_settings):
    capability_id = _seed_openai_capability(
        db_session,
        test_settings,
        capability_id="capability-workbench-github",
        adapter_type="github",
    )
    agent = _create_openclaw_agent(management_client, allowed_capability_ids=[capability_id])

    response = management_client.post(
        f"/api/openclaw/agents/{agent['id']}/workbench/sessions",
        json={"capability_id": capability_id},
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Workbench currently supports openai capabilities only"


def test_viewer_cannot_access_workbench_management(management_client_for_role, db_session, test_settings):
    capability_id = _seed_openai_capability(db_session, test_settings)

    with management_client_for_role("admin") as admin_client:
        agent = _create_openclaw_agent(admin_client, allowed_capability_ids=[capability_id])

    with management_client_for_role("viewer") as viewer_client:
        listing = viewer_client.get(f"/api/openclaw/agents/{agent['id']}/workbench/sessions")
        create_response = viewer_client.post(
            f"/api/openclaw/agents/{agent['id']}/workbench/sessions",
            json={"capability_id": capability_id},
        )

    assert listing.status_code == 403
    assert listing.json()["detail"] == "admin role required"
    assert create_response.status_code == 403
    assert create_response.json()["detail"] == "admin role required"
