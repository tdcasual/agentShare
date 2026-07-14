from __future__ import annotations

from fastapi.testclient import TestClient

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Str0ng!Admin#2026"


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
    assert client.get("/api/admin/bootstrap/status").json() == {"setup_required": True}
    bootstrap_and_login(client)

    session = client.get("/api/admin/session")
    assert session.status_code == 200
    assert session.json()["email"] == ADMIN_EMAIL
    assert client.get("/api/admin/bootstrap/status").json() == {"setup_required": False}

    logout = client.delete("/api/admin/session")
    assert logout.status_code == 204
    assert client.get("/api/admin/session").status_code == 401


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

    revealed = client.get(f"/api/admin/secrets/{secret_ids[0]}/value")
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
