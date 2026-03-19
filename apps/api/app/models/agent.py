from pydantic import BaseModel, Field


class AgentIdentity(BaseModel):
    id: str
    name: str
    issuer: str
    auth_method: str
    status: str = "active"
    allowed_capability_ids: list[str] = Field(default_factory=list)
    allowed_task_types: list[str] = Field(default_factory=list)
    risk_tier: str = "medium"
