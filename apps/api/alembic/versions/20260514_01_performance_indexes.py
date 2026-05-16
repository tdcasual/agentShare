"""add performance indexes for common query patterns

Revision ID: 20260514_01
Revises: 20260424_02
Create Date: 2026-05-14

Adds indexes for:
- tasks.publication_status (filtered in list_active)
- tasks.status (filtered in task queries)
- task_targets.target_access_token_id (filtered in list_assigned)
- runs(task_id, status) (filtered in get_latest_completed_by_task)
"""
from alembic import op

revision = "20260514_01"
down_revision = "20260424_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_tasks_publication_status",
        "tasks",
        ["publication_status"],
    )
    op.create_index(
        "ix_tasks_status",
        "tasks",
        ["status"],
    )
    op.create_index(
        "ix_task_targets_target_access_token_id",
        "task_targets",
        ["target_access_token_id"],
    )
    op.create_index(
        "ix_runs_task_id_status",
        "runs",
        ["task_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_runs_task_id_status", table_name="runs")
    op.drop_index("ix_task_targets_target_access_token_id", table_name="task_targets")
    op.drop_index("ix_tasks_status", table_name="tasks")
    op.drop_index("ix_tasks_publication_status", table_name="tasks")
