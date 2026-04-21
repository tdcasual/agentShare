from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RuntimePrincipal(BaseModel):
    actor_type: str = "openclaw_agent"
    id: str
    name: str
    issuer: str
    auth_method: str
    status: str = "active"
    token_id: str | None = None
    token_prefix: str | None = None
    subject_type: str | None = None
    subject_id: str | None = None
    expires_at: datetime | None = None
    scopes: list[str] = Field(default_factory=list)
    labels: dict[str, str] = Field(default_factory=dict)
    allowed_capability_ids: list[str] = Field(default_factory=list)
    allowed_task_types: list[str] = Field(default_factory=list)
    risk_tier: str = "medium"
    session_id: str | None = None
    session_key: str | None = None
    workspace_root: str | None = None
    agent_dir: str | None = None
    sandbox_mode: str | None = None
    tools_policy: dict = Field(default_factory=dict)
    skills_policy: dict = Field(default_factory=dict)
    dream_policy: dict = Field(default_factory=dict)

    @property
    def agent_id(self) -> str:
        return self.id

    @property
    def agent_name(self) -> str:
        return self.name
