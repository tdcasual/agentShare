from __future__ import annotations

from fastapi.testclient import TestClient

from tests.test_admin_api import bootstrap_and_login


def _issue_agent_token(client: TestClient, agent_name: str) -> dict:
    agent = client.post("/api/admin/agents", json={"name": agent_name}).json()
    response = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "primary"},
    )
    assert response.status_code == 201
    return {**response.json(), "agent": agent}


def _agent_headers(token: str, *, idempotency_key: str | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if idempotency_key is not None:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def test_agents_collaborate_through_a_shared_space(client: TestClient) -> None:
    bootstrap_and_login(client)
    contributor = _issue_agent_token(client, "contributor")
    reader = _issue_agent_token(client, "reader")
    outsider = _issue_agent_token(client, "outsider")

    created_space = client.post(
        "/api/admin/spaces",
        json={"name": "Production", "description": "Shared production credentials"},
    )
    assert created_space.status_code == 201
    space = created_space.json()
    memberships = client.put(
        f"/api/admin/spaces/{space['id']}/memberships",
        json={
            "members": [
                {"token_id": contributor["id"], "role": "contributor"},
                {"token_id": reader["id"], "role": "reader"},
            ]
        },
    )
    assert memberships.status_code == 200

    contributor_headers = _agent_headers(
        contributor["token"],
        idempotency_key="space-create-credential-001",
    )
    reader_headers = _agent_headers(reader["token"])
    outsider_headers = _agent_headers(outsider["token"])

    visible_spaces = client.get("/api/vault/spaces", headers=contributor_headers)
    assert visible_spaces.status_code == 200
    assert visible_spaces.json()["items"][0]["role"] == "contributor"

    denied_create = client.post(
        f"/api/vault/spaces/{space['id']}/secrets",
        headers=reader_headers,
        json={"name": "denied", "type": "password", "value": "denied-value"},
    )
    assert denied_create.status_code == 403

    missing_idempotency = client.post(
        f"/api/vault/spaces/{space['id']}/secrets",
        headers=_agent_headers(contributor["token"]),
        json={"name": "missing-key", "type": "password", "value": "value"},
    )
    assert missing_idempotency.status_code == 422

    created = client.post(
        f"/api/vault/spaces/{space['id']}/secrets",
        headers=contributor_headers,
        json={
            "name": "shared-account",
            "type": "password",
            "value": "initial-password",
            "url": "https://service.example.com",
            "username": "shared-user",
        },
    )
    assert created.status_code == 201
    secret = created.json()
    assert secret["version"] == 1
    assert secret["permissions"] == ["read", "update"]
    assert secret["access_source"] == "space"
    assert "value" not in secret

    replay = client.post(
        f"/api/vault/spaces/{space['id']}/secrets",
        headers=contributor_headers,
        json={
            "name": "shared-account",
            "type": "password",
            "value": "initial-password",
            "url": "https://service.example.com",
            "username": "shared-user",
        },
    )
    assert replay.status_code == 201
    assert replay.json()["id"] == secret["id"]

    reader_list = client.get("/api/vault/secrets", headers=reader_headers)
    assert reader_list.status_code == 200
    assert reader_list.json()["total"] == 1
    assert reader_list.json()["items"][0]["username"] == "shared-user"
    assert reader_list.json()["items"][0]["permissions"] == ["read"]

    revealed = client.get(
        f"/api/vault/secrets/{secret['id']}/value",
        headers=reader_headers,
    )
    assert revealed.status_code == 200
    assert revealed.json() == {"value": "initial-password"}
    assert revealed.headers["cache-control"] == "no-store"

    denied_update = client.patch(
        f"/api/vault/secrets/{secret['id']}",
        headers={**reader_headers, "If-Match": "1"},
        json={"value": "reader-must-not-write"},
    )
    assert denied_update.status_code == 403

    updated = client.patch(
        f"/api/vault/secrets/{secret['id']}",
        headers={**_agent_headers(contributor["token"]), "If-Match": "1"},
        json={"value": "rotated-password"},
    )
    assert updated.status_code == 200
    assert updated.json()["version"] == 2

    stale = client.patch(
        f"/api/vault/secrets/{secret['id']}",
        headers={**_agent_headers(contributor["token"]), "If-Match": "1"},
        json={"description": "stale update"},
    )
    assert stale.status_code == 409

    reread = client.get(
        f"/api/vault/secrets/{secret['id']}/value",
        headers=reader_headers,
    )
    assert reread.json() == {"value": "rotated-password"}

    assert client.get("/api/vault/secrets", headers=outsider_headers).json()["total"] == 0
    assert (
        client.get(f"/api/vault/secrets/{secret['id']}", headers=outsider_headers).status_code
        == 403
    )
    assert client.delete(f"/api/admin/spaces/{space['id']}").status_code == 409


def test_agent_idempotency_keys_are_isolated_per_token(client: TestClient) -> None:
    bootstrap_and_login(client)
    first = _issue_agent_token(client, "first")
    second = _issue_agent_token(client, "second")
    space = client.post("/api/admin/spaces", json={"name": "Shared"}).json()
    assert client.put(
        f"/api/admin/spaces/{space['id']}/memberships",
        json={
            "members": [
                {"token_id": first["id"], "role": "contributor"},
                {"token_id": second["id"], "role": "contributor"},
            ]
        },
    ).status_code == 200

    for token, name in ((first["token"], "first-secret"), (second["token"], "second-secret")):
        response = client.post(
            f"/api/vault/spaces/{space['id']}/secrets",
            headers=_agent_headers(token, idempotency_key="same-agent-key-001"),
            json={"name": name, "type": "api_key", "value": f"{name}-value"},
        )
        assert response.status_code == 201

    listed = client.get("/api/admin/secrets")
    assert listed.status_code == 200
    assert listed.json()["total"] == 2
