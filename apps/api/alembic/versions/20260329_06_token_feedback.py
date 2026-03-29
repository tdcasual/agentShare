"""token feedback

Revision ID: 20260329_06
Revises: 20260329_05
Create Date: 2026-03-29 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260329_06"
down_revision = "20260329_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("token_feedback"):
        op.create_table(
            "token_feedback",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("token_id", sa.String(), nullable=False),
            sa.Column("task_target_id", sa.String(), nullable=False),
            sa.Column("run_id", sa.String(), nullable=False),
            sa.Column("source", sa.String(), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False),
            sa.Column("verdict", sa.String(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("created_by_actor_type", sa.String(), nullable=False),
            sa.Column("created_by_actor_id", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    token_columns = {column["name"] for column in inspector.get_columns("agent_tokens")}
    if "completed_runs" not in token_columns:
        op.add_column("agent_tokens", sa.Column("completed_runs", sa.Integer(), nullable=False, server_default="0"))
    if "successful_runs" not in token_columns:
        op.add_column("agent_tokens", sa.Column("successful_runs", sa.Integer(), nullable=False, server_default="0"))
    if "success_rate" not in token_columns:
        op.add_column("agent_tokens", sa.Column("success_rate", sa.Float(), nullable=False, server_default="0"))
    if "last_feedback_at" not in token_columns:
        op.add_column("agent_tokens", sa.Column("last_feedback_at", sa.DateTime(timezone=True), nullable=True))
    if "trust_score" not in token_columns:
        op.add_column("agent_tokens", sa.Column("trust_score", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    token_columns = {column["name"] for column in inspector.get_columns("agent_tokens")}
    for column_name in ("trust_score", "last_feedback_at", "success_rate", "successful_runs", "completed_runs"):
        if column_name in token_columns:
            op.drop_column("agent_tokens", column_name)

    if inspector.has_table("token_feedback"):
        op.drop_table("token_feedback")
