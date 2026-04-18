"""scope runtime approvals by token and task target

Revision ID: 20260415_02
Revises: 20260415_01
Create Date: 2026-04-15 18:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260415_02"
down_revision = "20260415_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "approval_requests",
        sa.Column("token_id", sa.String(), nullable=False, server_default=""),
    )
    op.add_column(
        "approval_requests",
        sa.Column("task_target_id", sa.String(), nullable=False, server_default=""),
    )

    op.drop_index("uq_approval_requests_pending_scope", table_name="approval_requests")
    op.create_index(
        "uq_approval_requests_pending_scope",
        "approval_requests",
        ["task_id", "capability_id", "agent_id", "token_id", "task_target_id", "action_type"],
        unique=True,
        sqlite_where=sa.text("status = 'pending'"),
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("uq_approval_requests_pending_scope", table_name="approval_requests")
    op.create_index(
        "uq_approval_requests_pending_scope",
        "approval_requests",
        ["task_id", "capability_id", "agent_id", "action_type"],
        unique=True,
        sqlite_where=sa.text("status = 'pending'"),
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.drop_column("approval_requests", "task_target_id")
    op.drop_column("approval_requests", "token_id")
