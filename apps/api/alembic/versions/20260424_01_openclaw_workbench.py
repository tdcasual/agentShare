"""add openclaw workbench management tables

Revision ID: 20260424_01
Revises: 20260419_04
Create Date: 2026-04-24 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260424_01"
down_revision = "20260419_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "openclaw_workbench_sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("capability_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False, server_default=sa.text("'New conversation'")),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "openclaw_workbench_messages",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("message_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("openclaw_workbench_messages")
    op.drop_table("openclaw_workbench_sessions")
