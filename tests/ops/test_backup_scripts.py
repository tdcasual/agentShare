from __future__ import annotations

import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_backup_and_restore_scripts_exist_and_are_executable() -> None:
    for relative_path in (
        "scripts/ops/backup-postgres.sh",
        "scripts/ops/restore-postgres.sh",
        "scripts/ops/backup-postgres-offsite.sh",
        "scripts/ops/restore-postgres-offsite-drill.sh",
    ):
        script = ROOT / relative_path
        assert script.exists()
        assert os.access(script, os.X_OK)


def test_postgres_backup_uses_pg_dump() -> None:
    script = (ROOT / "scripts/ops/backup-postgres.sh").read_text()
    assert "pg_dump" in script
    assert "docker compose" in script
    assert "BACKUP_DIR" in script
    assert ': "${POSTGRES_DB:?' not in script
    assert ': "${POSTGRES_USER:?' not in script
    assert "sh -c" in script
    assert "DATABASE_URL" not in script
    assert "umask 077" in script
    assert 'chmod 700 "${BACKUP_DIR}"' in script
    assert 'chmod 600 "${backup_file}"' in script


def test_release_env_file_is_optional_in_compose_invocations() -> None:
    """Ops scripts must tolerate a missing .release.env (only deploy.yml has one)."""
    for relative_path in (
        "scripts/ops/backup-postgres.sh",
        "scripts/ops/restore-postgres.sh",
        "scripts/ops/snapshot-postgres-volume.sh",
        "scripts/ops/check-postgres-durability.sh",
        "scripts/ops/verify-key-recovery.sh",
        "scripts/ops/export-audit-log.sh",
    ):
        script = (ROOT / relative_path).read_text()
        assert 'if [ -f "${COMPOSE_RELEASE_ENV_FILE}" ]; then' in script, relative_path
        assert 'release_env_file_args="--env-file ${COMPOSE_RELEASE_ENV_FILE}"' in script, (
            relative_path
        )
        assert '--env-file "${COMPOSE_ENV_FILE}" ${release_env_file_args}' in script, relative_path
        assert '--env-file "${COMPOSE_RELEASE_ENV_FILE}" \\' not in script, relative_path


def test_postgres_restore_documents_safe_restore_order() -> None:
    script = (ROOT / "scripts/ops/restore-postgres.sh").read_text()
    assert "psql" in script or "pg_restore" in script
    assert "docker compose" in script
    assert ': "${POSTGRES_DB:?' not in script
    assert ': "${POSTGRES_USER:?' not in script
    assert "--single-transaction" in script
    assert "--exit-on-error" in script
    assert "Stop API writes" in script
    assert "restore" in script.lower()


def test_production_operations_guide_includes_backup_and_restore_drills() -> None:
    guide = (ROOT / "docs/guides/production-operations.md").read_text()
    assert "## Backup" in guide
    assert "## Restore" in guide
    assert "postgres" in guide.lower()


def test_offsite_backup_is_encrypted_scoped_and_rotated() -> None:
    script = (ROOT / "scripts/ops/backup-postgres-offsite.sh").read_text()

    assert 'RESTIC_REPOSITORY:?' in script
    assert 'RESTIC_PASSWORD_FILE:?' in script
    assert "com.docker.compose.project=${RESOURCE_UUID}" in script
    assert "com.docker.compose.service=postgres" in script
    assert "pg_dump" in script
    assert "pg_restore -l" in script
    assert "restic_command backup" in script
    assert 'sftp.args=${RESTIC_SFTP_ARGS}' in script
    assert "--keep-daily 14" in script
    assert "--keep-weekly 8" in script
    assert "--keep-monthly 12" in script
    assert "--prune" in script


def test_offsite_restore_drill_uses_an_ephemeral_database() -> None:
    script = (ROOT / "scripts/ops/restore-postgres-offsite-drill.sh").read_text()

    assert "restic_command dump" in script
    assert "latest /vaultgate-postgres.dump" in script
    assert 'sftp.args=${RESTIC_SFTP_ARGS}' in script
    assert "docker run" in script
    assert "--tmpfs /var/lib/postgresql/data" in script
    assert "pg_restore" in script
    assert "information_schema.tables" in script
    assert "alembic_version" in script
    assert "docker rm -f" in script


def test_offsite_backup_has_a_persistent_daily_systemd_timer() -> None:
    service = (ROOT / "ops/systemd/vaultgate-offsite-backup.service").read_text()
    timer = (ROOT / "ops/systemd/vaultgate-offsite-backup.timer").read_text()

    assert "EnvironmentFile=/etc/vaultgate/offsite-backup.env" in service
    assert "Environment=HOME=/root" in service
    assert "NoNewPrivileges=true" in service
    assert "ProtectSystem=strict" in service
    assert "OnCalendar=*-*-* 04:00:00 UTC" in timer
    assert "Persistent=true" in timer
