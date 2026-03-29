from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ReviewQueueItem(BaseModel):
    resource_kind: str
    resource_id: str
    title: str
    publication_status: str
    created_by_actor_type: str
    created_by_actor_id: str
    created_via_token_id: str | None = None
    reviewed_by_actor_id: str | None = None
    reviewed_at: datetime | None = None


class ReviewQueueResponse(BaseModel):
    items: list[ReviewQueueItem] = Field(default_factory=list)


class ReviewDecisionRequest(BaseModel):
    reason: str | None = None


class ReviewDecisionResponse(BaseModel):
    resource_kind: str
    resource_id: str
    publication_status: str
    reviewed_by_actor_id: str | None = None
    reviewed_at: datetime | None = None
