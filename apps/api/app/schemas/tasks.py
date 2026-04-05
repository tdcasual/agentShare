from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.policy import ApprovalRule


class TaskCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "github"},
            "required_capability_ids": ["capability-1"],
            "playbook_ids": ["playbook-1"],
            "lease_allowed": False,
            "approval_mode": "auto",
            "approval_rules": [
                {
                    "decision": "manual",
                    "reason": "Production prompt runs require review",
                    "action_types": ["invoke"],
                    "task_types": ["prompt_run"],
                    "environments": ["production"],
                }
            ],
            "priority": "normal",
            "target_token_ids": ["token-1"],
            "target_mode": "explicit_tokens",
        },
    })

    title: str = Field(description="Short human-readable task title.")
    task_type: str = Field(description="Normalized task type used by agent allowlists.")
    input: dict[str, Any] = Field(default_factory=dict, description="Opaque task input payload.")
    required_capability_ids: list[str] = Field(
        default_factory=list,
        description="Capabilities the agent may use while executing this task.",
    )
    playbook_ids: list[str] = Field(
        default_factory=list,
        description="Referenced playbooks that provide operator or agent guidance for this task.",
    )
    lease_allowed: bool = Field(
        default=False,
        description="Whether the task may issue secret leases instead of proxy-only execution.",
    )
    approval_mode: Literal["auto", "manual"] = Field(
        default="auto",
        description="Approval mode for this task.",
    )
    approval_rules: list[ApprovalRule] = Field(
        default_factory=list,
        description="Optional policy rules evaluated before falling back to approval_mode.",
    )
    priority: str = Field(default="normal", description="Relative scheduling priority.")
    target_token_ids: list[str] = Field(
        default_factory=list,
        description="Concrete token ids that should receive this task when target_mode is explicit_tokens.",
    )
    target_mode: Literal["explicit_tokens", "broadcast"] = Field(
        default="broadcast",
        description="Whether to target explicit token ids or broadcast to all currently active tokens.",
    )

    @model_validator(mode="after")
    def validate_target_tokens(self) -> "TaskCreate":
        if len(set(self.target_token_ids)) != len(self.target_token_ids):
            raise ValueError("target_token_ids must be unique")
        if self.target_mode == "broadcast" and self.target_token_ids:
            raise ValueError("broadcast target_mode cannot include target_token_ids")
        if self.target_mode == "explicit_tokens" and not self.target_token_ids:
            raise ValueError("explicit_tokens target_mode requires target_token_ids")
        return self


class TaskComplete(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "result_summary": "Configuration synced",
            "output_payload": {"ok": True},
        },
    })

    result_summary: str = Field(description="Short summary of the completed work.")
    output_payload: dict[str, Any] = Field(default_factory=dict, description="Structured task output payload.")
