from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.repositories.agent_repo import AgentRepository
from app.services.session_service import decode_management_session_token

security = HTTPBearer(auto_error=False)
management_security = APIKeyCookie(
    name="management_session",
    auto_error=False,
    scheme_name="ManagementSession",
)


class ManagementIdentity(BaseModel):
    id: str
    role: str
    actor_type: str = "human"
    auth_method: str = "session"
    issued_at: int
    expires_at: int


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def resolve_agent_from_api_key(api_key: str, session: Session) -> AgentIdentity | None:
    key_hash = _hash_key(api_key)
    repo = AgentRepository(session)
    agent_model = repo.find_by_api_key_hash(key_hash)
    if agent_model is None or agent_model.status != "active":
        return None

    return AgentIdentity(
        id=agent_model.id,
        name=agent_model.name,
        issuer=agent_model.issuer,
        auth_method=agent_model.auth_method,
        allowed_capability_ids=agent_model.allowed_capability_ids or [],
        allowed_task_types=agent_model.allowed_task_types or [],
        risk_tier=agent_model.risk_tier,
    )


def require_agent(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_db),
) -> AgentIdentity:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    agent = resolve_agent_from_api_key(credentials.credentials, session)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")

    return agent


def require_bootstrap_agent(agent: AgentIdentity = Depends(require_agent)) -> AgentIdentity:
    if not is_bootstrap_agent(agent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bootstrap management credential required",
        )
    return agent


def require_management_session(
    request: Request,
    settings: Settings = Depends(get_settings),
    _documented_session_token: str | None = Depends(management_security),
) -> ManagementIdentity:
    session_token = request.cookies.get(settings.management_session_cookie_name)
    if session_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing management session",
        )

    try:
        payload = decode_management_session_token(session_token, settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return ManagementIdentity(
        id=payload.actor_id,
        role=payload.role,
        actor_type=payload.actor_type,
        auth_method=payload.auth_method,
        issued_at=payload.iat,
        expires_at=payload.exp,
    )


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
