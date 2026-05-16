from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InvokeRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "task_id": "task-1",
            "parameters": {"prompt": "hello"},
        },
    })

    task_id: str = Field(max_length=128, description="Claimed task being executed.")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Capability-specific runtime parameters.")


class LeaseRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "task_id": "task-1",
            "purpose": "git cli access",
        },
    })

    task_id: str = Field(max_length=128, description="Claimed task requesting the lease.")
    purpose: str = Field(max_length=1000, description="Why proxy mode is insufficient and a lease is required.")
