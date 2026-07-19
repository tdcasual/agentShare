import asyncio
from datetime import UTC, datetime, timedelta

import pytest

from app.config import Settings
from app.db import migrate_db
from app.durability import (
    ZERO_HASH,
    audit_database_keyring,
    build_hash_chained_audit_record,
    build_keyring_audit_report,
    encrypted_envelope_key_id,
    export_audit_logs,
)
from app.orm import AuditLog, IdempotencyRecord, Secret, User
from app.runtime import build_runtime
from app.services.encryption import EncryptionService, get_encryption_service, reset_encryption_service

ACTIVE_KEY = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY="
OLD_KEY = "b2xkLWtleS1tYXRlcmlhbC0zMi1ieXRlcy12YWx1ZSE="


def test_encrypted_envelope_key_id_handles_versioned_and_legacy_payloads() -> None:
    assert encrypted_envelope_key_id("v2:current:payload") == "current"
    assert encrypted_envelope_key_id("v1:payload") == "legacy"
    assert encrypted_envelope_key_id("payload") == "legacy"
    assert encrypted_envelope_key_id("v2::payload") == "invalid"


def test_keyring_audit_verifies_records_without_exposing_key_material() -> None:
    encryption = EncryptionService(
        ACTIVE_KEY,
        encryption_keyring={"old": OLD_KEY},
        active_key_id="current",
    )
    old_encryption = EncryptionService(OLD_KEY, active_key_id="old")
    records = [
        ("secret", "secret-1", encryption.encrypt("current-value")),
        ("secret", "secret-2", old_encryption.encrypt("old-value")),
    ]

    report, success = build_keyring_audit_report(records, encryption)

    assert success is True
    assert report["status"] == "ok"
    assert report["key_usage"] == {"current": 1, "old": 1}
    assert ACTIVE_KEY not in str(report)
    assert OLD_KEY not in str(report)


def test_keyring_audit_fails_when_recovery_key_is_missing() -> None:
    active = EncryptionService(ACTIVE_KEY, active_key_id="current")
    old = EncryptionService(OLD_KEY, active_key_id="old")

    report, success = build_keyring_audit_report(
        [("secret", "secret-1", old.encrypt("old-value"))],
        active,
    )

    assert success is False
    assert report["failures"][0]["error"] == "missing-key"


def test_audit_export_hash_chain_detects_order_and_content_changes() -> None:
    first, first_hash = build_hash_chained_audit_record(
        {"id": "audit-1", "action": "secret.read"},
        ZERO_HASH,
    )
    second, second_hash = build_hash_chained_audit_record(
        {"id": "audit-2", "action": "admin.login"},
        first_hash,
    )
    changed, changed_hash = build_hash_chained_audit_record(
        {"id": "audit-2", "action": "admin.login.failed"},
        first_hash,
    )

    assert first["integrity"]["previous"] == ZERO_HASH
    assert second["integrity"]["previous"] == first_hash
    assert second_hash != changed_hash
    assert changed["integrity"]["digest"] == changed_hash

    with pytest.raises(ValueError, match="lowercase SHA-256"):
        build_hash_chained_audit_record({"id": "audit-3"}, "INVALID")


def test_database_keyring_audit_and_integrity_export(tmp_path, monkeypatch) -> None:
    database_url = f"sqlite:///{tmp_path / 'durability.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    migrate_db(database_url)
    settings = Settings(
        app_env="development",
        database_url=database_url,
        encryption_key=ACTIVE_KEY,
    )
    reset_encryption_service()

    async def exercise() -> None:
        runtime = build_runtime(settings)
        try:
            encryption = get_encryption_service()
            async with runtime.session_factory() as session:
                user = User(id="user-1", email="admin@example.com", password_hash="hash")
                session.add(user)
                # SQLite enforces foreign keys: flush the parent row before
                # inserting children that reference it.
                await session.flush()
                session.add(
                    Secret(
                        id="secret-1",
                        user_id=user.id,
                        type="password",
                        name="Database",
                        value_encrypted=encryption.encrypt("secret-value"),
                    )
                )
                session.add(
                    IdempotencyRecord(
                        id="idempotency-1",
                        user_id=user.id,
                        key="request-1",
                        request_hash="a" * 64,
                        status_code=201,
                        response_encrypted=encryption.encrypt('{"id":"secret-1"}'),
                    )
                )
                session.add(
                    AuditLog(
                        id="audit-1",
                        actor_type="admin_session",
                        actor_id="session-1",
                        actor_label="admin@example.com",
                        resource_type="secret",
                        resource_id="secret-1",
                        resource_label="Database",
                        action="secret.create",
                        result="success",
                        log_metadata={"field_count": 1},
                    )
                )
                await session.commit()
        finally:
            await runtime.dispose()

        keyring_report, success = await audit_database_keyring(settings)
        assert success is True
        assert keyring_report["encrypted_record_count"] == 2
        assert keyring_report["key_usage"] == {"current": 2}

        exported = await export_audit_logs(
            settings,
            since=datetime.now(UTC) - timedelta(days=1),
            limit=100,
            previous_hash=ZERO_HASH,
        )
        assert len(exported) == 1
        assert exported[0]["id"] == "audit-1"
        assert exported[0]["metadata"] == {"field_count": 1}
        assert exported[0]["integrity"]["previous"] == ZERO_HASH

    try:
        asyncio.run(exercise())
    finally:
        reset_encryption_service()
