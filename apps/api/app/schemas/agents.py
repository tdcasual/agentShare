from pydantic import BaseModel


class AgentCreate(BaseModel):
    name: str
    risk_tier: str = "medium"
    allowed_capability_ids: list[str] = []
    allowed_task_types: list[str] = []
