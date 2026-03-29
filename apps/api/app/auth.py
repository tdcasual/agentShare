from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import ManagementRole, Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.repositories.agent_repo import AgentRepository
from app.repositories.agent_token_repo import AgentTokenRepository
from app.services.agent_token_service import (
    build_legacy_runtime_token_id,
    hash_token,
    is_token_active,
    touch_agent_token,
)
from app.services.session_service import authenticate_management_session_token

security = HTTPBearer(auto_error=False)
management_security = APIKeyCookie(
    name="management_session",
    auto_error=False,
    scheme_name="ManagementSession",
)


MANAGEMENT_ROLE_LEVELS: dict[ManagementRole, int] = {
    "viewer": 0,
    "operator": 1,
    "admin": 2,
    "owner": 3,
}


class ManagementIdentity(BaseModel):
    id: str
    email: str
    role: ManagementRole
    actor_type: str = "human"
    auth_method: str = "session"
    session_id: str
    issued_at: int
    expires_at: int


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def resolve_agent_from_api_key(api_key: str, session: Session) -> AgentIdentity | None:
    key_hash = hash_token(api_key)
    token_repo = AgentTokenRepository(session)
    token_model = token_repo.find_by_token_hash(key_hash)
    if token_model is not None:
        agent_model = AgentRepository(session).get(token_model.agent_id)
        if agent_model is None or agent_model.status != "active" or not is_token_active(token_model):
            return None
        touch_agent_token(session, token_model)
        return AgentIdentity(
            id=agent_model.id,
            name=agent_model.name,
            issuer=agent_model.issuer,
            auth_method=agent_model.auth_method,
            status=agent_model.status,
            token_id=token_model.id,
            token_prefix=token_model.token_prefix,
            expires_at=token_model.expires_at,
            scopes=token_model.scopes or [],
            labels=token_model.labels or {},
            allowed_capability_ids=agent_model.allowed_capability_ids or [],
            allowed_task_types=agent_model.allowed_task_types or [],
            risk_tier=agent_model.risk_tier,
        )

    repo = AgentRepository(session)
    agent_model = repo.find_by_api_key_hash(key_hash)
    if agent_model is None or agent_model.status != "active":
        return None

    return AgentIdentity(
        id=agent_model.id,
        name=agent_model.name,
        issuer=agent_model.issuer,
        auth_method=agent_model.auth_method,
        status=agent_model.status,
        token_id="bootstrap" if agent_model.id == "bootstrap" else build_legacy_runtime_token_id(agent_model),
        token_prefix=api_key[:10],
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
    session: Session = Depends(get_db),
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
        payload = authenticate_management_session_token(session_token, settings, session)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return ManagementIdentity(
        id=payload.actor_id,
        email=payload.email,
        role=payload.role,
        actor_type=payload.actor_type,
        auth_method=payload.auth_method,
        session_id=payload.session_id,
        issued_at=payload.iat,
        expires_at=payload.exp,
    )


def require_management_role(minimum_role: ManagementRole):
    def dependency(
        identity: ManagementIdentity = Depends(require_management_session),
    ) -> ManagementIdentity:
        if MANAGEMENT_ROLE_LEVELS[identity.role] < MANAGEMENT_ROLE_LEVELS[minimum_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{minimum_role} role required",
            )
        return identity

    dependency.__name__ = f"require_management_{minimum_role}"
    return dependency


require_operator_management_session = require_management_role("operator")
require_admin_management_session = require_management_role("admin")
require_owner_management_session = require_management_role("owner")


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
