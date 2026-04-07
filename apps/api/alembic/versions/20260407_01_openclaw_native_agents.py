"""openclaw native agent foundations

Revision ID: 20260407_01
Revises: 20260405_01
Create Date: 2026-04-07 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260407_01"
down_revision = "20260405_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "openclaw_agents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'active'")),
        sa.Column("auth_method", sa.String(), nullable=False, server_default=sa.text("'openclaw_session'")),
        sa.Column("risk_tier", sa.String(), nullable=False, server_default=sa.text("'medium'")),
        sa.Column("workspace_root", sa.String(), nullable=False),
        sa.Column("agent_dir", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("thinking_level", sa.String(), nullable=False, server_default=sa.text("'balanced'")),
        sa.Column("sandbox_mode", sa.String(), nullable=False, server_default=sa.text("'workspace-write'")),
        sa.Column("tools_policy", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("skills_policy", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("allowed_capability_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("allowed_task_types", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "openclaw_agent_files",
        sa.Column("agent_id", sa.String(), primary_key=True),
        sa.Column("file_name", sa.String(), primary_key=True),
        sa.Column("content", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "openclaw_sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("session_key", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False, server_default=sa.text("'chat'")),
        sa.Column("subject", sa.String(), nullable=True),
        sa.Column("transcript_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("context_tokens", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("session_key", name="uq_openclaw_sessions_session_key"),
    )

    op.create_table(
        "openclaw_tool_bindings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("binding_kind", sa.String(), nullable=False),
        sa.Column("binding_target", sa.String(), nullable=False),
        sa.Column("approval_mode", sa.String(), nullable=False, server_default=sa.text("'auto'")),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("agent_id", "name", name="uq_openclaw_tool_bindings_agent_name"),
    )


def downgrade() -> None:
    op.drop_table("openclaw_tool_bindings")
    op.drop_table("openclaw_sessions")
    op.drop_table("openclaw_agent_files")
    op.drop_table("openclaw_agents")
