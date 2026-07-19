from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from app.time_utils import as_utc

from .base import Base

if TYPE_CHECKING:
    from .user import User


class AdminSession(Base):
    __tablename__ = "admin_sessions"
    __table_args__ = (
        sa.UniqueConstraint("key_hash", name="uq_admin_sessions_key_hash"),
        sa.Index("idx_admin_sessions_user_id", "user_id"),
        sa.Index("idx_admin_sessions_expires_at", "expires_at"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    key_hash: so.Mapped[str] = so.mapped_column(sa.String(64), nullable=False)
    key_prefix: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    expires_at: so.Mapped[datetime] = so.mapped_column(sa.DateTime(timezone=True), nullable=False)
    revoked_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    last_used_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    ip_address: so.Mapped[str | None] = so.mapped_column(sa.String(45))
    user_agent: so.Mapped[str | None] = so.mapped_column(sa.Text)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: so.Mapped[User] = so.relationship(back_populates="admin_sessions")

    def is_valid(self, now: datetime | None = None) -> bool:
        checked_at = as_utc(now or datetime.now(UTC))
        return self.revoked_at is None and checked_at < as_utc(self.expires_at)
