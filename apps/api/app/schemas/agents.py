from pydantic import BaseModel, ConfigDict, Field


class AgentCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "deploy-bot",
            "risk_tier": "medium",
            "allowed_capability_ids": ["capability-1"],
            "allowed_task_types": ["config_sync", "account_read"],
        },
    })

    name: str = Field(description="Human-readable agent name.")
    risk_tier: str = Field(default="medium", description="Risk tier attached to the agent identity.")
    allowed_capability_ids: list[str] = Field(
        default_factory=list,
        description="Capability allowlist for this agent. Empty means unrestricted until a policy UI exists.",
    )
    allowed_task_types: list[str] = Field(
        default_factory=list,
        description="Task type allowlist for this agent. Empty means unrestricted until a policy UI exists.",
    )
