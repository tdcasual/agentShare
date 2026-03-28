import pytest
from pydantic import ValidationError

from app.config import Settings


def test_settings_default_to_local_services():
    settings = Settings()

    assert "agent_share" in settings.database_url
    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.secret_backend == "openbao"


def test_production_settings_reject_default_bootstrap_agent_key():
    with pytest.raises(ValueError, match="bootstrap"):
        Settings(
            app_env="production",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_agent_key="changeme-bootstrap-key",
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
            bootstrap_agent_key="custom-bootstrap-key",
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
            bootstrap_agent_key="custom-bootstrap-key",
            management_session_secret="custom-management-secret",
            management_session_secure=False,
        )


def test_settings_reject_unknown_management_operator_role():
    with pytest.raises(ValidationError, match="management_operator_role"):
        Settings(
            _env_file=None,
            management_operator_role="superadmin",
        )
