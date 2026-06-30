"""VaultGate secrets management routes.

This module provides API endpoints for secret CRUD operations via web UI.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.dependencies import get_current_user_from_session
from app.orm.secret import Secret
from app.orm.user import User
from app.schemas.vault import (
    PaginationParams,
    VaultSecretCreate,
    VaultSecretResponse,
    VaultSecretUpdate,
)
from app.services.encryption import get_encryption_service

router = APIRouter(prefix="/api/secrets")


@router.get(
    "",
    response_model=dict,
    tags=["Secrets"],
    summary="List my secrets",
    description="List all secrets owned by the current user.",
)
async def list_secrets(
    pagination: PaginationParams = Depends(),
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """List all secrets for the current user with pagination."""
    from sqlalchemy import func

    # Get total count
    count_result = await db.execute(
        select(func.count(Secret.id)).where(Secret.user_id == user.id)
    )
    total = count_result.scalar() or 0

    # Get paginated results
    result = await db.execute(
        select(Secret)
        .where(Secret.user_id == user.id)
        .order_by(Secret.created_at.desc())
        .limit(pagination.limit)
        .offset(pagination.offset)
    )
    secrets = result.scalars().all()

    items = []
    for secret in secrets:
        items.append({
            "id": secret.id,
            "name": secret.name,
            "type": secret.type,
            "url": secret.url,
            "description": secret.description,
            "tags": secret.tags,
            "created_at": secret.created_at.isoformat(),
        })

    return {"items": items, "total": total, "limit": pagination.limit, "offset": pagination.offset}


@router.post(
    "",
    response_model=dict,
    tags=["Secrets"],
    summary="Create a new secret",
    description="Create a new secret with encrypted value.",
)
async def create_secret(
    secret_data: VaultSecretCreate,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create a new secret."""
    # Encrypt the value
    encryption_svc = get_encryption_service()
    encrypted_value = encryption_svc.encrypt(secret_data.value)

    # Create secret
    new_secret = Secret(
        user_id=user.id,
        type=secret_data.type,
        name=secret_data.name,
        url=secret_data.url,
        username=secret_data.username,
        description=secret_data.description,
        value_encrypted=encrypted_value,
        tags=secret_data.tags,
        secret_metadata=secret_data.metadata,
    )

    db.add(new_secret)
    await db.commit()
    await db.refresh(new_secret)

    return {
        "id": new_secret.id,
        "name": new_secret.name,
        "type": new_secret.type,
        "url": new_secret.url,
        "username": new_secret.username,
        "description": new_secret.description,
        "tags": new_secret.tags,
        "metadata": new_secret.secret_metadata,
        "created_at": new_secret.created_at.isoformat(),
    }


@router.get(
    "/{secret_id}",
    response_model=VaultSecretResponse,
    tags=["Secrets"],
    summary="Get secret details",
    description="Get secret details (value not included).",
)
async def get_secret(
    secret_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Get secret details without value."""
    # Verify ownership
    result = await db.execute(
        select(Secret).where(Secret.id == secret_id).where(Secret.user_id == user.id)
    )
    secret = result.scalar_one_or_none()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )

    return {
        "id": secret.id,
        "name": secret.name,
        "type": secret.type,
        "url": secret.url,
        "username": secret.username,
        "description": secret.description,
        "tags": secret.tags,
        "metadata": secret.secret_metadata,
        "created_at": secret.created_at.isoformat(),
        "updated_at": secret.updated_at.isoformat(),
    }


@router.patch(
    "/{secret_id}",
    tags=["Secrets"],
    summary="Update a secret",
    description="Update a secret's metadata. To update the value, you must provide it.",
)
async def update_secret(
    secret_id: str,
    secret_data: VaultSecretUpdate,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Update a secret."""
    # Verify ownership
    result = await db.execute(
        select(Secret).where(Secret.id == secret_id).where(Secret.user_id == user.id)
    )
    secret = result.scalar_one_or_none()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )

    # Update fields
    if secret_data.name is not None:
        secret.name = secret_data.name
    if secret_data.type is not None:
        secret.type = secret_data.type
    if secret_data.url is not None:
        secret.url = secret_data.url
    if secret_data.username is not None:
        secret.username = secret_data.username
    if secret_data.description is not None:
        secret.description = secret_data.description
    if secret_data.tags is not None:
        secret.tags = secret_data.tags
    if secret_data.metadata is not None:
        secret.secret_metadata = secret_data.metadata
    if secret_data.value is not None:
        encryption_svc = get_encryption_service()
        secret.value_encrypted = encryption_svc.encrypt(secret_data.value)

    await db.commit()
    await db.refresh(secret)

    return {
        "id": secret.id,
        "name": secret.name,
        "type": secret.type,
        "url": secret.url,
        "username": secret.username,
        "description": secret.description,
        "tags": secret.tags,
        "metadata": secret.secret_metadata,
        "created_at": secret.created_at.isoformat(),
        "updated_at": secret.updated_at.isoformat(),
    }


@router.delete(
    "/{secret_id}",
    tags=["Secrets"],
    summary="Delete a secret",
    description="Delete a secret permanently.",
)
async def delete_secret(
    secret_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Delete a secret."""
    # Verify ownership
    result = await db.execute(
        select(Secret).where(Secret.id == secret_id).where(Secret.user_id == user.id)
    )
    secret = result.scalar_one_or_none()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )

    await db.delete(secret)
    await db.commit()

    return {"message": "Secret deleted", "secret_id": secret_id}
