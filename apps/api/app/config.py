from typing import Literal

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_BOOTSTRAP_OWNER_KEY = "changeme-bootstrap-key"
DEFAULT_MANAGEMENT_SESSION_SECRET = "changeme-management-session-secret"
ManagementRole = Literal["viewer", "operator", "admin", "owner"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(populate_by_name=True, extra="forbid")

    app_env: Literal["development", "staging", "production"] = "development"
    database_url: str = "sqlite:///./agent_share.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "memory"
    openbao_addr: str | None = Field(
        default=None,
        validation_alias=AliasChoices("openbao_addr", "OPENBAO_ADDR", "secret_backend_url", "SECRET_BACKEND_URL"),
    )
    openbao_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("openbao_token", "OPENBAO_TOKEN", "secret_backend_token", "SECRET_BACKEND_TOKEN"),
    )
    openbao_token_file: str | None = Field(
        default=None,
        validation_alias=AliasChoices("openbao_token_file", "OPENBAO_TOKEN_FILE"),
    )
    openbao_mount: str = "secret"
    openbao_prefix: str = "agent-share"
    bootstrap_owner_key: str = DEFAULT_BOOTSTRAP_OWNER_KEY
    management_session_secret: str = DEFAULT_MANAGEMENT_SESSION_SECRET
    management_session_cookie_name: str = "management_session"
    management_session_ttl_seconds: int = 60 * 60 * 12
    management_session_secure: bool = False
    operator_identity_provider: Literal["local"] = "local"
    metrics_enabled: bool = True
    demo_seed_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "demo_seed_enabled",
            "DEMO_SEED_ENABLED",
            "CONTROL_PLANE_DEMO_SEED_ENABLED",
        ),
    )

    @model_validator(mode="after")
    def validate_secret_backend_for_environment(self) -> "Settings":
        if (not self.openbao_token) and self.openbao_token_file:
            with open(self.openbao_token_file, "r", encoding="utf-8") as token_file:
                self.openbao_token = token_file.read().strip() or None

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

        if self.is_production_like() and self.bootstrap_owner_key == DEFAULT_BOOTSTRAP_OWNER_KEY:
            raise ValueError("Production settings must not use the default bootstrap owner key.")

        if self.is_production_like() and self.management_session_secret == DEFAULT_MANAGEMENT_SESSION_SECRET:
            raise ValueError("Production settings must not use the default management session secret.")

        if self.is_production_like() and not self.management_session_secure:
            raise ValueError("Production settings require secure management session cookies.")

        if self.is_production_like() and self.demo_seed_enabled:
            raise ValueError("Demo seed mode is only allowed in development.")

        return self

    def is_production_like(self) -> bool:
        return self.app_env in {"staging", "production"}
