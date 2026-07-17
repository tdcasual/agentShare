from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.orm import AdminSession, AgentToken, AuditLog, IdempotencyRecord, ManagementToken
from app.orm.admin_session import _as_utc


def should_update_last_used(
    last_used_at: datetime | None,
    now: datetime,
    interval_seconds: int,
) -> bool:
    if last_used_at is None:
        return True
    return _as_utc(now) - _as_utc(last_used_at) >= timedelta(seconds=interval_seconds)


async def cleanup_expired_records(db: AsyncSession, settings: Settings) -> None:
    now = datetime.now(UTC)
    credential_cutoff = now - timedelta(days=settings.credential_retention_days)
    audit_cutoff = now - timedelta(days=settings.audit_retention_days)
    idempotency_cutoff = now - timedelta(days=settings.idempotency_retention_days)

    await db.execute(
        delete(AdminSession).where(
            or_(
                AdminSession.expires_at < credential_cutoff,
                AdminSession.revoked_at < credential_cutoff,
            )
        )
    )
    await db.execute(
        delete(ManagementToken).where(
            or_(
                ManagementToken.expires_at < credential_cutoff,
                ManagementToken.revoked_at < credential_cutoff,
            )
        )
    )
    await db.execute(
        delete(AgentToken).where(
            or_(
                AgentToken.expires_at < credential_cutoff,
                AgentToken.revoked_at < credential_cutoff,
            )
        )
    )
    await db.execute(delete(AuditLog).where(AuditLog.created_at < audit_cutoff))
    await db.execute(delete(IdempotencyRecord).where(IdempotencyRecord.created_at < idempotency_cutoff))
    await db.commit()
