from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from collections import Counter
from collections.abc import Iterable
from datetime import datetime
from typing import Any

from sqlalchemy import select

from app.config import Settings
from app.orm import AuditLog, IdempotencyRecord, Secret
from app.runtime import build_runtime
from app.services.encryption import EncryptionService, get_encryption_service

ZERO_HASH = "0" * 64


def encrypted_envelope_key_id(encrypted_value: str) -> str:
    if encrypted_value.startswith("v2:"):
        parts = encrypted_value.split(":", 2)
        if len(parts) == 3 and parts[1]:
            return parts[1]
        return "invalid"
    return "legacy"


def build_keyring_audit_report(
    records: Iterable[tuple[str, str, str]],
    encryption: EncryptionService,
) -> tuple[dict[str, Any], bool]:
    key_usage: Counter[str] = Counter()
    failures: list[dict[str, str]] = []
    configured_key_ids = set(encryption.key_ids)

    for record_type, record_id, encrypted_value in records:
        key_id = encrypted_envelope_key_id(encrypted_value)
        key_usage[key_id] += 1
        if key_id not in {"legacy", "invalid"} and key_id not in configured_key_ids:
            failures.append(
                {
                    "record_type": record_type,
                    "record_id": record_id,
                    "key_id": key_id,
                    "error": "missing-key",
                }
            )
            continue
        try:
            encryption.decrypt(encrypted_value)
        except ValueError:
            failures.append(
                {
                    "record_type": record_type,
                    "record_id": record_id,
                    "key_id": key_id,
                    "error": "decrypt-failed",
                }
            )

    report: dict[str, Any] = {
        "status": "ok" if not failures else "failed",
        "active_key_id": encryption.active_key_id,
        "configured_key_ids": list(encryption.key_ids),
        "key_fingerprints": encryption.key_fingerprints(),
        "encrypted_record_count": sum(key_usage.values()),
        "key_usage": dict(sorted(key_usage.items())),
        "failure_count": len(failures),
        "failures": failures,
    }
    return report, not failures


async def audit_database_keyring(settings: Settings) -> tuple[dict[str, Any], bool]:
    runtime = build_runtime(settings)
    try:
        async with runtime.session_factory() as session:
            secret_rows = (
                await session.execute(select(Secret.id, Secret.value_encrypted))
            ).all()
            idempotency_rows = (
                await session.execute(
                    select(IdempotencyRecord.id, IdempotencyRecord.response_encrypted)
                )
            ).all()
        records = [
            *(('secret', record_id, encrypted) for record_id, encrypted in secret_rows),
            *(
                ('idempotency_record', record_id, encrypted)
                for record_id, encrypted in idempotency_rows
            ),
        ]
        return build_keyring_audit_report(records, get_encryption_service())
    finally:
        await runtime.dispose()


def build_hash_chained_audit_record(
    payload: dict[str, Any],
    previous_hash: str,
) -> tuple[dict[str, Any], str]:
    if len(previous_hash) != 64 or any(character not in "0123456789abcdef" for character in previous_hash):
        raise ValueError("previous_hash must be a lowercase SHA-256 hex digest")
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    digest = hashlib.sha256(previous_hash.encode("ascii") + b"\n" + canonical).hexdigest()
    return {
        **payload,
        "integrity": {
            "algorithm": "sha256-chain-v1",
            "previous": previous_hash,
            "digest": digest,
        },
    }, digest


def _audit_log_payload(log: AuditLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "token_id": log.token_id,
        "token_prefix": log.token_prefix,
        "secret_id": log.secret_id,
        "actor_type": log.actor_type,
        "actor_id": log.actor_id,
        "actor_label": log.actor_label,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "resource_label": log.resource_label,
        "action": log.action,
        "result": log.result,
        "reason": log.reason,
        "request_id": log.request_id,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "requested_field_count": log.requested_field_count,
        "metadata": log.log_metadata,
        "created_at": log.created_at.isoformat(),
    }


async def export_audit_logs(
    settings: Settings,
    *,
    since: datetime | None,
    limit: int,
    previous_hash: str,
) -> list[dict[str, Any]]:
    runtime = build_runtime(settings)
    try:
        async with runtime.session_factory() as session:
            query = select(AuditLog).order_by(AuditLog.created_at, AuditLog.id).limit(limit)
            if since is not None:
                query = query.where(AuditLog.created_at > since)
            logs = (await session.execute(query)).scalars().all()

        exported: list[dict[str, Any]] = []
        chain_hash = previous_hash
        for log in logs:
            record, chain_hash = build_hash_chained_audit_record(
                _audit_log_payload(log),
                chain_hash,
            )
            exported.append(record)
        return exported
    finally:
        await runtime.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description="VaultGate data durability utilities")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "keyring-audit",
        help="Verify every encrypted database record against the configured recovery keyring",
    )
    export_parser = subparsers.add_parser(
        "audit-export",
        help="Export audit records as integrity-chained JSON Lines",
    )
    export_parser.add_argument("--since", help="Export records after this ISO-8601 timestamp")
    export_parser.add_argument("--limit", type=int, default=100_000)
    export_parser.add_argument("--previous-hash", default=ZERO_HASH)
    args = parser.parse_args()

    if args.command == "keyring-audit":
        report, success = asyncio.run(audit_database_keyring(Settings()))
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0 if success else 2
    if args.command == "audit-export":
        if args.limit < 1 or args.limit > 1_000_000:
            parser.error("--limit must be between 1 and 1000000")
        since = datetime.fromisoformat(args.since) if args.since else None
        records = asyncio.run(
            export_audit_logs(
                Settings(),
                since=since,
                limit=args.limit,
                previous_hash=args.previous_hash,
            )
        )
        for record in records:
            print(json.dumps(record, ensure_ascii=False, sort_keys=True))
        return 0
    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
