"""controlled dream mode primitives

Revision ID: 20260408_01
Revises: 20260407_01
Create Date: 2026-04-08 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260408_01"
down_revision = "20260407_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "openclaw_agents",
        sa.Column("dream_policy", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )

    op.create_table(
        "openclaw_dream_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("task_id", sa.String(), nullable=True),
        sa.Column("objective", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'active'")),
        sa.Column("stop_reason", sa.String(), nullable=True),
        sa.Column("step_budget", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("consumed_steps", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_followup_tasks", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("started_by_actor_type", sa.String(), nullable=False, server_default=sa.text("'agent'")),
        sa.Column("started_by_actor_id", sa.String(), nullable=False),
        sa.Column("runtime_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "openclaw_dream_steps",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("step_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'completed'")),
        sa.Column("input_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("output_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("token_usage", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_task_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("run_id", "step_index", name="uq_openclaw_dream_steps_run_step_index"),
    )

    op.create_table(
        "openclaw_memory_notes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("run_id", sa.String(), nullable=True),
        sa.Column("scope", sa.String(), nullable=False, server_default=sa.text("'agent'")),
        sa.Column("kind", sa.String(), nullable=False, server_default=sa.text("'working_note'")),
        sa.Column("importance", sa.String(), nullable=False, server_default=sa.text("'medium'")),
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("content", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("openclaw_memory_notes")
    op.drop_table("openclaw_dream_steps")
    op.drop_table("openclaw_dream_runs")
    op.drop_column("openclaw_agents", "dream_policy")
