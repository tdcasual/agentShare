# Production Deployment

This deployed product should be understood as an **agent server first** system.

- The production stack exists to expose a governed agent server surface: agent provisioning, sessions, tasks, approvals, MCP, playbooks, and dream runs.
- OpenClaw-style in-project agents plus `session_key` are the primary runtime path.
- Remote tokens remain supported as credentials for off-project or external runtimes, but they are not the conceptual center of the deployed product.

For the architecture framing, read `docs/guides/agent-server-first.md` before changing deployment assumptions.

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
2. Trigger `.github/workflows/deploy.yml` manually when you actually want to roll out an image.
3. The deploy workflow uploads the production assets, writes `.env.production`, validates compose, pulls images, restarts the stack, and runs smoke checks.
4. The API container applies `alembic upgrade head` during startup through `apps/api/docker-entrypoint.sh`, so production schema changes still ship as explicit Alembic migrations even though the deploy workflow does not invoke Alembic directly.
5. The smoke script accepts either `APP_BASE_URL` or `PUBLIC_BASE_URL` as the public entrypoint override when operators need to match existing environment naming.

This repository currently keeps image publishing automated, but disables automatic production rollout. That reduces accidental deployments while operators are still validating environment parity and database credentials.

## Database Migrations

- Treat Alembic as the schema authority for the API database.
- Run `alembic upgrade head` from `apps/api` before starting the API in CI.
- In production compose deployments, the API container runs `alembic upgrade head` on startup before `uvicorn`.
- Do not rely on API startup to backfill legacy columns; schema changes must ship as migrations.

## Known Deployment Problems

- GitHub Actions deploy failures that stop at `Copy deployment assets to server` are usually SSH secret failures, not image or app failures. If the log shows `can't connect without a private SSH key or password`, verify `DEPLOY_SSH_KEY` first and then the rest of the deploy connection secrets plus the selected GitHub Environment.
- API startup failures that stop during `alembic upgrade head` with `password authentication failed for user "postgres"` usually mean database credential drift in the deployment environment. First check whether an explicit `DATABASE_URL` override still matches the intended database host and current `POSTGRES_*` values.
- For the default same-stack deployment paths, the safer posture is to leave `DATABASE_URL` unset and let Compose derive it from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

## DNS, TLS, and Metrics

- Point `PUBLIC_HOST` at the production server before the first deploy.
- Caddy terminates TLS automatically using `ACME_EMAIL`.
- Caddy is the public ingress for the production stack, but `/metrics` now requires an admin-or-owner management session in addition to staying on host-local or private-network paths so raw Prometheus data is not exposed on the public internet.
- The deploy smoke checks still verify `/metrics` through Caddy from the deployment host itself after authenticating with an admin management session.
- Do not publish Postgres or Redis directly.
- Keep the Caddy security headers in `ops/caddy/Caddyfile` enabled unless you have a replacement control upstream.
- Review `.github/workflows/security.yml` before each release window if recent image security scan failures occurred.
- If you customize `MANAGEMENT_SESSION_COOKIE_NAME`, set the same value for both the `api` and `web` services in `.env.production` so login, OpenAPI docs, and Next.js middleware stay aligned.

## Rollback

- Re-run the deploy workflow with a known-good `image_tag`.
- Confirm smoke checks and host-local `/metrics` recover before closing the incident.
