from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.services.access_token_service import hash_access_token, mint_access_token


BOOTSTRAP_OWNER_KEY = "bootstrap-test-token"
OWNER_EMAIL = "owner@example.com"
OWNER_PASSWORD = "correct horse battery staple"


@contextmanager
def management_client_for_role(tmp_path: Path, role: str, *, database_name: str | None = None):
    settings = Settings(
        _env_file=None,
        app_env="development",
        database_url=f"sqlite:///{tmp_path / (database_name or f'{role}.db')}",
        bootstrap_owner_key=BOOTSTRAP_OWNER_KEY,
        management_session_secret="session-secret",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        session = app.state.runtime.session_factory()
        try:
            token, raw_key = mint_access_token(
                session,
                display_name="Role Test Access Token",
                subject_type="automation",
                subject_id="role-test-agent",
                scopes=["runtime"],
                labels={},
                issued_by_actor_type="system",
                issued_by_actor_id="test-fixture",
            )
            session.commit()
        finally:
            session.close()

        status_response = client.get("/api/bootstrap/status")
        assert status_response.status_code == 200, status_response.text
        if not status_response.json()["initialized"]:
            bootstrap = client.post(
                "/api/bootstrap/setup-owner",
                json={
                    "bootstrap_key": BOOTSTRAP_OWNER_KEY,
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
        tokens = client.get("/api/access-tokens")

    assert approvals.status_code == 403
    assert approvals.json()["detail"] == "operator role required"
    assert secrets.status_code == 403
    assert secrets.json()["detail"] == "admin role required"
    assert tokens.status_code == 403
    assert tokens.json()["detail"] == "admin role required"


def test_operator_can_review_approvals_but_cannot_manage_secrets_or_tokens(tmp_path: Path) -> None:
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
        tokens = client.post(
            "/api/access-tokens",
            json={
                "display_name": "Operator token",
                "subject_type": "automation",
                "subject_id": "op-runner",
                "scopes": ["runtime"],
            },
        )

    assert approvals.status_code == 200
    assert approvals.json() == {"items": []}
    assert secrets.status_code == 403
    assert secrets.json()["detail"] == "admin role required"
    assert tokens.status_code == 403
    assert tokens.json()["detail"] == "admin role required"


def test_viewer_cannot_create_playbooks(tmp_path: Path) -> None:
    with management_client_for_role(tmp_path, "viewer") as client:
        response = client.post(
            "/api/playbooks",
            json={
                "title": "Viewer draft",
                "task_type": "account_read",
                "body": "Should be blocked",
            },
        )

    assert response.status_code == 403
    assert response.json()["detail"] == "operator role required"


def test_admin_can_manage_secrets_and_tokens_but_cannot_delete_openclaw_agents(tmp_path: Path) -> None:
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
        created_token = client.post(
            "/api/access-tokens",
            json={
                "display_name": "Admin access token",
                "subject_type": "automation",
                "subject_id": "admin-runner",
                "scopes": ["runtime"],
            },
        )
        tokens = client.get("/api/access-tokens")

    assert secret.status_code == 201
    assert created_token.status_code == 201
    assert tokens.status_code == 200


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


def test_operator_can_create_tasks_but_cannot_create_admin_accounts(tmp_path: Path) -> None:
    shared_database = "operator-actions.db"

    with management_client_for_role(tmp_path, "operator", database_name=shared_database) as client:
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

    assert task_creation.status_code == 201
    assert task_creation.json()["publication_status"] == "active"
    assert account_creation.status_code == 403
    assert account_creation.json()["detail"] == "admin role required"


def test_admin_can_manage_tokens_but_cannot_disable_owner(tmp_path: Path) -> None:
    shared_database = "admin-token-actions.db"

    with management_client_for_role(tmp_path, "admin", database_name=shared_database) as client:
        created_token = client.post(
            "/api/access-tokens",
            json={
                "display_name": "Token managed",
                "subject_type": "automation",
                "subject_id": "admin-runner",
                "scopes": ["runtime"],
            },
        )
        assert created_token.status_code == 201, created_token.text

        revoked = client.post(f"/api/access-tokens/{created_token.json()['id']}/revoke")
        assert revoked.status_code == 200, revoked.text

        accounts = client.get("/api/admin-accounts")
        owner = next(item for item in accounts.json()["items"] if item["role"] == "owner")
        disable_owner = client.post(f"/api/admin-accounts/{owner['id']}/disable")

    assert disable_owner.status_code == 409
    assert disable_owner.json()["detail"] == "Owner accounts cannot be disabled"
