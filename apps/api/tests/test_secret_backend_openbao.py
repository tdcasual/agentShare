import httpx
import pytest

from app.config import Settings
from app.services.secret_backend import (
    OpenBaoSecretBackend,
    SecretBackendConfigurationError,
    get_secret_backend,
    get_secret_backend_for_ref,
)


def test_get_secret_backend_rejects_openbao_without_credentials():
    with pytest.raises(SecretBackendConfigurationError, match="SECRET_BACKEND=memory"):
        get_secret_backend(
            Settings(
                _env_file=None,
                secret_backend="openbao",
                openbao_addr=None,
                openbao_token=None,
            )
        )


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
    assert secret_id.startswith("secret-")
    assert secret_id != "secret-1"
    assert backend_ref == f"openbao:secret:agent-share/{secret_id}"
    assert captured[0][0] == "POST"
    assert captured[0][1] == f"/v1/secret/data/agent-share/{secret_id}"
    assert captured[0][2]["token"] == "root-token"
    assert captured[1][0] == "GET"
    assert captured[1][1] == f"/v1/secret/data/agent-share/{secret_id}"


def test_get_secret_backend_for_ref_supports_demo_seed_refs():
    backend = get_secret_backend_for_ref(
        "demo://secret-demo-market-active",
        Settings(secret_backend="memory"),
    )

    assert backend.backend_name == "demo"
    assert backend.read_secret("secret-demo-market-active", "demo://secret-demo-market-active")


def test_get_secret_backend_for_ref_rejects_unknown_prefixes():
    with pytest.raises(SecretBackendConfigurationError, match="Unsupported secret backend reference"):
        get_secret_backend_for_ref(
            "bogus://secret-1",
            Settings(secret_backend="memory"),
        )


def test_openbao_backend_without_explicit_settings_fails_with_configuration_error():
    backend = OpenBaoSecretBackend()

    with pytest.raises(RuntimeError, match="not configured"):
        backend.write_secret("remote-secret")


def test_openbao_backend_reuses_client_within_backend_instance(monkeypatch):
    client_instances: list[object] = []

    class FakeClient:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.requests: list[tuple[str, str, dict | None]] = []
            client_instances.append(self)

        def request(self, method: str, path: str, json: dict | None = None):
            self.requests.append((method, path, json))
            request = httpx.Request(method, f"http://127.0.0.1:8200{path}")
            if method == "POST":
                return httpx.Response(200, request=request, json={"data": {"version": 1}})
            return httpx.Response(
                200,
                request=request,
                json={"data": {"data": {"value": "remote-secret"}, "metadata": {"version": 1}}},
            )

    monkeypatch.setattr("app.services.secret_backend.httpx.Client", FakeClient)

    backend = OpenBaoSecretBackend(
        Settings(
            secret_backend="openbao",
            openbao_addr="http://127.0.0.1:8200",
            openbao_token="root-token",
            openbao_mount="secret",
            openbao_prefix="agent-share",
        )
    )

    secret_id, backend_ref = backend.write_secret("remote-secret")
    secret_value = backend.read_secret(secret_id, backend_ref)

    assert secret_value == "remote-secret"
    assert len(client_instances) == 1
    assert client_instances[0].requests == [
        ("POST", f"/v1/secret/data/agent-share/{secret_id}", {"data": {"value": "remote-secret"}}),
        ("GET", f"/v1/secret/data/agent-share/{secret_id}", None),
    ]
