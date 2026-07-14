from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.routes import get_admin_principal
from app.modules.admin_auth.service import AdminPrincipal
from app.modules.audit.service import add_admin_audit
from app.modules.secrets.schemas import SecretCreate, SecretUpdate
from app.modules.secrets.service import serialize_secret
from app.orm import Secret
from app.orm.secret import SecretType
from app.services.encryption import get_encryption_service

router = APIRouter(prefix="/api/admin/secrets", tags=["Admin Secrets"])


async def _owned_secret(db: AsyncSession, user_id: str, secret_id: str) -> Secret:
    result = await db.execute(select(Secret).where(Secret.id == secret_id, Secret.user_id == user_id))
    secret = result.scalar_one_or_none()
    if secret is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")
    return secret


@router.get("")
async def list_secrets(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    secret_type: str | None = Query(default=None, alias="type"),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    filters = [Secret.user_id == principal.user.id]
    if search is not None:
        normalized_search = search.strip()
        if normalized_search:
            pattern = f"%{normalized_search}%"
            filters.append(
                or_(
                    Secret.name.ilike(pattern),
                    Secret.url.ilike(pattern),
                    Secret.username.ilike(pattern),
                    Secret.description.ilike(pattern),
                )
            )
    if secret_type is not None:
        if secret_type not in SecretType.all_values():
            raise HTTPException(status_code=422, detail="Invalid secret type")
        filters.append(Secret.type == secret_type)

    total = await db.scalar(select(func.count(Secret.id)).where(*filters))
    result = await db.scalars(
        select(Secret).where(*filters).order_by(Secret.created_at.desc(), Secret.id).limit(limit).offset(offset)
    )
    return {
        "items": [serialize_secret(secret) for secret in result],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_secret(
    body: SecretCreate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    secret = Secret(
        user_id=principal.user.id,
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
    await db.flush()
    add_admin_audit(
        db,
        request,
        principal,
        action="secret.create",
        resource_type="secret",
        resource_id=secret.id,
        resource_label=secret.name,
    )
    await db.commit()
    await db.refresh(secret)
    return serialize_secret(secret)


@router.get("/{secret_id}")
async def get_secret(
    secret_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    return serialize_secret(await _owned_secret(db, principal.user.id, secret_id))


@router.get("/{secret_id}/value")
async def reveal_secret(
    secret_id: str,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    secret = await _owned_secret(db, principal.user.id, secret_id)
    add_admin_audit(
        db,
        request,
        principal,
        action="secret.value.read",
        resource_type="secret",
        resource_id=secret.id,
        resource_label=secret.name,
    )
    await db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"value": get_encryption_service().decrypt(secret.value_encrypted)}


@router.patch("/{secret_id}")
async def update_secret(
    secret_id: str,
    body: SecretUpdate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    secret = await _owned_secret(db, principal.user.id, secret_id)
    changes = body.model_dump(exclude_unset=True)
    if "metadata" in changes:
        secret.secret_metadata = changes.pop("metadata")
    if "value" in changes:
        secret.value_encrypted = get_encryption_service().encrypt(changes.pop("value"))
    for field, value in changes.items():
        setattr(secret, field, value)
    add_admin_audit(
        db,
        request,
        principal,
        action="secret.update",
        resource_type="secret",
        resource_id=secret.id,
        resource_label=secret.name,
    )
    await db.commit()
    await db.refresh(secret)
    return serialize_secret(secret)


@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    secret_id: str,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    secret = await _owned_secret(db, principal.user.id, secret_id)
    add_admin_audit(
        db,
        request,
        principal,
        action="secret.delete",
        resource_type="secret",
        resource_id=secret.id,
        resource_label=secret.name,
    )
    await db.delete(secret)
    await db.commit()
