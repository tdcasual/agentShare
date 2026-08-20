from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_schemas import AgentTokenOptionPageResponse, GrantResponse, IssuedAgentTokenResponse
from app.db import get_async_db
from app.idempotency import commit_idempotent_response, replay_idempotent_response
from app.modules.admin_auth.service import (
    AdminPrincipal,
    expires_from_ttl,
    generate_credential,
    get_admin_principal,
    renew_expiration,
)
from app.modules.agents.service import owned_agent
from app.modules.audit.service import add_admin_audit
from app.modules.tokens.schemas import AgentTokenCreate, GrantReplace
from app.modules.tokens.service import owned_token, serialize_token
from app.orm import Agent, AgentStatus, AgentToken, AgentTokenStatus, Secret, TokenSecretGrant
from app.query_utils import contains_pattern

router = APIRouter(prefix="/api/admin", tags=["Admin Tokens"])


@router.get("/tokens", response_model=AgentTokenOptionPageResponse)
async def list_all_tokens(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    filters = [AgentToken.user_id == principal.user.id]
    if search is not None:
        normalized_search = search.strip()
        if normalized_search:
            pattern = contains_pattern(normalized_search)
            filters.append(
                or_(
                    Agent.name.ilike(pattern, escape="\\"),
                    AgentToken.name.ilike(pattern, escape="\\"),
                    AgentToken.key_prefix.ilike(pattern, escape="\\"),
                )
            )
    total = await db.scalar(
        select(func.count(AgentToken.id))
        .join(Agent, Agent.id == AgentToken.agent_id)
        .where(*filters)
    )
    rows = await db.execute(
        select(AgentToken, Agent.name)
        .join(Agent, Agent.id == AgentToken.agent_id)
        .where(*filters)
        .order_by(Agent.name, AgentToken.name, AgentToken.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [{**serialize_token(token), "agent_name": agent_name} for token, agent_name in rows],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }

@router.post(
    "/agents/{agent_id}/tokens",
    status_code=status.HTTP_201_CREATED,
    response_model=IssuedAgentTokenResponse,
)
async def issue_token(
    agent_id: str,
    body: AgentTokenCreate,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    idempotency, replay = await replay_idempotent_response(
        db, request, principal.user.id, {"agent_id": agent_id, **body.model_dump(mode="json")}
    )
    if replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return replay
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
    try:
        await db.flush()
        add_admin_audit(
            db,
            request,
            principal,
            action="agent_token.issue",
            resource_type="agent_token",
            resource_id=token.id,
            resource_label=f"{agent.name}/{token.name}",
        )
        payload = serialize_token(token)
        payload["token"] = raw_value
        concurrent_replay = await commit_idempotent_response(
            db, principal.user.id, idempotency, payload, status_code=201
        )
        if concurrent_replay is not None:
            response.headers["Cache-Control"] = "no-store"
            return concurrent_replay
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Token name already exists for this agent",
        ) from exc
    await db.refresh(token)
    response.headers["Cache-Control"] = "no-store"
    return payload


@router.post("/tokens/{token_id}/rotate", response_model=IssuedAgentTokenResponse)
async def rotate_token(
    token_id: str,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    token = await owned_token(db, principal.user.id, token_id)
    if token.status == AgentTokenStatus.REVOKED:
        # Revocation is an explicit human action; rotation must not undo it.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Revoked token cannot be rotated; issue a new token instead",
        )
    agent = await owned_agent(db, principal.user.id, token.agent_id)
    if agent.status != AgentStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent is disabled")
    raw_value, token.key_hash, token.key_prefix = generate_credential("vg_")
    token.expires_at = renew_expiration(token.created_at, token.expires_at)
    add_admin_audit(
        db,
        request,
        principal,
        action="agent_token.rotate",
        resource_type="agent_token",
        resource_id=token.id,
        resource_label=token.name,
    )
    await db.commit()
    payload = serialize_token(token)
    payload["token"] = raw_value
    response.headers["Cache-Control"] = "no-store"
    return payload


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(
    token_id: str,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    token = await owned_token(db, principal.user.id, token_id)
    token.status = AgentTokenStatus.REVOKED
    token.revoked_at = datetime.now(UTC)
    add_admin_audit(
        db,
        request,
        principal,
        action="agent_token.revoke",
        resource_type="agent_token",
        resource_id=token.id,
        resource_label=token.name,
    )
    await db.commit()


@router.get("/tokens/{token_id}/grants", response_model=GrantResponse)
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


@router.put("/tokens/{token_id}/grants", response_model=GrantResponse)
async def replace_grants(
    token_id: str,
    body: GrantReplace,
    request: Request,
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
    add_admin_audit(
        db,
        request,
        principal,
        action="token_grants.replace",
        resource_type="agent_token",
        resource_id=token.id,
        resource_label=token.name,
        metadata={"secret_count": len(requested_ids)},
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Token grants were modified concurrently; retry the operation",
        ) from exc
    return {"secret_ids": requested_ids}
