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


class AgentStatus:
    ACTIVE = "active"
    DISABLED = "disabled"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.DISABLED]


class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "name", name="uq_agents_user_name"),
        sa.CheckConstraint(
            sa.text(f"status IN ({', '.join(repr(value) for value in AgentStatus.all_values())})"),
            name="check_agent_status",
        ),
        sa.Index("idx_agents_user_id", "user_id"),
        sa.Index("idx_agents_status", "status"),
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
        default=AgentStatus.ACTIVE,
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

    user: so.Mapped[User] = so.relationship(back_populates="agents")
    tokens: so.Mapped[list[AgentToken]] = so.relationship(
        back_populates="agent",
        cascade="all, delete-orphan",
    )
