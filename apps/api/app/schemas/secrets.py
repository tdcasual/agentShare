from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SecretCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "display_name": "OpenAI production key",
            "kind": "api_token",
            "value": "sk-live-example",
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read", "responses.write"],
            "resource_selector": "project:agent-share",
            "metadata": {"owner": "ml-platform"},
        },
    })

    display_name: str = Field(description="Human-readable label for the stored credential.")
    kind: str = Field(description="Credential kind such as api_token, cookie, or refresh_token.")
    value: str = Field(description="Plaintext credential value to store in the secret backend.")
    provider: str = Field(description="Normalized upstream provider identifier, such as openai or github.")
    environment: str | None = Field(
        default=None,
        description="Optional environment label used for compatibility checks, such as production or staging.",
    )
    provider_scopes: list[str] = Field(
        default_factory=list,
        description="Normalized provider-native scopes granted to this credential.",
    )
    resource_selector: str | None = Field(
        default=None,
        description="Optional provider-specific resource selector such as repo:agent-share.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Display-only metadata that is not used for runtime authorization checks.",
    )

    @model_validator(mode="before")
    @classmethod
    def upgrade_legacy_scope(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        scope = value.pop("scope", None)
        if not isinstance(scope, dict):
            return value

        metadata = value.get("metadata")
        if not isinstance(metadata, dict):
            metadata = {}

        known_fields = {"provider", "environment", "provider_scopes", "resource_selector", "metadata"}
        extras = {key: item for key, item in scope.items() if key not in known_fields}

        value.setdefault("provider", scope.get("provider"))
        value.setdefault("environment", scope.get("environment"))
        value.setdefault("provider_scopes", scope.get("provider_scopes", []))
        value.setdefault("resource_selector", scope.get("resource_selector"))
        value["metadata"] = {**metadata, **scope.get("metadata", {}), **extras}
        return value


class SecretResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "secret-1",
            "display_name": "OpenAI production key",
            "kind": "api_token",
            "scope": {
                "provider": "openai",
                "environment": "production",
                "provider_scopes": ["responses.read", "responses.write"],
                "resource_selector": "project:agent-share",
            },
            "provider": "openai",
            "environment": "production",
            "provider_scopes": ["responses.read", "responses.write"],
            "resource_selector": "project:agent-share",
            "metadata": {"owner": "ml-platform"},
            "backend_ref": "memory:secret-1",
            "publication_status": "active",
        },
    })

    id: str
    display_name: str
    kind: str
    scope: dict[str, Any]
    provider: str
    environment: str | None
    provider_scopes: list[str]
    resource_selector: str | None
    metadata: dict[str, Any]
    backend_ref: str
    publication_status: Literal["pending_review", "approved", "rejected", "active", "expired"]
    created_by_actor_type: str | None = None
    created_by_actor_id: str | None = None
    created_via_token_id: str | None = None
    reviewed_at: datetime | None = None
