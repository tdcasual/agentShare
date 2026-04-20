from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from alembic.util.exc import CommandError
from sqlalchemy import create_engine, inspect, text

from app import db as db_module


ROOT = Path(__file__).resolve().parents[3]
CURRENT_ALEMBIC_HEAD = "20260419_01"


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


def test_alembic_versions_directory_contains_current_baseline_and_openclaw_followup_revision() -> None:
    version_files = sorted(
        path.name
        for path in (ROOT / "apps/api/alembic/versions").glob("*.py")
        if path.name != "__init__.py"
    )

    assert version_files == [
        "20260405_01_clean_baseline.py",
        "20260407_01_openclaw_native_agents.py",
        "20260408_01_controlled_dream_mode.py",
        "20260415_01_harden_runtime_approvals_and_sessions.py",
        "20260415_02_scope_runtime_approvals.py",
        "20260419_01_access_tokens.py",
    ]


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
            "openclaw_agents",
            "openclaw_agent_files",
            "openclaw_sessions",
            "openclaw_tool_bindings",
            "openclaw_dream_runs",
            "openclaw_dream_steps",
            "openclaw_memory_notes",
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
            "access_tokens",
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
        openclaw_session_constraints = inspector.get_unique_constraints("openclaw_sessions")
        assert any(
            constraint["column_names"] == ["session_key"]
            for constraint in openclaw_session_constraints
        )
        openclaw_tool_binding_constraints = inspector.get_unique_constraints("openclaw_tool_bindings")
        assert any(
            constraint["column_names"] == ["agent_id", "name"]
            for constraint in openclaw_tool_binding_constraints
        )
        openclaw_agent_columns = {column["name"] for column in inspector.get_columns("openclaw_agents")}
        assert "dream_policy" in openclaw_agent_columns
        openclaw_dream_step_constraints = inspector.get_unique_constraints("openclaw_dream_steps")
        assert any(
            constraint["column_names"] == ["run_id", "step_index"]
            for constraint in openclaw_dream_step_constraints
        )

        with engine.connect() as connection:
            migrated_revision = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()

        assert migrated_revision == CURRENT_ALEMBIC_HEAD
    finally:
        engine.dispose()


def test_build_alembic_config_falls_back_to_repo_apps_api_when_package_relative_ini_is_missing(
    monkeypatch, tmp_path
) -> None:
    missing_ini_path = tmp_path / "site-packages" / "alembic.ini"
    monkeypatch.setattr(db_module, "ALEMBIC_INI_PATH", missing_ini_path)
    monkeypatch.chdir(ROOT)

    config = db_module._build_alembic_config("sqlite:///./agent_share.db")

    assert config.config_file_name == str(ROOT / "apps/api/alembic.ini")
    assert config.get_main_option("script_location") == str(ROOT / "apps/api/alembic")
    assert config.get_main_option("prepend_sys_path") == str(ROOT / "apps/api")


def test_migrate_db_recovers_default_local_sqlite_when_revision_history_is_missing(
    monkeypatch, tmp_path
) -> None:
    database_path = tmp_path / "agent_share.db"
    database_path.write_text("legacy dev database")
    monkeypatch.chdir(tmp_path)

    upgrade_calls: list[str] = []

    def fake_upgrade(config, revision):
        upgrade_calls.append(config.get_main_option("sqlalchemy.url"))
        if len(upgrade_calls) == 1:
            raise CommandError("Can't locate revision identified by '20260330_02'")
        database_path.write_text("fresh baseline database")

    monkeypatch.setattr(db_module.command, "upgrade", fake_upgrade)

    backup_path = db_module.migrate_db(
        "sqlite:///./agent_share.db",
        recover_default_dev_sqlite=True,
    )

    assert upgrade_calls == ["sqlite:///./agent_share.db", "sqlite:///./agent_share.db"]
    assert backup_path is not None
    assert backup_path.exists()
    assert backup_path.read_text() == "legacy dev database"
    assert backup_path != database_path
    assert database_path.read_text() == "fresh baseline database"


def test_migrate_db_does_not_reset_custom_sqlite_paths_when_revision_history_is_missing(
    monkeypatch, tmp_path
) -> None:
    custom_db_path = tmp_path / ".tmp" / "dev-agent-share.db"
    custom_db_path.parent.mkdir()
    custom_db_path.write_text("keep me")
    monkeypatch.chdir(tmp_path)

    def fake_upgrade(config, revision):
        raise CommandError("Can't locate revision identified by '20260330_02'")

    monkeypatch.setattr(db_module.command, "upgrade", fake_upgrade)

    with pytest.raises(CommandError, match="20260330_02"):
        db_module.migrate_db(
            "sqlite:///./.tmp/dev-agent-share.db",
            recover_default_dev_sqlite=True,
        )

    assert custom_db_path.read_text() == "keep me"
    assert not list(tmp_path.glob("*.pre-baseline*.db"))


def test_openclaw_followup_migration_creates_workspace_session_and_tool_tables(tmp_path) -> None:
    db_path = tmp_path / "openclaw-followup.db"
    database_url = f"sqlite:///{db_path}"

    _run_alembic_upgrade(database_url, "head")

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        assert {
            "openclaw_agents",
            "openclaw_agent_files",
            "openclaw_sessions",
            "openclaw_tool_bindings",
            "openclaw_dream_runs",
            "openclaw_dream_steps",
            "openclaw_memory_notes",
        }.issubset(
            set(inspector.get_table_names())
        )
    finally:
        engine.dispose()


def test_pytest_database_fixture_uses_migrated_schema(db_session) -> None:
    tables = set(inspect(db_session.bind).get_table_names())

    assert "alembic_version" in tables
