from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .secret import Secret
    from .space_token_membership import SpaceTokenMembership
    from .user import User


class VaultSpaceStatus:
    ACTIVE = "active"
    ARCHIVED = "archived"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.ARCHIVED]


class VaultSpace(Base):
    __tablename__ = "vault_spaces"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "name", name="uq_vault_spaces_user_name"),
        sa.Index("idx_vault_spaces_user_id", "user_id"),
        sa.Index("idx_vault_spaces_status", "status"),
        sa.CheckConstraint(
            sa.text(f"status IN ({', '.join(repr(value) for value in VaultSpaceStatus.all_values())})"),
            name="check_vault_space_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text)
    status: so.Mapped[str] = so.mapped_column(
        sa.String(20),
        default=VaultSpaceStatus.ACTIVE,
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

    user: so.Mapped[User] = so.relationship(back_populates="vault_spaces")
    secrets: so.Mapped[list[Secret]] = so.relationship(back_populates="space")
    memberships: so.Mapped[list[SpaceTokenMembership]] = so.relationship(
        back_populates="space",
        cascade="all, delete-orphan",
    )
