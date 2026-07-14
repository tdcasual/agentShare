# Production Operations

VaultGate currently supports one API process. Authentication rate limits are process-local; do not
horizontally scale the API until a shared rate-limit store is configured.

## Startup Verification

After each deployment:

1. Run `scripts/ops/smoke-test.sh` to verify health, headers, and readiness.
2. Confirm `/healthz` returns `{"status": "ok"}` with an `x-request-id` header.
3. Confirm `/readyz` returns `{"status": "ok"}` and that database and encryption checks pass.

## Backup

```bash
./scripts/ops/backup-postgres.sh
```

- Backups are saved to `./backups/postgres/` with timestamps.
- Run daily and before schema changes.
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
