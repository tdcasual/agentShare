from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.orm import AgentToken


async def owned_token(db: AsyncSession, user_id: str, token_id: str) -> AgentToken:
    result = await db.execute(
        select(AgentToken).where(AgentToken.id == token_id, AgentToken.user_id == user_id)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent token not found")
    return token


def serialize_token(token: AgentToken) -> dict:
    return {
        "id": token.id,
        "agent_id": token.agent_id,
        "name": token.name,
        "description": token.description,
        "key_prefix": token.key_prefix,
        "status": token.status,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
        "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
        "created_at": token.created_at.isoformat(),
    }
