from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_schemas import (
    SecretValueResponse,
    VaultIdentityResponse,
    VaultSecretPageResponse,
    VaultSecretResponse,
    VaultSpaceListResponse,
)
from app.db import get_async_db
from app.idempotency import commit_idempotent_response, replay_idempotent_response
from app.modules.access.service import (
    SecretAccess,
    list_accessible_secrets,
    resolve_secret_access,
    resolve_space_access,
)
from app.modules.audit.service import add_vault_audit, write_vault_audit
from app.modules.secrets.schemas import AgentSecretCreate, AgentSecretUpdate
from app.modules.secrets.service import serialize_secret
from app.modules.vault.service import AgentPrincipal, resolve_agent_principal
from app.orm import (
    Secret,
    SpaceMembershipStatus,
    SpaceTokenMembership,
    VaultSpace,
    VaultSpaceStatus,
)
from app.services.encryption import get_encryption_service

router = APIRouter(prefix="/api/vault", tags=["Vault"])


async def get_agent_principal(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> AgentPrincipal:
    return await resolve_agent_principal(request, db)


def serialize_access(item: SecretAccess, agent_id: str) -> dict:
    return {
        **serialize_secret(item.secret),
        "permissions": item.permissions_for(agent_id),
        "access_source": item.access_source,
    }


@router.get("/me", response_model=VaultIdentityResponse)
async def get_me(principal: AgentPrincipal = Depends(get_agent_principal)) -> dict:
    return {
        "agent_id": principal.agent.id,
        "agent_name": principal.agent.name,
        "token_id": principal.token.id,
        "token_name": principal.token.name,
    }


@router.get("/spaces", response_model=VaultSpaceListResponse)
async def list_spaces(
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    rows = await db.execute(
        select(VaultSpace, SpaceTokenMembership.role)
        .join(SpaceTokenMembership, SpaceTokenMembership.space_id == VaultSpace.id)
        .where(
            VaultSpace.user_id == principal.token.user_id,
            VaultSpace.status == VaultSpaceStatus.ACTIVE,
            SpaceTokenMembership.token_id == principal.token.id,
            SpaceTokenMembership.status == SpaceMembershipStatus.ACTIVE,
        )
        .order_by(VaultSpace.name, VaultSpace.id)
    )
    return {
        "items": [
            {
                "id": space.id,
                "name": space.name,
                "description": space.description,
                "status": space.status,
                "role": role,
                "created_at": space.created_at.isoformat(),
                "updated_at": space.updated_at.isoformat(),
            }
            for space, role in rows
        ]
    }


@router.get("/secrets", response_model=VaultSecretPageResponse)
async def list_secrets(
    request: Request,
    space_id: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    items, total = await list_accessible_secrets(
        db,
        principal.token,
        space_id=space_id,
        limit=limit,
        offset=offset,
    )
    await write_vault_audit(
        db,
        request,
        principal.token,
        action="secret.list",
        result="success",
    )
    return {
        "items": [serialize_access(item, principal.agent.id) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/spaces/{space_id}/secrets",
    status_code=status.HTTP_201_CREATED,
    response_model=VaultSecretResponse,
)
async def create_secret(
    space_id: str,
    body: AgentSecretCreate,
    request: Request,
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    access = await resolve_space_access(db, principal.token, space_id)
    if access is None or not access.can_create:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.create",
            result="denied",
            requested_secret_id=space_id,
            reason="space_contributor_required",
        )
        raise HTTPException(status_code=403, detail="Contributor access required")
    if "idempotency-key" not in request.headers:
        raise HTTPException(status_code=422, detail="Idempotency-Key header is required")

    payload = {"space_id": space_id, **body.model_dump(mode="json")}
    idempotency, replay = await replay_idempotent_response(
        db,
        request,
        principal.token.user_id,
        payload,
        principal_type="agent_token",
        principal_id=principal.token.id,
    )
    if replay is not None:
        return replay

    secret = Secret(
        user_id=principal.token.user_id,
        space_id=access.space.id,
        created_by_agent_id=principal.agent.id,
        created_by_token_id=principal.token.id,
        name=body.name,
        type=body.type,
        url=body.url,
        username=body.username,
        description=body.description,
        value_encrypted=get_encryption_service().encrypt(body.value),
        tags=body.tags,
        secret_metadata=body.metadata,
    )
    db.add(secret)
    try:
        await db.flush()
        add_vault_audit(
            db,
            request,
            principal.token,
            action="secret.create",
            result="success",
            secret=secret,
        )
        response_payload = {
            **serialize_secret(secret),
            "permissions": ["read", "update"],
            "access_source": "space",
        }
        concurrent_replay = await commit_idempotent_response(
            db,
            principal.token.user_id,
            idempotency,
            response_payload,
            status_code=201,
        )
        if concurrent_replay is not None:
            return concurrent_replay
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Secret name already exists") from exc
    return response_payload


@router.get("/secrets/{secret_id}", response_model=VaultSecretResponse)
async def get_secret(
    secret_id: str,
    request: Request,
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    access = await resolve_secret_access(db, principal.token, secret_id)
    if access is None:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.read",
            result="denied",
            requested_secret_id=secret_id,
            reason="grant_missing",
        )
        raise HTTPException(status_code=403, detail="Access denied")
    await write_vault_audit(
        db,
        request,
        principal.token,
        action="secret.read",
        result="success",
        secret=access.secret,
    )
    return serialize_access(access, principal.agent.id)


@router.patch("/secrets/{secret_id}", response_model=VaultSecretResponse)
async def update_secret(
    secret_id: str,
    body: AgentSecretUpdate,
    request: Request,
    expected_version: Annotated[int, Header(alias="If-Match", ge=1)],
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    access = await resolve_secret_access(db, principal.token, secret_id)
    can_update = access is not None and "update" in access.permissions_for(principal.agent.id)
    if access is None or not can_update:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.update",
            result="denied",
            requested_secret_id=secret_id,
            reason="space_update_permission_missing",
        )
        raise HTTPException(status_code=403, detail="Update access denied")

    changes = body.model_dump(exclude_unset=True)
    if "metadata" in changes:
        changes["secret_metadata"] = changes.pop("metadata")
    if "value" in changes:
        changes["value_encrypted"] = get_encryption_service().encrypt(changes.pop("value"))
    changes["version"] = Secret.version + 1
    try:
        result = await db.execute(
            update(Secret)
            .where(Secret.id == secret_id, Secret.version == expected_version)
            .values(**changes)
            .returning(Secret.id)
        )
        if result.scalar_one_or_none() is None:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Secret version conflict")
        secret = await db.get(Secret, secret_id)
        if secret is None:
            raise HTTPException(status_code=404, detail="Secret not found")
        add_vault_audit(
            db,
            request,
            principal.token,
            action="secret.update",
            result="success",
            secret=secret,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Secret name already exists") from exc
    await db.refresh(secret)
    refreshed_access = await resolve_secret_access(db, principal.token, secret_id)
    if refreshed_access is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_access(refreshed_access, principal.agent.id)


@router.get("/secrets/{secret_id}/value", response_model=SecretValueResponse)
async def reveal_secret(
    secret_id: str,
    request: Request,
    response: Response,
    principal: AgentPrincipal = Depends(get_agent_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    access = await resolve_secret_access(db, principal.token, secret_id)
    if access is None:
        await write_vault_audit(
            db,
            request,
            principal.token,
            action="secret.value.read",
            result="denied",
            requested_secret_id=secret_id,
            reason="grant_missing",
        )
        raise HTTPException(status_code=403, detail="Access denied")
    value = get_encryption_service().decrypt(access.secret.value_encrypted)
    await write_vault_audit(
        db,
        request,
        principal.token,
        action="secret.value.read",
        result="success",
        secret=access.secret,
    )
    response.headers["Cache-Control"] = "no-store"
    return {"value": value}
