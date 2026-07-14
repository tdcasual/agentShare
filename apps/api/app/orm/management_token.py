from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .admin_session import _as_utc
from .base import Base

if TYPE_CHECKING:
    from .user import User


class ManagementToken(Base):
    __tablename__ = "management_tokens"
    __table_args__ = (
        sa.UniqueConstraint("key_hash", name="uq_management_tokens_key_hash"),
        sa.Index("idx_management_tokens_user_id", "user_id"),
        sa.Index("idx_management_tokens_expires_at", "expires_at"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    key_hash: so.Mapped[str] = so.mapped_column(sa.String(64), nullable=False)
    key_prefix: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text)
    expires_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    revoked_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    last_used_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: so.Mapped[User] = so.relationship(back_populates="management_tokens")

    def is_valid(self, now: datetime | None = None) -> bool:
        if self.revoked_at is not None:
            return False
        if self.expires_at is None:
            return True
        return _as_utc(now or datetime.now(UTC)) < _as_utc(self.expires_at)
