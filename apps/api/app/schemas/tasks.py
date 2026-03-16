from typing import Any

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str
    task_type: str
    input: dict[str, Any] = Field(default_factory=dict)
    required_capability_ids: list[str] = Field(default_factory=list)
    lease_allowed: bool = False
    approval_mode: str = "auto"
    priority: str = "normal"


class TaskComplete(BaseModel):
    result_summary: str
    output_payload: dict[str, Any] = Field(default_factory=dict)
