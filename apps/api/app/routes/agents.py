from fastapi import APIRouter, Depends

from app.auth import require_agent
from app.models.agent import AgentIdentity


router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/me")
def read_agent_me(agent: AgentIdentity = Depends(require_agent)) -> dict:
    return agent.model_dump()
