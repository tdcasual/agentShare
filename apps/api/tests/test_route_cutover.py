from fastapi.testclient import TestClient


def test_only_new_admin_and_vault_routes_are_exposed(client: TestClient) -> None:
    openapi = client.get("/api/openapi.json")
    assert openapi.status_code == 200
    paths = set(openapi.json()["paths"])
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


def test_api_documentation_uses_api_namespace(client: TestClient) -> None:
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_agent_disable_has_no_legacy_delete_endpoint(client: TestClient) -> None:
    assert client.delete("/api/admin/agents/agent-id").status_code == 405
