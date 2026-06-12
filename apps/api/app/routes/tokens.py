"""VaultGate token routes.

This module provides API endpoints for token management.
"""
from __future__ import annotations

import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db import get_async_db
from app.dependencies import get_current_user_from_session
from app.orm.user import User
from app.orm.token import Token, TokenStatus
from app.orm.secret import Secret
from app.orm.scope import Scope
from app.schemas.vault import PaginationParams
from app.schemas.vault import VaultTokenCreate, VaultTokenResponse, VaultTokenDetailResponse, VaultScopeCreate, VaultScopeBatchCreate

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
            .where(Scope.allowed.is_(True))
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
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

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
            "allowed": scope.allowed,
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
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

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
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

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
            "allowed": scope.allowed,
            "created_at": scope.created_at.isoformat(),
        })

    return {"items": items}


@router.post(
    "/{token_id}/scopes",
    tags=["Tokens"],
    summary="Grant a scope",
    description="Grant or deny access to a secret for this token.",
)
async def create_scope(
    token_id: str,
    scope_data: VaultScopeCreate,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create a scope (permission) for a token."""
    # Verify token ownership
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    # Verify secret ownership
    secret = await db.execute(
        select(Secret).where(Secret.id == scope_data.secret_id).where(Secret.user_id == user.id)
    )
    secret = secret.scalar_one_or_none()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )

    # Check if scope already exists
    existing = await db.execute(
        select(Scope).where(Scope.token_id == token_id).where(Scope.secret_id == scope_data.secret_id)
    )
    existing_scope = existing.scalar_one_or_none()

    if existing_scope:
        # Update existing scope
        existing_scope.allowed = scope_data.allowed
        await db.commit()
        return {
            "id": existing_scope.id,
            "token_id": existing_scope.token_id,
            "secret_id": existing_scope.secret_id,
            "allowed": existing_scope.allowed,
            "created_at": existing_scope.created_at.isoformat(),
        }

    # Create new scope
    new_scope = Scope(
        token_id=token_id,
        secret_id=scope_data.secret_id,
        allowed=scope_data.allowed,
    )

    db.add(new_scope)
    await db.commit()
    await db.refresh(new_scope)

    return {
        "id": new_scope.id,
        "token_id": new_scope.token_id,
        "secret_id": new_scope.secret_id,
        "allowed": new_scope.allowed,
        "created_at": new_scope.created_at.isoformat(),
    }


@router.post(
    "/{token_id}/scopes/batch",
    tags=["Tokens"],
    summary="Batch grant scopes",
    description="Grant multiple scopes at once.",
)
async def create_scopes_batch(
    token_id: str,
    batch_data: VaultScopeBatchCreate,
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create multiple scopes in a single request."""
    # Verify token ownership
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    created = []
    for grant_data in batch_data.grants:
        # Verify secret ownership
        secret = await db.execute(
            select(Secret).where(Secret.id == grant_data.secret_id).where(Secret.user_id == user.id)
        )
        secret = secret.scalar_one_or_none()

        if not secret:
            continue

        # Check if scope already exists
        existing = await db.execute(
            select(Scope).where(Scope.token_id == token_id).where(Scope.secret_id == grant_data.secret_id)
        )
        existing_scope = existing.scalar_one_or_none()

        if existing_scope:
            existing_scope.allowed = grant_data.allowed
            created.append(existing_scope)
        else:
            new_scope = Scope(
                token_id=token_id,
                secret_id=grant_data.secret_id,
                allowed=grant_data.allowed,
            )
            db.add(new_scope)
            created.append(new_scope)

    await db.commit()

    return {
        "created": len(created),
        "scopes": [{"id": s.id, "secret_id": s.secret_id, "allowed": s.allowed} for s in created],
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
    token = await db.execute(
        select(Token).where(Token.id == token_id).where(Token.user_id == user.id)
    )
    token = token.scalar_one_or_none()

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
