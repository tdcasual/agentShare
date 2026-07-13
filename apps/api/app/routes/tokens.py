"""VaultGate token routes.

This module provides API endpoints for token management.
"""
from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.dependencies import get_current_user_from_session
from app.orm.scope import Scope
from app.orm.secret import Secret
from app.orm.token import Token, TokenStatus
from app.orm.user import User
from app.schemas.vault import PaginationParams, VaultScopeCreate, VaultTokenCreate, VaultTokenDetailResponse

router = APIRouter(prefix="/api/tokens")


def generate_token_value() -> tuple[str, str]:
    """Generate a secure random token value.

    Returns:
        Tuple of (token_value, token_prefix)
    """
    # Generate 64-character token (512 bits of entropy)
    token_value = "vg_" + secrets.token_urlsafe(48)  # 64 chars total with prefix

    # Store first 10 characters as prefix for identification
    token_prefix = token_value[:10]

    return token_value, token_prefix


def hash_token(token_value: str) -> str:
    """Hash a token value for storage.

    Args:
        token_value: The raw token value

    Returns:
        SHA256 hash of the token
    """
    return hashlib.sha256(token_value.encode()).hexdigest()


@router.post(
    "",
    response_model=dict,
    tags=["Tokens"],
    summary="Create a new token",
    description="Issue a new API token. Returns the full token value - this is the only time it will be shown.",
)
async def create_token(
    token_data: VaultTokenCreate,
    request: Request,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create a new API token for external access.

    The token value is only returned once - save it securely.
    """
    # Generate token
    token_value, token_prefix = generate_token_value()
    token_hash = hash_token(token_value)

    # Create token record
    new_token = Token(
        user_id=user.id,
        key_hash=token_hash,
        key_prefix=token_prefix,
        name=token_data.name,
        description=token_data.description,
        status=TokenStatus.ACTIVE,
        expires_at=token_data.expires_at,
    )

    db.add(new_token)
    await db.commit()
    await db.refresh(new_token)

    return {
        "id": new_token.id,
        "name": new_token.name,
        "description": new_token.description,
        "token": token_value,  # Only shown once!
        "key_prefix": new_token.key_prefix,
        "status": new_token.status,
        "expires_at": new_token.expires_at.isoformat() if new_token.expires_at else None,
        "created_at": new_token.created_at.isoformat(),
        "warning": "Please save this token securely. It will not be shown again.",
    }


@router.get(
    "",
    response_model=dict,
    tags=["Tokens"],
    summary="List my tokens",
    description="List all tokens created by the current user.",
)
async def list_tokens(
    pagination: PaginationParams = Depends(),
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """List all tokens for the current user with pagination."""
    # Get total count
    count_result = await db.execute(
        select(func.count(Token.id)).where(Token.user_id == user.id)
    )
    total = count_result.scalar() or 0

    # Get paginated results
    result = await db.execute(
        select(Token)
        .where(Token.user_id == user.id)
        .order_by(Token.created_at.desc())
        .limit(pagination.limit)
        .offset(pagination.offset)
    )
    tokens = result.scalars().all()

    # Get scope counts
    token_ids = [t.id for t in tokens]
    scope_counts = {}
    if token_ids:
        scope_result = await db.execute(
            select(Scope.token_id, func.count(Scope.id))
            .where(Scope.token_id.in_(token_ids))
            .group_by(Scope.token_id)
        )
        for row in scope_result.all():
            scope_counts[row[0]] = row[1]

    items = []
    for token in tokens:
        items.append({
            "id": token.id,
            "name": token.name,
            "description": token.description,
            "status": token.status,
            "key_prefix": token.key_prefix,
            "expires_at": token.expires_at.isoformat() if token.expires_at else None,
            "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
            "created_at": token.created_at.isoformat(),
            "scopes_count": scope_counts.get(token.id, 0),
        })

    return {"items": items, "total": total, "limit": pagination.limit, "offset": pagination.offset}


@router.get(
    "/{token_id}",
    response_model=VaultTokenDetailResponse,
    tags=["Tokens"],
    summary="Get token details",
    description="Get detailed information about a token including its scopes.",
)
async def get_token(
    token_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Get token details with scopes."""
    # Verify ownership
    token_result = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token_result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Get scopes with secret details
    result = await db.execute(
        select(Scope, Secret.name, Secret.type, Secret.url)
        .join(Secret, Scope.secret_id == Secret.id)
        .where(Scope.token_id == token.id)
        .order_by(Scope.created_at.desc())
    )

    scopes = []
    for row in result.all():
        scope, secret_name, secret_type, secret_url = row
        scopes.append({
            "id": scope.id,
            "secret_id": scope.secret_id,
            "secret_name": secret_name,
            "secret_type": secret_type,
            "secret_url": secret_url,
            "created_at": scope.created_at.isoformat(),
        })

    return {
        "id": token.id,
        "name": token.name,
        "description": token.description,
        "status": token.status,
        "key_prefix": token.key_prefix,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
        "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
        "created_at": token.created_at.isoformat(),
        "scopes_count": len(scopes),
        "scopes": scopes,
    }


@router.delete(
    "/{token_id}",
    tags=["Tokens"],
    summary="Revoke a token",
    description="Revoke (soft delete) a token. It will immediately become invalid.",
)
async def revoke_token(
    token_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Revoke a token."""
    # Verify ownership
    token_result = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token_result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Soft delete - set status to revoked
    token.status = TokenStatus.REVOKED
    await db.commit()

    return {"message": "Token revoked", "token_id": token_id}


@router.get(
    "/{token_id}/scopes",
    tags=["Tokens"],
    summary="List token scopes",
    description="List all scopes (permissions) for a token.",
)
async def list_token_scopes(
    token_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """List scopes for a token."""
    # Verify ownership
    token_result = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token_result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Get scopes
    result = await db.execute(
        select(Scope).where(Scope.token_id == token_id).order_by(Scope.created_at.desc())
    )
    scopes = result.scalars().all()

    items = []
    for scope in scopes:
        items.append({
            "id": scope.id,
            "secret_id": scope.secret_id,
            "created_at": scope.created_at.isoformat(),
        })

    return {"items": items}


@router.post(
    "/{token_id}/scopes",
    tags=["Tokens"],
    summary="Grant scopes",
    description="Grant access to one or more secrets for this token.",
)
async def create_scope(
    token_id: str,
    scope_data: VaultScopeCreate,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create one or more scopes (permissions) for a token."""
    # Verify token ownership
    token_result = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token_result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Normalize to a list of secret IDs (support both legacy single field and new batch field)
    secret_ids = list(scope_data.secret_ids) if scope_data.secret_ids else []
    if scope_data.secret_id:
        secret_ids.append(scope_data.secret_id)

    if not secret_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No secret IDs provided",
        )

    # Verify all secrets are owned by the current user
    secret_result = await db.execute(
        select(Secret).where(Secret.id.in_(secret_ids)).where(Secret.user_id == user.id)
    )
    owned_secrets = {secret.id: secret for secret in secret_result.scalars().all()}

    missing_secret_ids = [sid for sid in secret_ids if sid not in owned_secrets]
    if missing_secret_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Secret(s) not found: {', '.join(missing_secret_ids)}",
        )

    # Find existing scopes to avoid duplicates
    existing_result = await db.execute(
        select(Scope).where(Scope.token_id == token_id).where(Scope.secret_id.in_(secret_ids))
    )
    existing_scopes = {scope.secret_id: scope for scope in existing_result.scalars().all()}

    created_scopes = []
    for secret_id in secret_ids:
        existing_scope = existing_scopes.get(secret_id)
        if existing_scope:
            created_scopes.append(existing_scope)
            continue

        new_scope = Scope(token_id=token_id, secret_id=secret_id)
        db.add(new_scope)
        created_scopes.append(new_scope)

    await db.commit()
    for scope in created_scopes:
        await db.refresh(scope)

    return {
        "items": [
            {
                "id": scope.id,
                "token_id": scope.token_id,
                "secret_id": scope.secret_id,
                "created_at": scope.created_at.isoformat(),
            }
            for scope in created_scopes
        ],
    }


@router.delete(
    "/{token_id}/scopes/{scope_id}",
    tags=["Tokens"],
    summary="Revoke a scope",
    description="Remove a scope (permission) from a token.",
)
async def delete_scope(
    token_id: str,
    scope_id: str,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Delete a scope."""
    # Verify token ownership
    token_result = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token_result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Find scope
    scope = await db.get(Scope, scope_id)
    if not scope or scope.token_id != token_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scope not found",
        )

    await db.delete(scope)
    await db.commit()

    return {"message": "Scope deleted", "scope_id": scope_id}
