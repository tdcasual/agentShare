from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text


ROOT = Path(__file__).resolve().parents[3]
CURRENT_ALEMBIC_HEAD = "20260405_01"


def _run_alembic_upgrade(database_url: str, revision: str) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url

    subprocess.run(
        [
            sys.executable,
            "-c",
            f"from alembic.config import main; main(argv=['-c', 'alembic.ini', 'upgrade', '{revision}'])",
        ],
        cwd=ROOT / "apps/api",
        check=True,
        env=env,
    )


def test_alembic_versions_directory_contains_single_baseline_revision() -> None:
    version_files = sorted(
        path.name
        for path in (ROOT / "apps/api/alembic/versions").glob("*.py")
        if path.name != "__init__.py"
    )

    assert version_files == ["20260405_01_clean_baseline.py"]


def test_alembic_upgrade_head_creates_current_schema(tmp_path) -> None:
    db_path = tmp_path / "alembic.db"
    database_url = f"sqlite:///{db_path}"

    _run_alembic_upgrade(database_url, "head")

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        assert {
            "agents",
            "agent_tokens",
            "human_accounts",
            "management_sessions",
            "system_settings",
            "secrets",
            "pending_secret_materials",
            "capabilities",
            "tasks",
            "task_targets",
            "runs",
            "playbooks",
            "audit_events",
            "approval_requests",
            "events",
            "spaces",
            "space_members",
            "space_timeline_entries",
            "catalog_releases",
            "token_feedback",
        }.issubset(set(inspector.get_table_names()))

        capability_columns = {column["name"] for column in inspector.get_columns("capabilities")}
        assert "access_policy" in capability_columns
        secret_columns = {column["name"] for column in inspector.get_columns("secrets")}
        assert "review_reason" in secret_columns
        token_feedback_constraints = inspector.get_unique_constraints("token_feedback")
        assert any(
            constraint["column_names"] == ["task_target_id"]
            for constraint in token_feedback_constraints
        )
        task_target_constraints = inspector.get_unique_constraints("task_targets")
        assert any(
            constraint["column_names"] == ["task_id", "target_token_id"]
            for constraint in task_target_constraints
        )
        catalog_release_constraints = inspector.get_unique_constraints("catalog_releases")
        assert any(
            constraint["column_names"] == ["resource_kind", "resource_id", "version"]
            for constraint in catalog_release_constraints
        )

        with engine.connect() as connection:
            migrated_revision = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()

        assert migrated_revision == CURRENT_ALEMBIC_HEAD
    finally:
        engine.dispose()


def test_pytest_database_fixture_uses_migrated_schema(db_session) -> None:
    tables = set(inspect(db_session.bind).get_table_names())

    assert "alembic_version" in tables
