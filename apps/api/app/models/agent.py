from pydantic import BaseModel


class AgentIdentity(BaseModel):
    id: str
    name: str
    issuer: str
    auth_method: str
    status: str = "active"
    allowed_capability_ids: list[str] = []
    allowed_task_types: list[str] = []
    risk_tier: str = "medium"
