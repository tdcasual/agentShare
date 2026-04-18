# Deployment Manual

## Scope

This manual is the operator-facing deployment handbook for the current `v1` stack.

It covers:

- first-time deployment on Coolify
- first-time deployment with plain `docker compose`
- required environment values
- post-deploy smoke checks
- upgrade and rollback flow
- common troubleshooting steps

For the simplest public production path, use `docker-compose.coolify.yml`.

## Recommended Topology

For a self-hosted public production deployment, the recommended stack is:

- `web`
- `api`
- `postgres`
- `redis`
- `openbao`

This topology is intentionally simple:

- Coolify handles ingress and TLS
- application services stay in one compose stack
- OpenBao runs in persistent integrated-storage mode
- the API runs database migrations automatically on startup

## Required Inputs

Start from [ops/compose/coolify.env.example](/Users/lvxiaoer/Documents/codeWork/agentShare/ops/compose/coolify.env.example).

Replace these values before production use:

- `PUBLIC_HOST`
- `APP_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `POSTGRES_PASSWORD`
- `BOOTSTRAP_OWNER_KEY`
- `MANAGEMENT_SESSION_SECRET`

Usually you will also set at least one LLM provider key:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `GOOGLE_API_KEY`

Keep these defaults unless you know you need different wiring:

- `APP_ENV=production`
- `SECRET_BACKEND=openbao`
- `OPENBAO_ADDR=http://openbao:8200`
- `OPENBAO_TOKEN_FILE=/openbao/bootstrap/root-token`
- `OPENBAO_MOUNT=secret`
- `OPENBAO_PREFIX=agent-share`
- `REDIS_URL=redis://redis:6379/0`
- `API_BIND_HOST=127.0.0.1`
- `WEB_BIND_HOST=127.0.0.1`

Those bind-host defaults keep the raw `api` and `web` ports on loopback so Coolify can front them without also publishing them directly on the server's public interface. Only switch either bind host to `0.0.0.0` if you intentionally want direct host-port exposure.

## Preparation Checklist

Before the first deploy, confirm:

1. The target host can run Docker Compose workloads.
2. The public domain already points to the Coolify instance or deployment host.
3. You have generated strong production secrets for:
   - database password
   - bootstrap owner key
   - management session secret
4. You know whether the API needs a public domain in addition to the web domain.

Suggested secret generation commands:

```bash
openssl rand -hex 24
openssl rand -hex 32
```

## First-Time Deploy On Coolify

### 1. Create the application

In Coolify:

1. Create a new Docker Compose application.
2. Point it at this repository.
3. Set the compose file to `docker-compose.coolify.yml`.

### 2. Add environment variables

Paste the contents of `ops/compose/coolify.env.example` into the shared environment section, then replace the production values listed above.

Minimum real values:

- `PUBLIC_HOST`
- `APP_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `POSTGRES_PASSWORD`
- `BOOTSTRAP_OWNER_KEY`
- `MANAGEMENT_SESSION_SECRET`

### 3. Configure domains

Attach:

- the public app domain to the `web` service

Optional:

- a second public domain to the `api` service if you want direct external access to `/docs`, `/openapi.json`, or `/mcp`

If you do not expose the API publicly, the web app still talks to it through the internal compose network.

### 4. Deploy

Start the stack from Coolify.

Expected startup flow:

1. `postgres`, `redis`, and `openbao` start first
2. `openbao` initializes itself on the first boot
3. the API reads the generated root token from `/openbao/bootstrap/root-token`
4. the API runs `alembic upgrade head`
5. the web service starts after the API healthcheck passes

### 5. Bootstrap the owner account

After the stack is healthy:

1. open `APP_BASE_URL`
2. complete the first-owner bootstrap flow
3. store the owner credentials securely

## First-Time Deploy With Plain Docker Compose

Use this path when you want a direct single-host deployment without Coolify.

### 1. Prepare the env file

```bash
cp ops/compose/coolify.env.example .env.coolify
```

Edit `.env.coolify` and replace the real production values.

### 2. Start the stack

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up -d --build
```

### 3. Verify service state

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml ps
docker compose --env-file .env.coolify -f docker-compose.coolify.yml logs api --tail=100
docker compose --env-file .env.coolify -f docker-compose.coolify.yml logs web --tail=100
```

### 4. Open the application

Visit:

- `APP_BASE_URL`
- the `api` service's own public domain plus `/docs` if you attached a separate public domain directly to the API service

## Post-Deploy Smoke Checks

Run these checks after every first deploy and every upgrade.

### Public endpoints

```bash
curl -I "$APP_BASE_URL"
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` may still point at the web domain so browser traffic can use the `/api/*` proxy path; do not assume it is always the same thing as a direct public API domain
- if the API has its own direct public domain, run `curl "https://your-api-domain.example.com/healthz"`
- if the API is not public, run the API health check from inside the host or container network instead, for example:

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml exec api \
  python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"
```

- on Coolify, prefer the web domain as the primary user-facing health check

### Container health

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml ps
```

Confirm all services are `running` and health checks are passing.

### Functional checks

Confirm manually:

1. login page loads
2. owner bootstrap works on a fresh deployment
3. dashboard pages render
4. task listing loads
5. token listing loads

## Upgrade Procedure

For regular upgrades:

1. pull the latest repository version or update the tracked revision in Coolify
2. review any environment variable changes
3. redeploy the compose application
4. wait for the API migration step to complete
5. run the post-deploy smoke checks

The API container runs migrations automatically, so there is no separate migration job for this path.

## Rollback Procedure

If a new release must be rolled back:

1. redeploy the previously known-good Git revision or image version
2. keep the same production environment file unless the rollback specifically requires config rollback
3. confirm `api` returns healthy status
4. repeat the smoke checks

Because `postgres`, `redis`, and `openbao` data are persisted in volumes, a rollback normally means reverting application code, not deleting data volumes.

## Backup Expectations

This simple stack still needs backups outside the deployment itself.

Minimum expectations:

- back up Postgres regularly
- protect the OpenBao persisted volume or export strategy
- capture Redis according to your tolerance for cache/session loss
- store production env values securely outside the host

## Troubleshooting

Before chasing application code, check whether the failure is one of the known deployment-environment issues below. They have been more common than actual app regressions.

### API cannot start

Check:

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml logs api --tail=200
```

Common causes:

- invalid `DATABASE_URL`
- missing `POSTGRES_PASSWORD`
- invalid `BOOTSTRAP_OWNER_KEY`
- invalid `MANAGEMENT_SESSION_SECRET`
- OpenBao not healthy yet

### OpenBao issues

Check:

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml logs openbao --tail=200
```

Confirm:

- `openbao-data` volume exists
- `openbao-bootstrap` volume exists
- the root token file is available to the API container

### Web is up but data pages fail

Check:

- `AGENT_CONTROL_PLANE_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- API health status
- browser console/network errors

### Deployment starts but bootstrap/login fails

Check:

- `MANAGEMENT_SESSION_SECRET`
- `MANAGEMENT_SESSION_SECURE`
- public domain and HTTPS configuration in Coolify
- whether `APP_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` match the real public URL
- whether an explicit `DATABASE_URL` override still matches the intended database host and current `POSTGRES_*` values

If the API container fails during `alembic upgrade head` with `password authentication failed for user "postgres"`, the usual cause is environment drift: `POSTGRES_PASSWORD` was rotated or the database host changed while `DATABASE_URL` still points at stale credentials.

## Related Documents

- [Coolify Deployment](/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/coolify-deployment.md)
- [README](/Users/lvxiaoer/Documents/codeWork/agentShare/README.md)
