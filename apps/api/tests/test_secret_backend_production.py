from pydantic import ValidationError

from app.config import Settings
from app.services.secret_backend import OpenBaoSecretBackend, get_secret_backend


def test_production_openbao_backend_requires_credentials() -> None:
    try:
        Settings(
            _env_file=None,
            app_env="production",
            secret_backend="openbao",
            openbao_addr=None,
            openbao_token=None,
        )
    except ValidationError as exc:
        assert "OpenBao credentials are required" in str(exc)
    else:
        raise AssertionError("Expected production settings to reject missing OpenBao credentials")


def test_staging_openbao_backend_requires_credentials() -> None:
    try:
        Settings(
            _env_file=None,
            app_env="staging",
            secret_backend="openbao",
            openbao_addr=None,
            openbao_token=None,
        )
    except ValidationError as exc:
        assert "OpenBao credentials are required" in str(exc)
    else:
        raise AssertionError("Expected staging settings to reject missing OpenBao credentials")


def test_development_openbao_backend_can_fall_back_to_memory() -> None:
    backend = get_secret_backend(
        Settings(
            _env_file=None,
            app_env="development",
            secret_backend="openbao",
            openbao_addr=None,
            openbao_token=None,
        )
    )

    assert backend.backend_name == "memory"


def test_external_secret_backend_aliases_map_to_openbao_settings() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        secret_backend="openbao",
        secret_backend_url="https://vault.example.com",
        secret_backend_token="scoped-token",
    )

    backend = get_secret_backend(settings)

    assert settings.openbao_addr == "https://vault.example.com"
    assert settings.openbao_token == "scoped-token"
    assert isinstance(backend, OpenBaoSecretBackend)
