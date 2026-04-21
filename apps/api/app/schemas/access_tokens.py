from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AccessTokenCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "display_name": "CI remote runner",
            "subject_type": "automation",
            "subject_id": "github-actions",
            "scopes": ["runtime"],
            "labels": {"env": "staging"},
            "policy": {"allowed_task_types": ["config_sync"]},
        },
    })

    display_name: str
    subject_type: str = Field(default="remote_caller")
    subject_id: str
    scopes: list[str] = Field(default_factory=list)
    labels: dict[str, str] = Field(default_factory=dict)
    policy: dict = Field(default_factory=dict)
    expires_at: datetime | None = None


class AccessTokenResponse(BaseModel):
    id: str
    display_name: str
    token_prefix: str
    status: str
    subject_type: str
    subject_id: str
    expires_at: datetime | None
    issued_by_actor_type: str
    issued_by_actor_id: str
    last_used_at: datetime | None
    scopes: list[str]
    labels: dict[str, str]
    policy: dict
    completed_runs: int = 0
    successful_runs: int = 0
    success_rate: float = 0.0
    last_feedback_at: datetime | None = None
    trust_score: float = 0.0
    api_key: str | None = None


class AccessTokenListResponse(BaseModel):
    items: list[AccessTokenResponse]


class AccessTokenRevokeResponse(BaseModel):
    id: str
    status: str
