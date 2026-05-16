from typing import Any

from pydantic import BaseModel, Field


class RunResponse(BaseModel):
    id: str
    task_id: str
    agent_id: str
    access_token_id: str | None = None
    task_target_id: str | None = None
    status: str
    result_summary: str = ""
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error_summary: str = ""
    capability_invocations: list[Any] = Field(default_factory=list)
    lease_events: list[Any] = Field(default_factory=list)


class RunListResponse(BaseModel):
    items: list[RunResponse] = Field(default_factory=list)
