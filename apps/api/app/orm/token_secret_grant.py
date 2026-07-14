from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .agent_token import AgentToken
    from .secret import Secret


class TokenSecretGrant(Base):
    __tablename__ = "token_secret_grants"
    __table_args__ = (
        sa.Index("idx_token_secret_grants_token_id", "token_id"),
        sa.Index("idx_token_secret_grants_secret_id", "secret_id"),
        sa.UniqueConstraint(
            "token_id",
            "secret_id",
            name="uq_token_secret_grants_token_secret",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    token_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("agent_tokens.id", ondelete="CASCADE"),
        nullable=False,
    )
    secret_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("secrets.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    token: so.Mapped[AgentToken] = so.relationship(back_populates="grants")
    secret: so.Mapped[Secret] = so.relationship(back_populates="grants")
