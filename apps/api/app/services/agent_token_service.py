from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.orm.agent_token import AgentTokenModel
from app.repositories.agent_repo import AgentRepository
from app.repositories.agent_token_repo import AgentTokenRepository
from app.services.identifiers import new_resource_id


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def mint_agent_token(
    session: Session,
    *,
    agent_id: str,
    display_name: str,
    issued_by_actor_type: str,
    issued_by_actor_id: str,
    scopes: list[str] | None = None,
    labels: dict[str, str] | None = None,
    expires_at: datetime | None = None,
) -> tuple[AgentTokenModel, str]:
    agent = AgentRepository(session).get(agent_id)
    if agent is None:
        raise NotFoundError("Agent not found")
    if agent.status != "active":
        raise ConflictError("Agent is not active")

    raw_token = secrets.token_urlsafe(32)
    model = AgentTokenModel(
        id=new_resource_id("token"),
        agent_id=agent_id,
        display_name=display_name,
        token_hash=hash_token(raw_token),
        token_prefix=raw_token[:10],
        status="active",
        expires_at=expires_at,
        issued_by_actor_type=issued_by_actor_type,
        issued_by_actor_id=issued_by_actor_id,
        scopes=scopes or [],
        labels=labels or {},
    )
    AgentTokenRepository(session).create(model)
    return model, raw_token


def list_agent_tokens(session: Session, agent_id: str) -> list[AgentTokenModel]:
    if AgentRepository(session).get(agent_id) is None:
        raise NotFoundError("Agent not found")
    return AgentTokenRepository(session).list_by_agent(agent_id)


def list_agent_tokens_bulk(session: Session, agent_ids: list[str]) -> dict[str, list[AgentTokenModel]]:
    grouped: dict[str, list[AgentTokenModel]] = {agent_id: [] for agent_id in agent_ids}
    for token in AgentTokenRepository(session).list_by_agents(agent_ids):
        grouped.setdefault(token.agent_id, []).append(token)
    return grouped


def revoke_agent_token(session: Session, token_id: str) -> AgentTokenModel:
    token = AgentTokenRepository(session).revoke(token_id)
    if token is None:
        raise NotFoundError("Agent token not found")
    return token


def is_token_active(token: AgentTokenModel) -> bool:
    if token.status != "active":
        return False
    if token.expires_at is None:
        return True
    expires_at = token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at > datetime.now(timezone.utc)


def touch_agent_token(session: Session, token: AgentTokenModel) -> AgentTokenModel:
    token.last_used_at = datetime.now(timezone.utc)
    return AgentTokenRepository(session).update(token)


def serialize_agent_token(model: AgentTokenModel, *, api_key: str | None = None) -> dict:
    return {
        "id": model.id,
        "agent_id": model.agent_id,
        "display_name": model.display_name,
        "token_prefix": model.token_prefix,
        "status": model.status,
        "expires_at": model.expires_at,
        "issued_by_actor_type": model.issued_by_actor_type,
        "issued_by_actor_id": model.issued_by_actor_id,
        "last_used_at": model.last_used_at,
        "scopes": model.scopes or [],
        "labels": model.labels or {},
        "completed_runs": model.completed_runs,
        "successful_runs": model.successful_runs,
        "success_rate": model.success_rate,
        "last_feedback_at": model.last_feedback_at,
        "trust_score": model.trust_score,
        "api_key": api_key,
    }
