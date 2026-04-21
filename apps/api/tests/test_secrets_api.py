from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.orm.pending_secret_material import PendingSecretMaterialModel
from app.orm.secret import SecretModel
from app.repositories.audit_repo import AuditEventRepository
from app.services.secret_backend import InMemorySecretBackend
from conftest import BOOTSTRAP_OWNER_KEY, TEST_AGENT_KEY, _run_alembic_upgrade, bootstrap_owner_account, login_management_account


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


def test_create_secret_persists_structured_scope_in_database(management_client, db_session):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "resource_selector": "project:agent-share",
            "metadata": {"owner": "ml-platform"},
        },
    )

    assert response.status_code == 201
    body = response.json()

    stored = db_session.get(SecretModel, body["id"])
    assert stored is not None
    assert stored.scope == {
        "provider": "openai",
        "environment": "production",
        "provider_scopes": ["responses.read"],
        "resource_selector": "project:agent-share",
    }
    assert stored.metadata_json == {"owner": "ml-platform"}
    assert body["scope"] == stored.scope


def test_create_secret_with_empty_metadata_keeps_metadata_empty(management_client):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "resource_selector": "project:agent-share",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["metadata"] == {}
    assert body["scope"] == {
        "provider": "openai",
        "environment": "production",
        "provider_scopes": ["responses.read"],
        "resource_selector": "project:agent-share",
    }


def test_create_secret_rejects_legacy_scope_shape(management_client):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Legacy shaped secret",
            "kind": "api_token",
            "value": "sk-live-example",
            "scope": {"provider": "openai"},
        },
    )

    assert response.status_code == 422


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
    assert item["created_by_actor_type"] == "access_token"
    assert item["created_by_actor_id"] == "test-agent"
    assert item["created_via_token_id"] == "access-token-test-agent"


def test_create_secret_uses_runtime_settings_for_secret_backend(monkeypatch, tmp_path):
    captured: list[str] = []

    class FakeBackend:
        def write_secret(self, value: str, *, secret_id: str | None = None) -> tuple[str, str]:
            del value
            del secret_id
            return ("secret-runtime", "memory:secret-runtime")

    def fake_get_secret_backend(settings: Settings):
        captured.append(settings.secret_backend)
        return FakeBackend()

    monkeypatch.setattr("app.routes.secrets.get_secret_backend", fake_get_secret_backend)
    _run_alembic_upgrade(f"sqlite:///{tmp_path / 'secret-runtime.db'}")
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'secret-runtime.db'}",
        bootstrap_owner_key=BOOTSTRAP_OWNER_KEY,
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
    assert created_events[-1].payload["actor_type"] == "access_token"
    assert created_events[-1].payload["actor_id"] == "test-agent"
    assert created_events[-1].payload["via_token_id"] == "access-token-test-agent"
    assert body["backend_ref"] == f"pending://{body['id']}"
    assert InMemorySecretBackend._store == {}
    assert db_session.get(PendingSecretMaterialModel, body["id"]) is not None


def test_runtime_created_secret_is_staged_until_review_approval(client, management_client):
    created = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={
            "display_name": "Staged agent secret",
            "kind": "api_token",
            "value": "stage-first-secret",
            "provider": "openai",
        },
    )

    assert created.status_code == 202, created.text
    created_body = created.json()
    assert created_body["backend_ref"] == f"pending://{created_body['id']}"
    assert created_body["id"] not in InMemorySecretBackend._store

    approved = management_client.post(
        f"/api/reviews/secret/{created_body['id']}/approve",
        json={"reason": "Approved after review"},
    )

    assert approved.status_code == 200, approved.text
    assert approved.json()["review_reason"] == "Approved after review"
    assert InMemorySecretBackend._store[created_body["id"]] == "stage-first-secret"

    listing = management_client.get("/api/secrets")
    assert listing.status_code == 200, listing.text
    item = next(entry for entry in listing.json()["items"] if entry["id"] == created_body["id"])
    assert item["backend_ref"] == f"memory:{created_body['id']}"
    assert item["review_reason"] == "Approved after review"


def test_rejecting_pending_secret_discards_staged_material(client, management_client, db_session):
    created = client.post(
        "/api/secrets",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={
            "display_name": "Rejected secret",
            "kind": "api_token",
            "value": "reject-me",
            "provider": "openai",
        },
    )

    assert created.status_code == 202, created.text
    secret_id = created.json()["id"]

    rejected = management_client.post(
        f"/api/reviews/secret/{secret_id}/reject",
        json={"reason": "Provider scope mismatch"},
    )

    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["review_reason"] == "Provider scope mismatch"
    assert db_session.get(PendingSecretMaterialModel, secret_id) is None
    assert secret_id not in InMemorySecretBackend._store

    listing = management_client.get("/api/secrets")
    assert listing.status_code == 200, listing.text
    item = next(entry for entry in listing.json()["items"] if entry["id"] == secret_id)
    assert item["publication_status"] == "rejected"
    assert item["review_reason"] == "Provider scope mismatch"


def test_management_secret_creation_cleans_backend_when_late_failure_occurs(
    monkeypatch,
    management_client,
    db_session,
):
    deleted: list[tuple[str, str]] = []

    class FakeBackend:
        def write_secret(self, value: str, *, secret_id: str | None = None) -> tuple[str, str]:
            del value
            return (secret_id or "secret-cleanup", f"memory:{secret_id or 'secret-cleanup'}")

        def delete_secret(self, secret_id: str, backend_ref: str | None = None) -> None:
            deleted.append((secret_id, backend_ref or ""))

    def fail_audit(*args, **kwargs):
        del args
        del kwargs
        raise RuntimeError("audit failed")

    monkeypatch.setattr("app.routes.secrets.get_secret_backend", lambda settings: FakeBackend())
    monkeypatch.setattr("app.routes.secrets.write_audit_event", fail_audit)

    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Cleanup target",
            "kind": "api_token",
            "value": "cleanup-me",
            "provider": "openai",
        },
    )

    assert response.status_code == 500
    assert deleted == [("secret-cleanup", "memory:secret-cleanup")]
    assert db_session.get(SecretModel, "secret-cleanup") is None


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
