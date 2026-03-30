from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text


ROOT = Path(__file__).resolve().parents[3]


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
    capability_columns = {column["name"] for column in inspector.get_columns("capabilities")}
    assert "access_policy" in capability_columns


def test_pytest_database_fixture_uses_migrated_schema(db_session) -> None:
    tables = set(inspect(db_session.bind).get_table_names())

    assert "alembic_version" in tables


def test_alembic_upgrade_migrates_legacy_capability_access_policy(tmp_path) -> None:
    db_path = tmp_path / "alembic-capability-policy.db"
    database_url = f"sqlite:///{db_path}"

    _run_alembic_upgrade(database_url, "20260330_01")

    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO capabilities (
                        id,
                        name,
                        secret_id,
                        allowed_mode,
                        lease_ttl_seconds,
                        risk_level,
                        approval_mode,
                        approval_rules,
                        allowed_audience,
                        access_policy,
                        required_provider_scopes,
                        allowed_environments,
                        adapter_type,
                        adapter_config,
                        created_by_actor_type,
                        created_by_actor_id,
                        publication_status
                    )
                    VALUES (
                        :id,
                        :name,
                        :secret_id,
                        :allowed_mode,
                        :lease_ttl_seconds,
                        :risk_level,
                        :approval_mode,
                        :approval_rules,
                        :allowed_audience,
                        :access_policy,
                        :required_provider_scopes,
                        :allowed_environments,
                        :adapter_type,
                        :adapter_config,
                        :created_by_actor_type,
                        :created_by_actor_id,
                        :publication_status
                    )
                    """
                ),
                {
                    "id": "capability-legacy",
                    "name": "legacy.policy",
                    "secret_id": "secret-legacy",
                    "allowed_mode": "proxy_only",
                    "lease_ttl_seconds": 60,
                    "risk_level": "medium",
                    "approval_mode": "auto",
                    "approval_rules": json.dumps([]),
                    "allowed_audience": json.dumps([]),
                    "access_policy": json.dumps(
                        {
                            "mode": "explicit_tokens",
                            "token_ids": ["token-legacy"],
                        }
                    ),
                    "required_provider_scopes": json.dumps([]),
                    "allowed_environments": json.dumps([]),
                    "adapter_type": "generic_http",
                    "adapter_config": json.dumps({}),
                    "created_by_actor_type": "human",
                    "created_by_actor_id": "test",
                    "publication_status": "active",
                },
            )

        _run_alembic_upgrade(database_url, "head")

        with engine.connect() as connection:
            raw_policy = connection.execute(
                text("SELECT access_policy FROM capabilities WHERE id = 'capability-legacy'")
            ).scalar_one()

        if isinstance(raw_policy, str):
            raw_policy = json.loads(raw_policy)

        assert raw_policy == {
            "mode": "selectors",
            "selectors": [
                {"kind": "token", "ids": ["token-legacy"]},
            ],
        }
    finally:
        engine.dispose()
