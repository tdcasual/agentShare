"""asset provenance and review

Revision ID: 20260329_04
Revises: 20260329_03
Create Date: 2026-03-29 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260329_04"
down_revision = "20260329_03"
branch_labels = None
depends_on = None


TABLES = ("secrets", "capabilities", "playbooks", "tasks")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table_name in TABLES:
        if not inspector.has_table(table_name):
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "created_by_actor_type" not in columns:
            op.add_column(table_name, sa.Column("created_by_actor_type", sa.String(), nullable=False, server_default="human"))
        if "created_by_actor_id" not in columns:
            op.add_column(table_name, sa.Column("created_by_actor_id", sa.String(), nullable=False, server_default="human"))
        if "created_via_token_id" not in columns:
            op.add_column(table_name, sa.Column("created_via_token_id", sa.String(), nullable=True))
        if "publication_status" not in columns:
            op.add_column(table_name, sa.Column("publication_status", sa.String(), nullable=False, server_default="active"))
        if "reviewed_by_actor_id" not in columns:
            op.add_column(table_name, sa.Column("reviewed_by_actor_id", sa.String(), nullable=True))
        if "reviewed_at" not in columns:
            op.add_column(table_name, sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table_name in TABLES:
        if not inspector.has_table(table_name):
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name in (
            "reviewed_at",
            "reviewed_by_actor_id",
            "publication_status",
            "created_via_token_id",
            "created_by_actor_id",
            "created_by_actor_type",
        ):
            if column_name in columns:
                op.drop_column(table_name, column_name)
