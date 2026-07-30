from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .agent_token import AgentToken
    from .user import User
    from .vault_space import VaultSpace


class SpaceRole:
    READER = "reader"
    CONTRIBUTOR = "contributor"
    MAINTAINER = "maintainer"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.READER, cls.CONTRIBUTOR, cls.MAINTAINER]


class SpaceMembershipStatus:
    ACTIVE = "active"
    REVOKED = "revoked"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.REVOKED]


class SpaceTokenMembership(Base):
    __tablename__ = "space_token_memberships"
    __table_args__ = (
        sa.UniqueConstraint("space_id", "token_id", name="uq_space_token_membership"),
        sa.Index("idx_space_memberships_user_id", "user_id"),
        sa.Index("idx_space_memberships_space_id", "space_id"),
        sa.Index("idx_space_memberships_token_id", "token_id"),
        sa.CheckConstraint(
            sa.text(f"role IN ({', '.join(repr(value) for value in SpaceRole.all_values())})"),
            name="check_space_membership_role",
        ),
        sa.CheckConstraint(
            sa.text(
                f"status IN ({', '.join(repr(value) for value in SpaceMembershipStatus.all_values())})"
            ),
            name="check_space_membership_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    space_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("vault_spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("agent_tokens.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: so.Mapped[str] = so.mapped_column(sa.String(20), nullable=False)
    status: so.Mapped[str] = so.mapped_column(
        sa.String(20),
        default=SpaceMembershipStatus.ACTIVE,
        nullable=False,
    )
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: so.Mapped[User] = so.relationship(back_populates="space_token_memberships")
    space: so.Mapped[VaultSpace] = so.relationship(back_populates="memberships")
    token: so.Mapped[AgentToken] = so.relationship(back_populates="space_memberships")
