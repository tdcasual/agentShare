from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_production_postgres_enables_native_durability_and_wal_archiving() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()

    for setting in (
        "fsync=on",
        "synchronous_commit=on",
        "full_page_writes=on",
        "wal_compression=on",
        "wal_level=replica",
        "archive_mode=on",
        "archive_command=",
        "POSTGRES_INITDB_ARGS",
        "--data-checksums",
        "postgres-wal-archive",
    ):
        assert setting in compose
    assert "stop_grace_period: 2m" in compose
    assert "POSTGRES_DATA_LOCATION" in compose
    assert "POSTGRES_WAL_ARCHIVE_LOCATION" in compose


def test_file_backed_secrets_and_key_recovery_audit_are_available() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    config = (ROOT / "apps/api/app/config.py").read_text()
    recovery_script = (ROOT / "scripts/ops/verify-key-recovery.sh").read_text()

    for setting in (
        "DATABASE_URL_FILE",
        "POSTGRES_PASSWORD_FILE",
        "ENCRYPTION_KEY_FILE",
        "ENCRYPTION_KEYRING_FILE",
        "BOOTSTRAP_TOKEN_FILE",
    ):
        assert setting in compose or setting.lower() in config
    assert "app.durability keyring-audit" in recovery_script


def test_external_database_stack_omits_embedded_postgres_and_supports_api_replicas() -> None:
    compose = (ROOT / "docker-compose.prod.external-db.yml").read_text()

    assert "\n  postgres:\n" not in compose
    assert "POSTGRES_HOST" not in compose
    assert "DATABASE_URL_FILE" in compose
    assert "replicas: ${API_REPLICAS:-2}" in compose
    assert "stop_grace_period" in compose


def test_durability_checks_snapshot_hook_and_recovery_drill_exist() -> None:
    check = (ROOT / "scripts/ops/check-postgres-durability.sh").read_text()
    snapshot = (ROOT / "scripts/ops/snapshot-postgres-volume.sh").read_text()
    drill = (ROOT / "scripts/ops/run-durability-drill.sh").read_text()

    assert "pg_switch_wal" in check
    assert "pg_stat_replication" in check
    assert "data_checksums" in check
    assert "df -Pi" in check
    assert "CHECKPOINT" in snapshot
    assert "compose pause" in snapshot
    assert "SNAPSHOT_HOOK" in snapshot
    assert "vaultgate_durability_probe" in drill
    assert "compose stop postgres" in drill
    assert "check-postgres-durability.sh" in drill
    assert "verify-key-recovery.sh" in drill
    assert "DRILL_SMOKE_PUBLIC_HOST" in drill
    assert "DRILL_SMOKE_BASE_URL" in drill


def test_migrations_are_serialized_and_destructive_upgrades_are_linted() -> None:
    database = (ROOT / "apps/api/app/db.py").read_text()
    alembic_env = (ROOT / "apps/api/alembic/env.py").read_text()
    policy = (ROOT / "scripts/ops/check_migration_policy.py").read_text()
    verification = (ROOT / "scripts/ops/verify-control-plane.sh").read_text()

    assert "pg_try_advisory_lock" in database
    assert 'config.attributes["connection"]' in database
    assert 'config.attributes.get("connection")' in alembic_env
    assert "drop_column" in policy
    assert "drop_table" in policy
    assert "check_migration_policy.py" in verification


def test_audit_export_is_hash_chained_and_can_target_off_host_storage() -> None:
    durability = (ROOT / "apps/api/app/durability.py").read_text()
    exporter = (ROOT / "scripts/ops/export-audit-log.sh").read_text()

    assert "sha256-chain-v1" in durability
    assert "previous_hash" in durability
    assert "AUDIT_EXPORT_DIR" in exporter
    assert "sha256sum" in exporter
    assert ".chain-head" in exporter
    assert "chmod 600" in exporter


def test_durability_runbook_and_alert_rules_cover_recovery_contract() -> None:
    guide = (ROOT / "docs/guides/data-durability.md").read_text().lower()
    alerts = (ROOT / "ops/monitoring/vaultgate-alerts.yml").read_text()

    for term in ("rpo", "rto", "pitr", "key escrow", "expand/contract", "recovery drill"):
        assert term in guide
    assert "VaultGateWalArchiveFailures" in alerts
    assert "VaultGatePostgresReplicationLag" in alerts
