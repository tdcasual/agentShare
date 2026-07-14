from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.routes import get_admin_principal
from app.modules.admin_auth.service import AdminPrincipal
from app.orm import AuditLog

router = APIRouter(prefix="/api/admin", tags=["Admin Audit"])


@router.get("/audit-logs")
async def list_audit_logs(
    result: str | None = Query(default=None),
    action: str | None = Query(default=None),
    actor_type: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    resource_id: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    filters = []
    if result is not None:
        filters.append(AuditLog.result == result)
    if action is not None:
        filters.append(AuditLog.action == action)
    if actor_type is not None:
        filters.append(AuditLog.actor_type == actor_type)
    if actor_id is not None:
        filters.append(AuditLog.actor_id == actor_id)
    if resource_type is not None:
        filters.append(AuditLog.resource_type == resource_type)
    if resource_id is not None:
        filters.append(AuditLog.resource_id == resource_id)
    if created_from is not None:
        filters.append(AuditLog.created_at >= created_from)
    if created_to is not None:
        filters.append(AuditLog.created_at <= created_to)
    total = await db.scalar(select(func.count(AuditLog.id)).where(*filters))
    rows = await db.scalars(
        select(AuditLog)
        .where(*filters)
        .order_by(AuditLog.created_at.desc(), AuditLog.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [
            {
                "id": log.id,
                "actor_type": log.actor_type,
                "actor_id": log.actor_id,
                "actor_label": log.actor_label,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "resource_label": log.resource_label,
                "action": log.action,
                "result": log.result,
                "reason": log.reason,
                "request_id": log.request_id,
                "created_at": log.created_at.isoformat(),
            }
            for log in rows
        ],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/audit-stats")
async def audit_stats(
    _principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, int]:
    total = await db.scalar(select(func.count(AuditLog.id)))
    access_filter = AuditLog.actor_type == "agent_token"
    granted = await db.scalar(
        select(func.count(AuditLog.id)).where(access_filter, AuditLog.result == "success")
    )
    denied = await db.scalar(
        select(func.count(AuditLog.id)).where(access_filter, AuditLog.result == "denied")
    )
    value_reads = await db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.action == "secret.value.read")
    )
    return {
        "total": total or 0,
        "granted": granted or 0,
        "denied": denied or 0,
        "value_reads": value_reads or 0,
    }
