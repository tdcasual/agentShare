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
| `POSTGRES_PASSWORD` | yes | Database password |
| `PUBLIC_HOST` | production | Public domain |
| `ACME_EMAIL` | production | ACME registration address |
| `CORS_ALLOWED_ORIGINS` | production | Exact comma-separated browser origins |
| `SESSION_SECURE` | production | Must be `true` behind HTTPS |
| `VAULTGATE_API_URL` | web container | Internal API origin used by the same-origin proxy |

The browser has no configurable public API base. It always calls the web application's `/api` proxy.
