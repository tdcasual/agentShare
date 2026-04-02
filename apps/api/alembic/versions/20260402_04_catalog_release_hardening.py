"""catalog release hardening

Revision ID: 20260402_04
Revises: 20260402_03
Create Date: 2026-04-02 00:20:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260402_04"
down_revision = "20260402_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("catalog_releases"):
        columns = {column["name"] for column in inspector.get_columns("catalog_releases")}
        if "release_notes" not in columns:
            op.add_column("catalog_releases", sa.Column("release_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("catalog_releases"):
        columns = {column["name"] for column in inspector.get_columns("catalog_releases")}
        if "release_notes" in columns:
            op.drop_column("catalog_releases", "release_notes")
