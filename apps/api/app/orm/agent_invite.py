from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .vault_space import VaultSpace


class AgentInviteStatus:
    ACTIVE = "active"
    CONSUMED = "consumed"
    REVOKED = "revoked"
    EXPIRED = "expired"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.CONSUMED, cls.REVOKED, cls.EXPIRED]


class AgentInvite(Base):
    __tablename__ = "agent_invites"
    __table_args__ = (
        sa.Index("idx_agent_invites_user_id", "user_id"),
        sa.Index("idx_agent_invites_status", "status"),
        sa.CheckConstraint(
            f"status IN ({', '.join(repr(value) for value in AgentInviteStatus.all_values())})",
            name="check_agent_invite_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    code_hash: so.Mapped[str] = so.mapped_column(sa.String(64), unique=True, nullable=False)
    label: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    default_space_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255), sa.ForeignKey("vault_spaces.id", ondelete="SET NULL")
    )
    default_role: so.Mapped[str] = so.mapped_column(sa.String(20), nullable=False, default="reader")
    status: so.Mapped[str] = so.mapped_column(sa.String(20), nullable=False, default=AgentInviteStatus.ACTIVE)
    expires_at: so.Mapped[datetime] = so.mapped_column(sa.DateTime(timezone=True), nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    consumed_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    revoked_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))

    user: so.Mapped[User] = so.relationship()
    space: so.Mapped[VaultSpace | None] = so.relationship()


class AgentJoinRequestStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.PENDING, cls.APPROVED, cls.REJECTED, cls.EXPIRED]


class AgentJoinRequest(Base):
    __tablename__ = "agent_join_requests"
    __table_args__ = (
        sa.UniqueConstraint("invite_id", name="uq_agent_join_requests_invite_id"),
        sa.Index("idx_agent_join_requests_user_id", "user_id"),
        sa.Index("idx_agent_join_requests_status", "status"),
        sa.CheckConstraint(
            f"status IN ({', '.join(repr(value) for value in AgentJoinRequestStatus.all_values())})",
            name="check_agent_join_request_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    invite_id: so.Mapped[str] = so.mapped_column(
        sa.String(255), sa.ForeignKey("agent_invites.id", ondelete="CASCADE"), nullable=False
    )
    request_secret_hash: so.Mapped[str] = so.mapped_column(sa.String(64), unique=True, nullable=False)
    proposed_name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text)
    status: so.Mapped[str] = so.mapped_column(sa.String(20), nullable=False, default=AgentJoinRequestStatus.PENDING)
    agent_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255), sa.ForeignKey("agents.id", ondelete="SET NULL")
    )
    rejection_reason: so.Mapped[str | None] = so.mapped_column(sa.String(1000))
    delivery_encrypted: so.Mapped[str | None] = so.mapped_column(sa.Text)
    delivery_claimed_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    delivery_expires_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    reviewed_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))

    user: so.Mapped[User] = so.relationship()
    invite: so.Mapped[AgentInvite] = so.relationship()
