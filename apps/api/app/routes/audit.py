"""VaultGate audit log routes.

This module provides API endpoints for querying audit logs.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.dependencies import get_current_user_from_session
from app.orm.audit_log import AuditLog
from app.orm.user import User
from app.schemas.vault import PaginationParams

router = APIRouter(prefix="/api/audit-logs")


@router.get(
    "",
    response_model=dict,
    tags=["Audit"],
    summary="List audit logs",
    description="List audit log entries for the current user's tokens and secrets.",
)
async def list_audit_logs(
    pagination: PaginationParams = Depends(),
    token_id: str | None = Query(None, description="Filter by token ID"),
    secret_id: str | None = Query(None, description="Filter by secret ID"),
    action: str | None = Query(None, description="Filter by action"),
    result: str | None = Query(None, description="Filter by result (success or denied)"),
    user: User = Depends(get_current_user_from_session),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """List audit logs for the current user with optional filters."""
    from app.orm.secret import Secret
    from app.orm.token import Token

    # Build base query: restrict to logs for tokens/secrets owned by current user
    token_ids_subquery = (
        select(Token.id)
        .where(Token.user_id == user.id)
        .scalar_subquery()
    )
    secret_ids_subquery = (
        select(Secret.id)
        .where(Secret.user_id == user.id)
        .scalar_subquery()
    )

    query = select(AuditLog).where(
        (AuditLog.token_id.is_(None) | AuditLog.token_id.in_(token_ids_subquery))
        & (AuditLog.secret_id.is_(None) | AuditLog.secret_id.in_(secret_ids_subquery))
    )

    if token_id:
        query = query.where(AuditLog.token_id == token_id)
    if secret_id:
        query = query.where(AuditLog.secret_id == secret_id)
    if action:
        query = query.where(AuditLog.action == action)
    if result:
        query = query.where(AuditLog.result == result)

    # Get total count
    count_query = select(func.count(AuditLog.id)).where(
        (AuditLog.token_id.is_(None) | AuditLog.token_id.in_(token_ids_subquery))
        & (AuditLog.secret_id.is_(None) | AuditLog.secret_id.in_(secret_ids_subquery))
    )
    if token_id:
        count_query = count_query.where(AuditLog.token_id == token_id)
    if secret_id:
        count_query = count_query.where(AuditLog.secret_id == secret_id)
    if action:
        count_query = count_query.where(AuditLog.action == action)
    if result:
        count_query = count_query.where(AuditLog.result == result)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    query = query.order_by(desc(AuditLog.created_at)).limit(pagination.limit).offset(pagination.offset)
    result_rows = await db.execute(query)
    logs = result_rows.scalars().all()

    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "token_id": log.token_id,
            "token_prefix": log.token_prefix,
            "secret_id": log.secret_id,
            "action": log.action,
            "granted": log.result == "success",
            "result": log.result,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "requested_field_count": log.requested_field_count,
            "metadata": log.log_metadata,
        })

    return {
        "items": items,
        "total": total,
        "limit": pagination.limit,
        "offset": pagination.offset,
    }
