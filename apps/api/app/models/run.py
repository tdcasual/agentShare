from typing import Any

from pydantic import BaseModel, Field


class RunRecord(BaseModel):
    id: str
    task_id: str
    agent_id: str
    status: str
    result_summary: str = ""
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error_summary: str = ""
    capability_invocations: list[dict[str, Any]] = Field(default_factory=list)
    lease_events: list[dict[str, Any]] = Field(default_factory=list)
