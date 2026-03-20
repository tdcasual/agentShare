from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApprovalActionType = Literal["invoke", "lease"]
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]


class ApprovalDecisionRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "reason": "Approved for this run window",
        },
    })

    reason: str = Field(default="", description="Optional operator note for this decision.")


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "approval-1",
            "task_id": "task-1",
            "capability_id": "capability-1",
            "agent_id": "agent-1",
            "action_type": "invoke",
            "status": "pending",
            "reason": "",
            "requested_by": "agent-1",
            "decided_by": None,
            "expires_at": None,
        },
    })

    id: str
    task_id: str
    capability_id: str
    agent_id: str
    action_type: ApprovalActionType
    status: ApprovalStatus
    reason: str
    requested_by: str
    decided_by: str | None
    expires_at: datetime | None
