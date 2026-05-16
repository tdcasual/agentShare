from pydantic import BaseModel, ConfigDict, Field


class OpenClawAgentCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "openclaw-runtime",
            "workspace_root": "/srv/agents/openclaw-runtime",
            "agent_dir": ".openclaw/agents/openclaw-runtime",
            "model": "gpt-5",
            "thinking_level": "balanced",
            "sandbox_mode": "workspace-write",
            "risk_tier": "medium",
            "dream_policy": {
                "enabled": False,
                "max_steps_per_run": 3,
                "max_followup_tasks": 0,
                "allow_task_proposal": False,
                "allow_memory_write": False,
                "max_context_tokens": 4096,
            },
        },
    })

    name: str = Field(max_length=255, description="Human-readable OpenClaw agent name.")
    workspace_root: str = Field(max_length=512, description="Root workspace path controlled by this agent.")
    agent_dir: str = Field(max_length=512, description="Agent-local configuration directory relative to the workspace root.")
    model: str | None = Field(default=None, max_length=128, description="Optional default model for the agent runtime.")
    thinking_level: str = Field(default="balanced", max_length=32, description="Reasoning depth preset for the agent runtime.")
    sandbox_mode: str = Field(default="workspace-write", max_length=64, description="OpenClaw-style sandbox mode for this agent.")
    risk_tier: str = Field(default="medium", max_length=32, description="Risk tier preserved for policy and management summaries.")
    auth_method: str = Field(default="openclaw_session", max_length=64, description="Primary runtime auth method for this agent.")
    tools_policy: dict = Field(default_factory=dict, description="Declarative tool allow/deny policy.")
    skills_policy: dict = Field(default_factory=dict, description="Declarative skill allow/deny policy.")
    dream_policy: dict = Field(default_factory=dict, description="Bounded autonomy policy for Dream Mode.")
    allowed_capability_ids: list[str] = Field(default_factory=list, description="Capability allowlist for existing business policy checks.")
    allowed_task_types: list[str] = Field(default_factory=list, description="Task type allowlist for existing business policy checks.")


class OpenClawAgentUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    auth_method: str | None = None
    risk_tier: str | None = None
    workspace_root: str | None = None
    agent_dir: str | None = None
    model: str | None = None
    thinking_level: str | None = None
    sandbox_mode: str | None = None
    tools_policy: dict | None = None
    skills_policy: dict | None = None
    dream_policy: dict | None = None
    allowed_capability_ids: list[str] | None = None
    allowed_task_types: list[str] | None = None


class OpenClawAgentSummary(BaseModel):
    id: str
    name: str
    status: str
    auth_method: str
    risk_tier: str
    workspace_root: str
    agent_dir: str
    model: str | None = None
    thinking_level: str
    sandbox_mode: str
    dream_policy: dict = Field(default_factory=dict)
    tools_policy: dict = Field(default_factory=dict)
    skills_policy: dict = Field(default_factory=dict)
    allowed_capability_ids: list[str] = Field(default_factory=list)
    allowed_task_types: list[str] = Field(default_factory=list)


class OpenClawAgentFileSummary(BaseModel):
    agent_id: str
    file_name: str
    content: str


class OpenClawAgentFileUpdate(BaseModel):
    content: str = Field(description="Full file content for an OpenClaw workspace bootstrap file.")


class OpenClawAgentListResponse(BaseModel):
    items: list[OpenClawAgentSummary] = Field(default_factory=list)


class OpenClawAgentDeleteResponse(BaseModel):
    id: str
    status: str


class OpenClawAgentFileListResponse(BaseModel):
    items: list[OpenClawAgentFileSummary] = Field(default_factory=list)
