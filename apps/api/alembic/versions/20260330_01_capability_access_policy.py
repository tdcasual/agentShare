"""capability access policy

Revision ID: 20260330_01
Revises: 20260329_06
Create Date: 2026-03-30 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260330_01"
down_revision = "20260329_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("capabilities"):
        return

    columns = {column["name"] for column in inspector.get_columns("capabilities")}
    if "access_policy" not in columns:
        op.add_column(
            "capabilities",
            sa.Column("access_policy", sa.JSON(), nullable=False, server_default="{}"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("capabilities"):
        return

    columns = {column["name"] for column in inspector.get_columns("capabilities")}
    if "access_policy" in columns:
        op.drop_column("capabilities", "access_policy")
