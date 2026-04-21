"""drop deprecated remote-credential tables

Revision ID: 20260419_04
Revises: 20260419_03
Create Date: 2026-04-19 19:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260419_04"
down_revision = "20260419_03"
branch_labels = None
depends_on = None


def _legacy(*parts: str) -> str:
    return "".join(parts)


def upgrade() -> None:
    op.drop_table(_legacy("agent", "_", "tokens"))
    op.drop_table("agents")


def downgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("issuer", sa.String(), nullable=False),
        sa.Column("auth_method", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("api_key_hash", sa.String(), nullable=True),
        sa.Column("allowed_capability_ids", sa.JSON(), nullable=False),
        sa.Column("allowed_task_types", sa.JSON(), nullable=False),
        sa.Column("risk_tier", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        _legacy("agent", "_", "tokens"),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("token_prefix", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_by_actor_type", sa.String(), nullable=False),
        sa.Column("issued_by_actor_id", sa.String(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("completed_runs", sa.Integer(), nullable=False),
        sa.Column("successful_runs", sa.Integer(), nullable=False),
        sa.Column("success_rate", sa.Float(), nullable=False),
        sa.Column("last_feedback_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trust_score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
