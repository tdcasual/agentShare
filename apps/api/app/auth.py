from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import ManagementRole, Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.repositories.access_token_repo import AccessTokenRepository
from app.repositories.agent_repo import AgentRepository
from app.repositories.agent_token_repo import AgentTokenRepository
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.openclaw_session_repo import OpenClawSessionRepository
from app.services.access_token_service import (
    hash_access_token,
    is_access_token_active,
    touch_access_token,
)
from app.services.agent_token_service import (
    hash_token,
    is_token_active,
    touch_agent_token,
)
from app.services.openclaw_runtime_service import build_runtime_principal
from app.services.policy_service import ensure_management_action_allowed
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


class AuthenticatedActor(BaseModel):
    actor_type: str
    id: str
    auth_method: str
    role: ManagementRole | None = None
    token_id: str | None = None


def resolve_agent_from_api_key(api_key: str, session: Session) -> AgentIdentity | None:
    openclaw_session = OpenClawSessionRepository(session).find_by_session_key(api_key)
    if openclaw_session is not None:
        openclaw_agent = OpenClawAgentRepository(session).get(openclaw_session.agent_id)
        if openclaw_agent is not None and openclaw_agent.status == "active":
            return build_runtime_principal(
                agent=openclaw_agent,
                session=openclaw_session,
                session_key=api_key,
            )

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

    access_token = AccessTokenRepository(session).find_by_token_hash(hash_access_token(api_key))
    if access_token is None or not is_access_token_active(access_token):
        return None

    touch_access_token(session, access_token)
    return AgentIdentity(
        id=access_token.subject_id,
        name=access_token.display_name,
        issuer=access_token.subject_type,
        auth_method="access_token",
        status=access_token.status,
        token_id=access_token.id,
        token_prefix=access_token.token_prefix,
        expires_at=access_token.expires_at,
        scopes=access_token.scopes or [],
        labels=access_token.labels or {},
        allowed_capability_ids=[],
        allowed_task_types=[],
        risk_tier="medium",
    )


def require_agent(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_db),
) -> AgentIdentity:
    agent = _require_known_agent(credentials, session)
    if is_bootstrap_agent(agent):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")
    ensure_runtime_scope_allowed(agent)

    return agent


def require_management_session(
    request: Request,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _documented_session_token: str | None = Depends(management_security),
) -> ManagementIdentity:
    return _resolve_management_identity(request, session, settings)


def _resolve_management_identity(
    request: Request,
    session: Session,
    settings: Settings,
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


def require_management_or_agent(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _documented_session_token: str | None = Depends(management_security),
) -> AuthenticatedActor:
    if credentials is not None:
        agent = resolve_agent_from_api_key(credentials.credentials, session)
        if agent is not None and not is_bootstrap_agent(agent):
            ensure_runtime_scope_allowed(agent)
            return AuthenticatedActor(
                actor_type="agent",
                id=agent.id,
                auth_method=agent.auth_method,
                token_id=agent.token_id,
            )

    if request.cookies.get(settings.management_session_cookie_name) is not None:
        identity = _resolve_management_identity(request, session, settings)
        return AuthenticatedActor(
            actor_type=identity.actor_type,
            id=identity.id,
            auth_method=identity.auth_method,
            role=identity.role,
        )

    if credentials is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")

    identity = _resolve_management_identity(request, session, settings)
    return AuthenticatedActor(
        actor_type=identity.actor_type,
        id=identity.id,
        auth_method=identity.auth_method,
        role=identity.role,
    )


def require_admin_management_or_agent(
    actor: AuthenticatedActor = Depends(require_management_or_agent),
) -> AuthenticatedActor:
    if actor.actor_type == "human" and actor.role is not None:
        if MANAGEMENT_ROLE_LEVELS[actor.role] < MANAGEMENT_ROLE_LEVELS["admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="admin role required",
            )
    return actor


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


def require_management_action(action: str):
    def dependency(
        identity: ManagementIdentity = Depends(require_management_session),
    ) -> ManagementIdentity:
        try:
            ensure_management_action_allowed(identity.role, action)
        except PermissionError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            ) from exc
        return identity

    dependency.__name__ = f"require_management_action_{action.replace(':', '_')}"
    return dependency


def require_management_or_agent_action(action: str):
    def dependency(
        actor: AuthenticatedActor = Depends(require_management_or_agent),
    ) -> AuthenticatedActor:
        if actor.actor_type == "human" and actor.role is not None:
            try:
                ensure_management_action_allowed(actor.role, action)
            except PermissionError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(exc),
                ) from exc
        return actor

    dependency.__name__ = f"require_management_or_agent_action_{action.replace(':', '_')}"
    return dependency


require_operator_management_session = require_management_role("operator")
require_admin_management_session = require_management_role("admin")
require_owner_management_session = require_management_role("owner")


def _require_known_agent(
    credentials: HTTPAuthorizationCredentials | None,
    session: Session,
) -> AgentIdentity:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    agent = resolve_agent_from_api_key(credentials.credentials, session)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent")
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


def ensure_runtime_scope_allowed(agent: AgentIdentity) -> None:
    if is_bootstrap_agent(agent):
        return
    if agent.scopes and "runtime" not in set(agent.scopes):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent token lacks runtime scope",
        )
