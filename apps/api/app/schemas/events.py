from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EventResponse(BaseModel):
    id: str
    event_type: str
    actor_type: str
    actor_id: str
    subject_type: str
    subject_id: str
    summary: str
    details: str
    severity: str
    action_url: str | None = None
    metadata: dict = Field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseModel):
    items: list[EventResponse] = Field(default_factory=list)
