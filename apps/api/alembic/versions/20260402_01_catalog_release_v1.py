"""catalog release marketplace v1

Revision ID: 20260402_01
Revises: 20260331_01
Create Date: 2026-04-02 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260402_01"
down_revision = "20260331_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("catalog_releases"):
        op.create_table(
            "catalog_releases",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("resource_kind", sa.String(), nullable=False),
            sa.Column("resource_id", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("subtitle", sa.String(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("release_status", sa.String(), nullable=False),
            sa.Column("released_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by_actor_id", sa.String(), nullable=False),
            sa.Column("created_via_token_id", sa.String(), nullable=True),
            sa.Column("adoption_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_catalog_releases_resource",
            "catalog_releases",
            ["resource_kind", "resource_id"],
            unique=False,
        )
        op.create_index(
            "ix_catalog_releases_released_at",
            "catalog_releases",
            ["released_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("catalog_releases"):
        indexes = {index["name"] for index in inspector.get_indexes("catalog_releases")}
        for index_name in ("ix_catalog_releases_released_at", "ix_catalog_releases_resource"):
            if index_name in indexes:
                op.drop_index(index_name, table_name="catalog_releases")
        op.drop_table("catalog_releases")
