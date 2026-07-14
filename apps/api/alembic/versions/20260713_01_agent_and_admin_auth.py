"""Add agents, scoped tokens, and revocable administrator authentication.

Revision ID: 20260713_01
Revises: 20260613_01
Create Date: 2026-07-13
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa

from alembic import op

revision = "20260713_01"
down_revision = "20260613_01"
branch_labels = None
depends_on = None


def _require_single_existing_user() -> None:
    user_count = op.get_bind().execute(sa.text("SELECT COUNT(*) FROM users")).scalar_one()
    if user_count > 1:
        raise RuntimeError(
            "VaultGate supports one administrator, but the database contains "
            f"{user_count} users. Consolidate users before upgrading."
        )


def _create_migration_agent() -> None:
    bind = op.get_bind()
    user_rows = bind.execute(
        sa.text("SELECT DISTINCT user_id FROM agent_tokens ORDER BY user_id")
    ).all()
    for (user_id,) in user_rows:
        agent_id = str(uuid.uuid4())
        bind.execute(
            sa.text(
                "INSERT INTO agents (id, user_id, name, status) "
                "VALUES (:id, :user_id, :name, 'active')"
            ),
            {"id": agent_id, "user_id": user_id, "name": "Migrated Agent"},
        )
        bind.execute(
            sa.text(
                "UPDATE agent_tokens SET agent_id = :agent_id "
                "WHERE user_id = :user_id"
            ),
            {"agent_id": agent_id, "user_id": user_id},
        )


def upgrade() -> None:
    _require_single_existing_user()

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column(
                "singleton_key",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("1"),
            )
        )
        batch_op.create_unique_constraint("uq_users_singleton_key", ["singleton_key"])
        batch_op.create_check_constraint("check_users_singleton_key", "singleton_key = 1")

    op.create_table(
        "agents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
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
        sa.UniqueConstraint("user_id", "name", name="uq_agents_user_name"),
        sa.CheckConstraint("status IN ('active', 'disabled')", name="check_agent_status"),
    )
    op.create_index("idx_agents_user_id", "agents", ["user_id"])
    op.create_index("idx_agents_status", "agents", ["status"])

    op.rename_table("tokens", "agent_tokens")
    op.drop_index("idx_tokens_expires_at", table_name="agent_tokens")
    op.drop_index("idx_tokens_key_hash", table_name="agent_tokens")
    op.drop_index("idx_tokens_user_id", table_name="agent_tokens")
    with op.batch_alter_table("agent_tokens") as batch_op:
        batch_op.drop_constraint("uq_tokens_key_hash", type_="unique")
        batch_op.drop_constraint("check_token_status", type_="check")
        batch_op.alter_column(
            "key_prefix",
            existing_type=sa.String(10),
            type_=sa.String(16),
            existing_nullable=False,
        )
        batch_op.add_column(sa.Column("agent_id", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("revoked_at", sa.DateTime(timezone=True)))
        batch_op.create_unique_constraint("uq_agent_tokens_key_hash", ["key_hash"])
        batch_op.create_check_constraint(
            "check_agent_token_status",
            "status IN ('active', 'revoked')",
        )

    _create_migration_agent()

    with op.batch_alter_table("agent_tokens") as batch_op:
        batch_op.alter_column("agent_id", existing_type=sa.String(255), nullable=False)
        batch_op.create_foreign_key(
            "fk_agent_tokens_agent_id_agents",
            "agents",
            ["agent_id"],
            ["id"],
            ondelete="CASCADE",
        )
    op.create_index("idx_agent_tokens_user_id", "agent_tokens", ["user_id"])
    op.create_index("idx_agent_tokens_key_hash", "agent_tokens", ["key_hash"])
    op.create_index("idx_agent_tokens_expires_at", "agent_tokens", ["expires_at"])
    op.create_index("idx_agent_tokens_agent_id", "agent_tokens", ["agent_id"])

    op.rename_table("scopes", "token_secret_grants")
    op.drop_index("idx_scopes_secret_id", table_name="token_secret_grants")
    op.drop_index("idx_scopes_token_id", table_name="token_secret_grants")
    with op.batch_alter_table("token_secret_grants") as batch_op:
        batch_op.drop_constraint("uq_scopes_token_secret", type_="unique")
        batch_op.create_unique_constraint(
            "uq_token_secret_grants_token_secret",
            ["token_id", "secret_id"],
        )
    op.create_index(
        "idx_token_secret_grants_token_id",
        "token_secret_grants",
        ["token_id"],
    )
    op.create_index(
        "idx_token_secret_grants_secret_id",
        "token_secret_grants",
        ["secret_id"],
    )

    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "token_prefix",
            existing_type=sa.String(10),
            type_=sa.String(16),
            existing_nullable=True,
        )
        batch_op.add_column(sa.Column("actor_type", sa.String(32), nullable=True))
        batch_op.add_column(sa.Column("actor_id", sa.String(255)))
        batch_op.add_column(sa.Column("actor_label", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("resource_type", sa.String(32)))
        batch_op.add_column(sa.Column("resource_id", sa.String(255)))
        batch_op.add_column(sa.Column("resource_label", sa.String(255)))
        batch_op.add_column(sa.Column("reason", sa.String(100)))
        batch_op.add_column(sa.Column("request_id", sa.String(255)))

    op.execute(
        sa.text(
            "UPDATE audit_logs SET "
            "actor_type = CASE WHEN token_id IS NULL THEN 'legacy' ELSE 'agent_token' END, "
            "actor_id = token_id, "
            "actor_label = COALESCE(token_prefix, token_id, 'legacy migration'), "
            "resource_type = CASE WHEN secret_id IS NULL THEN NULL ELSE 'secret' END, "
            "resource_id = secret_id, "
            "resource_label = secret_id"
        )
    )
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "actor_type",
            existing_type=sa.String(32),
            nullable=False,
        )
        batch_op.alter_column(
            "actor_label",
            existing_type=sa.String(255),
            nullable=False,
        )
    op.create_index("idx_audit_logs_actor", "audit_logs", ["actor_type", "actor_id"])
    op.create_index(
        "idx_audit_logs_resource",
        "audit_logs",
        ["resource_type", "resource_id"],
    )
    op.create_index("idx_audit_logs_request_id", "audit_logs", ["request_id"])

    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("key_prefix", sa.String(16), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("key_hash", name="uq_admin_sessions_key_hash"),
    )
    op.create_index("idx_admin_sessions_user_id", "admin_sessions", ["user_id"])
    op.create_index("idx_admin_sessions_expires_at", "admin_sessions", ["expires_at"])

    op.create_table(
        "management_tokens",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("key_prefix", sa.String(16), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("key_hash", name="uq_management_tokens_key_hash"),
    )
    op.create_index("idx_management_tokens_user_id", "management_tokens", ["user_id"])
    op.create_index(
        "idx_management_tokens_expires_at",
        "management_tokens",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_table("management_tokens")
    op.drop_table("admin_sessions")

    op.drop_index("idx_audit_logs_request_id", table_name="audit_logs")
    op.drop_index("idx_audit_logs_resource", table_name="audit_logs")
    op.drop_index("idx_audit_logs_actor", table_name="audit_logs")
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "token_prefix",
            existing_type=sa.String(16),
            type_=sa.String(10),
            existing_nullable=True,
        )
        batch_op.drop_column("request_id")
        batch_op.drop_column("reason")
        batch_op.drop_column("resource_label")
        batch_op.drop_column("resource_id")
        batch_op.drop_column("resource_type")
        batch_op.drop_column("actor_label")
        batch_op.drop_column("actor_id")
        batch_op.drop_column("actor_type")

    op.drop_index(
        "idx_token_secret_grants_secret_id",
        table_name="token_secret_grants",
    )
    op.drop_index(
        "idx_token_secret_grants_token_id",
        table_name="token_secret_grants",
    )
    with op.batch_alter_table("token_secret_grants") as batch_op:
        batch_op.drop_constraint(
            "uq_token_secret_grants_token_secret",
            type_="unique",
        )
        batch_op.create_unique_constraint(
            "uq_scopes_token_secret",
            ["token_id", "secret_id"],
        )
    op.rename_table("token_secret_grants", "scopes")
    op.create_index("idx_scopes_token_id", "scopes", ["token_id"])
    op.create_index("idx_scopes_secret_id", "scopes", ["secret_id"])

    op.drop_index("idx_agent_tokens_agent_id", table_name="agent_tokens")
    op.drop_index("idx_agent_tokens_expires_at", table_name="agent_tokens")
    op.drop_index("idx_agent_tokens_key_hash", table_name="agent_tokens")
    op.drop_index("idx_agent_tokens_user_id", table_name="agent_tokens")
    with op.batch_alter_table("agent_tokens") as batch_op:
        batch_op.drop_constraint("fk_agent_tokens_agent_id_agents", type_="foreignkey")
        batch_op.drop_constraint("check_agent_token_status", type_="check")
        batch_op.drop_constraint("uq_agent_tokens_key_hash", type_="unique")
        batch_op.alter_column(
            "key_prefix",
            existing_type=sa.String(16),
            type_=sa.String(10),
            existing_nullable=False,
        )
        batch_op.drop_column("revoked_at")
        batch_op.drop_column("agent_id")
        batch_op.create_unique_constraint("uq_tokens_key_hash", ["key_hash"])
        batch_op.create_check_constraint(
            "check_token_status",
            "status IN ('active', 'revoked')",
        )
    op.rename_table("agent_tokens", "tokens")
    op.create_index("idx_tokens_user_id", "tokens", ["user_id"])
    op.create_index("idx_tokens_key_hash", "tokens", ["key_hash"])
    op.create_index("idx_tokens_expires_at", "tokens", ["expires_at"])

    op.drop_table("agents")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("check_users_singleton_key", type_="check")
        batch_op.drop_constraint("uq_users_singleton_key", type_="unique")
        batch_op.drop_column("singleton_key")
