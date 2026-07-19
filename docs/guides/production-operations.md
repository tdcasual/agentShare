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
- Treat dumps as confidential: Secret values are stored as ciphertext, but names, URLs, usernames,
  metadata, and audit records are plaintext. Encrypt backup storage and restrict access to it.

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

For symptom-by-symptom diagnosis (readiness 503, migration lock, ACME, login 429, drill
failures, audit IPs, crash loops), see [`troubleshooting.md`](troubleshooting.md).

## Monitoring

- **Health**: `GET /healthz` — returns `{"status": "ok"}`
- **Readiness**: `GET /readyz` — returns `{"status": "ok"}` when database and encryption are operational
- **Request IDs**: All responses include `x-request-id` header for log correlation
- **Database durability**: `scripts/ops/check-postgres-durability.sh`
- **Key recovery**: `scripts/ops/verify-key-recovery.sh`
- **Audit export**: `scripts/ops/export-audit-log.sh`
- **Recovery drill**: `scripts/ops/run-durability-drill.sh`
- **Prometheus alerts**: `ops/monitoring/vaultgate-alerts.yml` — exporter setup, scrape
  configuration, and alert-chain testing are covered in [`monitoring.md`](monitoring.md)

## Logging

All services log to stdout/stderr; collect with the Docker logging driver, not in-container
files.

- **API request logs**: one JSON line per request on stdout (logger `app.request`), for example
  `{"event": "http_request", "request_id": "...", "method": "GET", "path": "/readyz", "status": 200, "duration_ms": 1.234}`.
  The API honors an inbound `x-request-id` header (truncated to 255 characters) or generates one,
  and always returns it in the `x-request-id` response header. Startup, readiness, and rate-limit
  events use the `app.startup` and `app.rate_limit` loggers.
- **Web**: the Next.js standalone server logs runtime errors and proxy failures to stdout.
- **Caddy**: emits JSON process logs (startup, TLS issuance, admin) on stderr. The shipped
  `ops/caddy/Caddyfile` does not enable per-request access logs; add a `log` directive inside the
  site block if edge access logs are required, then restart Caddy.

Collection and retention:

```bash
# Follow a service
docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml logs -f api
```

Prefer the `journald` logging driver (or configure `max-size`/`max-file` for the default
`json-file` driver) so log rotation is handled outside the containers. Keep application logs for
roughly 14–30 days; anything longer-lived belongs in the integrity-chained audit export
(`scripts/ops/export-audit-log.sh`), whose retention is governed by `AUDIT_RETENTION_DAYS`.

Correlating a user report with backend logs and audit records by request ID:

```bash
# 1. Take the x-request-id from the failed response (browser devtools or curl -i).
# 2. Find the API log line:
docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml logs api --since 1h \
  | grep '"request_id":"<request-id>"'
# 3. The audit query API returns the same request_id per row:
curl -fsS -H "Authorization: Bearer ${VGM_TOKEN}" \
  "https://${PUBLIC_HOST}/api/admin/audit-logs?limit=50" | grep '<request-id>'
```
