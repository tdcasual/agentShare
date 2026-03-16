from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.agent import AgentIdentity


security = HTTPBearer(auto_error=False)

KNOWN_AGENTS = {
    "agent-test-token": AgentIdentity(
        id="agent-test",
        name="Test Agent",
        issuer="local-dev",
        auth_method="bearer",
        allowed_capability_ids=[],
        allowed_task_types=["config_sync", "account_read", "prompt_run"],
        risk_tier="medium",
    )
}


def require_agent(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AgentIdentity:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    agent = KNOWN_AGENTS.get(credentials.credentials)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")
    return agent
