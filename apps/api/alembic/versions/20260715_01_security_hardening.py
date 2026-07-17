"""Add encrypted idempotency response records.

Revision ID: 20260715_01
Revises: 20260713_01
Create Date: 2026-07-15
"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260715_01"
down_revision = "20260713_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_encrypted", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("user_id", "key", name="uq_idempotency_records_user_key"),
    )
    op.create_index(
        "idx_idempotency_records_created_at",
        "idempotency_records",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_idempotency_records_created_at", table_name="idempotency_records")
    op.drop_table("idempotency_records")
