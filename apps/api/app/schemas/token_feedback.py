from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TokenFeedbackCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "score": 5,
            "verdict": "accepted",
            "summary": "Looks good",
        },
    })

    score: int = Field(ge=1, le=5)
    verdict: str
    summary: str = ""


class TokenFeedbackResponse(BaseModel):
    id: str
    token_id: str
    task_target_id: str
    run_id: str
    source: str
    score: int
    verdict: str
    summary: str
    created_by_actor_type: str
    created_by_actor_id: str
    created_at: datetime


class TokenFeedbackListResponse(BaseModel):
    items: list[TokenFeedbackResponse] = Field(default_factory=list)
