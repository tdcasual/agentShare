from typing import Any

from pydantic import BaseModel, Field


class TaskRecord(BaseModel):
    id: str
    title: str
    task_type: str
    input: dict[str, Any]
    required_capability_ids: list[str] = Field(default_factory=list)
    lease_allowed: bool = False
    approval_mode: str = "auto"
    priority: str = "normal"
    status: str = "pending"
    created_by: str = "human"
    claimed_by: str | None = None
