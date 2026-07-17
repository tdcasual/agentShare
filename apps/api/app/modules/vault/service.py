from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.maintenance import should_update_last_used
from app.modules.admin_auth.service import hash_credential
from app.modules.audit.service import write_auth_failure_audit
from app.orm import Agent, AgentStatus, AgentToken, Secret, TokenSecretGrant


@dataclass(frozen=True)
class AgentPrincipal:
    token: AgentToken
    agent: Agent


async def resolve_agent_principal(request: Request, db: AsyncSession) -> AgentPrincipal:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        await write_auth_failure_audit(
            db,
            request,
            action="agent_auth.failed",
            actor_type="anonymous",
            actor_label="anonymous",
            reason="agent_token_required",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent token required")
    raw_value = authorization.removeprefix("Bearer ")
    if not raw_value.startswith("vg_") or raw_value.startswith("vgm_"):
        await write_auth_failure_audit(
            db,
            request,
            action="agent_auth.failed",
            actor_type="unknown_agent_token",
            actor_label=raw_value[:16] or "unknown",
            reason="invalid_agent_token_type",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent token")
    token = await db.scalar(
        select(AgentToken).where(AgentToken.key_hash == hash_credential(raw_value))
    )
    if token is None or not token.is_valid():
        await write_auth_failure_audit(
            db,
            request,
            action="agent_auth.failed",
            actor_type="unknown_agent_token",
            actor_label=raw_value[:16],
            reason="invalid_agent_token",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent token")
    agent = await db.get(Agent, token.agent_id)
    if agent is None or agent.status != AgentStatus.ACTIVE:
        await write_auth_failure_audit(
            db,
            request,
            action="agent_auth.failed",
            actor_type="agent_token",
            actor_label=token.key_prefix,
            reason="agent_disabled",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent is disabled")
    now = datetime.now(UTC)
    if should_update_last_used(
        token.last_used_at,
        now,
        request.app.state.settings.last_used_write_interval_seconds,
    ):
        token.last_used_at = now
        await db.commit()
    return AgentPrincipal(token=token, agent=agent)


async def granted_secret(db: AsyncSession, token_id: str, secret_id: str) -> Secret | None:
    secret: Secret | None = await db.scalar(
        select(Secret)
        .join(TokenSecretGrant, TokenSecretGrant.secret_id == Secret.id)
        .where(TokenSecretGrant.token_id == token_id, Secret.id == secret_id)
    )
    return secret
