"""VaultGate configuration.

This module defines VaultGate application settings.
"""
import os
from ipaddress import ip_network
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

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
    postgres_host: str = ""
    postgres_port: int = 5432
    postgres_db: str = "vaultgate"
    postgres_user: str = "postgres"
    postgres_password: str = ""

    # Encryption - AES-256-GCM key (32 bytes base64-encoded = 44 chars)
    encryption_key: str = DEFAULT_ENCRYPTION_KEY
    encryption_active_key_id: str = "current"
    encryption_keyring: dict[str, str] = Field(default_factory=dict)

    # Session - for web UI authentication cookies
    session_cookie_name: str = "vaultgate_session"
    session_ttl_seconds: int = 60 * 60 * 12  # 12 hours
    session_secure: bool = False  # Set True in production with HTTPS

    # One-time deployment credential required before the first administrator exists.
    bootstrap_token: str = ""

    # CORS
    cors_allowed_origins: str = ""
    cors_allow_credentials: bool = True

    # Rate limiting
    auth_rate_limit_max_attempts: int = 5
    auth_rate_limit_window_seconds: int = 300
    trusted_proxy_cidrs: str = ""

    # Data lifecycle
    last_used_write_interval_seconds: int = Field(default=300, ge=0)
    credential_retention_days: int = Field(default=30, ge=0)
    audit_retention_days: int = Field(default=365, ge=1)
    idempotency_retention_days: int = Field(default=7, ge=1, le=90)
    max_request_body_bytes: int = Field(default=2_097_152, ge=65_536, le=16_777_216)

    @field_validator("trusted_proxy_cidrs")
    @classmethod
    def validate_trusted_proxy_cidrs(cls, value: str) -> str:
        try:
            for network in value.split(","):
                if normalized := network.strip():
                    ip_network(normalized, strict=False)
        except ValueError as exc:
            raise ValueError("TRUSTED_PROXY_CIDRS must contain valid IP addresses or CIDRs") from exc
        return value

    @model_validator(mode="after")
    def validate_settings_for_environment(self) -> "Settings":
        """Validate settings based on environment."""
        if not self.database_url:
            if not self.postgres_host or not self.postgres_password:
                raise ValueError(
                    "DATABASE_URL or POSTGRES_HOST and POSTGRES_PASSWORD must be configured."
                )
            self.database_url = URL.create(
                "postgresql",
                username=self.postgres_user,
                password=self.postgres_password,
                host=self.postgres_host,
                port=self.postgres_port,
                database=self.postgres_db,
            ).render_as_string(hide_password=False)

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

            if len(self.bootstrap_token) < 32:
                raise ValueError(
                    "Production settings require a BOOTSTRAP_TOKEN of at least 32 characters."
                )

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
