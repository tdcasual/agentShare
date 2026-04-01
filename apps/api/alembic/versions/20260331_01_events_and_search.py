"""events and search foundation

Revision ID: 20260331_01
Revises: 20260330_02
Create Date: 2026-03-31 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260331_01"
down_revision = "20260330_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("events"):
        op.create_table(
            "events",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("event_type", sa.String(), nullable=False),
            sa.Column("actor_type", sa.String(), nullable=False),
            sa.Column("actor_id", sa.String(), nullable=False),
            sa.Column("subject_type", sa.String(), nullable=False),
            sa.Column("subject_id", sa.String(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("details", sa.Text(), nullable=False),
            sa.Column("severity", sa.String(), nullable=False),
            sa.Column("action_url", sa.String(), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=False),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_events_created_at", "events", ["created_at"], unique=False)
        op.create_index("ix_events_event_type", "events", ["event_type"], unique=False)
        op.create_index("ix_events_read_at", "events", ["read_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("events"):
        indexes = {index["name"] for index in inspector.get_indexes("events")}
        for index_name in ("ix_events_read_at", "ix_events_event_type", "ix_events_created_at"):
            if index_name in indexes:
                op.drop_index(index_name, table_name="events")
        op.drop_table("events")
