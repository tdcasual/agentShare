from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AgentTokenCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "display_name": "Staging worker token",
            "scopes": ["runtime"],
            "labels": {"environment": "staging"},
        },
    })

    display_name: str = Field(description="Human-readable name for this token.")
    scopes: list[str] = Field(default_factory=list, description="Optional narrowing scopes for this token.")
    labels: dict[str, str] = Field(default_factory=dict, description="Operator labels attached to this token.")
    expires_at: datetime | None = Field(default=None, description="Optional absolute expiry timestamp.")


class AgentTokenResponse(BaseModel):
    id: str
    agent_id: str
    display_name: str
    token_prefix: str
    status: str
    expires_at: datetime | None
    issued_by_actor_type: str
    issued_by_actor_id: str
    last_used_at: datetime | None
    scopes: list[str]
    labels: dict[str, str]
    api_key: str | None = None


class AgentTokenListResponse(BaseModel):
    items: list[AgentTokenResponse]


class AgentTokenRevokeResponse(BaseModel):
    id: str
    status: str
