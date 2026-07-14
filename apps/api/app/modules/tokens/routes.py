from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.routes import get_admin_principal
from app.modules.admin_auth.service import (
    AdminPrincipal,
    expires_from_ttl,
    generate_credential,
)
from app.modules.agents.routes import owned_agent
from app.modules.tokens.schemas import AgentTokenCreate, GrantReplace
from app.modules.tokens.service import serialize_token
from app.orm import AgentStatus, AgentToken, AgentTokenStatus, Secret, TokenSecretGrant

router = APIRouter(prefix="/api/admin", tags=["Admin Tokens"])


async def owned_token(db: AsyncSession, user_id: str, token_id: str) -> AgentToken:
    result = await db.execute(
        select(AgentToken).where(AgentToken.id == token_id, AgentToken.user_id == user_id)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent token not found")
    return token


@router.post("/agents/{agent_id}/tokens", status_code=status.HTTP_201_CREATED)
async def issue_token(
    agent_id: str,
    body: AgentTokenCreate,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = await owned_agent(db, principal.user.id, agent_id)
    if agent.status != AgentStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent is disabled")
    raw_value, key_hash, key_prefix = generate_credential("vg_")
    token = AgentToken(
        user_id=principal.user.id,
        agent_id=agent.id,
        name=body.name,
        description=body.description,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=expires_from_ttl(body.ttl_seconds),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    payload = serialize_token(token)
    payload["token"] = raw_value
    response.headers["Cache-Control"] = "no-store"
    return payload


@router.post("/tokens/{token_id}/rotate")
async def rotate_token(
    token_id: str,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    token = await owned_token(db, principal.user.id, token_id)
    raw_value, token.key_hash, token.key_prefix = generate_credential("vg_")
    token.status = AgentTokenStatus.ACTIVE
    token.revoked_at = None
    await db.commit()
    payload = serialize_token(token)
    payload["token"] = raw_value
    response.headers["Cache-Control"] = "no-store"
    return payload


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(
    token_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    token = await owned_token(db, principal.user.id, token_id)
    token.status = AgentTokenStatus.REVOKED
    token.revoked_at = datetime.now(UTC)
    await db.commit()


@router.get("/tokens/{token_id}/grants")
async def get_grants(
    token_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, list[str]]:
    token = await owned_token(db, principal.user.id, token_id)
    secret_ids = await db.scalars(
        select(TokenSecretGrant.secret_id)
        .where(TokenSecretGrant.token_id == token.id)
        .order_by(TokenSecretGrant.secret_id)
    )
    return {"secret_ids": list(secret_ids)}


@router.put("/tokens/{token_id}/grants")
async def replace_grants(
    token_id: str,
    body: GrantReplace,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, list[str]]:
    token = await owned_token(db, principal.user.id, token_id)
    requested_ids = sorted(set(body.secret_ids))
    if requested_ids:
        owned_ids = set(await db.scalars(
            select(Secret.id).where(
                Secret.user_id == principal.user.id,
                Secret.id.in_(requested_ids),
            )
        ))
        if owned_ids != set(requested_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")
    await db.execute(delete(TokenSecretGrant).where(TokenSecretGrant.token_id == token.id))
    db.add_all([
        TokenSecretGrant(token_id=token.id, secret_id=secret_id)
        for secret_id in requested_ids
    ])
    await db.commit()
    return {"secret_ids": requested_ids}
