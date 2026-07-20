"""Enforce unique secret names and per-agent token names.

Duplicate names are renamed with " (n)" suffixes before the unique indexes
are created, so existing data is preserved.

Revision ID: 20260720_01
Revises: 20260715_01
Create Date: 2026-07-20
"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260720_01"
down_revision = "20260715_01"
branch_labels = None
depends_on = None

_NAME_COLUMN_LENGTH = 255


def _suffixed_name(name: str, suffix: int) -> str:
    tail = f" ({suffix})"
    return f"{name[: _NAME_COLUMN_LENGTH - len(tail)]}{tail}"


def _dedupe_names(table_name: str, scope_column: str | None = None) -> None:
    """Append " (n)" suffixes to duplicate names, keeping the earliest row.

    Names are UI metadata, so renaming is safe. Rows are ordered by
    created_at (then id) and the first row of each group keeps its name.
    """
    bind = op.get_bind()
    table = sa.table(
        table_name,
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("created_at", sa.DateTime),
        *([sa.column(scope_column, sa.String)] if scope_column is not None else []),
    )
    order_by = [table.c.name, table.c.created_at, table.c.id]
    if scope_column is not None:
        order_by.insert(0, table.c[scope_column])
    rows = bind.execute(sa.select(table).order_by(*order_by)).mappings().all()

    groups: dict[tuple[str | None, str], list[sa.RowMapping]] = {}
    for row in rows:
        scope = row[scope_column] if scope_column is not None else None
        groups.setdefault((scope, row["name"]), []).append(row)

    taken = set(groups)
    for (scope, name), group_rows in groups.items():
        for suffix, row in enumerate(group_rows[1:], start=2):
            new_name = _suffixed_name(name, suffix)
            while (scope, new_name) in taken:
                suffix += 1
                new_name = _suffixed_name(name, suffix)
            taken.add((scope, new_name))
            bind.execute(
                sa.update(table).where(table.c.id == row["id"]).values(name=new_name)
            )


def upgrade() -> None:
    _dedupe_names("secrets")
    _dedupe_names("agent_tokens", scope_column="agent_id")

    # Unique indexes avoid SQLite table rebuilds (no batch_alter_table).
    op.create_index("uq_secrets_name", "secrets", ["name"], unique=True)
    op.create_index(
        "uq_agent_tokens_agent_id_name",
        "agent_tokens",
        ["agent_id", "name"],
        unique=True,
    )


def downgrade() -> None:
    # Renamed duplicates are intentionally kept: uniqueness is a one-way door.
    op.drop_index("uq_agent_tokens_agent_id_name", table_name="agent_tokens")
    op.drop_index("uq_secrets_name", table_name="secrets")
