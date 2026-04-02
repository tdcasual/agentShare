"""spaces domain v1

Revision ID: 20260402_03
Revises: 20260402_01
Create Date: 2026-04-02 00:10:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260402_03"
down_revision = "20260402_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("spaces"):
        op.create_table(
            "spaces",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(), nullable=False, server_default="active"),
            sa.Column("created_by_actor_id", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if not inspector.has_table("space_members"):
        op.create_table(
            "space_members",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("space_id", sa.String(), nullable=False),
            sa.Column("member_type", sa.String(), nullable=False),
            sa.Column("member_id", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False, server_default="participant"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("space_id", "member_type", "member_id", name="uq_space_members_identity"),
        )
        op.create_index("ix_space_members_space_id", "space_members", ["space_id"], unique=False)

    if not inspector.has_table("space_timeline_entries"):
        op.create_table(
            "space_timeline_entries",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("space_id", sa.String(), nullable=False),
            sa.Column("entry_type", sa.String(), nullable=False),
            sa.Column("subject_type", sa.String(), nullable=False),
            sa.Column("subject_id", sa.String(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "space_id",
                "entry_type",
                "subject_type",
                "subject_id",
                name="uq_space_timeline_identity",
            ),
        )
        op.create_index("ix_space_timeline_entries_space_id", "space_timeline_entries", ["space_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("space_timeline_entries"):
        indexes = {index["name"] for index in inspector.get_indexes("space_timeline_entries")}
        if "ix_space_timeline_entries_space_id" in indexes:
            op.drop_index("ix_space_timeline_entries_space_id", table_name="space_timeline_entries")
        op.drop_table("space_timeline_entries")

    if inspector.has_table("space_members"):
        indexes = {index["name"] for index in inspector.get_indexes("space_members")}
        if "ix_space_members_space_id" in indexes:
            op.drop_index("ix_space_members_space_id", table_name="space_members")
        op.drop_table("space_members")

    if inspector.has_table("spaces"):
        op.drop_table("spaces")
