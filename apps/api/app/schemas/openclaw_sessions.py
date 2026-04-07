from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OpenClawSessionCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "session_key": "sess_openclaw_primary",
            "display_name": "Primary chat session",
            "channel": "chat",
            "subject": "deployment triage",
        },
    })

    session_key: str = Field(description="Stable OpenClaw session key.")
    display_name: str = Field(description="Friendly session label shown in management UIs.")
    channel: str = Field(default="chat", description="Runtime channel such as chat, workflow, or inbox.")
    subject: str | None = Field(default=None, description="Optional session topic or work subject.")


class OpenClawSessionSummary(BaseModel):
    id: str
    agent_id: str
    session_key: str
    display_name: str
    channel: str
    subject: str | None = None
    transcript_metadata: dict = Field(default_factory=dict)
    input_tokens: int
    output_tokens: int
    context_tokens: int
    updated_at: datetime


class OpenClawSessionListResponse(BaseModel):
    items: list[OpenClawSessionSummary] = Field(default_factory=list)
