"""Tests for VaultGate configuration settings."""
import json

import pytest

from app.config import DEFAULT_ENCRYPTION_KEY, Settings


def test_settings_default_to_sqlite():
    settings = Settings()
    assert "sqlite" in settings.database_url


def test_structured_postgres_settings_escape_reserved_password_characters():
    settings = Settings(
        app_env="development",
        database_url="",
        postgres_host="postgres",
        postgres_db="vaultgate",
        postgres_user="admin@example.com",
        postgres_password="p@ss:/?#% word",
    )

    assert settings.database_url == (
        "postgresql://admin%40example.com:p%40ss%3A%2F%3F%23%25 word@postgres:5432/vaultgate"
    )


def test_structured_postgres_settings_require_host_and_password():
    with pytest.raises(ValueError, match="POSTGRES_HOST and POSTGRES_PASSWORD"):
        Settings(app_env="development", database_url="", postgres_host="postgres")


def test_deployment_like_settings_require_explicit_app_env():
    with pytest.raises(ValueError, match="APP_ENV"):
        Settings(database_url="postgresql://postgres:postgres@db.example.com:5432/vaultgate")


def test_explicit_development_allows_local_postgres_stack():
    settings = Settings(
        app_env="development",
        database_url="postgresql://postgres:postgres@db.example.com:5432/vaultgate",
    )
    assert settings.app_env == "development"


def test_production_settings_reject_default_encryption_key():
    with pytest.raises(ValueError, match="ENCRYPTION_KEY"):
        Settings(
            app_env="production",
            encryption_key=DEFAULT_ENCRYPTION_KEY,
            session_secure=True,
        )


def test_production_settings_require_secure_cookie():
    with pytest.raises(ValueError, match="secure"):
        Settings(
            app_env="production",
            encryption_key="a" * 44,
            session_secure=False,
        )


def test_production_settings_require_bootstrap_token():
    with pytest.raises(ValueError, match="BOOTSTRAP_TOKEN"):
        Settings(
            app_env="production",
            encryption_key="YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
            session_secure=True,
        )


def test_valid_production_settings():
    settings = Settings(
        app_env="production",
        encryption_key="YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
        session_secure=True,
        bootstrap_token="bootstrap-token-with-at-least-32-bytes",
    )
    assert settings.is_production_like()
    assert settings.session_secure is True


def test_is_production_like():
    assert Settings(
        app_env="production",
        encryption_key="a" * 44,
        session_secure=True,
        bootstrap_token="bootstrap-token-with-at-least-32-bytes",
    ).is_production_like()
    assert Settings(
        app_env="staging",
        encryption_key="a" * 44,
        session_secure=True,
        bootstrap_token="bootstrap-token-with-at-least-32-bytes",
    ).is_production_like()
    assert not Settings(app_env="development").is_production_like()


def test_trusted_proxy_configuration_accepts_cidrs_and_rejects_invalid_values():
    settings = Settings(
        app_env="development",
        trusted_proxy_cidrs="172.30.0.0/24,2001:db8::/32",
    )
    assert settings.trusted_proxy_cidrs == "172.30.0.0/24,2001:db8::/32"

    with pytest.raises(ValueError, match="TRUSTED_PROXY_CIDRS"):
        Settings(app_env="development", trusted_proxy_cidrs="not-a-network")


def test_data_lifecycle_settings_reject_invalid_values():
    with pytest.raises(ValueError):
        Settings(app_env="development", last_used_write_interval_seconds=-1)
    with pytest.raises(ValueError):
        Settings(app_env="development", credential_retention_days=-1)
    with pytest.raises(ValueError):
        Settings(app_env="development", audit_retention_days=0)


def test_settings_load_production_secrets_from_files(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database_url_file = tmp_path / "database-url"
    encryption_key_file = tmp_path / "encryption-key"
    encryption_keyring_file = tmp_path / "encryption-keyring"
    bootstrap_token_file = tmp_path / "bootstrap-token"
    postgres_password_file = tmp_path / "postgres-password"
    database_url_file.write_text("postgresql://vaultgate:file-password@db/vaultgate\n")
    encryption_key_file.write_text(
        "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=\n"
    )
    encryption_keyring_file.write_text(
        json.dumps({"old": "b2xkLWtleS1tYXRlcmlhbC0zMi1ieXRlcy12YWx1ZSE="})
    )
    bootstrap_token_file.write_text("bootstrap-token-with-at-least-32-bytes\n")
    postgres_password_file.write_text("file-backed-postgres-password\n")

    settings = Settings(
        app_env="production",
        database_url_file=str(database_url_file),
        postgres_password_file=str(postgres_password_file),
        encryption_key_file=str(encryption_key_file),
        encryption_keyring_file=str(encryption_keyring_file),
        bootstrap_token_file=str(bootstrap_token_file),
        session_secure=True,
    )

    assert settings.postgres_password == "file-backed-postgres-password"
    assert settings.database_url == "postgresql://vaultgate:file-password@db/vaultgate"
    assert settings.encryption_key.startswith("YWJj")
    assert set(settings.encryption_keyring) == {"old"}
    assert settings.bootstrap_token == "bootstrap-token-with-at-least-32-bytes"


def test_settings_reject_ambiguous_direct_and_file_secret(tmp_path):
    key_file = tmp_path / "encryption-key"
    key_file.write_text("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")

    with pytest.raises(ValueError, match="either ENCRYPTION_KEY or ENCRYPTION_KEY_FILE"):
        Settings(
            app_env="development",
            encryption_key="a" * 44,
            encryption_key_file=str(key_file),
        )
