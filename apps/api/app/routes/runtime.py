"""VaultGate runtime routes.

This module provides the /api/me endpoint for Bearer token verification.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_async_db
from app.dependencies import get_token_from_bearer
from app.orm.token import Token
from app.orm.scope import Scope

router = APIRouter(prefix="/api")


@router.get(
    "/me",
    tags=["Runtime"],
    summary="Verify token and get info",
    description="Verify the Bearer token and return basic token information.",
)
async def get_token_info(
    token: Token = Depends(get_token_from_bearer),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Get token information.

    Returns basic token info including the number of accessible secrets (scopes).
    """
    # Count allowed scopes
    result = await db.execute(
        select(Scope.id)
        .where(Scope.token_id == token.id)
        .where(Scope.allowed.is_(True))
    )
    scopes_count = len(result.all())

    return {
        "token_id": token.id,
        "name": token.name,
        "description": token.description,
        "status": token.status,
        "key_prefix": token.key_prefix,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
        "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
        "created_at": token.created_at.isoformat(),
        "scopes_count": scopes_count,
    }
