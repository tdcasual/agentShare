from typing import Literal

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_BOOTSTRAP_AGENT_KEY = "changeme-bootstrap-key"
DEFAULT_MANAGEMENT_SESSION_SECRET = "changeme-management-session-secret"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(populate_by_name=True, extra="forbid")

    app_env: Literal["development", "staging", "production"] = "development"
    database_url: str = "sqlite:///./agent_share.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "openbao"
    openbao_addr: str | None = Field(
        default=None,
        validation_alias=AliasChoices("openbao_addr", "OPENBAO_ADDR", "secret_backend_url", "SECRET_BACKEND_URL"),
    )
    openbao_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("openbao_token", "OPENBAO_TOKEN", "secret_backend_token", "SECRET_BACKEND_TOKEN"),
    )
    openbao_mount: str = "secret"
    openbao_prefix: str = "agent-share"
    bootstrap_agent_key: str = DEFAULT_BOOTSTRAP_AGENT_KEY
    management_session_secret: str = DEFAULT_MANAGEMENT_SESSION_SECRET
    management_session_cookie_name: str = "management_session"
    management_session_ttl_seconds: int = 60 * 60 * 12
    management_session_secure: bool = False
    metrics_enabled: bool = True

    @model_validator(mode="after")
    def validate_secret_backend_for_environment(self) -> "Settings":
        if self.secret_backend == "memory" and self.is_production_like():
            raise ValueError("APP_ENV staging/production does not allow SECRET_BACKEND=memory.")

        if (
            self.secret_backend == "openbao"
            and self.is_production_like()
            and (not self.openbao_addr or not self.openbao_token)
        ):
            raise ValueError(
                "OpenBao credentials are required in staging/production when SECRET_BACKEND=openbao."
            )

        if self.is_production_like() and self.bootstrap_agent_key == DEFAULT_BOOTSTRAP_AGENT_KEY:
            raise ValueError("Production settings must not use the default bootstrap agent key.")

        if self.is_production_like() and self.management_session_secret == DEFAULT_MANAGEMENT_SESSION_SECRET:
            raise ValueError("Production settings must not use the default management session secret.")

        if self.is_production_like() and not self.management_session_secure:
            raise ValueError("Production settings require secure management session cookies.")

        return self

    def is_production_like(self) -> bool:
        return self.app_env in {"staging", "production"}
