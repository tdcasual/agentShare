# Production Operations

## Startup Verification

After each deployment:

1. Run `scripts/ops/smoke-test.sh` to verify health, headers, and metrics.
2. Confirm `/healthz` returns `{"status": "ok"}` with an `x-request-id` header.
3. Authenticate and check `/metrics` for `http_requests_total` and `http_errors_total`.

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
2. Verify `/healthz` and `/metrics` endpoints.
3. Check database connectivity.
4. Review recent audit logs via the web UI at `/audit`.
5. If needed, restore from backup and re-run smoke checks.

## Monitoring

- **Health**: `GET /healthz` — returns `{"status": "ok"}`
- **Metrics**: `GET /metrics` — requires session cookie, returns request counts and error rates
- **Request IDs**: All responses include `x-request-id` header for log correlation
