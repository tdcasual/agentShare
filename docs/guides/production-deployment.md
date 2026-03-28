# Production Deployment

## Purpose

This guide covers the production deployment path only. Use the agent quickstart for local development, tests, and manual exploration.

## Baseline

- `docker-compose.prod.yml` is the single-host production stack.
- `caddy` is the only public ingress on ports `80` and `443`.
- `web`, `api`, `postgres`, and `redis` stay on private compose networks.
- Secret reads and writes go through an external secret backend configured with `SECRET_BACKEND_URL` and `SECRET_BACKEND_TOKEN`.

This guide covers the app team's single-host production baseline only. Managed data services, HA networking, SSO, and centralized alerting remain outside this repository and should follow `docs/guides/platform-roadmap.md`.

## Release Flow

1. Push images through `.github/workflows/docker-images.yml`.
2. Trigger `.github/workflows/deploy.yml` or let the successful `main` image workflow start it.
3. The deploy workflow uploads the production assets, writes `.env.production`, validates compose, pulls images, runs `alembic upgrade head`, restarts the stack, and runs smoke checks.
4. The smoke script accepts either `APP_BASE_URL` or `PUBLIC_BASE_URL` as the public entrypoint override when operators need to match existing environment naming.

## Database Migrations

- Treat Alembic as the schema authority for the API database.
- Run `alembic upgrade head` from `apps/api` before starting the API in CI, staging, or production.
- Do not rely on API startup to backfill legacy columns; schema changes must ship as migrations.

## DNS, TLS, and Metrics

- Point `PUBLIC_HOST` at the production server before the first deploy.
- Caddy terminates TLS automatically using `ACME_EMAIL`.
- Keep `/metrics` on the API service for internal scraping; do not publish Postgres or Redis directly.
- Keep the Caddy security headers in `ops/caddy/Caddyfile` enabled unless you have a replacement control upstream.
- Review `.github/workflows/security.yml` before each release window if recent image security scan failures occurred.

## Rollback

- Re-run the deploy workflow with a known-good `image_tag`.
- Confirm smoke checks and `/metrics` recover before closing the incident.
