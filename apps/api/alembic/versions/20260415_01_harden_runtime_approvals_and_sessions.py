"""harden runtime approvals and openclaw session storage

Revision ID: 20260415_01
Revises: 20260408_01
Create Date: 2026-04-15 12:00:00.000000
"""

from __future__ import annotations

import hashlib

from alembic import op
import sqlalchemy as sa


revision = "20260415_01"
down_revision = "20260408_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, session_key FROM openclaw_sessions")).mappings().all()
    for row in rows:
        bind.execute(
            sa.text("UPDATE openclaw_sessions SET session_key = :session_key WHERE id = :id"),
            {
                "id": row["id"],
                "session_key": hashlib.sha256(row["session_key"].encode()).hexdigest(),
            },
        )

    op.create_index(
        "uq_approval_requests_pending_scope",
        "approval_requests",
        ["task_id", "capability_id", "agent_id", "action_type"],
        unique=True,
        sqlite_where=sa.text("status = 'pending'"),
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("uq_approval_requests_pending_scope", table_name="approval_requests")
