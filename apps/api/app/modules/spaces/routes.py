from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_schemas import (
    SpaceMembershipListResponse,
    VaultSpacePageResponse,
    VaultSpaceResponse,
)
from app.db import get_async_db
from app.modules.admin_auth.service import AdminPrincipal, get_admin_principal
from app.modules.audit.service import add_admin_audit
from app.modules.spaces.schemas import MembershipReplace, SpaceCreate, SpaceUpdate
from app.orm import AgentToken, Secret, SpaceTokenMembership, VaultSpace

router = APIRouter(prefix="/api/admin/spaces", tags=["Admin Spaces"])


def serialize_space(space: VaultSpace) -> dict:
    return {
        "id": space.id,
        "name": space.name,
        "description": space.description,
        "status": space.status,
        "created_at": space.created_at.isoformat(),
        "updated_at": space.updated_at.isoformat(),
    }


def serialize_membership(membership: SpaceTokenMembership) -> dict:
    return {
        "token_id": membership.token_id,
        "role": membership.role,
        "status": membership.status,
    }


async def owned_space(db: AsyncSession, user_id: str, space_id: str) -> VaultSpace:
    space = await db.scalar(
        select(VaultSpace).where(VaultSpace.id == space_id, VaultSpace.user_id == user_id)
    )
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.get("", response_model=VaultSpacePageResponse)
async def list_spaces(
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    rows = await db.scalars(
        select(VaultSpace)
        .where(VaultSpace.user_id == principal.user.id)
        .order_by(VaultSpace.created_at, VaultSpace.id)
    )
    return {"items": [serialize_space(space) for space in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=VaultSpaceResponse)
async def create_space(
    body: SpaceCreate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    space = VaultSpace(
        user_id=principal.user.id,
        name=body.name,
        description=body.description,
    )
    db.add(space)
    try:
        await db.flush()
        add_admin_audit(
            db,
            request,
            principal,
            action="space.create",
            resource_type="vault_space",
            resource_id=space.id,
            resource_label=space.name,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Space name already exists") from exc
    await db.refresh(space)
    return serialize_space(space)


@router.patch("/{space_id}", response_model=VaultSpaceResponse)
async def update_space(
    space_id: str,
    body: SpaceUpdate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    space = await owned_space(db, principal.user.id, space_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(space, field, value)
    try:
        add_admin_audit(
            db,
            request,
            principal,
            action="space.update",
            resource_type="vault_space",
            resource_id=space.id,
            resource_label=space.name,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Space name already exists") from exc
    await db.refresh(space)
    return serialize_space(space)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: str,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    space = await owned_space(db, principal.user.id, space_id)
    secret_count = await db.scalar(
        select(func.count(Secret.id)).where(Secret.space_id == space.id)
    )
    if secret_count:
        raise HTTPException(status_code=409, detail="Space must be empty before deletion")
    add_admin_audit(
        db,
        request,
        principal,
        action="space.delete",
        resource_type="vault_space",
        resource_id=space.id,
        resource_label=space.name,
    )
    await db.delete(space)
    await db.commit()


@router.get("/{space_id}/memberships", response_model=SpaceMembershipListResponse)
async def get_memberships(
    space_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    space = await owned_space(db, principal.user.id, space_id)
    rows = await db.scalars(
        select(SpaceTokenMembership)
        .where(SpaceTokenMembership.space_id == space.id)
        .order_by(SpaceTokenMembership.token_id)
    )
    return {"members": [serialize_membership(row) for row in rows]}


@router.put("/{space_id}/memberships", response_model=SpaceMembershipListResponse)
async def replace_memberships(
    space_id: str,
    body: MembershipReplace,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    space = await owned_space(db, principal.user.id, space_id)
    requested = {member.token_id: member for member in body.members}
    if requested:
        token_ids = set(
            await db.scalars(
                select(AgentToken.id).where(
                    AgentToken.user_id == principal.user.id,
                    AgentToken.id.in_(requested),
                )
            )
        )
        if token_ids != set(requested):
            raise HTTPException(status_code=404, detail="Agent token not found")

    await db.execute(
        delete(SpaceTokenMembership).where(SpaceTokenMembership.space_id == space.id)
    )
    memberships = [
        SpaceTokenMembership(
            user_id=principal.user.id,
            space_id=space.id,
            token_id=token_id,
            role=item.role,
            status=item.status,
        )
        for token_id, item in requested.items()
    ]
    db.add_all(memberships)
    add_admin_audit(
        db,
        request,
        principal,
        action="space.memberships.replace",
        resource_type="vault_space",
        resource_id=space.id,
        resource_label=space.name,
        metadata={"member_count": len(memberships)},
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Space memberships were modified concurrently; retry the operation",
        ) from exc
    return {"members": [serialize_membership(row) for row in memberships]}
