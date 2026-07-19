# Production Deployment

## Architecture

VaultGate production stack:

```
Internet → Caddy (TLS) → Web (Next.js) → API (FastAPI) → PostgreSQL
```

- **Caddy**: Reverse proxy with automatic Let's Encrypt TLS
- **Web**: Next.js management console (port 3000 internal)
- **API**: FastAPI backend (port 8000 internal)
- **PostgreSQL**: Database (port 5432 internal)

## Security Hardening

The production compose (`docker-compose.prod.yml`) includes:

- `read_only: true` on the caddy, web, and api containers (PostgreSQL is excluded because it must write to its data and WAL archive volumes)
- `cap_drop: ALL` on the caddy, web, and api containers — none of them needs Linux capabilities at runtime (non-root users, unprivileged ports, no setuid helpers); Caddy adds back only `NET_BIND_SERVICE`. PostgreSQL keeps its default set because its entrypoint uses `gosu`
- `security_opt: no-new-privileges:true` on all services
- Network segmentation: `edge` (public) and `data` (internal) networks
- Resource limits: 512MB memory, 1 CPU per container
- `tmpfs` mounts for writable temp directories
- Health checks on all services with proper startup ordering
- PostgreSQL checksums, synchronous durability settings, continuous WAL archival, and graceful shutdown

## Release Flow

1. Push images through `.github/workflows/docker-images.yml`.
2. Trigger `.github/workflows/deploy.yml` manually when ready to deploy.
3. The deploy workflow uploads production assets, writes `.env.production`, accepts only scanned `sha-*` image tags, resolves them to digests, restarts the stack, and runs smoke checks with automatic image rollback.
4. The API container runs the equivalent of `alembic upgrade head` under a PostgreSQL advisory lock before `uvicorn`.
5. Logical `pg_dump` is optional through `ENABLE_LOGICAL_BACKUP=true`; snapshots plus WAL/PITR are the primary recovery path.

## Database Migrations

- Alembic is the schema authority.
- In production, migrations run automatically on API startup.
- Schema changes must ship as explicit Alembic migrations.
- Multiple API replicas serialize migrations with a database advisory lock.
- CI blocks destructive upgrade operations unless an explicit reviewed change-ticket marker is present.

## Managed high-availability database

Use `docker-compose.prod.external-db.yml` with a TLS-validated `DATABASE_URL` for managed Multi-AZ
PostgreSQL. This topology omits the embedded database and defaults to two API replicas. See
[`data-durability.md`](data-durability.md) for recovery and key escrow requirements.

The `deploy.yml` workflow automates only the standard four-service stack (its rollback detection
expects exactly four running services), so deploy this topology manually:

1. **Prepare the environment.** Copy the template and fill every `replace-with-*` value —
   `PUBLIC_HOST`, `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `ACME_EMAIL`, exactly one of
   `DATABASE_URL` (with `sslmode=verify-full`) or `DATABASE_URL_FILE`, `ENCRYPTION_KEY`,
   `BOOTSTRAP_TOKEN`, and `API_REPLICAS`:

   ```bash
   cp ops/compose/prod.external-db.env.example .env.production
   ```

2. **Select and pin the images.** Write the release file with immutable `sha-*` tags produced by
   the image workflow, then resolve them to digests (this mirrors what `deploy.yml` does for the
   standard stack):

   ```bash
   cat > .release.env <<EOF
   API_IMAGE=ghcr.io/<owner>/vaultgate-api:sha-<tag>
   CADDY_IMAGE=ghcr.io/<owner>/vaultgate-caddy:sha-<tag>
   WEB_IMAGE=ghcr.io/<owner>/vaultgate-web:sha-<tag>
   EOF

   docker compose --env-file .env.production --env-file .release.env \
     -f docker-compose.prod.external-db.yml pull
   : > .resolved-release.env
   for variable_name in API_IMAGE CADDY_IMAGE WEB_IMAGE; do
     image_reference="$(sed -n "s/^${variable_name}=//p" .release.env)"
     image_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image_reference")"
     printf '%s=%s\n' "$variable_name" "$image_digest" >> .resolved-release.env
   done
   ```

   Keep the previous `.resolved-release.env` — it is the rollback target.

3. **Start the stack.**

   ```bash
   docker compose --env-file .env.production --env-file .resolved-release.env \
     -f docker-compose.prod.external-db.yml up -d
   ```

   Each API replica runs the migration under the PostgreSQL advisory lock before serving, so
   simultaneous first starts are safe (see `MIGRATION_LOCK_TIMEOUT_SECONDS`).

4. **Verify.**

   ```bash
   PUBLIC_HOST=vaultgate.example.com ./scripts/ops/smoke-test.sh
   ```

5. **Roll back manually on failure.** Repoint the image variables at the previous known-good
   digests (the saved `.resolved-release.env`), re-run `up -d`, and re-run the smoke test:

   ```bash
   cp .resolved-release.env.previous .resolved-release.env
   docker compose --env-file .env.production --env-file .resolved-release.env \
     -f docker-compose.prod.external-db.yml up -d
   PUBLIC_HOST=vaultgate.example.com ./scripts/ops/smoke-test.sh
   ```

The ops scripts accept `COMPOSE_FILE=docker-compose.prod.external-db.yml` and
`COMPOSE_RELEASE_ENV_FILE=.resolved-release.env` overrides (for example for
`verify-key-recovery.sh`). The standard automated flow remains the one in
[`deployment-manual.md`](deployment-manual.md); use it whenever the embedded database is
acceptable.

## DNS and TLS

- Point `PUBLIC_HOST` at the production server before the first deploy.
- Caddy terminates TLS automatically using `ACME_EMAIL`.
- Do not publish PostgreSQL directly.

## Rollback

Re-run the deploy workflow with a known-good `image_tag`, then verify with smoke checks.
