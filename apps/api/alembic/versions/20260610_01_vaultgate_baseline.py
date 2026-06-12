"""VaultGate clean baseline.

Single migration that creates only the current VaultGate tables.
Replaces the entire Agent Control Plane migration chain.

Revision ID: 20260610_01
Revises:
Create Date: 2026-06-10
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260610_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_users_email", "users", ["email"])

    # 2. Secrets table
    op.create_table(
        "secrets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("value_encrypted", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "type IN ('password', 'api_key', 'basic_auth', 'bearer_token', "
            "'api_key_header', 'oauth_token', 'certificate', 'ssh_key', "
            "'database_url', 'custom')",
            name="check_secret_type",
        ),
    )
    op.create_index("idx_secrets_user_id", "secrets", ["user_id"])
    op.create_index("idx_secrets_type", "secrets", ["type"])

    # 3. Tokens table
    op.create_table(
        "tokens",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("key_prefix", sa.String(10), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="active"
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("key_hash", name="uq_tokens_key_hash"),
        sa.CheckConstraint(
            "status IN ('active', 'revoked', 'expired')",
            name="check_token_status",
        ),
    )
    op.create_index("idx_tokens_user_id", "tokens", ["user_id"])
    op.create_index("idx_tokens_key_hash", "tokens", ["key_hash"])
    op.create_index("idx_tokens_expires_at", "tokens", ["expires_at"])

    # 4. Scopes table
    op.create_table(
        "scopes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "token_id",
            sa.String(255),
            sa.ForeignKey("tokens.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "secret_id",
            sa.String(255),
            sa.ForeignKey("secrets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("allowed", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("token_id", "secret_id", name="uq_scopes_token_secret"),
    )
    op.create_index("idx_scopes_token_id", "scopes", ["token_id"])
    op.create_index("idx_scopes_secret_id", "scopes", ["secret_id"])

    # 5. Audit logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "token_id",
            sa.String(255),
            sa.ForeignKey("tokens.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("token_prefix", sa.String(10), nullable=True),
        sa.Column(
            "secret_id",
            sa.String(255),
            sa.ForeignKey("secrets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column(
            "result", sa.String(20), nullable=False, server_default="success"
        ),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("requested_field_count", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_audit_logs_token_id", "audit_logs", ["token_id"])
    op.create_index("idx_audit_logs_secret_id", "audit_logs", ["secret_id"])
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    """Drop all VaultGate tables in dependency order."""
    op.drop_table("audit_logs")
    op.drop_table("scopes")
    op.drop_table("tokens")
    op.drop_table("secrets")
    op.drop_table("users")
