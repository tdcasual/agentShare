from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TaskTargetResponse(BaseModel):
    id: str
    task_id: str
    title: str
    task_type: str
    target_token_id: str
    status: str
    claimed_by_token_id: str | None = None
    claimed_by_agent_id: str | None = None
    claimed_at: datetime | None = None
    completed_at: datetime | None = None
    last_run_id: str | None = None


class TaskTargetListResponse(BaseModel):
    items: list[TaskTargetResponse] = Field(default_factory=list)
