from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from app.time_utils import as_utc

from .base import Base

if TYPE_CHECKING:
    from .agent import Agent
    from .token_secret_grant import TokenSecretGrant
    from .user import User


class AgentTokenStatus:
    ACTIVE = "active"
    REVOKED = "revoked"

    @classmethod
    def all_values(cls) -> list[str]:
        return [cls.ACTIVE, cls.REVOKED]


class AgentToken(Base):
    __tablename__ = "agent_tokens"
    __table_args__ = (
        sa.Index("idx_agent_tokens_user_id", "user_id"),
        sa.Index("idx_agent_tokens_agent_id", "agent_id"),
        sa.Index("idx_agent_tokens_key_hash", "key_hash"),
        sa.Index("idx_agent_tokens_expires_at", "expires_at"),
        sa.UniqueConstraint("key_hash", name="uq_agent_tokens_key_hash"),
        sa.CheckConstraint(
            sa.text(
                f"status IN ({', '.join(repr(value) for value in AgentTokenStatus.all_values())})"
            ),
            name="check_agent_token_status",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    key_hash: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    key_prefix: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text)
    status: so.Mapped[str] = so.mapped_column(
        sa.String(20),
        default=AgentTokenStatus.ACTIVE,
        nullable=False,
    )
    expires_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    revoked_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    last_used_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: so.Mapped[User] = so.relationship(back_populates="agent_tokens")
    agent: so.Mapped[Agent] = so.relationship(back_populates="tokens")
    grants: so.Mapped[list[TokenSecretGrant]] = so.relationship(
        back_populates="token",
        cascade="all, delete-orphan",
    )

    def is_expired(self, now: datetime | None = None) -> bool:
        if self.expires_at is None:
            return False
        return as_utc(now or datetime.now(UTC)) >= as_utc(self.expires_at)

    def is_valid(self, now: datetime | None = None) -> bool:
        return (
            self.status == AgentTokenStatus.ACTIVE
            and self.revoked_at is None
            and not self.is_expired(now)
        )
