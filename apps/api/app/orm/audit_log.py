"""VaultGate AuditLog ORM model.

This module defines the AuditLog model for security auditing.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base


class AuditLog(Base):
    """VaultGate audit log entry.

    All sensitive operations are logged for security and compliance.
    Logs are immutable once written.
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        sa.Index("idx_audit_logs_token_id", "token_id"),
        sa.Index("idx_audit_logs_secret_id", "secret_id"),
        sa.Index("idx_audit_logs_created_at", "created_at"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    token_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("tokens.id", ondelete="SET NULL"),
        nullable=True,
    )
    token_prefix: so.Mapped[str | None] = so.mapped_column(sa.String(10), nullable=True)
    secret_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("secrets.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: so.Mapped[str] = so.mapped_column(sa.String(50), nullable=False)
    result: so.Mapped[str] = so.mapped_column(sa.String(20), nullable=False, default="success")
    ip_address: so.Mapped[str | None] = so.mapped_column(sa.String(45), nullable=True)
    user_agent: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    requested_field_count: so.Mapped[int | None] = so.mapped_column(sa.Integer, nullable=True)
    log_metadata: so.Mapped[dict] = so.mapped_column("metadata", sa.JSON, default=dict, nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id!r}, action={self.action!r}, result={self.result!r})>"
