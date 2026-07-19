# Data Durability and Recovery

VaultGate protects encrypted application data, PostgreSQL state, audit evidence, and the encryption
keys required to read that state. A database copy without the matching active and historical keys is
not a recoverable VaultGate backup.

## Recovery objectives

Define these values before production launch:

- **RPO**: maximum acceptable data loss. WAL archiving plus frequent snapshots can target minutes.
- **RTO**: maximum acceptable recovery time. A warm managed replica usually recovers faster than a
  volume restore.
- **Key recovery objective**: active and historical key IDs must be recoverable independently of the
  database host.

Logical `pg_dump` backups are optional. At least one independent snapshot/PITR recovery path is
required for a finite RPO.

## 1. Encryption key escrow and recovery

Prefer file-mounted secrets supplied by a cloud Secret Manager, Vault, Docker Secret, or an
equivalent host agent:

```dotenv
ENCRYPTION_KEY=
ENCRYPTION_KEY_FILE=/run/secrets/vaultgate/encryption_key
ENCRYPTION_KEYRING=
ENCRYPTION_KEYRING_FILE=/run/secrets/vaultgate/encryption_keyring
BOOTSTRAP_TOKEN=
BOOTSTRAP_TOKEN_FILE=/run/secrets/vaultgate/bootstrap_token
VAULTGATE_SECRETS_DIR=/secure/host/path/vaultgate
```

The host directory is mounted read-only. Direct and file-backed values are mutually exclusive.
Keep the active key and all key IDs still referenced by ciphertext in a versioned, access-audited
secret store. Maintain an offline break-glass copy under dual control.

Verify a restored key set without printing key material:

```bash
./scripts/ops/verify-key-recovery.sh
```

The command decrypts every Secret and encrypted idempotency response and reports key IDs plus
short SHA-256 fingerprints. Run it after key rotation and during every recovery drill.

## 2. WAL archiving, checksums, and PITR

The embedded PostgreSQL stack enables:

- `fsync=on`, `synchronous_commit=on`, and `full_page_writes=on`;
- `wal_compression=on`, `wal_level=replica`, and `archive_mode=on`;
- data checksums for newly initialized clusters;
- a dedicated `/var/lib/postgresql/wal-archive` volume.

Place `POSTGRES_DATA_LOCATION` and `POSTGRES_WAL_ARCHIVE_LOCATION` on separate durable storage where
possible. The WAL archive location should be replicated or continuously synchronized off-host.

```dotenv
POSTGRES_DATA_LOCATION=/mnt/replicated/vaultgate/postgres
POSTGRES_WAL_ARCHIVE_LOCATION=/mnt/offhost-wal/vaultgate
```

For an existing cluster created without checksums, schedule downtime and use the PostgreSQL
`pg_checksums` utility before declaring the durability check healthy.

PITR recovery procedure:

1. Provision an isolated host and restore the latest data-volume snapshot.
2. Attach the matching WAL archive read-only.
3. Set `restore_command` to copy `%f` from the restored WAL archive to `%p`.
4. Set `recovery_target_time` or `recovery_target_lsn` and create `recovery.signal`.
5. Start PostgreSQL without API traffic and wait for recovery to finish.
6. Run Alembic status, `verify-key-recovery.sh`, database integrity queries, and application smoke tests.
7. Promote only after the recovered timestamp and audit chain have been verified.

## 3. Storage snapshots

`snapshot-postgres-volume.sh` performs a PostgreSQL checkpoint, pauses the database container,
invokes a provider-specific executable hook, and immediately unpauses PostgreSQL. The hook receives
the configured storage location and generated snapshot ID:

```bash
SNAPSHOT_HOOK=/usr/local/sbin/snapshot-vaultgate-volume \
  ./scripts/ops/snapshot-postgres-volume.sh
```

Keep the pause window short. The provider hook should only initiate an atomic block/filesystem
snapshot and return; replication or upload should continue asynchronously.

## 4. High availability

For managed PostgreSQL Multi-AZ or another HA endpoint, use:

```bash
docker compose --env-file .env.production --env-file .release.env \
  -f docker-compose.prod.external-db.yml up -d
```

This mode does not start or wait for an unused local database and defaults to two API replicas.
Require TLS certificate validation in `DATABASE_URL`. Database replicas improve availability but do
not replace snapshots or PITR because accidental writes and corruption can replicate.

This topology is deployed manually with the command above. The `deploy.yml` workflow only automates
the standard four-service `docker-compose.prod.yml` stack: its rollback detection expects exactly
four running services, so automatic pull/restart/smoke-check/rollback does not cover the
external-database stack.

## 5. Monitoring and alerts

Run this check from systemd or cron and alert on any non-zero exit:

```bash
./scripts/ops/check-postgres-durability.sh
```

It verifies durability settings, checksums, WAL archival, replica policy, disk usage, and inode
usage. Prometheus alert templates are provided in `ops/monitoring/vaultgate-alerts.yml`; exporter
setup and scrape configuration are covered in [`monitoring.md`](monitoring.md).

## 6. Migrations

Production startup serializes Alembic upgrades with a PostgreSQL advisory lock. CI rejects
`drop_table` and `drop_column` in upgrade functions unless a reviewed change-ticket marker is
present. Use expand/contract migrations:

1. add backwards-compatible schema;
2. deploy readers/writers that support both versions;
3. backfill and verify;
4. stop use of the old schema;
5. remove old data only in a separately approved release.

## 7. Off-host audit evidence

Export integrity-chained JSON Lines to a directory backed by immutable or off-host storage:

```bash
AUDIT_EXPORT_DIR=/mnt/worm/vaultgate/audit ./scripts/ops/export-audit-log.sh
```

Each record includes the previous record hash and its own SHA-256 chain digest. A separate file
checksum is written beside every export. The exporter persists `.chain-head` in the destination so
later files continue the previous export's chain. Place the entire destination on immutable storage
and protect the chain-head file with the same retention policy. Configure retention so audit rows
are exported before they are removed from PostgreSQL.

## 8. Recovery drills

Use dedicated environment and release files; the drill rejects production-like project names:

```bash
DRILL_ENV_FILE=.env.durability-drill \
DRILL_RELEASE_ENV_FILE=.release.env \
DRILL_SMOKE_PUBLIC_HOST=localhost \
DRILL_SMOKE_BASE_URL=http://localhost \
  ./scripts/ops/run-durability-drill.sh
```

The drill starts an isolated stack, writes a marker, verifies WAL archival and the encryption
keyring, restarts PostgreSQL, and confirms the marker survives. Provide `DRILL_SNAPSHOT_HOOK` to
exercise the storage-provider snapshot path. Run at least quarterly and record measured RPO/RTO.

## Optional logical backup

Set `ENABLE_LOGICAL_BACKUP=true` to retain the deployment-time `pg_dump` safeguard. Logical backups
are useful for portability and selective restores, but remain optional when tested snapshot/PITR
recovery is available.
