"""Add collaborative Vault Spaces and Secret provenance.

Revision ID: 20260730_01
Revises: 20260720_01
Create Date: 2026-07-30
"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260730_01"
down_revision = "20260720_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vault_spaces",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('active', 'archived')", name="check_vault_space_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_vault_spaces_user_name"),
    )
    op.create_index("idx_vault_spaces_user_id", "vault_spaces", ["user_id"])
    op.create_index("idx_vault_spaces_status", "vault_spaces", ["status"])

    with op.batch_alter_table("secrets") as batch_op:
        batch_op.add_column(sa.Column("space_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("created_by_agent_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("created_by_token_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("version", sa.Integer(), server_default="1", nullable=False))
        batch_op.create_foreign_key(
            "fk_secrets_space_id",
            "vault_spaces",
            ["space_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch_op.create_foreign_key(
            "fk_secrets_created_by_agent_id",
            "agents",
            ["created_by_agent_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            "fk_secrets_created_by_token_id",
            "agent_tokens",
            ["created_by_token_id"],
            ["id"],
            ondelete="SET NULL",
        )

    op.create_table(
        "space_token_memberships",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("space_id", sa.String(length=255), nullable=False),
        sa.Column("token_id", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "role IN ('reader', 'contributor', 'maintainer')",
            name="check_space_membership_role",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'revoked')",
            name="check_space_membership_status",
        ),
        sa.ForeignKeyConstraint(["space_id"], ["vault_spaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["token_id"], ["agent_tokens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("space_id", "token_id", name="uq_space_token_membership"),
    )
    op.create_index("idx_space_memberships_user_id", "space_token_memberships", ["user_id"])
    op.create_index("idx_space_memberships_space_id", "space_token_memberships", ["space_id"])
    op.create_index("idx_space_memberships_token_id", "space_token_memberships", ["token_id"])

    with op.batch_alter_table("idempotency_records") as batch_op:
        batch_op.drop_constraint("uq_idempotency_records_user_key", type_="unique")
        batch_op.add_column(
            sa.Column("principal_type", sa.String(length=32), server_default="admin", nullable=False)
        )
        batch_op.add_column(sa.Column("principal_id", sa.String(length=255), nullable=True))
    op.execute("UPDATE idempotency_records SET principal_id = user_id WHERE principal_id IS NULL")
    with op.batch_alter_table("idempotency_records") as batch_op:
        batch_op.alter_column("principal_id", nullable=False)
        batch_op.create_unique_constraint(
            "uq_idempotency_records_principal_key",
            ["user_id", "principal_type", "principal_id", "key"],
        )


def downgrade() -> None:
    with op.batch_alter_table("idempotency_records") as batch_op:
        batch_op.drop_constraint("uq_idempotency_records_principal_key", type_="unique")
        batch_op.drop_column("principal_id")
        batch_op.drop_column("principal_type")
        batch_op.create_unique_constraint(
            "uq_idempotency_records_user_key",
            ["user_id", "key"],
        )
    op.drop_table("space_token_memberships")
    with op.batch_alter_table("secrets") as batch_op:
        batch_op.drop_constraint("fk_secrets_created_by_token_id", type_="foreignkey")
        batch_op.drop_constraint("fk_secrets_created_by_agent_id", type_="foreignkey")
        batch_op.drop_constraint("fk_secrets_space_id", type_="foreignkey")
        batch_op.drop_column("version")
        batch_op.drop_column("created_by_token_id")
        batch_op.drop_column("created_by_agent_id")
        batch_op.drop_column("space_id")
    op.drop_index("idx_vault_spaces_status", table_name="vault_spaces")
    op.drop_index("idx_vault_spaces_user_id", table_name="vault_spaces")
    op.drop_table("vault_spaces")
