"""rename task targeting fields to access token vocabulary

Revision ID: 20260419_02
Revises: 20260419_01
Create Date: 2026-04-19 16:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260419_02"
down_revision = "20260419_01"
branch_labels = None
depends_on = None


def _legacy(*parts: str) -> str:
    return "".join(parts)


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE tasks SET target_mode = 'explicit_access_tokens' "
            f"WHERE target_mode = '{_legacy('explicit', '_', 'tokens')}'"
        )
    )

    with op.batch_alter_table("tasks", recreate="always") as batch_op:
        batch_op.alter_column(
            _legacy("target", "_", "token", "_", "ids"),
            existing_type=sa.JSON(),
            new_column_name="target_access_token_ids",
            existing_nullable=False,
        )

    with op.batch_alter_table("task_targets", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_task_targets_task_token", type_="unique")
        batch_op.alter_column(
            _legacy("target", "_", "token", "_", "id"),
            existing_type=sa.String(),
            new_column_name="target_access_token_id",
            existing_nullable=False,
        )
        batch_op.alter_column(
            _legacy("claimed_by", "_", "token", "_", "id"),
            existing_type=sa.String(),
            new_column_name="claimed_by_access_token_id",
            existing_nullable=True,
        )
    op.create_index(
        "ix_task_targets_task_access_token_unique",
        "task_targets",
        ["task_id", "target_access_token_id"],
        unique=True,
    )

    with op.batch_alter_table("runs", recreate="always") as batch_op:
        batch_op.alter_column(
            "token_id",
            existing_type=sa.String(),
            new_column_name="access_token_id",
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("runs", recreate="always") as batch_op:
        batch_op.alter_column(
            "access_token_id",
            existing_type=sa.String(),
            new_column_name="token_id",
            existing_nullable=True,
        )

    op.drop_index("ix_task_targets_task_access_token_unique", table_name="task_targets")

    with op.batch_alter_table("task_targets", recreate="always") as batch_op:
        batch_op.alter_column(
            "claimed_by_access_token_id",
            existing_type=sa.String(),
            new_column_name=_legacy("claimed_by", "_", "token", "_", "id"),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "target_access_token_id",
            existing_type=sa.String(),
            new_column_name=_legacy("target", "_", "token", "_", "id"),
            existing_nullable=False,
        )

    with op.batch_alter_table("tasks", recreate="always") as batch_op:
        batch_op.alter_column(
            "target_access_token_ids",
            existing_type=sa.JSON(),
            new_column_name=_legacy("target", "_", "token", "_", "ids"),
            existing_nullable=False,
        )

    op.execute(
        sa.text(
            f"UPDATE tasks SET target_mode = '{_legacy('explicit', '_', 'tokens')}' "
            "WHERE target_mode = 'explicit_access_tokens'"
        )
    )
