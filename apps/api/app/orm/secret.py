"""VaultGate Secret ORM model.

This module defines the Secret model for storing encrypted credentials.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .token_secret_grant import TokenSecretGrant
    from .user import User
    from .vault_space import VaultSpace


class SecretType(StrEnum):
    """Secret type constants."""

    PASSWORD = "password"
    API_KEY = "api_key"
    BASIC_AUTH = "basic_auth"
    BEARER_TOKEN = "bearer_token"
    API_KEY_HEADER = "api_key_header"
    OAUTH_TOKEN = "oauth_token"
    CERTIFICATE = "certificate"
    SSH_KEY = "ssh_key"
    DATABASE_URL = "database_url"
    CUSTOM = "custom"

    @classmethod
    def all_values(cls) -> list[str]:
        return [secret_type.value for secret_type in cls]


class Secret(Base):
    """VaultGate secret containing encrypted credentials.

    Secrets can be API keys, passwords, or any sensitive data that needs
    secure storage and controlled access via tokens.
    """

    __tablename__ = "secrets"
    __table_args__ = (
        sa.Index("idx_secrets_user_id", "user_id"),
        sa.Index("idx_secrets_type", "type"),
        # Unique index (not a table constraint) so the migration can use
        # create_index without rebuilding the table on SQLite.
        sa.Index("uq_secrets_name", "name", unique=True),
        sa.CheckConstraint(
            sa.text(f"type IN ({', '.join(repr(t) for t in SecretType.all_values())})"),
            name="check_secret_type",
        ),
    )

    id: so.Mapped[str] = so.mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: so.Mapped[str] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    space_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("vault_spaces.id", ondelete="RESTRICT"),
        nullable=True,
    )
    created_by_agent_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_token_id: so.Mapped[str | None] = so.mapped_column(
        sa.String(255),
        sa.ForeignKey("agent_tokens.id", ondelete="SET NULL"),
        nullable=True,
    )
    version: so.Mapped[int] = so.mapped_column(sa.Integer, default=1, nullable=False)
    type: so.Mapped[str] = so.mapped_column(sa.String(50), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    url: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    documentation_url: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    username: so.Mapped[str | None] = so.mapped_column(sa.String(255), nullable=True)
    description: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    value_encrypted: so.Mapped[str] = so.mapped_column(sa.Text, nullable=False)
    tags: so.Mapped[list[str]] = so.mapped_column(
        sa.JSON,
        default=list,
        nullable=False,
    )
    secret_metadata: so.Mapped[dict] = so.mapped_column("metadata", sa.JSON, default=dict, nullable=False)
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

    # Relationships
    user: so.Mapped[User] = so.relationship(back_populates="secrets")
    space: so.Mapped[VaultSpace | None] = so.relationship(back_populates="secrets")
    grants: so.WriteOnlyMapped[TokenSecretGrant] = so.relationship(
        back_populates="secret",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Secret(id={self.id!r}, name={self.name!r}, type={self.type!r})>"
