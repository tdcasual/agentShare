from fastapi.testclient import TestClient


def test_only_new_admin_and_vault_routes_are_exposed(client: TestClient) -> None:
    paths = set(client.get("/openapi.json").json()["paths"])
    assert "/api/admin/bootstrap/status" in paths
    assert "/api/admin/session/login" in paths
    assert "/api/admin/agents" in paths
    assert "/api/vault/secrets" in paths

    for old_path in (
        "/api/bootstrap/status",
        "/api/session/login",
        "/api/secrets",
        "/api/tokens",
        "/api/audit-logs",
        "/api/me",
    ):
        assert old_path not in paths
        assert client.get(old_path).status_code == 404
