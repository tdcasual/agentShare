"""baseline schema

Revision ID: 20260328_01
Revises:
Create Date: 2026-03-28 00:00:00.000000
"""
from __future__ import annotations

from alembic import op

from app.orm import Base


# revision identifiers, used by Alembic.
revision = "20260328_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
