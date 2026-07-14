"""VaultGate configuration.

This module defines VaultGate application settings.
"""
import os
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Defaults - MUST be changed in production
# Valid base64-encoded 32-byte key for AES-256-GCM (development only)
DEFAULT_ENCRYPTION_KEY = "ZGV2LW9ubHktMzItYnl0ZS1lbmNyeXB0aW9uLWtleSE="  # DO NOT use in production


class Settings(BaseSettings):
    """VaultGate application settings."""

    model_config = SettingsConfigDict(populate_by_name=True, extra="forbid")

    # Environment
    app_env: Literal["development", "staging", "production"] = "development"

    # Database
    database_url: str = "sqlite:///./vaultgate.db"

    # Encryption - AES-256-GCM key (32 bytes base64-encoded = 44 chars)
    encryption_key: str = DEFAULT_ENCRYPTION_KEY

    # Session - for web UI authentication cookies
    session_cookie_name: str = "vaultgate_session"
    session_ttl_seconds: int = 60 * 60 * 12  # 12 hours
    session_secure: bool = False  # Set True in production with HTTPS

    # CORS
    cors_allowed_origins: str = ""
    cors_allow_credentials: bool = True

    # Rate limiting
    auth_rate_limit_max_attempts: int = 5
    auth_rate_limit_window_seconds: int = 300
    trusted_proxy_ips: str = ""

    @model_validator(mode="after")
    def validate_settings_for_environment(self) -> "Settings":
        """Validate settings based on environment."""
        if self._requires_explicit_app_env():
            raise ValueError(
                "APP_ENV must be set explicitly for non-local deployments instead of relying on the development default."
            )

        if self.is_production_like():
            # Validate encryption key
            if self.encryption_key == DEFAULT_ENCRYPTION_KEY:
                raise ValueError(
                    "Production settings must use a strong ENCRYPTION_KEY. "
                    "Generate with: python -c 'import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'"
                )

            # Validate secure cookies
            if not self.session_secure:
                raise ValueError("Production settings require secure session cookies (SESSION_SECURE=true).")

        return self

    def is_production_like(self) -> bool:
        """Check if running in production-like environment."""
        return self.app_env in {"staging", "production"}

    def _requires_explicit_app_env(self) -> bool:
        """Check if APP_ENV must be explicitly set."""
        if self.is_production_like():
            return False
        if "app_env" in self.model_fields_set:
            return False
        if os.getenv("APP_ENV") is not None:
            return False

        return not self.database_url.startswith("sqlite")
