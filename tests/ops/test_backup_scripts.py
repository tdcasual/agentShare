from __future__ import annotations

import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_backup_and_restore_scripts_exist_and_are_executable() -> None:
    for relative_path in (
        "scripts/ops/backup-postgres.sh",
        "scripts/ops/restore-postgres.sh",
        "scripts/ops/backup-redis.sh",
    ):
        script = ROOT / relative_path
        assert script.exists()
        assert os.access(script, os.X_OK)


def test_postgres_backup_uses_pg_dump() -> None:
    script = (ROOT / "scripts/ops/backup-postgres.sh").read_text()
    assert "pg_dump" in script
    assert "docker compose" in script
    assert "BACKUP_DIR" in script


def test_postgres_restore_documents_safe_restore_order() -> None:
    script = (ROOT / "scripts/ops/restore-postgres.sh").read_text()
    assert "psql" in script or "pg_restore" in script
    assert "Stop API writes" in script
    assert "restore" in script.lower()


def test_redis_backup_script_captures_persistent_state() -> None:
    script = (ROOT / "scripts/ops/backup-redis.sh").read_text()
    assert "redis-cli" in script
    assert "tar" in script or "rdb" in script.lower()


def test_production_operations_guide_includes_backup_and_restore_drills() -> None:
    guide = (ROOT / "docs/guides/production-operations.md").read_text()
    assert "backup cadence" in guide.lower()
    assert "restore drill" in guide.lower()
    assert "postgres" in guide.lower()
    assert "redis" in guide.lower()
    assert "secret backend" in guide.lower()
