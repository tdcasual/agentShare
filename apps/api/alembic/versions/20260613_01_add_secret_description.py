"""add secret description.

Revision ID: 20260613_01
Revises: 20260610_01
Create Date: 2026-06-13
"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260613_01"
down_revision = "20260610_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("secrets", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("secrets", "description")
