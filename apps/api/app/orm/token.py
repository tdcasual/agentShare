"""VaultGate Token ORM model.

This module defines the Token model for API access control.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .scope import Scope


class TokenStatus:
    """Token status constants."""

    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.REVOKED, cls.EXPIRED]


class Token(Base):
    """VaultGate access token.

    Tokens are issued by users to grant external systems (agents, scripts,
    applications) access to specific secrets.
    """

    __tablename__ = "tokens"
    __table_args__ = (
        sa.Index("idx_tokens_user_id", "user_id"),
        sa.Index("idx_tokens_key_hash", "key_hash"),
        sa.Index("idx_tokens_expires_at", "expires_at"),
        sa.UniqueConstraint("key_hash", name="uq_tokens_key_hash"),
        sa.CheckConstraint(
            sa.text(f"status IN ({', '.join(repr(s) for s in TokenStatus.all_values())})"),
            name="check_token_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    key_hash: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False, unique=True)
    key_prefix: so.Mapped[str] = so.mapped_column(sa.String(10), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    status: so.Mapped[str] = so.mapped_column(
        sa.String(20),
        default=TokenStatus.ACTIVE,
        nullable=False,
    )
    expires_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: so.Mapped[User] = so.relationship(back_populates="tokens")
    scopes: so.WriteOnlyMapped[Scope] = so.relationship(
        back_populates="token",
        cascade="all, delete-orphan",
    )

    def is_expired(self) -> bool:
        """Check if token is expired."""
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at

    def is_valid(self) -> bool:
        """Check if token is valid (active and not expired)."""
        return self.status == TokenStatus.ACTIVE and not self.is_expired()

    def __repr__(self) -> str:
        return f"<Token(id={self.id!r}, name={self.name!r}, prefix={self.key_prefix!r})>"
