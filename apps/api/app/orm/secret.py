"""VaultGate Secret ORM model.

This module defines the Secret model for storing encrypted credentials.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid

import sqlalchemy as sa
from sqlalchemy import orm as so

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .scope import Scope


class SecretType:
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
        return [
            cls.PASSWORD,
            cls.API_KEY,
            cls.BASIC_AUTH,
            cls.BEARER_TOKEN,
            cls.API_KEY_HEADER,
            cls.OAUTH_TOKEN,
            cls.CERTIFICATE,
            cls.SSH_KEY,
            cls.DATABASE_URL,
            cls.CUSTOM,
        ]


class Secret(Base):
    """VaultGate secret containing encrypted credentials.

    Secrets can be API keys, passwords, or any sensitive data that needs
    secure storage and controlled access via tokens.
    """

    __tablename__ = "secrets"
    __table_args__ = (
        sa.Index("idx_secrets_user_id", "user_id"),
        sa.Index("idx_secrets_type", "type"),
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
        index=True,
    )
    type: so.Mapped[str] = so.mapped_column(sa.String(50), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    url: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    username: so.Mapped[str | None] = so.mapped_column(sa.String(255), nullable=True)
    value_encrypted: so.Mapped[str] = so.mapped_column(sa.Text, nullable=False)
    tags: so.Mapped[list[str]] = so.mapped_column(
        sa.JSON,
        default=list,
        nullable=False,
    )
    secret_metadata: so.Mapped[dict] = so.mapped_column("metadata", sa.JSON, default=dict, nullable=False)
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: so.Mapped[User] = so.relationship(back_populates="secrets")
    scopes: so.WriteOnlyMapped[Scope] = so.relationship(
        back_populates="secret",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Secret(id={self.id!r}, name={self.name!r}, type={self.type!r})>"
