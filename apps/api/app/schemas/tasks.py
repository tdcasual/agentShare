from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "github"},
            "required_capability_ids": ["capability-1"],
            "lease_allowed": False,
            "approval_mode": "auto",
            "priority": "normal",
        },
    })

    title: str = Field(description="Short human-readable task title.")
    task_type: str = Field(description="Normalized task type used by agent allowlists.")
    input: dict[str, Any] = Field(default_factory=dict, description="Opaque task input payload.")
    required_capability_ids: list[str] = Field(
        default_factory=list,
        description="Capabilities the agent may use while executing this task.",
    )
    lease_allowed: bool = Field(
        default=False,
        description="Whether the task may issue secret leases instead of proxy-only execution.",
    )
    approval_mode: str = Field(default="auto", description="Approval mode for this task.")
    priority: str = Field(default="normal", description="Relative scheduling priority.")


class TaskComplete(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "result_summary": "Configuration synced",
            "output_payload": {"ok": True},
        },
    })

    result_summary: str = Field(description="Short summary of the completed work.")
    output_payload: dict[str, Any] = Field(default_factory=dict, description="Structured task output payload.")
