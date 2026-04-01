from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.repositories.audit_repo import AuditEventRepository
from conftest import BOOTSTRAP_AGENT_KEY, TEST_AGENT_KEY, _run_alembic_upgrade, bootstrap_owner_account, login_management_account


def test_create_secret_returns_reference_only(management_client):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "metadata": {"owner": "ml-platform"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("secret-")
    assert body["id"] != "secret-1"
    assert body["display_name"] == "OpenAI prod key"
    assert body["publication_status"] == "active"
    assert "value" not in body
    assert body["backend_ref"] == f"memory:{body['id']}"


def test_list_secrets_returns_redacted_metadata(management_client):
    management_client.post(
        "/api/secrets",
        json={
            "display_name": "QQ token",
            "kind": "api_token",
            "value": "qq-secret",
            "provider": "qq",
        },
    )

    response = management_client.get("/api/secrets")

    assert response.status_code == 200
    assert response.json()["items"][0]["display_name"] == "QQ token"
    assert "value" not in response.json()["items"][0]


def test_agent_created_secret_exposes_marketplace_provenance(management_client, client):
    response = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={
            "display_name": "Agent market secret",
            "kind": "api_token",
            "value": "agent-secret-value",
            "provider": "openai",
        },
    )

    assert response.status_code == 202, response.text

    listing = management_client.get("/api/secrets")

    assert listing.status_code == 200, listing.text
    item = listing.json()["items"][0]
    assert item["display_name"] == "Agent market secret"
    assert item["created_by_actor_type"] == "agent"
    assert item["created_by_actor_id"] == "test-agent"
    assert item["created_via_token_id"] == "token-test-agent"


def test_create_secret_uses_runtime_settings_for_secret_backend(monkeypatch, tmp_path):
    captured: list[str] = []

    class FakeBackend:
        def write_secret(self, value: str) -> tuple[str, str]:
            return ("secret-runtime", "memory:secret-runtime")

    def fake_get_secret_backend(settings: Settings):
        captured.append(settings.secret_backend)
        return FakeBackend()

    monkeypatch.setattr("app.routes.secrets.get_secret_backend", fake_get_secret_backend)
    _run_alembic_upgrade(f"sqlite:///{tmp_path / 'secret-runtime.db'}")
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'secret-runtime.db'}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
        secret_backend="memory",
    ))

    with TestClient(app) as client:
        bootstrap_owner_account(client)
        login_response = login_management_account(client)
        assert login_response.status_code == 200

        response = client.post(
            "/api/secrets",
            json={
                "display_name": "Runtime secret",
                "kind": "api_token",
                "value": "runtime-token",
                "provider": "openai",
            },
        )

    assert response.status_code == 201
    assert captured == ["memory"]


def test_runtime_created_secret_starts_pending_review_and_tracks_token_provenance(client, db_session):
    response = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={
            "display_name": "Agent secret",
            "kind": "api_token",
            "value": "agent-secret-value",
            "provider": "openai",
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body["publication_status"] == "pending_review"

    events = AuditEventRepository(db_session).list_all()
    created_events = [event for event in events if event.event_type == "secret_created"]
    assert created_events
    assert created_events[-1].payload["actor_type"] == "agent"
    assert created_events[-1].payload["actor_id"] == "test-agent"
    assert created_events[-1].payload["via_token_id"] == "token-test-agent"


def test_approved_secret_exposes_review_timestamp(management_client, client):
    created = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={
            "display_name": "Approved market secret",
            "kind": "api_token",
            "value": "approved-secret-value",
            "provider": "openai",
        },
    )

    assert created.status_code == 202, created.text

    approved = management_client.post(f"/api/reviews/secret/{created.json()['id']}/approve", json={})
    assert approved.status_code == 200, approved.text

    listing = management_client.get("/api/secrets")
    assert listing.status_code == 200, listing.text

    item = next(entry for entry in listing.json()["items"] if entry["id"] == created.json()["id"])
    assert item["publication_status"] == "active"
    assert item["reviewed_at"] is not None
