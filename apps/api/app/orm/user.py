"""VaultGate User ORM model.

This module defines the User model for VaultGate's simplified authentication system.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .secret import Secret
    from .token import Token


class User(Base):
    """VaultGate user account.

    Users can create secrets and issue tokens for external access.
    """

    __tablename__ = "users"
    __table_args__ = (
        sa.Index("idx_users_email", "email"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    email: so.Mapped[str] = so.mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    password_hash: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    secrets: so.WriteOnlyMapped[Secret] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    tokens: so.WriteOnlyMapped[Token] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r})>"
