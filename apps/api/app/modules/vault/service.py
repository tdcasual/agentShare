from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin_auth.service import hash_credential
from app.orm import Agent, AgentStatus, AgentToken, Secret, TokenSecretGrant


@dataclass(frozen=True)
class AgentPrincipal:
    token: AgentToken
    agent: Agent


async def resolve_agent_principal(request: Request, db: AsyncSession) -> AgentPrincipal:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent token required")
    raw_value = authorization.removeprefix("Bearer ")
    if not raw_value.startswith("vg_") or raw_value.startswith("vgm_"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent token")
    token = await db.scalar(
        select(AgentToken).where(AgentToken.key_hash == hash_credential(raw_value))
    )
    if token is None or not token.is_valid():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent token")
    agent = await db.get(Agent, token.agent_id)
    if agent is None or agent.status != AgentStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent is disabled")
    token.last_used_at = datetime.now(UTC)
    await db.commit()
    return AgentPrincipal(token=token, agent=agent)


async def granted_secret(db: AsyncSession, token_id: str, secret_id: str) -> Secret | None:
    secret: Secret | None = await db.scalar(
        select(Secret)
        .join(TokenSecretGrant, TokenSecretGrant.secret_id == Secret.id)
        .where(TokenSecretGrant.token_id == token_id, Secret.id == secret_id)
    )
    return secret
