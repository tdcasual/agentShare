# Deployment Manual

## Production prerequisites

- Docker and Docker Compose v2+
- A TLS-enabled domain
- PostgreSQL 16, bundled or external
- A base64-encoded 32-byte `ENCRYPTION_KEY`

## Deploy

```bash
cp ops/compose/prod.env.example .env.production
# Fill PUBLIC_HOST, ACME_EMAIL, POSTGRES_PASSWORD, ENCRYPTION_KEY, image names,
# and CORS_ALLOWED_ORIGINS.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Verify:

```bash
./scripts/ops/smoke-test.sh
```

Open `https://YOUR_DOMAIN/setup` to create the single administrator. Administrator automation can later create `vgm_` Tokens through `/api/admin/management-tokens`.

## Upgrade without deleting data

1. Back up PostgreSQL and verify the backup is readable.
2. Pull the new images.
3. Start the stack. API startup runs `alembic upgrade head` before serving traffic.
4. Verify `/readyz`, browser login, Agent Token access, and audit records.
5. Keep the previous images and backup until acceptance is complete.

```bash
./scripts/ops/backup-postgres.sh
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
./scripts/ops/smoke-test.sh
```

The migration preserves existing administrator data, Secrets, Token hashes, grants, and audit records. Existing Tokens are assigned to a migration Agent.

## Recovery

Stop API writes, restore the PostgreSQL backup into a clean database, point `DATABASE_URL` at the restored database, run `alembic upgrade head`, then execute the smoke test and one synthetic Agent read. Never use destructive schema reset as an upgrade path.

## Environment variables

| Variable | Required | Description |
|---|---:|---|
| `ENCRYPTION_KEY` | yes | Base64-encoded 32-byte AES key |
| `ENCRYPTION_ACTIVE_KEY_ID` | no | Key id for newly encrypted values |
| `ENCRYPTION_KEYRING` | no | JSON object containing legacy key ids and keys during rotation |
| `POSTGRES_PASSWORD` | yes | Database password |
| `BOOTSTRAP_TOKEN` | production | One-time credential of at least 32 characters; API startup fails without it. Rotate or destroy it once the administrator is initialized |
| `PUBLIC_HOST` | production | Public domain |
| `ACME_EMAIL` | production | ACME registration address |
| `CORS_ALLOWED_ORIGINS` | production | Exact comma-separated browser origins |
| `SESSION_SECURE` | production | Must be `true` behind HTTPS |
| `TRUSTED_PROXY_CIDRS` | no | Comma-separated proxy IPs/CIDRs trusted for `X-Forwarded-For` (compose default `172.30.0.2/32`) |
| `MAX_REQUEST_BODY_BYTES` | no | Maximum API request body size in bytes (default 2 MiB) |
| `CREDENTIAL_RETENTION_DAYS` | no | Days expired or revoked sessions and tokens are kept before deletion (default 30) |
| `AUDIT_RETENTION_DAYS` | no | Audit row retention in days (default 365) |
| `IDEMPOTENCY_RETENTION_DAYS` | no | Completed mutation replay retention, 1-90 days |
| `ENABLE_LOGICAL_BACKUP` | no | `true` runs a pre-migration `pg_dump` during deployment (default `false`) |
| `VAULTGATE_API_URL` | web container | Internal API origin used by the same-origin proxy |

The browser has no configurable public API base. It always calls the web application's `/api` proxy.

## CI/CD secrets

`deploy.yml` runs against a GitHub environment (`production` by default); configure these as
environment secrets there. `docker-images.yml` and `security.yml` authenticate to GHCR with the
automatic `GITHUB_TOKEN` and need no manual secrets.

| Secret | Used by | Purpose | Example format |
|---|---|---|---|
| `DEPLOY_HOST` | deploy.yml | Deployment server hostname or IP | `203.0.113.10` |
| `DEPLOY_USER` | deploy.yml | SSH user on the deployment server | `deploy` |
| `DEPLOY_SSH_KEY` | deploy.yml | SSH private key for `DEPLOY_USER` | `-----BEGIN OPENSSH PRIVATE KEY-----` |
| `DEPLOY_PORT` | deploy.yml | SSH port | `22` |
| `DEPLOY_PATH` | deploy.yml | Remote directory receiving the deployment assets | `/opt/vaultgate` |
| `DEPLOY_ENV_FILE` | deploy.yml | Full contents of the production `.env.production` | `PUBLIC_HOST=vaultgate.example.com` |
| `GHCR_TOKEN` | deploy.yml | Token for `docker login ghcr.io` (read packages) | `ghp_...` |
| `GHCR_USERNAME` | deploy.yml | GHCR username for the login above | `octocat` |
