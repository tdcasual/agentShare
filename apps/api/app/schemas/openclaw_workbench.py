from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OpenClawWorkbenchSessionCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "capability_id": "capability-openai-workbench",
            "title": "Deploy triage",
        },
    })

    capability_id: str = Field(description="Active capability used for assistant replies in this workbench session.")
    title: str | None = Field(default=None, description="Optional operator-facing conversation title.")


class OpenClawWorkbenchSessionSummary(BaseModel):
    id: str
    agent_id: str
    capability_id: str
    capability_name: str | None = None
    title: str
    status: str
    created_by_actor_id: str
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime


class OpenClawWorkbenchSessionListResponse(BaseModel):
    items: list[OpenClawWorkbenchSessionSummary] = Field(default_factory=list)


class OpenClawWorkbenchMessageSummary(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    message_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class OpenClawWorkbenchMessageListResponse(BaseModel):
    items: list[OpenClawWorkbenchMessageSummary] = Field(default_factory=list)


class OpenClawWorkbenchMessageCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content": "Please summarize the current deployment risk and next actions.",
            "temperature": 0.2,
            "max_tokens": 500,
        },
    })

    content: str = Field(description="Operator message content.")
    temperature: float | None = Field(default=None, description="Optional OpenAI chat temperature override.")
    max_tokens: int | None = Field(default=None, description="Optional assistant token cap override.")


class OpenClawWorkbenchMessageCreateResponse(BaseModel):
    session: OpenClawWorkbenchSessionSummary
    user_message: OpenClawWorkbenchMessageSummary
    assistant_message: OpenClawWorkbenchMessageSummary
