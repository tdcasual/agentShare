from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OpenClawDreamRunCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "objective": "Inspect config drift and suggest a follow-up task.",
            "task_id": "task-123",
            "step_budget": 3,
        },
    })

    objective: str = Field(description="Explicit objective for the bounded dream run.")
    task_id: str | None = Field(default=None, description="Optional parent task that motivated the run.")
    step_budget: int | None = Field(default=None, description="Optional run-specific step budget override.")


class OpenClawDreamRunSummary(BaseModel):
    id: str
    agent_id: str
    session_id: str
    task_id: str | None = None
    objective: str
    status: str
    stop_reason: str | None = None
    step_budget: int
    consumed_steps: int
    created_followup_tasks: int
    started_by_actor_type: str
    started_by_actor_id: str
    runtime_metadata: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime


class OpenClawDreamRunListResponse(BaseModel):
    items: list[OpenClawDreamRunSummary] = Field(default_factory=list)


class OpenClawDreamStepCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "step_type": "plan",
            "status": "completed",
            "input_payload": {"prompt": "What should I do next?"},
            "output_payload": {"summary": "Search playbooks first."},
            "token_usage": {"input": 10, "output": 5},
        },
    })

    step_type: str = Field(description="Plan, reflect, propose_task, stop, or other explicit step type.")
    status: str = Field(default="completed", description="Recorded status for this step.")
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    token_usage: dict[str, Any] = Field(default_factory=dict)
    created_task_id: str | None = None


class OpenClawDreamStepSummary(BaseModel):
    id: str
    run_id: str
    step_index: int
    step_type: str
    status: str
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    token_usage: dict[str, Any] = Field(default_factory=dict)
    created_task_id: str | None = None
    updated_at: datetime


class OpenClawDreamStepCreateResponse(BaseModel):
    step: OpenClawDreamStepSummary
    run: OpenClawDreamRunSummary


class OpenClawDreamRunStop(BaseModel):
    stop_reason: str = Field(description="Explicit reason for stopping the run.")
