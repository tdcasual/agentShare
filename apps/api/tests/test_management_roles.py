from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.orm.agent import AgentIdentityModel
from app.orm.agent_token import AgentTokenModel
from app.repositories.agent_repo import AgentRepository
from app.services.agent_token_service import hash_token


BOOTSTRAP_AGENT_KEY = "bootstrap-test-token"
OWNER_EMAIL = "owner@example.com"
OWNER_PASSWORD = "correct horse battery staple"
ROLE_TEST_AGENT_KEY = "role-test-agent-key"


@contextmanager
def management_client_for_role(tmp_path: Path, role: str, *, database_name: str | None = None):
    settings = Settings(
        _env_file=None,
        app_env="development",
        database_url=f"sqlite:///{tmp_path / (database_name or f'{role}.db')}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        session = app.state.runtime.session_factory()
        try:
            repo = AgentRepository(session)
            if repo.get("role-test-agent") is None:
                repo.create(AgentIdentityModel(
                    id="role-test-agent",
                    name="Role Test Agent",
                    api_key_hash=None,
                    status="active",
                    allowed_capability_ids=[],
                    allowed_task_types=["prompt_run", "config_sync", "account_read"],
                    risk_tier="medium",
                ))
                session.add(AgentTokenModel(
                    id="token-role-test-agent",
                    agent_id="role-test-agent",
                    display_name="Role Test Agent Token",
                    token_hash=hash_token(ROLE_TEST_AGENT_KEY),
                    token_prefix=ROLE_TEST_AGENT_KEY[:10],
                    status="active",
                    issued_by_actor_type="system",
                    issued_by_actor_id="test-fixture",
                    scopes=[],
                    labels={},
                ))
                session.commit()
        finally:
            session.close()

        status_response = client.get("/api/bootstrap/status")
        assert status_response.status_code == 200, status_response.text
        if not status_response.json()["initialized"]:
            bootstrap = client.post(
                "/api/bootstrap/setup-owner",
                json={
                    "bootstrap_key": BOOTSTRAP_AGENT_KEY,
                    "email": OWNER_EMAIL,
                    "display_name": "Founding Owner",
                    "password": OWNER_PASSWORD,
                },
            )
            assert bootstrap.status_code == 201, bootstrap.text

        login = client.post("/api/session/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
        assert login.status_code == 200, login.text

        if role != "owner":
            create_account = client.post(
                "/api/admin-accounts",
                json={
                    "email": f"{role}@example.com",
                    "display_name": role.title(),
                    "password": f"{role}-password-123",
                    "role": role,
                },
            )
            assert create_account.status_code == 201, create_account.text

            client.post("/api/session/logout")
            login = client.post(
                "/api/session/login",
                json={"email": f"{role}@example.com", "password": f"{role}-password-123"},
            )
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


def test_viewer_cannot_create_tasks_or_admin_accounts(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "viewer") as client:
        task_creation = client.post(
            "/api/tasks",
            json={
                "title": "Viewer task",
                "task_type": "prompt_run",
                "input": {"prompt": "hello"},
            },
        )
        account_creation = client.post(
            "/api/admin-accounts",
            json={
                "email": "viewer-created@example.com",
                "display_name": "Viewer Created",
                "password": "viewer-created-pass",
                "role": "viewer",
            },
        )

    assert task_creation.status_code == 403
    assert task_creation.json()["detail"] == "operator role required"
    assert account_creation.status_code == 403
    assert account_creation.json()["detail"] == "admin role required"


def test_operator_can_review_runtime_submissions_and_create_tasks_but_cannot_create_admin_accounts(tmp_path: Path) -> None:
    shared_database = "operator-actions.db"

    with management_client_for_role(tmp_path, "operator", database_name=shared_database) as client:
        runtime_task = client.post(
            "/api/tasks",
            headers={"Authorization": f"Bearer {ROLE_TEST_AGENT_KEY}"},
            json={
                "title": "Runtime queued task",
                "task_type": "prompt_run",
                "input": {"prompt": "review me"},
            },
        )
        assert runtime_task.status_code == 202, runtime_task.text

        listing = client.get("/api/reviews")
        task_creation = client.post(
            "/api/tasks",
            json={
                "title": "Operator task",
                "task_type": "prompt_run",
                "input": {"prompt": "ship it"},
            },
        )
        account_creation = client.post(
            "/api/admin-accounts",
            json={
                "email": "operator-created@example.com",
                "display_name": "Operator Created",
                "password": "operator-created-pass",
                "role": "viewer",
            },
        )
        approval = client.post(f"/api/reviews/task/{runtime_task.json()['id']}/approve", json={})

    assert listing.status_code == 200
    assert runtime_task.json()["id"] in {item["resource_id"] for item in listing.json()["items"]}
    assert task_creation.status_code == 201
    assert task_creation.json()["publication_status"] == "active"
    assert account_creation.status_code == 403
    assert account_creation.json()["detail"] == "admin role required"
    assert approval.status_code == 200
    assert approval.json()["publication_status"] == "active"


def test_admin_can_manage_tokens_but_cannot_disable_owner(tmp_path: Path) -> None:
    shared_database = "admin-token-actions.db"

    with management_client_for_role(tmp_path, "admin", database_name=shared_database) as client:
        created_agent = client.post(
            "/api/agents",
            json={
                "name": "Token Managed Agent",
                "risk_tier": "medium",
                "allowed_capability_ids": [],
                "allowed_task_types": [],
            },
        )
        assert created_agent.status_code == 201, created_agent.text

        minted = client.post(
            f"/api/agents/{created_agent.json()['id']}/tokens",
            json={"display_name": "Secondary token"},
        )
        assert minted.status_code == 201, minted.text

        revoked = client.post(f"/api/agent-tokens/{minted.json()['id']}/revoke")
        assert revoked.status_code == 200, revoked.text

        accounts = client.get("/api/admin-accounts")
        owner = next(item for item in accounts.json()["items"] if item["role"] == "owner")
        disable_owner = client.post(f"/api/admin-accounts/{owner['id']}/disable")

    assert disable_owner.status_code == 409
    assert disable_owner.json()["detail"] == "Owner accounts cannot be disabled"
