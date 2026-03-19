from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.agent import AgentIdentity
from app.repositories.agent_repo import AgentRepository

security = HTTPBearer(auto_error=False)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def require_agent(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_db),
) -> AgentIdentity:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    api_key = credentials.credentials
    key_hash = _hash_key(api_key)
    repo = AgentRepository(session)
    agent_model = repo.find_by_api_key_hash(key_hash)
    if agent_model is None or agent_model.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")

    return AgentIdentity(
        id=agent_model.id,
        name=agent_model.name,
        issuer=agent_model.issuer,
        auth_method=agent_model.auth_method,
        allowed_capability_ids=agent_model.allowed_capability_ids or [],
        allowed_task_types=agent_model.allowed_task_types or [],
        risk_tier=agent_model.risk_tier,
    )


def require_bootstrap_agent(agent: AgentIdentity = Depends(require_agent)) -> AgentIdentity:
    if not is_bootstrap_agent(agent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bootstrap management credential required",
        )
    return agent


def is_bootstrap_agent(agent: AgentIdentity) -> bool:
    return agent.id == "bootstrap"


def ensure_task_type_allowed(agent: AgentIdentity, task_type: str) -> None:
    if is_bootstrap_agent(agent):
        return
    if agent.allowed_task_types and task_type not in agent.allowed_task_types:
        raise PermissionError("Agent is not allowed to claim this task type")


def ensure_capability_allowed(agent: AgentIdentity, capability_id: str) -> None:
    if is_bootstrap_agent(agent):
        return
    if agent.allowed_capability_ids and capability_id not in agent.allowed_capability_ids:
        raise PermissionError("Agent is not allowed to use this capability")
