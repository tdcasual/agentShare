"""VaultGate User ORM model.

This module defines the User model for VaultGate's simplified authentication system.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .admin_session import AdminSession
    from .agent import Agent
    from .agent_token import AgentToken
    from .management_token import ManagementToken
    from .secret import Secret
    from .space_token_membership import SpaceTokenMembership
    from .vault_space import VaultSpace


class User(Base):
    """VaultGate user account.

    Users can create secrets and issue tokens for external access.
    """

    __tablename__ = "users"
    __table_args__ = (
        sa.Index("idx_users_email", "email"),
        sa.UniqueConstraint("singleton_key", name="uq_users_singleton_key"),
        sa.CheckConstraint("singleton_key = 1", name="check_users_singleton_key"),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    singleton_key: so.Mapped[int] = so.mapped_column(
        sa.Integer,
        default=1,
        server_default=sa.text("1"),
        nullable=False,
    )
    email: so.Mapped[str] = so.mapped_column(sa.String(255), unique=True, nullable=False)
    password_hash: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    secrets: so.WriteOnlyMapped[Secret] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    agents: so.Mapped[list[Agent]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    agent_tokens: so.WriteOnlyMapped[AgentToken] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    admin_sessions: so.WriteOnlyMapped[AdminSession] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    management_tokens: so.WriteOnlyMapped[ManagementToken] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    vault_spaces: so.Mapped[list[VaultSpace]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    space_token_memberships: so.WriteOnlyMapped[SpaceTokenMembership] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r})>"
