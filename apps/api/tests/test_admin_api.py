from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.runtime import build_runtime

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Str0ng!Admin#2026"
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
        assert production_client.post(
            "/api/admin/bootstrap/init",
            json=payload,
            headers={"X-Bootstrap-Token": "wrong-token"},
        ).status_code == 403
        assert production_client.post(
            "/api/admin/bootstrap/init",
            json=payload,
            headers={"X-Bootstrap-Token": BOOTSTRAP_TOKEN},
        ).status_code == 201


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
    assert client.get(
        "/api/admin/secrets",
        headers={"Authorization": f"Bearer {rotated_token}"},
    ).status_code == 200

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
            json={"name": name, "type": "api_key", "value": value, "tags": ["prod"]},
        )
        assert response.status_code == 201
        assert "value" not in response.json()
        secret_ids.append(response.json()["id"])

    listed = client.get("/api/admin/secrets?limit=1&offset=0")
    assert listed.status_code == 200
    assert listed.json()["total"] == 2
    assert len(listed.json()["items"]) == 1

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
    assert {token["name"] for token in details.json()["tokens"]} == {"primary", "fallback"}

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
        "agent.update",
        "agent_token.issue",
        "agent_token.revoke",
        "token_grants.replace",
    } <= actions
    reveal_audit = next(item for item in audit.json()["items"] if item["action"] == "secret.value.read")
    assert reveal_audit["request_id"] == "admin-reveal-request"

    stats = client.get("/api/admin/audit-stats")
    assert stats.status_code == 200
    assert stats.json()["value_reads"] == 1
    assert stats.json()["total"] >= len(actions)


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
