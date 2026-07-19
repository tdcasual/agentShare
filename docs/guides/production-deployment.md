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

## DNS and TLS

- Point `PUBLIC_HOST` at the production server before the first deploy.
- Caddy terminates TLS automatically using `ACME_EMAIL`.
- Do not publish PostgreSQL directly.

## Rollback

Re-run the deploy workflow with a known-good `image_tag`, then verify with smoke checks.
