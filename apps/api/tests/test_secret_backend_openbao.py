import httpx

from app.config import Settings
from app.services.secret_backend import OpenBaoSecretBackend, get_secret_backend


def test_get_secret_backend_falls_back_to_memory_without_openbao_credentials():
    backend = get_secret_backend(
        Settings(
            secret_backend="openbao",
            openbao_addr=None,
            openbao_token=None,
        )
    )

    assert backend.backend_name == "memory"


def test_openbao_backend_uses_kv_v2_data_paths_for_write_and_read():
    captured: list[tuple[str, str, dict | None]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = None
        if request.content:
            payload = httpx.Request(
                request.method, str(request.url), content=request.content
            ).read()
        captured.append((request.method, request.url.path, {"body": payload, "token": request.headers["X-Vault-Token"]}))
        if request.method == "POST":
            return httpx.Response(200, json={"data": {"version": 1}})
        return httpx.Response(
            200,
            json={"data": {"data": {"value": "remote-secret"}, "metadata": {"version": 1}}},
        )

    backend = OpenBaoSecretBackend(
        Settings(
            secret_backend="openbao",
            openbao_addr="http://127.0.0.1:8200",
            openbao_token="root-token",
            openbao_mount="secret",
            openbao_prefix="agent-share",
        ),
        transport=httpx.MockTransport(handler),
    )

    secret_id, backend_ref = backend.write_secret("remote-secret")
    secret_value = backend.read_secret(secret_id, backend_ref)

    assert secret_value == "remote-secret"
    assert backend_ref == "openbao:secret:agent-share/secret-1"
    assert captured[0][0] == "POST"
    assert captured[0][1] == "/v1/secret/data/agent-share/secret-1"
    assert captured[0][2]["token"] == "root-token"
    assert captured[1][0] == "GET"
    assert captured[1][1] == "/v1/secret/data/agent-share/secret-1"
