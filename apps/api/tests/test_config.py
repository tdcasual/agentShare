import pytest

from app.config import DEFAULT_BOOTSTRAP_OWNER_KEY, Settings


def test_settings_default_to_local_services():
    settings = Settings()

    assert "agent_share" in settings.database_url
    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.secret_backend == "memory"


def test_settings_read_bootstrap_owner_key_from_new_env_only(monkeypatch):
    monkeypatch.setenv("BOOTSTRAP_OWNER_KEY", "owner-bootstrap-xyz")
    monkeypatch.setenv("BOOTSTRAP_AGENT_KEY", "legacy-agent-bootstrap-xyz")

    settings = Settings()

    assert settings.bootstrap_owner_key == "owner-bootstrap-xyz"
    assert settings.bootstrap_owner_key != "legacy-agent-bootstrap-xyz"


def test_deployment_like_settings_require_explicit_app_env():
    with pytest.raises(ValueError, match="APP_ENV"):
        Settings(database_url="postgresql://postgres:postgres@db.example.com:5432/agent_share")


def test_explicit_development_allows_local_postgres_stack():
    settings = Settings(
        app_env="development",
        database_url="postgresql://postgres:postgres@db.example.com:5432/agent_share",
    )

    assert settings.app_env == "development"


def test_production_settings_reject_default_bootstrap_owner_key():
    with pytest.raises(ValueError, match="bootstrap"):
        Settings(
            app_env="production",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_owner_key=DEFAULT_BOOTSTRAP_OWNER_KEY,
            management_session_secret="custom-management-secret",
            management_session_secure=True,
        )


def test_production_settings_reject_default_management_secret():
    with pytest.raises(ValueError, match="management session"):
        Settings(
            app_env="production",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_owner_key="custom-bootstrap-key",
            management_session_secret="changeme-management-session-secret",
            management_session_secure=True,
        )


def test_production_settings_require_secure_management_cookie():
    with pytest.raises(ValueError, match="secure"):
        Settings(
            app_env="production",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_owner_key="custom-bootstrap-key",
            management_session_secret="custom-management-secret",
            management_session_secure=False,
        )


def test_settings_can_read_openbao_token_from_file(tmp_path):
    token_file = tmp_path / "openbao-token"
    token_file.write_text("file-token-xyz\n")

    settings = Settings(
        secret_backend="openbao",
        openbao_addr="http://openbao:8200",
        openbao_token=None,
        openbao_token_file=str(token_file),
    )

    assert settings.openbao_token == "file-token-xyz"
