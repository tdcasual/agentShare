"""VaultGate vault routes.

This module provides API endpoints for secret management via Bearer token authentication.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("app.vault")

from app.db import get_async_db
from app.dependencies import get_token_from_bearer
from app.orm.scope import Scope
from app.orm.secret import Secret
from app.orm.token import Token
from app.services.encryption import get_encryption_service
from app.services.permission import get_permission_service
from app.schemas.vault import VaultBatchSecretBatchRequest, VaultSecretListResponse

router = APIRouter(prefix="/api/vault")


async def update_token_last_used(token: Token, db: AsyncSession) -> None:
    """Update token's last_used_at timestamp."""
    token.last_used_at = datetime.now(timezone.utc)
    await db.commit()


def get_allowed_fields() -> set[str]:
    """Get allowed field names for field filtering."""
    return {"id", "name", "type", "url", "username", "value", "tags", "metadata", "created_at", "updated_at"}


def validate_and_filter_fields(requested_fields: list[str] | None) -> list[str]:
    """Validate requested fields and return allowed ones.

    Args:
        requested_fields: List of field names requested

    Returns:
        List of allowed field names

    Raises:
        HTTPException: If invalid fields are requested
    """
    allowed = get_allowed_fields()

    if requested_fields is None:
        # Default fields (no value)
        return ["id", "name", "type", "url", "tags", "created_at"]

    # Validate fields
    invalid = set(requested_fields) - allowed
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_FIELDS",
                "message": "Invalid field names requested",
                "details": {
                    "invalid_fields": list(invalid),
                    "allowed_fields": sorted(allowed),
                },
            },
        )

    return requested_fields


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

    Only returns secrets where the token has an allowed scope.
    By default, returns only metadata (no value field).
    """
    # Update token last used timestamp
    await update_token_last_used(token, db)

    # Get accessible secret IDs
    result = await db.execute(
        select(Scope.secret_id)
        .where(Scope.token_id == token.id)
        .where(Scope.allowed.is_(True))
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

    result = await db.execute(query)
    secrets = result.scalars().all()

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
            "tags": secret.tags,
            "created_at": secret.created_at.isoformat(),
        })

    return {"items": items}


@router.get(
    "/{secret_id}",
    tags=["Vault"],
    summary="Get secret details",
    description="Get secret details with optional field filtering. Value field is never returned by default.",
)
async def get_secret(
    secret_id: str,
    request: Request,
    fields: str | None = Query(None, description="Comma-separated field names to return"),
    db: AsyncSession = Depends(get_async_db),
    token: Token = Depends(get_token_from_bearer),
):
    """Get secret details with field filtering.

    The value field is never returned unless explicitly requested via ?fields=value.
    """
    # Parse and validate fields
    requested_fields = validate_and_filter_fields(
        [f.strip() for f in fields.split(",")] if fields else None
    )

    # Special case: if "value" is not in requested fields, we don't count it
    # This prevents leaking whether value was requested
    field_count = len(requested_fields) if "value" in requested_fields else len(requested_fields) - 1

    # Check permission
    permission_svc = get_permission_service()
    has_access = await permission_svc.check_permission(
        db=db,
        token=token,
        secret_id=secret_id,
        action="read",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        requested_field_count=field_count if field_count > 0 else None,
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

    # Decrypt value if requested
    value = None
    if "value" in requested_fields:
        encryption_svc = get_encryption_service()
        value = encryption_svc.decrypt(secret.value_encrypted)

    # Build response with requested fields
    response = {}
    field_map = {
        "id": secret.id,
        "name": secret.name,
        "type": secret.type,
        "url": secret.url,
        "username": secret.username,
        "value": value,
        "tags": secret.tags,
        "metadata": secret.secret_metadata,
        "created_at": secret.created_at.isoformat() if secret.created_at else None,
        "updated_at": secret.updated_at.isoformat() if secret.updated_at else None,
    }

    for field in requested_fields:
        if field in field_map:
            response[field] = field_map[field]

    return response


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


@router.post(
    "/batch",
    tags=["Vault"],
    summary="Batch get secrets",
    description="Get multiple secrets with field filtering in one request.",
)
async def batch_get_secrets(
    request: Request,
    body: VaultBatchSecretBatchRequest,
    db: AsyncSession = Depends(get_async_db),
    token: Token = Depends(get_token_from_bearer),
) -> dict:
    """Get multiple secrets in a single request.

    Request body should be an object with a `requests` array containing:
    - secret_id: The secret ID to fetch
    - fields: Optional list of field names to return
    """
    results = []
    denied = []

    for req in body.requests:
        secret_id = req.secret_id

        try:
            # Parse fields
            requested_fields = validate_and_filter_fields(req.fields)

            # Check permission
            permission_svc = get_permission_service()
            has_access = await permission_svc.check_permission(
                db=db,
                token=token,
                secret_id=secret_id,
                action="read",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                requested_field_count=len(requested_fields) if requested_fields else None,
            )

            if not has_access:
                denied.append({"secret_id": secret_id, "reason": "no_permission"})
                continue

            # Get secret
            secret = await db.get(Secret, secret_id)
            if not secret:
                denied.append({"secret_id": secret_id, "reason": "not_found"})
                continue

            # Build response
            response_item = {"secret_id": secret_id}
            value = None

            if "value" in requested_fields:
                encryption_svc = get_encryption_service()
                value = encryption_svc.decrypt(secret.value_encrypted)

            field_map = {
                "id": secret.id,
                "name": secret.name,
                "type": secret.type,
                "url": secret.url,
                "username": secret.username,
                "value": value,
                "tags": secret.tags,
                "metadata": secret.secret_metadata,
                "created_at": secret.created_at.isoformat() if secret.created_at else None,
                "updated_at": secret.updated_at.isoformat() if secret.updated_at else None,
            }

            for field in requested_fields:
                if field in field_map:
                    response_item[field] = field_map[field]

            results.append(response_item)

        except Exception:
            logger.exception("Error fetching secret %s in batch request", secret_id)
            denied.append({"secret_id": secret_id, "reason": "internal_error"})

    return {"results": results, "denied": denied}
