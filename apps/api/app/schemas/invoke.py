from typing import Any

from pydantic import BaseModel, Field


class InvokeRequest(BaseModel):
    task_id: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class LeaseRequest(BaseModel):
    task_id: str
    purpose: str
