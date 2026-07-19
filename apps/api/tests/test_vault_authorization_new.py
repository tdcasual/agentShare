from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from tests.test_admin_api import bootstrap_and_login


def _create_runtime_fixture(client: TestClient) -> tuple[str, str, str, str]:
    bootstrap_and_login(client)
    secret_ids: list[str] = []
    for name in ("allowed", "denied"):
        secret = client.post(
            "/api/admin/secrets",
            json={"name": name, "type": "password", "value": f"{name}-value"},
        )
        secret_ids.append(secret.json()["id"])
    agent = client.post("/api/admin/agents", json={"name": "runtime"}).json()
    issued = client.post(
        f"/api/admin/agents/{agent['id']}/tokens",
        json={"name": "runtime-token"},
    ).json()
    client.put(
        f"/api/admin/tokens/{issued['id']}/grants",
        json={"secret_ids": [secret_ids[0]]},
    )
    return agent["id"], issued["id"], issued["token"], secret_ids[1]


def test_vault_is_default_deny_and_persists_audit(client: TestClient) -> None:
    _agent_id, _token_id, token, denied_secret_id = _create_runtime_fixture(client)
    headers = {"Authorization": f"Bearer {token}"}

    visible = client.get("/api/vault/secrets", headers=headers)
    assert visible.status_code == 200
    assert [item["name"] for item in visible.json()["items"]] == ["allowed"]

    denied = client.get(f"/api/vault/secrets/{denied_secret_id}/value", headers=headers)
    assert denied.status_code == 403

    audit = client.get("/api/admin/audit-logs?result=denied")
    assert audit.status_code == 200
    assert audit.json()["total"] == 1
    assert audit.json()["items"][0]["reason"] == "grant_missing"


def test_revoked_token_and_disabled_agent_are_rejected(client: TestClient) -> None:
    agent_id, token_id, token, _ = _create_runtime_fixture(client)
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/vault/me", headers=headers).status_code == 200

    assert client.delete(f"/api/admin/tokens/{token_id}").status_code == 204
    assert client.get("/api/vault/me", headers=headers).status_code == 401

    replacement = client.post(
        f"/api/admin/agents/{agent_id}/tokens",
        json={"name": "replacement"},
    ).json()["token"]
    assert client.patch(
        f"/api/admin/agents/{agent_id}",
        json={"status": "disabled"},
    ).status_code == 200
    assert client.get(
        "/api/vault/me",
        headers={"Authorization": f"Bearer {replacement}"},
    ).status_code == 401


def test_audit_failure_does_not_return_secret_plaintext(client: TestClient) -> None:
    _agent_id, _token_id, token, _ = _create_runtime_fixture(client)
    headers = {"Authorization": f"Bearer {token}"}
    allowed_secret_id = client.get("/api/vault/secrets", headers=headers).json()["items"][0]["id"]

    with patch(
        "app.modules.vault.routes.write_vault_audit",
        new=AsyncMock(side_effect=RuntimeError("audit unavailable")),
    ):
        response = client.get(
            f"/api/vault/secrets/{allowed_secret_id}/value",
            headers=headers,
        )

    assert response.status_code == 500
    assert "allowed-value" not in response.text


def test_vault_access_with_oversized_secret_id_is_truncated_in_audit(client: TestClient) -> None:
    """An over-length secret_id path parameter must be truncated before the
    audit insert, returning a clean 4xx instead of a 500 on PostgreSQL."""
    _agent_id, _token_id, token, _ = _create_runtime_fixture(client)
    oversized_secret_id = "s" * 400

    response = client.get(
        f"/api/vault/secrets/{oversized_secret_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403

    audit = client.get(
        "/api/admin/audit-logs",
        params={"action": "secret.read", "result": "denied"},
    )
    assert audit.status_code == 200
    assert audit.json()["total"] == 1
    assert audit.json()["items"][0]["resource_id"] == oversized_secret_id[:255]
