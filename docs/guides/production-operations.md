# Production Operations

Authentication rate limits are derived from persisted audit events, so multiple API processes share
the same failure window when they use the same PostgreSQL database.

## Startup Verification

After each deployment:

1. Run `scripts/ops/smoke-test.sh` to verify health, headers, and readiness.
2. Confirm `/healthz` returns `{"status": "ok"}` with an `x-request-id` header.
3. Confirm `/readyz` returns `{"status": "ok"}` and that database and encryption checks pass.

## Backup

The primary recovery path is storage snapshot plus WAL/PITR. See
[`data-durability.md`](data-durability.md). Logical backups are optional and enabled with
`ENABLE_LOGICAL_BACKUP=true`.

```bash
./scripts/ops/backup-postgres.sh
```

- Backups are saved to `./backups/postgres/` with timestamps.
- Run on demand or before high-risk schema changes when logical backups are enabled.
- Store backups off-host for disaster recovery.

## Restore

```bash
./scripts/ops/restore-postgres.sh
```

- Practice restore drills regularly on a non-production environment.
- Verify data integrity after restore.

## Incident Response

1. Check deploy logs if a release just completed.
2. Verify `/healthz` and `/readyz` endpoints.
3. Check database connectivity.
4. Review recent audit logs via the web UI at `/audit`.
5. If needed, restore from backup and re-run smoke checks.

## Monitoring

- **Health**: `GET /healthz` — returns `{"status": "ok"}`
- **Readiness**: `GET /readyz` — returns `{"status": "ok"}` when database and encryption are operational
- **Request IDs**: All responses include `x-request-id` header for log correlation
- **Database durability**: `scripts/ops/check-postgres-durability.sh`
- **Key recovery**: `scripts/ops/verify-key-recovery.sh`
- **Audit export**: `scripts/ops/export-audit-log.sh`
- **Recovery drill**: `scripts/ops/run-durability-drill.sh`
