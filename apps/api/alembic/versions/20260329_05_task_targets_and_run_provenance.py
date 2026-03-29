"""task targets and run provenance

Revision ID: 20260329_05
Revises: 20260329_04
Create Date: 2026-03-29 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260329_05"
down_revision = "20260329_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("task_targets"):
        op.create_table(
            "task_targets",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("task_id", sa.String(), nullable=False),
            sa.Column("target_token_id", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("claimed_by_token_id", sa.String(), nullable=True),
            sa.Column("claimed_by_agent_id", sa.String(), nullable=True),
            sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_run_id", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    run_columns = {column["name"] for column in inspector.get_columns("runs")}
    if "token_id" not in run_columns:
        op.add_column("runs", sa.Column("token_id", sa.String(), nullable=True))
    if "task_target_id" not in run_columns:
        op.add_column("runs", sa.Column("task_target_id", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    run_columns = {column["name"] for column in inspector.get_columns("runs")}
    if "task_target_id" in run_columns:
        op.drop_column("runs", "task_target_id")
    if "token_id" in run_columns:
        op.drop_column("runs", "token_id")
    if inspector.has_table("task_targets"):
        op.drop_table("task_targets")
