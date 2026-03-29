"""admin bootstrap

Revision ID: 20260329_02
Revises: 20260329_01
Create Date: 2026-03-29 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260329_02"
down_revision = "20260329_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("human_accounts"):
        op.create_table(
            "human_accounts",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("display_name", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )

    if not inspector.has_table("system_settings"):
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(), nullable=False),
            sa.Column("value_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("key"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("system_settings"):
        op.drop_table("system_settings")
    if inspector.has_table("human_accounts"):
        op.drop_table("human_accounts")
