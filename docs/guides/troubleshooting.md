# Troubleshooting

Symptom → checks → resolution for the failures operators actually hit. Commands assume the
standard production layout; all compose invocations use the same two env files the ops scripts
use:

```bash
alias vg-compose='docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml'
```

(The external-database topology uses `-f docker-compose.prod.external-db.yml` and has no
`postgres` service; run database checks against the managed instance instead.)

## `/readyz` returns 503

Check which dependency failed — the response names it:

```bash
curl -sS "https://${PUBLIC_HOST}/readyz"
# {"status":"degraded","database":"unavailable","encryption":"ok"}
```

- **`database: unavailable`**

  ```bash
  vg-compose ps postgres
  vg-compose logs --tail 100 postgres
  vg-compose logs --tail 100 api
  ```

  Resolution by cause: database container down or still starting (wait for the `pg_isready`
  healthcheck, then `vg-compose up -d`); wrong `POSTGRES_PASSWORD`/`DATABASE_URL` (fix
  `.env.production`, `vg-compose up -d`); a failed startup migration — the API log shows
  `[entrypoint] FATAL: Alembic migration failed. Exiting.` (see the migration lock entry below).

- **`encryption: unavailable`**

  The readiness check performs an encrypt round trip with the configured keyring, so this means
  the encryption service could not initialize. Look at API startup logs:

  ```bash
  vg-compose logs --tail 100 api | grep -i encryption
  ```

  Typical causes: `ENCRYPTION_KEY` missing (`No encryption key configured. Set ENCRYPTION_KEY
  environment variable.`), undecodable or wrong-length key (`Invalid ENCRYPTION_KEY: expected
  base64 or hex encoded 32-byte key`), an `ENCRYPTION_ACTIVE_KEY_ID` that violates
  `^[A-Za-z0-9._-]{1,32}$`, or a keyring id duplicating the active id (`Duplicate encryption key
  id`). Fix the value in `.env.production` and `vg-compose up -d`.

## Migration lock timeout at startup

API logs show `Timed out after 120s waiting for the PostgreSQL migration lock` followed by
`[entrypoint] FATAL`, and the container restart-loops.

Cause: migrations run under a PostgreSQL advisory lock so concurrent API replicas (the
external-db topology defaults to two) serialize — a slow migration on one replica delays the
others. Find the lock holder:

```bash
vg-compose exec -T postgres psql --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT l.pid, a.state, a.query_start, left(a.query, 80) AS query FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid WHERE l.locktype = 'advisory';"
```

Resolution: if the holder is actively migrating, just wait — the lock is released when it
finishes. If the holder is an orphaned idle session (its API container died mid-migration, or a
manual `alembic` run was left open), terminate it; advisory locks are session-scoped and release
on disconnect:

```bash
vg-compose exec -T postgres psql --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT pg_terminate_backend(<pid>);"
```

If a legitimately long migration is expected, raise `MIGRATION_LOCK_TIMEOUT_SECONDS` (compose
default 120, allowed range 1–600) in `.env.production` and recreate the API.

## ACME certificate issuance fails

TLS errors in the browser and ACME errors in the Caddy log:

```bash
vg-compose logs --tail 200 caddy | grep -i -e acme -e error
```

Checks:

1. DNS: `dig +short "${PUBLIC_HOST}"` must return this server's public IP.
2. Reachability from outside NAT: `curl -I "http://${PUBLIC_HOST}"` — ports 80 and 443 must be
   open in the firewall/security group; Let's Encrypt validates over port 80.
3. `PUBLIC_HOST` and `ACME_EMAIL` are set correctly in `.env.production`.
4. The `caddy-data` volume holds issued certificates; deleting it forces re-issuance and can hit
   Let's Encrypt rate limits.

Resolution: fix DNS/firewall/env, then `vg-compose up -d caddy` and watch
`vg-compose logs -f caddy` until the certificate is obtained.

## Login returns 429

Response body: `Too many failed login attempts. Try again in 300 seconds.`

The limit is keyed by (administrator email, client IP) and counts `admin.login.failed` audit
events inside `AUTH_RATE_LIMIT_WINDOW_SECONDS` (default 300); the block engages at
`AUTH_RATE_LIMIT_MAX_ATTEMPTS` (default 5). A successful login resets the window, and blocked
attempts are deliberately not audited so an attacker cannot keep an account locked with one
request per window.

Resolution:

- Wait for the oldest failures to age out of the window (default 5 minutes), or log in from a
  different IP.
- Do not raise `AUTH_RATE_LIMIT_MAX_ATTEMPTS` as a first response to lockouts.

Investigate whether it was a typo or an attack:

```bash
vg-compose exec -T postgres psql --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT created_at, actor_label, ip_address FROM audit_logs WHERE action = 'admin.login.failed' ORDER BY created_at DESC LIMIT 20;"
```

Repeated failures from unfamiliar IPs argue for rotating the administrator password and reviewing
the audit log at `/audit`.

## Durability drill or key-recovery verification fails

`./scripts/ops/run-durability-drill.sh` composes the drill from smaller checks; the failing line
identifies the stage:

- `Required drill file not found: ...` — create `.env.durability-drill` and `.release.env` in the
  working directory first.
- `Refusing to run a destructive durability drill with project name ...` — set
  `DRILL_PROJECT_NAME` to a non-production name (the default `vaultgate-durability-drill` is
  accepted).
- `PostgreSQL durability settings are unsafe: ...` — the database is not running with
  `fsync|synchronous_commit|full_page_writes|archive_mode|data_checksums` all `on`; for a cluster
  created without checksums, schedule downtime and run `pg_checksums`.
- `WAL archive did not receive ... within 20 seconds` — the WAL archive volume is not mounted or
  not writable; check `POSTGRES_WAL_ARCHIVE_LOCATION` and volume permissions.
- `PostgreSQL data storage is N% full` — expand storage or lower `POSTGRES_MAX_DISK_PERCENT`
  only after real headroom exists.
- `Durability marker did not survive the PostgreSQL restart.` — the data volume is not persisted
  (check `POSTGRES_DATA_LOCATION` and that no `down -v` ran); treat as a critical storage
  misconfiguration.
- Non-zero exit from `verify-key-recovery.sh` — the JSON report lists `failures` with
  `missing-key` (a key id referenced by ciphertext is absent from `ENCRYPTION_KEY` plus
  `ENCRYPTION_KEYRING`: restore that key to the keyring immediately) or `decrypt-failed` (the key
  material is wrong: restore the correct historical key from escrow). See the rotation runbook in
  [`production-security.md`](production-security.md).

A successful drill ends with `Durability drill passed for marker ...`.

## Audit log shows wrong client IPs

All rows showing the Caddy address (`172.30.0.2`) means the API does not trust the proxy, so it
records the direct peer instead of `X-Forwarded-For`.

Check: `TRUSTED_PROXY_CIDRS` must include the Caddy container address — the compose default is
`172.30.0.2/32`, matching the fixed `ipv4_address` on the `edge` network.

```bash
vg-compose config | grep TRUSTED_PROXY_CIDRS
```

Resolution: set `TRUSTED_PROXY_CIDRS=172.30.0.2/32` in `.env.production` and `vg-compose up -d`.
Only peers inside these CIDRs have their `X-Forwarded-For` header honored; Caddy itself
overwrites (never appends) the header at the edge, so clients cannot spoof their address. If you
place another proxy or CDN in front of Caddy, add its egress CIDRs as a comma-separated list —
and make sure that proxy also overwrites the header, otherwise spoofing becomes possible again.

## Container exits immediately after start

```bash
vg-compose ps -a
vg-compose logs --tail 100 api
```

The API validates production settings at startup and fails fast. Match the log line:

- `Production settings require a BOOTSTRAP_TOKEN of at least 32 characters.` — set a random
  one-time `BOOTSTRAP_TOKEN` (≥32 chars) in `.env.production`.
- `Production settings must use a strong ENCRYPTION_KEY.` — the default dev key is rejected;
  generate one with
  `python -c 'import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'`.
- `Invalid ENCRYPTION_KEY: expected base64 or hex encoded 32-byte key` — re-encode the key.
- `Configure either <NAME> or <NAME>_FILE, not both` — empty the direct variable when using a
  `_FILE` secret.
- `Production settings require secure session cookies (SESSION_SECURE=true).` — the prod compose
  files set this; a custom override removed it.
- `[entrypoint] FATAL: Alembic migration failed. Exiting.` — database unreachable, credentials
  wrong, or migration lock timeout; see the entries above.

After fixing `.env.production`, recreate with `vg-compose up -d` and re-check
`curl -sS "https://${PUBLIC_HOST}/readyz"`.
