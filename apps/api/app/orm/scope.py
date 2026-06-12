"""VaultGate Scope ORM model.

This module defines the Scope model for token-secret permissions.
"""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

import sqlalchemy as sa
from sqlalchemy import orm as so

from typing import TYPE_CHECKING

from .base import Base

if TYPE_CHECKING:
    from .secret import Secret
    from .token import Token


class Scope(Base):
    """VaultGate permission scope.

    Scopes define which tokens have access to which secrets.
    A scope with allowed=true grants access, allowed=false denies it.
    Missing scope means no access (default deny).
    """

    __tablename__ = "scopes"
    __table_args__ = (
        sa.Index("idx_scopes_token_id", "token_id"),
        sa.Index("idx_scopes_secret_id", "secret_id"),
        sa.UniqueConstraint("token_id", "secret_id", name="uq_scopes_token_secret"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    token_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("tokens.id", ondelete="CASCADE"),
        nullable=False,
    )
    secret_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("secrets.id", ondelete="CASCADE"),
        nullable=False,
    )
    allowed: so.Mapped[bool] = so.mapped_column(sa.Boolean, default=True, nullable=False)

    # Relationships
    token: so.Mapped[Token] = so.relationship(back_populates="scopes")
    secret: so.Mapped[Secret] = so.relationship(back_populates="scopes")

    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Scope(token_id={self.token_id!r}, secret_id={self.secret_id!r}, allowed={self.allowed!r})>"
