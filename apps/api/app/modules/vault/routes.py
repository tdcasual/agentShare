from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.audit.service import write_vault_audit
from app.modules.secrets.service import serialize_secret
from app.modules.vault.service import AgentPrincipal, granted_secret, resolve_agent_principal
from app.orm import Secret, TokenSecretGrant
from app.services.encryption import get_encryption_service

router = APIRouter(prefix="/api/vault", tags=["Vault"])


async def get_agent_principal(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> AgentPrincipal:
    return await resolve_agent_principal(request, db)


@router.get("/me")
async def get_me(principal: AgentPrincipal = Depends(get_agent_principal)) -> dict:
    return {
        "agent_id": principal.agent.id,
        "agent_name": principal.agent.name,
        "token_id": principal.token.id,
        "token_name": principal.token.name,
    }


@router.get("/secrets")
async def list_secrets(
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    secrets = await db.scalars(
        select(Secret)
        .join(TokenSecretGrant, TokenSecretGrant.secret_id == Secret.id)
        .where(TokenSecretGrant.token_id == principal.token.id)
        .order_by(Secret.name, Secret.id)
    )
    return {"items": [serialize_secret(secret) for secret in secrets]}


@router.get("/secrets/{secret_id}")
async def get_secret(
    secret_id: str,
    request: Request,
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    secret = await granted_secret(db, principal.token.id, secret_id)
    if secret is None:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.read",
            result="denied",
            requested_secret_id=secret_id,
            reason="grant_missing",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    await write_vault_audit(
        db,
        request,
        principal.token,
        action="secret.read",
        result="success",
        secret=secret,
    )
    return serialize_secret(secret)


@router.get("/secrets/{secret_id}/value")
async def reveal_secret(
    secret_id: str,
    request: Request,
    response: Response,
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    secret = await granted_secret(db, principal.token.id, secret_id)
    if secret is None:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.value.read",
            result="denied",
            requested_secret_id=secret_id,
            reason="grant_missing",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    value = get_encryption_service().decrypt(secret.value_encrypted)
    await write_vault_audit(
        db,
        request,
        principal.token,
        action="secret.value.read",
        result="success",
        secret=secret,
    )
    response.headers["Cache-Control"] = "no-store"
    return {"value": value}
