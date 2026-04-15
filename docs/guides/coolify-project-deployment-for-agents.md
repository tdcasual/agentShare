# Coolify Project Deployment For Agents

## Purpose

This guide is the shortest operator-safe runbook for an agent that needs to deploy this repository as one project on Coolify.

Use this guide when:

- the deployment target is Coolify
- the repository should run as one Docker Compose project
- the goal is a simple public production baseline
- the agent should avoid inventing extra infrastructure not already required by the repository

This guide assumes the recommended deployment path is `docker-compose.coolify.yml`.

If a human operator wants the broader manual, see [Deployment Manual](/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/deployment-manual.md).

## What The Agent Is Deploying

The Coolify project should include these services from `docker-compose.coolify.yml`:

- `web`
- `api`
- `postgres`
- `redis`
- `openbao`

Runtime behavior for this path:

- Coolify provides public ingress and TLS
- `openbao` runs inside the same project with persistent storage
- the API runs `alembic upgrade head` automatically on startup
- the web app talks to the API through the internal compose network
- browser traffic may still use the web app's `/api/*` proxy path

## Required Inputs

Before creating the Coolify project, the agent should collect or confirm:

- repository URL
- branch, tag, or commit to deploy
- strong values for:
  - `POSTGRES_PASSWORD`
  - `BOOTSTRAP_OWNER_KEY`
  - `MANAGEMENT_SESSION_SECRET`
- optional provider keys if the runtime needs them:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `DEEPSEEK_API_KEY`
  - `GOOGLE_API_KEY`

The environment template source is:

- [coolify.env.example](/Users/lvxiaoer/Documents/codeWork/agentShare/ops/compose/coolify.env.example)

## Project Creation Steps

In Coolify, create one Docker Compose project for this repository and use these exact decisions:

1. Choose a Docker Compose based application.
2. Point it at this repository.
3. Select `docker-compose.coolify.yml` as the compose file.
4. Use `ops/compose/coolify.env.example` as the starting environment template.
5. Replace at least these values before the first deploy:
   - `PUBLIC_HOST`
   - `APP_BASE_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `POSTGRES_PASSWORD`
   - `BOOTSTRAP_OWNER_KEY`
   - `MANAGEMENT_SESSION_SECRET`
6. Keep these defaults unless there is an explicit reason to change them:
   - `SECRET_BACKEND=openbao`
   - `OPENBAO_ADDR=http://openbao:8200`
   - `OPENBAO_TOKEN_FILE=/openbao/bootstrap/root-token`
   - `OPENBAO_MOUNT=secret`
   - `OPENBAO_PREFIX=agent-share`
   - `AGENT_CONTROL_PLANE_API_URL=http://api:8000`
   - `RUN_DB_MIGRATIONS_ON_STARTUP=true`

For the default same-stack Postgres path, leave `DATABASE_URL` unset unless you intentionally want the API to connect to a different database host. The compose file derives a matching URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

## Deploy Sequence

After the project is configured, the agent should deploy and verify in this order:

1. Start the Coolify deployment.
2. Wait for `postgres`, `redis`, and `openbao` to become healthy.
3. Confirm the API starts and finishes its migration step.
4. Confirm the `web` service becomes healthy after the API.
5. Open `APP_BASE_URL`.
6. Complete first-owner bootstrap if this is a fresh environment.

Expected startup facts:

- OpenBao initializes itself on first boot
- the API reads the root token from `/openbao/bootstrap/root-token`
- the API does not need a separate manual migration job on this path

## Post-Deploy Verification

The agent should verify these checks before calling the deployment successful:

1. The public home page responds:

```bash
curl -I "$APP_BASE_URL"
```

2. The API health endpoint responds:
   - if a direct public API origin already exists in the environment, check its `/healthz`
   - otherwise check from inside the Coolify host or container network

Example internal verification:

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml exec api \
  python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"
```

3. Manual smoke checks pass:
   - login page loads
   - owner bootstrap works on a new environment
   - dashboard renders
   - task listing loads
   - token listing loads

## Failure Triage

If deployment fails, the agent should inspect in this order:

1. `api` logs
2. `openbao` logs
3. service health status
4. runtime URL assumptions
5. environment values

Most common causes:

- invalid `DATABASE_URL`
- missing or weak `POSTGRES_PASSWORD`
- invalid `BOOTSTRAP_OWNER_KEY`
- invalid `MANAGEMENT_SESSION_SECRET`
- `MANAGEMENT_SESSION_SECURE` not aligned with HTTPS expectations
- OpenBao not healthy yet
- wrong assumption that `NEXT_PUBLIC_API_BASE_URL` must always be a separate direct API origin

## Handoff Output

After a successful deploy, the agent should return these facts to the human operator:

- deployed repository revision
- Coolify project name
- application entry URL
- direct API URL only if one already exists in the environment
- whether owner bootstrap is still pending or already completed
- any environment values that still require human completion outside the repository

## Source Of Truth

For this deployment path, the primary reference files are:

- [docker-compose.coolify.yml](/Users/lvxiaoer/Documents/codeWork/agentShare/docker-compose.coolify.yml)
- [coolify.env.example](/Users/lvxiaoer/Documents/codeWork/agentShare/ops/compose/coolify.env.example)
- [Coolify Deployment](/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/coolify-deployment.md)
- [Deployment Manual](/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/deployment-manual.md)
