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

### Encrypted off-host backup

`scripts/ops/backup-postgres-offsite.sh` locates the exact Coolify PostgreSQL container by Compose
project and service labels, creates and validates a custom-format dump, then sends it to an encrypted
restic repository. It retains 14 daily, 8 weekly, and 12 monthly snapshots. Required configuration:

```dotenv
RESTIC_REPOSITORY=sftp:vaultgate-backup@backup-host:/srv/vaultgate-backups/repository
RESTIC_PASSWORD_FILE=/root/.config/vaultgate-backup/restic-password
RESTIC_SFTP_ARGS="-i /root/.ssh/vaultgate-backup -o BatchMode=yes -o StrictHostKeyChecking=yes"
VAULTGATE_RESOURCE_UUID=<exact-coolify-resource-uuid>
```

Install `ops/systemd/vaultgate-offsite-backup.service` and `.timer` on the database host. The timer
runs at 04:00 UTC with a randomized delay, after the Coolify-local 03:17 backup. Keep the restic
password outside the repository; escrow a separately encrypted recovery copy so loss of the source
host does not make the off-host repository unreadable.

## Restore

`scripts/ops/restore-postgres.sh` restores a custom-format dump produced by
`backup-postgres.sh` through `pg_restore --clean --if-exists --no-owner --single-transaction
--exit-on-error`. `BACKUP_FILE` is required. The compose wiring follows the same
`COMPOSE_FILE` / `COMPOSE_ENV_FILE` defaults as the backup script; `.release.env`
(`COMPOSE_RELEASE_ENV_FILE`) is passed to `docker compose` only when the file exists, so
local drills need just `.env.production`.

Full sequence against the standard production stack:

```bash
# 1. Stop API writes so no session or audit rows land mid-restore.
docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml stop api

# 2. Restore into the bundled postgres service. The target database must be
#    disposable or in maintenance mode.
BACKUP_FILE=./backups/postgres/postgres-20260101T000000Z.dump \
  ./scripts/ops/restore-postgres.sh

# 3. Start the stack; the API entrypoint re-applies any migrations newer than
#    the dump (alembic upgrade head) before serving traffic.
docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml up -d

# 4. Verify readiness and run one synthetic Agent read.
./scripts/ops/smoke-test.sh
```

- Practice restore drills regularly on a non-production environment.
- Verify data integrity after restore (see the Recovery section of
  [`deployment-manual.md`](deployment-manual.md)).

To test an off-host snapshot without stopping or writing to production, run:

```bash
RESTIC_REPOSITORY=<repository> \
RESTIC_PASSWORD_FILE=<password-file> \
  ./scripts/ops/restore-postgres-offsite-drill.sh
```

The drill downloads the latest tagged snapshot, restores it into a temporary PostgreSQL 16
container backed by tmpfs, verifies public tables and the Alembic version row, then deletes the
container and plaintext archive.

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
- **Off-host backup**: `scripts/ops/backup-postgres-offsite.sh` and
  `vaultgate-offsite-backup.timer`
- **Off-host restore drill**: `scripts/ops/restore-postgres-offsite-drill.sh`
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

## Supply Chain Pinning

Base images in every Dockerfile are pinned by digest (`FROM image:tag@sha256:<digest>`),
and the API runtime dependencies are locked with hashes in `apps/api/requirements.lock`
(installed with `pip install --require-hashes`). The tag is kept for readability; the
digest is what Docker actually pulls.

Upgrading a base image:

1. Resolve the current digest for the new tag:
   `docker buildx imagetools inspect <image>:<tag>` (use the top-level index digest so
   multi-arch builds keep working).
2. Update the `FROM image:tag@sha256:<digest>` line in the Dockerfile.
3. Open a PR — the Docker Images workflow (`.github/workflows/docker-images.yml`) builds
   the image and runs a Trivy scan before anything is pushed to GHCR. Only merge when the
   scan is clean.

Regenerating the API dependency lock after changing `apps/api/pyproject.toml` (run inside
the Python 3.12 container toolchain so the pins match the runtime):

```bash
docker run --rm -v "$PWD/apps/api:/work" -w /work python:3.12-slim \
  sh -c "pip install pip-tools && pip-compile --generate-hashes --output-file=requirements.lock pyproject.toml"
```

CI audits the locked dependencies with `pip-audit -r requirements.lock`; review its output
before merging dependency bumps.
