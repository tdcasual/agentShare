"""Tests for VaultGate configuration settings."""
import pytest

from app.config import DEFAULT_ENCRYPTION_KEY, DEFAULT_SESSION_SECRET, Settings


def test_settings_default_to_sqlite():
    settings = Settings()
    assert "sqlite" in settings.database_url


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
            session_secret="a" * 32,
            session_secure=True,
        )


def test_production_settings_reject_default_session_secret():
    with pytest.raises(ValueError, match="SESSION_SECRET"):
        Settings(
            app_env="production",
            encryption_key="a" * 44,
            session_secret=DEFAULT_SESSION_SECRET,
            session_secure=True,
        )


def test_production_settings_require_secure_cookie():
    with pytest.raises(ValueError, match="secure"):
        Settings(
            app_env="production",
            encryption_key="a" * 44,
            session_secret="a" * 32,
            session_secure=False,
        )


def test_valid_production_settings():
    settings = Settings(
        app_env="production",
        encryption_key="YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
        session_secret="a-very-strong-production-session-secret-32chars",
        session_secure=True,
    )
    assert settings.is_production_like()
    assert settings.session_secure is True


def test_is_production_like():
    assert Settings(
        app_env="production",
        encryption_key="a" * 44,
        session_secret="a" * 32,
        session_secure=True,
    ).is_production_like()
    assert Settings(
        app_env="staging",
        encryption_key="a" * 44,
        session_secret="a" * 32,
        session_secure=True,
    ).is_production_like()
    assert not Settings(app_env="development").is_production_like()
