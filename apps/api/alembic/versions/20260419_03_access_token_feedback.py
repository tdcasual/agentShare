"""rename token feedback storage to access token feedback

Revision ID: 20260419_03
Revises: 20260419_02
Create Date: 2026-04-19 18:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260419_03"
down_revision = "20260419_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("token_feedback", "access_token_feedback")

    with op.batch_alter_table("access_token_feedback", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_token_feedback_task_target_id", type_="unique")
        batch_op.alter_column(
            "token_id",
            existing_type=sa.String(),
            new_column_name="access_token_id",
            existing_nullable=False,
        )
        batch_op.create_unique_constraint(
            "uq_access_token_feedback_task_target_id",
            ["task_target_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("access_token_feedback", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_access_token_feedback_task_target_id", type_="unique")
        batch_op.alter_column(
            "access_token_id",
            existing_type=sa.String(),
            new_column_name="token_id",
            existing_nullable=False,
        )
        batch_op.create_unique_constraint(
            "uq_token_feedback_task_target_id",
            ["task_target_id"],
        )

    op.rename_table("access_token_feedback", "token_feedback")
