from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.factory import create_app
from app.runtime import build_runtime
from tests.asgi_client import TestClient

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Str0ng!Admin#2026"
NEW_ADMIN_PASSWORD = "N3w!Admin#Password2026"
BOOTSTRAP_TOKEN = "bootstrap-token-with-at-least-32-bytes"


def bootstrap_and_login(client: TestClient) -> None:
    response = client.post(
        "/api/admin/bootstrap/init",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 201
    response = client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    client.headers["Origin"] = "http://localhost:3000"


def test_bootstrap_session_logout_and_server_side_revocation(client: TestClient) -> None:
    assert client.get("/api/admin/bootstrap/status").json() == {
        "setup_required": True,
        "bootstrap_token_required": False,
    }
    bootstrap_and_login(client)

    session = client.get("/api/admin/session")
    assert session.status_code == 200
    assert session.json()["email"] == ADMIN_EMAIL
    assert client.get("/api/admin/bootstrap/status").json() == {
        "setup_required": False,
        "bootstrap_token_required": False,
    }

    logout = client.delete("/api/admin/session")
    assert logout.status_code == 204
    assert client.get("/api/admin/session").status_code == 401


def test_production_bootstrap_requires_matching_one_time_token(test_database_url: str) -> None:
    settings = Settings(
        app_env="production",
        database_url=test_database_url,
        encryption_key="YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
        session_secure=True,
        bootstrap_token=BOOTSTRAP_TOKEN,
        cors_allowed_origins="https://vaultgate.example.com",
    )
    runtime = build_runtime(settings)
    app = create_app(settings, runtime=runtime)
    with TestClient(app) as production_client:
        assert production_client.get("/api/admin/bootstrap/status").json() == {
            "setup_required": True,
            "bootstrap_token_required": True,
        }
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        assert production_client.post("/api/admin/bootstrap/init", json=payload).status_code == 403
        assert (
            production_client.post(
                "/api/admin/bootstrap/init",
                json=payload,
                headers={"X-Bootstrap-Token": "wrong-token"},
            ).status_code
            == 403
        )
        assert (
            production_client.post(
                "/api/admin/bootstrap/init",
                json=payload,
                headers={"X-Bootstrap-Token": BOOTSTRAP_TOKEN},
            ).status_code
            == 201
        )


def test_bootstrap_rejects_passwords_over_bcrypt_byte_limit(client: TestClient) -> None:
    too_long_ascii = "Aa1!" + ("x" * 69)
    too_long_unicode = "Aa1!" + ("密" * 23)

    for password in (too_long_ascii, too_long_unicode):
        response = client.post(
            "/api/admin/bootstrap/init",
            json={"email": ADMIN_EMAIL, "password": password},
        )
        assert response.status_code == 422
        assert "72 UTF-8 bytes" in response.text


def test_password_change_revokes_all_sessions_and_updates_login(client: TestClient) -> None:
    bootstrap_and_login(client)
    other_session = TestClient(client.app)
    assert other_session.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    ).status_code == 200

    changed = client.patch(
        "/api/admin/password",
        json={"current_password": ADMIN_PASSWORD, "new_password": NEW_ADMIN_PASSWORD},
    )
    assert changed.status_code == 204
    assert client.get("/api/admin/session").status_code == 401
    assert other_session.get("/api/admin/session").status_code == 401
    assert client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    ).status_code == 401
    assert client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": NEW_ADMIN_PASSWORD},
    ).status_code == 200

    audit = client.get(
        "/api/admin/audit-logs",
        params={"action": "admin.password.change"},
    )
    assert audit.status_code == 200
    assert audit.json()["total"] == 1
    assert audit.json()["items"][0]["result"] == "success"
    assert audit.json()["items"][0]["reason"] is None


def test_password_change_rejects_bad_current_password_and_reuse(client: TestClient) -> None:
    bootstrap_and_login(client)

    rejected = client.patch(
        "/api/admin/password",
        json={"current_password": "Wr0ng!Password2026", "new_password": NEW_ADMIN_PASSWORD},
    )
    assert rejected.status_code == 400
    assert client.get("/api/admin/session").status_code == 200
    assert client.post(
        "/api/admin/session/login",
        json={"email": ADMIN_EMAIL, "password": NEW_ADMIN_PASSWORD},
    ).status_code == 401

    reused = client.patch(
        "/api/admin/password",
        json={"current_password": ADMIN_PASSWORD, "new_password": ADMIN_PASSWORD},
    )
    assert reused.status_code == 409
    assert client.get("/api/admin/session").status_code == 200

    audit = client.get(
        "/api/admin/audit-logs",
        params={"action": "admin.password.change"},
    )
    assert audit.status_code == 200
    assert audit.json()["total"] == 2
    assert {item["result"] for item in audit.json()["items"]} == {"denied"}
    assert {item["reason"] for item in audit.json()["items"]} == {
        "current_password_invalid",
        "password_reuse",
    }


def test_password_change_requires_session_and_preserves_management_tokens(
    client: TestClient,
) -> None:
    bootstrap_and_login(client)
    created = client.post("/api/admin/management-tokens", json={"name": "automation"})
    assert created.status_code == 201
    machine = TestClient(
        client.app,
        headers={"Authorization": f"Bearer {created.json()['token']}"},
    )

    rejected = machine.patch(
        "/api/admin/password",
        json={"current_password": ADMIN_PASSWORD, "new_password": NEW_ADMIN_PASSWORD},
    )
    assert rejected.status_code == 400

    assert client.patch(
        "/api/admin/password",
        json={"current_password": ADMIN_PASSWORD, "new_password": NEW_ADMIN_PASSWORD},
    ).status_code == 204
    assert machine.get("/api/admin/session").status_code == 200


def test_password_change_validates_policy_without_echoing_passwords(client: TestClient) -> None:
    bootstrap_and_login(client)
    rejected_current = "A" * 73
    rejected_new = "weak-password"
    response = client.patch(
        "/api/admin/password",
        json={"current_password": rejected_current, "new_password": rejected_new},
    )

    assert response.status_code == 422
    assert rejected_current not in response.text
    assert rejected_new not in response.text
    assert all("input" not in error for error in response.json()["detail"])


def test_password_change_requires_valid_csrf_origin(client: TestClient) -> None:
    bootstrap_and_login(client)
    del client.headers["Origin"]

    response = client.patch(
        "/api/admin/password",
        json={"current_password": ADMIN_PASSWORD, "new_password": NEW_ADMIN_PASSWORD},
    )
    assert response.status_code == 403


def test_management_token_is_separate_from_agent_tokens(client: TestClient) -> None:
    bootstrap_and_login(client)
    created = client.post(
        "/api/admin/management-tokens",
        json={"name": "automation", "ttl_seconds": 3600},
    )
    assert created.status_code == 201
    management_token = created.json()["token"]
    assert management_token.startswith("vgm_")
    assert created.headers["cache-control"] == "no-store"
    listed = client.get("/api/admin/management-tokens")
    assert listed.status_code == 200
    summary = listed.json()["items"][0]
    assert summary["name"] == "automation"
    assert summary["description"] is None
    assert summary["expires_at"] is not None
    assert summary["last_used_at"] is None
    assert summary["created_at"] is not None

    machine = TestClient(client.app, headers={"Authorization": f"Bearer {management_token}"})
    assert machine.get("/api/admin/secrets").status_code == 200
    assert machine.get("/api/vault/secrets").status_code == 401

    agent_credential = {"Authorization": "Bearer vg_invalid"}
    assert client.get("/api/admin/secrets", headers=agent_credential).status_code == 401

    rotated = client.post(f"/api/admin/management-tokens/{created.json()['id']}/rotate")
    assert rotated.status_code == 200
    rotated_token = rotated.json()["token"]
    assert rotated_token.startswith("vgm_")
    assert rotated_token != management_token
    assert machine.get("/api/admin/secrets").status_code == 401
    assert (
        client.get(
            "/api/admin/secrets",
            headers={"Authorization": f"Bearer {rotated_token}"},
        ).status_code
        == 200
    )

    assert client.delete(f"/api/admin/management-tokens/{created.json()['id']}").status_code == 204
    audit = client.get("/api/admin/audit-logs?limit=200")
    actions = {item["action"] for item in audit.json()["items"]}
    assert {
        "admin.login",
        "management_token.create",
        "management_token.rotate",
        "management_token.revoke",
    } <= actions


def test_secret_agent_tokens_and_independent_grants(client: TestClient) -> None:
    bootstrap_and_login(client)

    secret_ids = []
    for name, value in (("github", "gh-secret"), ("database", "db-secret")):
        response = client.post(
            "/api/admin/secrets",
            json={
                "name": name,
                "type": "api_key",
                "value": value,
                "tags": ["prod"],
                "documentation_url": "https://docs.example.com/github" if name == "github" else None,
            },
        )
        assert response.status_code == 201
        assert "value" not in response.json()
        secret_ids.append(response.json()["id"])

    listed = client.get("/api/admin/secrets?limit=1&offset=0")
    assert listed.status_code == 200
    assert listed.json()["total"] == 2
    assert len(listed.json()["items"]) == 1

    filtered = client.get("/api/admin/secrets?search=git&type=api_key")
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["name"] == "github"
    docs_filtered = client.get("/api/admin/secrets?search=docs.example.com")
    assert docs_filtered.status_code == 200
    assert docs_filtered.json()["items"][0]["documentation_url"] == "https://docs.example.com/github"

    revealed = client.get(
        f"/api/admin/secrets/{secret_ids[0]}/value",
        headers={"X-Request-ID": "admin-reveal-request"},
    )
    assert revealed.status_code == 200
    assert revealed.json() == {"value": "gh-secret"}
    assert revealed.headers["cache-control"] == "no-store"

    agent = client.post(
        "/api/admin/agents",
        json={"name": "deploy", "description": "production deployer"},
    )
    assert agent.status_code == 201
    agent_id = agent.json()["id"]

    issued_tokens = []
    for name in ("primary", "fallback"):
        issued = client.post(
            f"/api/admin/agents/{agent_id}/tokens",
            json={"name": name, "ttl_seconds": 3600},
        )
        assert issued.status_code == 201
        assert issued.json()["token"].startswith("vg_")
        assert issued.headers["cache-control"] == "no-store"
        issued_tokens.append(issued.json())

    for issued, secret_id in zip(issued_tokens, secret_ids, strict=True):
        grants = client.put(
            f"/api/admin/tokens/{issued['id']}/grants",
            json={"secret_ids": [secret_id, secret_id]},
        )
        assert grants.status_code == 200
        assert grants.json()["secret_ids"] == [secret_id]

    details = client.get(f"/api/admin/agents/{agent_id}")
    assert details.status_code == 200
    assert "tokens" not in details.json()
    tokens_page = client.get(f"/api/admin/agents/{agent_id}/tokens?limit=1&offset=0")
    assert tokens_page.status_code == 200
    assert tokens_page.json()["total"] == 2
    assert len(tokens_page.json()["items"]) == 1
    assert {
        "agent_id",
        "description",
        "created_at",
    } <= tokens_page.json()["items"][0].keys()

    updated = client.patch(f"/api/admin/secrets/{secret_ids[0]}", json={"description": "updated"})
    assert updated.status_code == 200
    assert client.delete(f"/api/admin/tokens/{issued_tokens[0]['id']}").status_code == 204
    assert client.patch(f"/api/admin/agents/{agent_id}", json={"status": "disabled"}).status_code == 200
    disabled_agents = client.get("/api/admin/agents?status=disabled&limit=1&offset=0")
    assert disabled_agents.status_code == 200
    assert disabled_agents.json()["total"] == 1
    assert disabled_agents.json()["items"][0]["id"] == agent_id
    assert client.get("/api/admin/agents?status=invalid").status_code == 422
    assert client.delete(f"/api/admin/secrets/{secret_ids[1]}").status_code == 204

    audit = client.get("/api/admin/audit-logs?limit=200")
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()["items"]}
    assert {
        "secret.create",
        "secret.value.read",
        "secret.update",
        "secret.delete",
        "agent.create",
        "agent.disable",
        "agent_token.issue",
        "agent_token.revoke",
        "token_grants.replace",
    } <= actions
    reveal_audit = next(item for item in audit.json()["items"] if item["action"] == "secret.value.read")
    assert reveal_audit["request_id"] == "admin-reveal-request"

    stats = client.get("/api/admin/audit-stats")
    assert stats.status_code == 200
    assert stats.json()["value_reads"] == 1
    assert stats.json()["granted"] == 0
    assert stats.json()["total"] >= len(actions)


def test_admin_mutations_reject_invalid_types_and_null_required_fields(
    client: TestClient,
) -> None:
    bootstrap_and_login(client)

    invalid_secret = client.post(
        "/api/admin/secrets",
        json={"name": "invalid", "type": "not-a-secret-type", "value": "secret"},
    )
    assert invalid_secret.status_code == 422
    invalid_documentation_url = client.post(
        "/api/admin/secrets",
        json={
            "name": "invalid-doc-url",
            "type": "api_key",
            "value": "secret",
            "documentation_url": "javascript:alert(1)",
        },
    )
    assert invalid_documentation_url.status_code == 422
    assert (
        client.post(
            "/api/admin/secrets",
            json={"name": "empty", "type": "password", "value": ""},
        ).status_code
        == 422
    )

    secret = client.post(
        "/api/admin/secrets",
        json={"name": "database", "type": "password", "value": "secret"},
    ).json()
    for field in ("name", "type", "value", "tags", "metadata"):
        response = client.patch(f"/api/admin/secrets/{secret['id']}", json={field: None})
        assert response.status_code == 422, field
    assert client.patch(f"/api/admin/secrets/{secret['id']}", json={"value": ""}).status_code == 422

    cleared_description = client.patch(
        f"/api/admin/secrets/{secret['id']}",
        json={"description": None},
    )
    assert cleared_description.status_code == 200
    assert cleared_description.json()["description"] is None

    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    for field in ("name", "status"):
        response = client.patch(f"/api/admin/agents/{agent['id']}", json={field: None})
        assert response.status_code == 422, field


def test_admin_search_treats_like_wildcards_as_literal_text(client: TestClient) -> None:
    bootstrap_and_login(client)
    names = ["percent%only", "under_score", r"back\slash", "plain"]
    for name in names:
        response = client.post(
            "/api/admin/secrets",
            json={"name": name, "type": "password", "value": "secret"},
        )
        assert response.status_code == 201

    for search, expected in (("%", "percent%only"), ("_", "under_score"), ("\\", r"back\slash")):
        response = client.get("/api/admin/secrets", params={"search": search})
        assert response.status_code == 200
        assert [item["name"] for item in response.json()["items"]] == [expected]

        audit = client.get("/api/admin/audit-logs", params={"resource_search": search})
        assert audit.status_code == 200
        assert {item["resource_label"] for item in audit.json()["items"]} == {expected}


def test_rotation_renews_expired_tokens_using_their_original_ttl(client: TestClient) -> None:
    bootstrap_and_login(client)
    management = client.post(
        "/api/admin/management-tokens",
        json={"name": "automation", "ttl_seconds": 60},
    ).json()
    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    agent_token = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary", "ttl_seconds": 60},
    ).json()

    from sqlalchemy import update

    from app.orm import AgentToken, ManagementToken

    expired_at = datetime(2025, 1, 1, tzinfo=UTC)
    created_at = datetime(2024, 12, 31, 23, 59, tzinfo=UTC)

    async def expire_tokens() -> None:
        async with client.app.state.runtime.session_factory() as db:
            await db.execute(
                update(ManagementToken)
                .where(ManagementToken.id == management["id"])
                .values(created_at=created_at, expires_at=expired_at)
            )
            await db.execute(
                update(AgentToken)
                .where(AgentToken.id == agent_token["id"])
                .values(created_at=created_at, expires_at=expired_at)
            )
            await db.commit()

    import asyncio

    asyncio.run(expire_tokens())
    rotated_management = client.post(f"/api/admin/management-tokens/{management['id']}/rotate")
    rotated_agent = client.post(f"/api/admin/tokens/{agent_token['id']}/rotate")

    assert rotated_management.status_code == 200
    assert rotated_agent.status_code == 200
    management_expiry = datetime.fromisoformat(rotated_management.json()["expires_at"])
    agent_expiry = datetime.fromisoformat(rotated_agent.json()["expires_at"])
    assert 55 <= (management_expiry - datetime.now(UTC)).total_seconds() <= 60
    assert 55 <= (agent_expiry - datetime.now(UTC)).total_seconds() <= 60

    management_headers = {"Authorization": f"Bearer {rotated_management.json()['token']}"}
    agent_headers = {"Authorization": f"Bearer {rotated_agent.json()['token']}"}
    assert client.get("/api/admin/secrets", headers=management_headers).status_code == 200
    assert client.get("/api/vault/secrets", headers=agent_headers).status_code == 200


def test_admin_reveal_audit_failure_does_not_return_plaintext(client: TestClient) -> None:
    bootstrap_and_login(client)
    secret = client.post(
        "/api/admin/secrets",
        json={"name": "sensitive", "type": "password", "value": "never-return-this"},
    ).json()

    with patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        new=AsyncMock(side_effect=RuntimeError("audit unavailable")),
    ):
        response = client.get(f"/api/admin/secrets/{secret['id']}/value")

    assert response.status_code == 500
    assert "never-return-this" not in response.text


def test_oversized_request_id_is_truncated_in_audit(client: TestClient) -> None:
    """An over-length X-Request-ID must be truncated to the String(255) column
    instead of failing the audit insert (StringDataRightTruncation on PG)."""
    bootstrap_and_login(client)
    oversized_request_id = "req-" + ("x" * 400)

    created = client.post(
        "/api/admin/secrets",
        json={"name": "github", "type": "api_key", "value": "gh-secret"},
        headers={"X-Request-ID": oversized_request_id},
    )
    assert created.status_code == 201
    assert created.headers["x-request-id"] == oversized_request_id[:255]

    audit = client.get("/api/admin/audit-logs", params={"action": "secret.create"})
    assert audit.status_code == 200
    assert audit.json()["total"] == 1
    assert audit.json()["items"][0]["request_id"] == oversized_request_id[:255]


def test_deleting_secret_cascades_token_grants(client: TestClient) -> None:
    """SQLite must enforce PRAGMA foreign_keys so ON DELETE CASCADE removes
    grant rows instead of leaving orphans (Secret.grants uses passive_deletes)."""
    bootstrap_and_login(client)
    secret = client.post(
        "/api/admin/secrets",
        json={"name": "github", "type": "api_key", "value": "gh-secret"},
    ).json()
    agent = client.post("/api/admin/agents", json={"name": "deploy"}).json()
    issued = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    ).json()
    granted = client.put(
        f"/api/admin/tokens/{issued['id']}/grants",
        json={"secret_ids": [secret["id"]]},
    )
    assert granted.status_code == 200

    assert client.delete(f"/api/admin/secrets/{secret['id']}").status_code == 204

    grants = client.get(f"/api/admin/tokens/{issued['id']}/grants")
    assert grants.status_code == 200
    assert grants.json() == {"secret_ids": []}


def test_duplicate_secret_name_is_rejected(client: TestClient) -> None:
    bootstrap_and_login(client)
    payload = {"name": "github", "type": "api_key", "value": "gh-secret"}
    assert client.post("/api/admin/secrets", json=payload).status_code == 201

    conflict = client.post("/api/admin/secrets", json=payload)
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "Secret name already exists"

    listed = client.get("/api/admin/secrets")
    assert listed.json()["total"] == 1


def test_renaming_secret_to_existing_name_is_rejected(client: TestClient) -> None:
    bootstrap_and_login(client)
    client.post(
        "/api/admin/secrets",
        json={"name": "github", "type": "api_key", "value": "gh-secret"},
    )
    second = client.post(
        "/api/admin/secrets",
        json={"name": "database", "type": "password", "value": "db-secret"},
    ).json()

    conflict = client.patch(f"/api/admin/secrets/{second['id']}", json={"name": "github"})
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "Secret name already exists"

    unchanged = client.get(f"/api/admin/secrets/{second['id']}")
    assert unchanged.json()["name"] == "database"


def test_secret_name_uniqueness_is_case_sensitive(client: TestClient) -> None:
    # SQLite's default BINARY collation and PostgreSQL's default collation are
    # both case-sensitive, so 'Github' does not conflict with 'github'.
    bootstrap_and_login(client)
    assert client.post(
        "/api/admin/secrets",
        json={"name": "github", "type": "api_key", "value": "gh-secret"},
    ).status_code == 201
    assert client.post(
        "/api/admin/secrets",
        json={"name": "Github", "type": "api_key", "value": "other-secret"},
    ).status_code == 201


def test_agent_token_names_are_unique_per_agent(client: TestClient) -> None:
    bootstrap_and_login(client)
    agent = client.post("/api/admin/agents", json={"name": "deploy"}).json()
    other_agent = client.post("/api/admin/agents", json={"name": "backup"}).json()

    issued = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    )
    assert issued.status_code == 201

    conflict = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "Token name already exists for this agent"

    # The same name under a different agent is allowed.
    other = client.post(
        f"/api/admin/agents/{other_agent['id']}/tokens",
        json={"name": "primary"},
    )
    assert other.status_code == 201


def test_revoked_tokens_cannot_be_rotated(client: TestClient) -> None:
    """Revocation is a deliberate human action; rotation must not resurrect a
    revoked credential. Expired tokens stay rotatable (see
    test_rotation_renews_expired_tokens_using_their_original_ttl)."""
    bootstrap_and_login(client)
    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    agent_token = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    ).json()
    management = client.post("/api/admin/management-tokens", json={"name": "automation"}).json()

    assert client.delete(f"/api/admin/tokens/{agent_token['id']}").status_code == 204
    assert client.delete(f"/api/admin/management-tokens/{management['id']}").status_code == 204

    rotated_agent = client.post(f"/api/admin/tokens/{agent_token['id']}/rotate")
    assert rotated_agent.status_code == 409
    assert rotated_agent.json()["detail"] == "Revoked token cannot be rotated; issue a new token instead"
    rotated_management = client.post(f"/api/admin/management-tokens/{management['id']}/rotate")
    assert rotated_management.status_code == 409
    assert rotated_management.json()["detail"] == "Revoked token cannot be rotated; create a new token instead"

    # The revoked credential stays unusable.
    vault = client.get(
        "/api/vault/me",
        headers={"Authorization": f"Bearer {agent_token['token']}"},
    )
    assert vault.status_code == 401
    admin = client.get(
        "/api/admin/secrets",
        headers={"Authorization": f"Bearer {management['token']}"},
    )
    assert admin.status_code == 401


def test_active_agent_token_rotation_issues_new_credential(client: TestClient) -> None:
    bootstrap_and_login(client)
    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    issued = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    ).json()

    rotated = client.post(f"/api/admin/tokens/{issued['id']}/rotate")
    assert rotated.status_code == 200
    assert rotated.json()["token"] != issued["token"]

    new_headers = {"Authorization": f"Bearer {rotated.json()['token']}"}
    old_headers = {"Authorization": f"Bearer {issued['token']}"}
    assert client.get("/api/vault/me", headers=new_headers).status_code == 200
    assert client.get("/api/vault/me", headers=old_headers).status_code == 401


def test_disabled_agent_tokens_cannot_be_rotated(client: TestClient) -> None:
    """Aligned with issue_token, which rejects token issuance for disabled agents."""
    bootstrap_and_login(client)
    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    token = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    ).json()
    disabled = client.patch(f"/api/admin/agents/{agent['id']}", json={"status": "disabled"})
    assert disabled.status_code == 200

    rotated = client.post(f"/api/admin/tokens/{token['id']}/rotate")
    assert rotated.status_code == 409
    assert rotated.json()["detail"] == "Agent is disabled"


def test_revoke_all_tokens_revokes_management_and_agent_credentials(
    client: TestClient,
) -> None:
    bootstrap_and_login(client)
    management = client.post("/api/admin/management-tokens", json={"name": "automation"})
    assert management.status_code == 201
    agent = client.post("/api/admin/agents", json={"name": "deploy"})
    assert agent.status_code == 201
    issued = client.post(
        f"/api/admin/agents/{agent.json()['id']}/tokens", json={"name": "primary"}
    )
    assert issued.status_code == 201

    machine = TestClient(
        client.app, headers={"Authorization": f"Bearer {management.json()['token']}"}
    )
    agent_client = TestClient(
        client.app, headers={"Authorization": f"Bearer {issued.json()['token']}"}
    )
    assert machine.get("/api/admin/secrets").status_code == 200
    assert agent_client.get("/api/vault/me").status_code == 200

    revoked = client.post("/api/admin/security/revoke-all-tokens")
    assert revoked.status_code == 200
    assert revoked.json() == {"management_tokens_revoked": 1, "agent_tokens_revoked": 1}

    assert machine.get("/api/admin/secrets").status_code == 401
    assert agent_client.get("/api/vault/me").status_code == 401
    assert client.get("/api/admin/management-tokens").json()["items"][0]["revoked_at"] is not None
    agent_tokens = client.get(f"/api/admin/agents/{agent.json()['id']}/tokens")
    assert agent_tokens.json()["items"][0]["status"] == "revoked"

    audit = client.get(
        "/api/admin/audit-logs", params={"action": "admin.credentials.revoke_all"}
    )
    assert audit.json()["total"] == 1

    # A second emergency revocation is idempotent and reports nothing left.
    again = client.post("/api/admin/security/revoke-all-tokens")
    assert again.status_code == 200
    assert again.json() == {"management_tokens_revoked": 0, "agent_tokens_revoked": 0}


def test_revoke_all_tokens_requires_session_authentication(client: TestClient) -> None:
    """A leaked automation token must not be able to wipe every credential."""
    bootstrap_and_login(client)
    management = client.post("/api/admin/management-tokens", json={"name": "automation"})
    assert management.status_code == 201
    machine = TestClient(
        client.app, headers={"Authorization": f"Bearer {management.json()['token']}"}
    )

    rejected = machine.post("/api/admin/security/revoke-all-tokens")
    assert rejected.status_code == 400
    assert client.get("/api/admin/management-tokens").json()["items"][0]["revoked_at"] is None


def test_revoke_all_tokens_requires_valid_csrf_origin(client: TestClient) -> None:
    bootstrap_and_login(client)
    del client.headers["Origin"]

    response = client.post("/api/admin/security/revoke-all-tokens")
    assert response.status_code == 403


def test_concurrent_grant_replace_conflict_returns_409(client: TestClient) -> None:
    """A losing concurrent replace (unique violation at commit) must yield 409,
    not an unhandled 500, and must not persist partial state."""
    bootstrap_and_login(client)
    secret = client.post(
        "/api/admin/secrets", json={"name": "github", "type": "api_key", "value": "gh-secret"}
    )
    assert secret.status_code == 201
    agent = client.post("/api/admin/agents", json={"name": "deploy"})
    issued = client.post(
        f"/api/admin/agents/{agent.json()['id']}/tokens", json={"name": "primary"}
    )
    token_id = issued.json()["id"]

    conflict = IntegrityError("statement", {}, Exception("unique constraint violation"))
    with patch.object(AsyncSession, "commit", side_effect=conflict):
        response = client.put(
            f"/api/admin/tokens/{token_id}/grants",
            json={"secret_ids": [secret.json()["id"]]},
        )
    assert response.status_code == 409

    assert client.get(f"/api/admin/tokens/{token_id}/grants").json() == {"secret_ids": []}
