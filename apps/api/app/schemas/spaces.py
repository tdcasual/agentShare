from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SpaceCreateRequest(BaseModel):
    name: str
    summary: str = ""


class SpaceMemberCreateRequest(BaseModel):
    member_type: str
    member_id: str
    role: str = "participant"


class SpaceMemberResponse(BaseModel):
    id: str
    member_type: str
    member_id: str
    role: str
    created_at: datetime


class SpaceTimelineEntryResponse(BaseModel):
    id: str
    entry_type: str
    subject_type: str
    subject_id: str
    summary: str
    created_at: datetime


class SpaceResponse(BaseModel):
    id: str
    name: str
    summary: str
    status: str
    created_by_actor_id: str
    created_at: datetime
    updated_at: datetime
    members: list[SpaceMemberResponse] = Field(default_factory=list)
    timeline: list[SpaceTimelineEntryResponse] = Field(default_factory=list)


class SpaceListResponse(BaseModel):
    items: list[SpaceResponse] = Field(default_factory=list)
