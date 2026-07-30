from __future__ import annotations

import uuid
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        sa.UniqueConstraint(
            "user_id",
            "principal_type",
            "principal_id",
            "key",
            name="uq_idempotency_records_principal_key",
        ),
        sa.Index("idx_idempotency_records_created_at", "created_at"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    principal_type: so.Mapped[str] = so.mapped_column(
        sa.String(32),
        default="admin",
        nullable=False,
    )
    principal_id: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    key: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    request_hash: so.Mapped[str] = so.mapped_column(sa.String(64), nullable=False)
    status_code: so.Mapped[int] = so.mapped_column(sa.Integer, nullable=False)
    response_encrypted: so.Mapped[str] = so.mapped_column(sa.Text, nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
