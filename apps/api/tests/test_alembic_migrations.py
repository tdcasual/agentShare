from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect


ROOT = Path(__file__).resolve().parents[3]


def test_alembic_upgrade_creates_expected_tables(tmp_path) -> None:
    db_path = tmp_path / "alembic.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path}"

    subprocess.run(
        [
            sys.executable,
            "-c",
            "from alembic.config import main; main(argv=['-c', 'alembic.ini', 'upgrade', 'head'])",
        ],
        cwd=ROOT / "apps/api",
        check=True,
        env=env,
    )

    inspector = inspect(create_engine(f"sqlite:///{db_path}"))
    assert {
        "agents",
        "secrets",
        "capabilities",
        "tasks",
        "runs",
        "playbooks",
        "approval_requests",
        "audit_events",
    }.issubset(set(inspector.get_table_names()))


def test_pytest_database_fixture_uses_migrated_schema(db_session) -> None:
    tables = set(inspect(db_session.bind).get_table_names())

    assert "alembic_version" in tables
