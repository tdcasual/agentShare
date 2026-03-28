from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from conftest import BOOTSTRAP_AGENT_KEY


def test_create_secret_returns_reference_only(management_client):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read"],
            "metadata": {"owner": "ml-platform"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "OpenAI prod key"
    assert "value" not in body
    assert body["backend_ref"].startswith("memory:")


def test_list_secrets_returns_redacted_metadata(management_client):
    management_client.post(
        "/api/secrets",
        json={
            "display_name": "QQ token",
            "kind": "api_token",
            "value": "qq-secret",
            "provider": "qq",
        },
    )

    response = management_client.get("/api/secrets")

    assert response.status_code == 200
    assert response.json()["items"][0]["display_name"] == "QQ token"
    assert "value" not in response.json()["items"][0]


def test_create_secret_uses_runtime_settings_for_secret_backend(monkeypatch, tmp_path):
    captured: list[str] = []

    class FakeBackend:
        def write_secret(self, value: str) -> tuple[str, str]:
            return ("secret-runtime", "memory:secret-runtime")

    def fake_get_secret_backend(settings: Settings):
        captured.append(settings.secret_backend)
        return FakeBackend()

    monkeypatch.setattr("app.routes.secrets.get_secret_backend", fake_get_secret_backend)
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'secret-runtime.db'}",
        bootstrap_agent_key=BOOTSTRAP_AGENT_KEY,
        management_session_secret="session-secret",
        secret_backend="memory",
    ))

    with TestClient(app) as client:
        login_response = client.post(
            "/api/session/login",
            json={"bootstrap_key": BOOTSTRAP_AGENT_KEY},
        )
        assert login_response.status_code == 200

        response = client.post(
            "/api/secrets",
            json={
                "display_name": "Runtime secret",
                "kind": "api_token",
                "value": "runtime-token",
                "provider": "openai",
            },
        )

    assert response.status_code == 201
    assert captured == ["memory"]
