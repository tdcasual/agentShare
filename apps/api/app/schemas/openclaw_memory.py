from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OpenClawMemoryNoteCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "scope": "agent",
            "kind": "working_note",
            "importance": "medium",
            "tags": ["config", "drift"],
            "content": "Config drift usually begins in the staging overlay.",
        },
    })

    scope: str = Field(default="agent")
    kind: str = Field(default="working_note")
    importance: str = Field(default="medium")
    tags: list[str] = Field(default_factory=list)
    content: str = Field(description="Explicit reusable memory content.")


class OpenClawMemoryNoteSummary(BaseModel):
    id: str
    agent_id: str
    session_id: str | None = None
    run_id: str | None = None
    scope: str
    kind: str
    importance: str
    tags: list[str] = Field(default_factory=list)
    content: str
    updated_at: datetime


class OpenClawMemoryNoteListResponse(BaseModel):
    items: list[OpenClawMemoryNoteSummary] = Field(default_factory=list)
