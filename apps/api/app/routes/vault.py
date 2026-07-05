"""VaultGate vault routes.

This module provides API endpoints for secret management via Bearer token authentication.
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.dependencies import get_token_from_bearer
from app.orm.scope import Scope
from app.orm.secret import Secret
from app.orm.token import Token
from app.schemas.vault import VaultSecretListResponse
from app.services.encryption import get_encryption_service
from app.services.permission import get_permission_service

router = APIRouter(prefix="/api/vault")


async def update_token_last_used(token: Token, db: AsyncSession) -> None:
    """Update token's last_used_at timestamp. Caller is responsible for commit."""
    token.last_used_at = datetime.now(UTC)
    # NOTE: do NOT commit here — the calling route owns the transaction.


@router.get(
    "",
    response_model=VaultSecretListResponse,
    tags=["Vault"],
    summary="List accessible secrets",
    description="List all secrets the token has access to (metadata only).",
)
async def list_secrets(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    token: Token = Depends(get_token_from_bearer),
    type_filter: str | None = Query(None, alias="type", description="Filter by secret type"),
    tags_filter: str | None = Query(None, alias="tags", description="Filter by tags (comma-separated)"),
    search: str | None = Query(None, description="Search in name"),
) -> dict:
    """List secrets accessible to the token.

    Only returns secrets where the token has a scope.
    Returns metadata only (no value field).
    """
    # Update token last used timestamp
    await update_token_last_used(token, db)
    await db.commit()

    # Get accessible secret IDs
    result = await db.execute(
        select(Scope.secret_id)
        .where(Scope.token_id == token.id)
    )
    accessible_secret_ids = {row[0] for row in result.all()}

    if not accessible_secret_ids:
        return {"items": []}

    # Build query
    query = select(Secret).where(Secret.id.in_(accessible_secret_ids))

    # Apply filters
    if type_filter:
        query = query.where(Secret.type == type_filter)

    if tags_filter:
        tag_list = [t.strip() for t in tags_filter.split(",")]
        for tag in tag_list:
            query = query.where(Secret.tags.contains([tag]))

    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(Secret.name.ilike(f"%{escaped}%", escape="\\"))

    secrets_result = await db.execute(query)
    secrets = secrets_result.scalars().all()

    # Log the list action
    permission_svc = get_permission_service()
    await permission_svc.log_success(
        db=db,
        token_id=token.id,
        token_prefix=token.key_prefix,
        secret_id=None,
        action="list",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        requested_field_count=0,  # List doesn't count as requesting value fields
    )

    # Build response
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

    return {"items": items}


@router.get(
    "/{secret_id}",
    tags=["Vault"],
    summary="Get secret details",
    description="Get secret details (metadata only, no value).",
)
async def get_secret(
    secret_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    token: Token = Depends(get_token_from_bearer),
):
    """Get secret details.

    Returns metadata fields only; use /{secret_id}/value for the credential value.
    """
    # Check permission
    permission_svc = get_permission_service()
    has_access = await permission_svc.check_permission(
        db=db,
        token=token,
        secret_id=secret_id,
        action="read",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        requested_field_count=None,
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Get secret
    secret = await db.get(Secret, secret_id)
    if not secret:
        # Return 403 instead of 404 to prevent information leakage
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
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
        "created_at": secret.created_at.isoformat() if secret.created_at else None,
        "updated_at": secret.updated_at.isoformat() if secret.updated_at else None,
    }


@router.get(
    "/{secret_id}/value",
    tags=["Vault"],
    summary="Get secret value only",
    description="Get only the value field of a secret. Most efficient endpoint for API access.",
)
async def get_secret_value(
    secret_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    token: Token = Depends(get_token_from_bearer),
) -> dict:
    """Get only the value field of a secret.

    This is the most efficient endpoint for agents that only need the credential value.
    """
    # Check permission
    permission_svc = get_permission_service()
    has_access = await permission_svc.check_permission(
        db=db,
        token=token,
        secret_id=secret_id,
        action="read",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        requested_field_count=1,  # Only requesting value
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Get secret
    secret = await db.get(Secret, secret_id)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Decrypt value
    encryption_svc = get_encryption_service()
    value = encryption_svc.decrypt(secret.value_encrypted)

    return {"value": value}
