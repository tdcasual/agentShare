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

- `read_only: true` on all application containers
- `security_opt: no-new-privileges:true` on all services
- Network segmentation: `edge` (public) and `data` (internal) networks
- Resource limits: 512MB memory, 1 CPU per container
- `tmpfs` mounts for writable temp directories
- Health checks on all services with proper startup ordering

## Release Flow

1. Push images through `.github/workflows/docker-images.yml`.
2. Trigger `.github/workflows/deploy.yml` manually when ready to deploy.
3. The deploy workflow uploads production assets, writes `.env.production`, validates compose, pulls images, restarts the stack, and runs smoke checks.
4. The API container runs `alembic upgrade head` on startup before `uvicorn`.

## Database Migrations

- Alembic is the schema authority.
- In production, migrations run automatically on API startup.
- Schema changes must ship as explicit Alembic migrations.

## DNS and TLS

- Point `PUBLIC_HOST` at the production server before the first deploy.
- Caddy terminates TLS automatically using `ACME_EMAIL`.
- Do not publish PostgreSQL directly.

## Rollback

Re-run the deploy workflow with a known-good `image_tag`, then verify with smoke checks.
