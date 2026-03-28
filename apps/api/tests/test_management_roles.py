from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app


BOOTSTRAP_AGENT_KEY = "bootstrap-test-token"


@contextmanager
def management_client_for_role(tmp_path: Path, role: str, *, database_name: str | None = None):
    settings = Settings(
        _env_file=None,
        app_env="development",
        database_url=f"sqlite:///{tmp_path / (database_name or f'{role}.db')}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
        management_operator_id=f"ops.{role}",
        management_operator_role=role,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        login = client.post("/api/session/login", json={"bootstrap_key": BOOTSTRAP_AGENT_KEY})
        assert login.status_code == 200, login.text
        yield client


def test_viewer_cannot_access_operator_or_admin_routes(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "viewer") as client:
        approvals = client.get("/api/approvals")
        secrets = client.post(
            "/api/secrets",
            json={
                "display_name": "Viewer secret",
                "kind": "api_token",
                "value": "secret-value",
                "provider": "openai",
                "metadata": {},
            },
        )
        agents = client.get("/api/agents")

    assert approvals.status_code == 403
    assert approvals.json()["detail"] == "operator role required"
    assert secrets.status_code == 403
    assert secrets.json()["detail"] == "admin role required"
    assert agents.status_code == 403
    assert agents.json()["detail"] == "admin role required"


def test_operator_can_review_approvals_but_cannot_manage_secrets_or_agents(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "operator") as client:
        approvals = client.get("/api/approvals")
        secrets = client.post(
            "/api/secrets",
            json={
                "display_name": "Operator secret",
                "kind": "api_token",
                "value": "secret-value",
                "provider": "openai",
                "metadata": {},
            },
        )
        agents = client.post(
            "/api/agents",
            json={
                "name": "Operator Agent",
                "risk_tier": "medium",
                "allowed_capability_ids": [],
                "allowed_task_types": [],
            },
        )

    assert approvals.status_code == 200
    assert approvals.json() == {"items": []}
    assert secrets.status_code == 403
    assert secrets.json()["detail"] == "admin role required"
    assert agents.status_code == 403
    assert agents.json()["detail"] == "admin role required"


def test_admin_can_manage_secrets_and_agents_but_cannot_delete_agents(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "admin") as client:
        secret = client.post(
            "/api/secrets",
            json={
                "display_name": "Admin secret",
                "kind": "api_token",
                "value": "secret-value",
                "provider": "openai",
                "metadata": {},
            },
        )
        created_agent = client.post(
            "/api/agents",
            json={
                "name": "Managed Agent",
                "risk_tier": "medium",
                "allowed_capability_ids": [],
                "allowed_task_types": [],
            },
        )
        agents = client.get("/api/agents")
        delete_attempt = client.delete(f"/api/agents/{created_agent.json()['id']}")

    assert secret.status_code == 201
    assert created_agent.status_code == 201
    assert agents.status_code == 200
    assert delete_attempt.status_code == 403
    assert delete_attempt.json()["detail"] == "owner role required"


def test_owner_can_delete_agents(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "owner") as client:
        created_agent = client.post(
            "/api/agents",
            json={
                "name": "Delete Me",
                "risk_tier": "medium",
                "allowed_capability_ids": [],
                "allowed_task_types": [],
            },
        )
        deleted = client.delete(f"/api/agents/{created_agent.json()['id']}")

    assert created_agent.status_code == 201
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "deleted"


def test_non_admin_roles_cannot_create_capabilities_but_can_still_list_them(tmp_path: Path) -> None:
    shared_database = "management-capabilities.db"

    with management_client_for_role(tmp_path, "admin", database_name=shared_database) as admin_client:
        secret = admin_client.post(
            "/api/secrets",
            json={
                "display_name": "Capability secret",
                "kind": "api_token",
                "value": "secret-value",
                "provider": "openai",
                "metadata": {},
            },
        )
        assert secret.status_code == 201

        created_capability = admin_client.post(
            "/api/capabilities",
            json={
                "name": "openai.chat.invoke",
                "secret_id": secret.json()["id"],
                "risk_level": "medium",
                "required_provider": "openai",
            },
        )
        assert created_capability.status_code == 201

    for role in ("viewer", "operator"):
        with management_client_for_role(tmp_path, role, database_name=shared_database) as client:
            listing = client.get("/api/capabilities")
            creation_attempt = client.post(
                "/api/capabilities",
                json={
                    "name": f"{role}.capability.create",
                    "secret_id": secret.json()["id"],
                    "risk_level": "medium",
                    "required_provider": "openai",
                },
            )

        assert listing.status_code == 200
        assert created_capability.json()["id"] in {item["id"] for item in listing.json()["items"]}
        assert creation_attempt.status_code == 403
        assert creation_attempt.json()["detail"] == "admin role required"
