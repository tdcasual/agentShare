# Agent Control Plane

Agent server for governed task execution, capability access, playbook search, review workflow, MCP, and OpenClaw-style runtime sessions.

## Architecture Position

This project should be read as **agent server first**.

- The primary runtime path is an in-project OpenClaw-style agent with one or more `session_key` credentials.
- Remote tokens still exist, but they are remote-access credentials for external runtimes, not the conceptual center of the product.
- Management, review, approvals, runs, dream mode, and MCP all belong to the server surface.

For the architecture framing, see `docs/guides/agent-server-first.md`.

## Docker And Deployment

This repository now ships two first-class container images:

- `ghcr.io/<owner>/agentshare-api`
- `ghcr.io/<owner>/agentshare-web`

They are built by GitHub Actions from:

- `apps/api/Dockerfile`
- `apps/control-plane-v3/Dockerfile`

### GitHub Actions image publishing

- Workflow: `.github/workflows/docker-images.yml`
- Pull requests: build validation only, no push
- Pushes to `main`: build and push tagged images to `ghcr.io`
- Git tags like `v1.2.3`: publish matching version tags
- Default branch pushes also publish `latest`

### Complete Docker Compose stack

The root `docker-compose.yml` runs the full stack:

- `web`
- `api`
- `postgres`
- `redis`
- `openbao`

Start everything locally:

```bash
cp .env.example .env
docker compose up -d --build
```

Then open:

- Web: `http://127.0.0.1:3000`
- API docs: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`

Stop and remove containers:

```bash
docker compose down
```

Stop and remove containers plus database/cache volumes:

```bash
docker compose down -v
```

### Compose environment variables

Important variables are exposed through `.env.example`:

- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_BACKEND`
- `OPENBAO_ADDR`
- `OPENBAO_TOKEN`
- `BOOTSTRAP_OWNER_KEY`
- `MANAGEMENT_SESSION_SECRET`
- `AGENT_CONTROL_PLANE_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`

For local compose defaults, `web` talks to `api` over the internal Compose network using `http://api:8000`.

The root `docker-compose.yml` is a local-development stack and always builds the `api` and `web` images from the checked-out repository.

### Using prebuilt GHCR images with production Compose

If you want Compose to run published GHCR images instead of building locally, use `docker-compose.prod.yml` and set `API_IMAGE` plus `WEB_IMAGE` in `.env.production` or `ops/compose/prod.env.example`:

```bash
cp ops/compose/prod.env.example .env.production
# edit .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Use a SHA or release tag instead of `latest` for repeatable production deployments.

### Coolify/self-host deployment

If this repository is being deployed as a public production stack on Coolify, use `docker-compose.coolify.yml` instead of the stricter production baseline.

That path is intentionally simpler:

- Coolify handles ingress and TLS
- `openbao`, `postgres`, `redis`, `api`, and `web` stay in one stack
- `openbao` now uses a persistent bootstrap flow instead of disposable dev mode
- the API container runs `alembic upgrade head` automatically on startup
- only the truly sensitive production values need to be supplied explicitly

For a public production deployment:

```bash
cp ops/compose/coolify.env.example .env.coolify
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up -d --build
```

Use this route when deployment simplicity matters more than the stricter repository-owned production boundary. Keep `docker-compose.prod.yml` for the hardened single-host baseline with Caddy and an external secret backend.

`ops/compose/coolify.env.example` includes the minimum production values you should replace plus optional LLM passthrough variables such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `DEEPSEEK_API_KEY`. Those env vars are useful for agent runtimes that expect provider keys in the container environment, but the repository's managed secret inventory still exists separately for governed capability access.

For the full step-by-step operator runbook, see `docs/guides/deployment-manual.md`.

### Server deployment with GitHub Actions

This repository now includes `.github/workflows/deploy.yml` for single-host deployments over SSH.

Deployment triggers:

- `workflow_run`: automatically deploys `latest` after the `Docker Images` workflow succeeds on `main`
- `workflow_dispatch`: lets you redeploy or pin any explicit image tag, including a release tag or SHA tag

The workflow uploads:

- `docker-compose.prod.yml`
- `.env.production.example`
- `ops/compose/prod.env.example`
- a generated `.release.env` file containing `API_IMAGE` and `WEB_IMAGE`
- `ops/caddy/Caddyfile`
- `scripts/ops/smoke-test.sh`

Then the remote host runs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
APP_BASE_URL=https://agentshare.example.com PUBLIC_HOST=agentshare.example.com ./scripts/ops/smoke-test.sh
```

`scripts/ops/smoke-test.sh` accepts either `APP_BASE_URL` or `PUBLIC_BASE_URL` for the public entrypoint, so teams can keep the smoke configuration aligned with their deployment env naming.

### Required GitHub secrets

Configure these repository or environment secrets before enabling the deploy workflow:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `DEPLOY_ENV_FILE`

`DEPLOY_ENV_FILE` should contain the full contents of the production `.env.production` file. The deploy workflow refreshes `.env.production` on every deployment so secret rotation, host changes, and other runtime config updates are actually applied.

### Server prerequisites

The target host should already have:

- Docker Engine
- Docker Compose v2 plugin
- an SSH account that can manage the deployment directory and run Docker commands
- network access to `ghcr.io`

Use `.env.production.example` as the starting point for the server environment file. Production expects an external secret backend instead of the in-repo OpenBao dev container, so configure `SECRET_BACKEND_URL` and `SECRET_BACKEND_TOKEN` for a separately managed KV v2 compatible service. The production stack exposes only Caddy publicly and keeps Postgres and Redis private to the compose network.

For the maintained production baseline, prefer `ops/compose/prod.env.example` and keep `.env.production` on the host aligned with it.

### Production topology

`docker-compose.prod.yml` is now a self-contained production stack:

- `caddy` terminates HTTP/TLS and routes traffic
- `web` serves the Next.js UI internally
- `api` serves the FastAPI control plane internally
- `postgres` and `redis` stay private on the data network

The Caddy config lives at `ops/caddy/Caddyfile` and routes `/api`, `/docs`, `/openapi.json`, `/healthz`, and `/mcp` to the API while sending all other traffic to the web app.

### Rollback guidance

For rollback, re-run `workflow_dispatch` and set `image_tag` to a known-good release tag like `v1.0.0` or a published SHA tag such as `sha-abcdef1`. That keeps the deployment reproducible without rebuilding images on the server.

### Smoke, backup, and restore expectations

The deploy workflow now runs smoke checks through Caddy after every restart. That verifies the root page and `/healthz` are reachable through the public entrypoint before the deployment is considered healthy.

This repository now ships baseline backup and restore helpers plus an operations runbook:

- `scripts/ops/backup-postgres.sh`
- `scripts/ops/restore-postgres.sh`
- `scripts/ops/backup-redis.sh`
- `docs/guides/production-operations.md`
- `docs/guides/production-security.md`
- `docs/guides/platform-roadmap.md`
- `docs/guides/platform-handoff-checklist.md`
- `docs/guides/platform-ownership-matrix.md`

Production still needs you to schedule and store these artifacts safely:

- Postgres needs scheduled logical backups plus periodic restore drills
- Redis persistence should be snapshotted or otherwise captured according to your RPO
- the external secret backend must have its own backup and restore policy outside this repository

### Security scan and headers

The repository now includes `.github/workflows/security.yml` to run Trivy image security scans against the published GHCR images on a schedule or by manual trigger.

The public ingress in `ops/caddy/Caddyfile` also applies baseline security headers for HSTS, framing protection, MIME sniffing protection, and referrer policy. For deeper operator guidance, see `docs/guides/production-security.md`.

### Current single-host limitation

`docker-compose.prod.yml` is a pragmatic single-host baseline, not a clustered platform. It is suitable for a controlled long-term deployment baseline, but it still needs follow-up work for richer observability, stricter production policy validation, and eventually more automated off-host backup scheduling.

That baseline is `trial-run ready` when the repository-owned runbooks and checks are in place. It is not `enterprise-ready` until the platform-owned handoff work is complete.

For the remaining P3 platformization work, use:

- `docs/guides/platform-roadmap.md`
- `docs/guides/platform-handoff-checklist.md`
- `docs/guides/platform-ownership-matrix.md`

Those documents define the migration checklist for high-availability, managed data services, SSO, centralized alerting, incident escalation, and the ownership boundary outside this repository.

## Local Development Runtime

The quickest way to prepare a fresh local checkout is:

```bash
./scripts/ops/bootstrap-dev-runtime.sh
```

That script:

- creates or refreshes the root `.venv`;
- installs the editable API dev dependencies into `.venv`;
- runs `npm ci` in `apps/control-plane-v3`;
- runs `alembic upgrade head` against the default local SQLite database;
- backs up the default local SQLite dev database and rebuilds it if the file still points at a removed pre-baseline Alembic revision chain;
- installs the Chromium browser used by Playwright when the local binary is available.

If you keep Python somewhere else, you can override the interpreter:

```bash
PYTHON_BIN=python3.12 ./scripts/ops/bootstrap-dev-runtime.sh
```

If you want the bootstrap script to prepare a different local database path, override `DEV_DATABASE_URL`:

```bash
DEV_DATABASE_URL=sqlite:///./.tmp/dev-agent-share.db ./scripts/ops/bootstrap-dev-runtime.sh
```

After the bootstrap completes, run the unified verification entrypoint:

```bash
./scripts/ops/verify-control-plane.sh
```

Playwright will look for `.venv/bin/uvicorn` by default. If you need to use a different binary, set:

```bash
export AGENT_SHARE_API_UVICORN_BIN=/absolute/path/to/uvicorn
```

## OpenClaw Native Agent Runtime

The primary runtime path is now OpenClaw-native:

- management operators provision agent workspaces through `/api/openclaw/agents`
- runtime execution binds to `/api/openclaw/agents/{agent_id}/sessions`
- agent requests authenticate with `Authorization: Bearer <session_key>`
- the management console inspects workspace files, session history, sandbox mode, and tool policy instead of linked managed tokens
- bounded autonomous continuation is available through Dream Mode runs and explicit memory notes

For the end-to-end local workflow, use [docs/guides/agent-quickstart.md](docs/guides/agent-quickstart.md).
For bounded autonomy setup and operator guidance, use [docs/guides/dream-mode-quickstart.md](docs/guides/dream-mode-quickstart.md).

### One-Command Demo Stack

To run the current backend plus `control-plane-v3` with persisted demo data in one command:

```bash
./scripts/ops/start-control-plane-demo.sh
```

This script:

- migrates a dedicated local demo database;
- enables `DEMO_SEED_ENABLED=true` for the API so inbox, marketplace, reviews, and search start with real local fixture records;
- starts the API on `http://127.0.0.1:8000`;
- starts `apps/control-plane-v3` on `http://127.0.0.1:3000`;
- prints the demo owner login:
  - `owner@example.com`
  - `correct horse battery staple`

If you want to inspect the exact commands and environment first:

```bash
./scripts/ops/start-control-plane-demo.sh --print-config
```

## Quality Floor

The repo's clean repo state is defined by one documented verification entrypoint:

```bash
./scripts/ops/verify-control-plane.sh
```

That script runs these checks in order:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run lint
cd apps/control-plane-v3 && npm run test:contracts
cd apps/control-plane-v3 && npm run test:unit
cd apps/control-plane-v3 && npm run build
```

If one of these fails, treat the branch as below the quality floor until the failure is explained or fixed.

When the backend intake catalog changes, refresh the frontend fallback snapshot before committing:

```bash
cd apps/control-plane-v3 && npm run sync:contracts
cd apps/control-plane-v3 && npm run test:contracts
```

`npm run sync:contracts` rewrites `apps/control-plane-v3/src/lib/forms/generated/intake-catalog.json` from the backend source of truth. `npm run test:contracts` then verifies the committed snapshot still matches the backend catalog.

## Agent Quickstart

Start with the operational guide:

- `docs/guides/agent-quickstart.md`
- `docs/guides/admin-bootstrap-and-token-ops.md`
- `docs/guides/dream-mode-quickstart.md`
- `docs/guides/mcp-quickstart.md`

The quickstarts cover first-run management bootstrap, external remote-access token operations, OpenClaw runtime session flows, direct HTTP runtime calls, bounded Dream Mode runs, and the MCP tool surface on top of the same control-plane services.

## Phase 2 Surface

- Search playbooks by `task_type`, free-text `q`, and `tag`, then open a full detail view in the console.
- Attach `playbook_ids` to tasks so operators can publish work together with reusable execution guidance.
- Enforce approval policy with explicit allow/manual/deny rules over action type, risk, provider, environment, and optional task type.
- Choose among three adapter paths:
  - `openai` for chat completions
  - `github` for repository-scoped REST calls
  - `generic_http` for other JSON APIs
- Use the MCP endpoint at `POST /mcp` to expose `list_tasks`, `claim_task`, `complete_task`, `search_playbooks`, `invoke_capability`, `request_capability_lease`, and Dream Mode tools such as `dream.runs.start` and `dream.tasks.propose_followup`.

## Runtime Safety Notes

- Proxy invoke now fails closed when an adapter cannot reach its upstream or is misconfigured. The API returns a `502` instead of synthesizing a fake success payload.
- Successful proxy invoke responses now keep the adapter contract explicit with:
  - `adapter_type`
  - `upstream_status`
  - `result`
- Lease responses are currently explicit metadata placeholders. They record policy-approved lease context, but do not include raw secret text or a derived session artifact yet.
- Manual approval gates stop invoke and lease before secret resolution. The gateway creates a pending approval request and returns `409` with `detail.code="approval_required"` until an operator approves the action.

## Approval Policy

- Tasks and capabilities both support `approval_mode`.
- Tasks and capabilities also support explicit `approval_rules`.
- Rule precedence is deterministic:
  - `deny`
  - `manual`
  - `allow`
  - fallback to `approval_mode`
- `approval_mode="auto"` means the runtime action can proceed as soon as the normal task, capability, and ownership checks pass.
- `approval_mode="manual"` means invoke and lease must pause for operator approval. If either the task or the capability is manual, the runtime route returns `409 approval_required` with an `approval_request_id`.
- Operators can review pending requests in the web console at `/approvals` or through the management API under `/api/approvals`.
- Approval decisions are temporary. Agents should retry the same runtime action only after approval, and should expect approval to be required again after the decision expires or the task is completed.

## API Discovery And Console Auth

- Machine-readable sources of truth:
  - Swagger UI: `http://127.0.0.1:8000/docs`
  - OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Current web console auth path:
  - Check `GET /api/bootstrap/status`.
  - If the system is uninitialized, create the founding owner once at `POST /api/bootstrap/setup-owner` using the bootstrap key.
  - After bootstrap, humans log in with persisted email/password accounts at `POST /api/session/login`.
  - The API responds with a short-lived `management_session` cookie, and the console forwards that cookie on management reads and writes.
  - In-project OpenClaw runtimes authenticate with `Authorization: Bearer $ACP_SESSION_KEY`.
  - External or off-project agents continue to authenticate with managed remote-access tokens such as `Authorization: Bearer $ACP_AGENT_TOKEN`.
- Production caution:
  - Do not deploy with `BOOTSTRAP_OWNER_KEY=changeme-bootstrap-key`.
  - Replace `MANAGEMENT_SESSION_SECRET=changeme-management-session-secret` before exposing the console to real users.
- Operator note:
  - Bootstrap is a one-time setup path, not a reusable daily login.
  - New human accounts are invite-only through `POST /api/admin-accounts`.
  - In-project OpenClaw runtimes are managed under `/api/openclaw/agents`, `/api/openclaw/agents/{agent_id}/sessions`, and `/api/openclaw/sessions`.
  - External remote agents and their managed access tokens are operated separately under `/api/agents` and `/api/agents/{agent_id}/tokens`.

## Route Policy Split

- Public routes:
  - `GET /healthz`
  - `/docs` and `/openapi.json`
  - `GET /api/bootstrap/status`
  - `POST /api/bootstrap/setup-owner`
  - `POST /api/session/login`
- Agent-authenticated runtime routes:
  - These routes accept `Authorization: Bearer <session_key>` for in-project OpenClaw runtimes and `Authorization: Bearer <token>` for external remote agents.
  - `GET /api/agents/me`
  - `GET /api/tasks`
  - `GET /api/tasks/assigned`
  - `POST /api/tasks/{task_id}/claim`
  - `POST /api/tasks/{task_id}/complete`
  - `POST /api/task-targets/{target_id}/claim`
  - `POST /api/task-targets/{target_id}/complete`
  - `POST /api/capabilities/{capability_id}/invoke`
  - `POST /api/capabilities/{capability_id}/lease`
  - `POST /mcp`
- Management-session protected routes:
  - Any management role:
    `GET /api/session/me`, `POST /api/session/logout`, `GET /api/capabilities`, `POST /api/tasks`, `GET /api/runs`, `POST /api/playbooks`, `GET /api/playbooks/search`, `GET /api/playbooks/{playbook_id}`, `GET /api/agent-tokens/{token_id}/feedback`
  - `operator+`:
    `GET /api/approvals`, `POST /api/approvals/{approval_id}/approve`, `POST /api/approvals/{approval_id}/reject`
  - `admin+`:
    `POST /api/secrets`, `GET /api/secrets`, `POST /api/capabilities`, `GET /api/agents`, `POST /api/agents`, `GET /api/agents/{agent_id}/tokens`, `POST /api/agents/{agent_id}/tokens`, `POST /api/agent-tokens/{token_id}/revoke`, `GET /api/openclaw/agents`, `POST /api/openclaw/agents`, `GET /api/openclaw/agents/{agent_id}`, `PATCH /api/openclaw/agents/{agent_id}`, `GET /api/openclaw/agents/{agent_id}/sessions`, `POST /api/openclaw/agents/{agent_id}/sessions`, `GET /api/openclaw/agents/{agent_id}/files`, `PUT /api/openclaw/agents/{agent_id}/files/{file_name}`, `GET /api/openclaw/sessions`, `GET /api/openclaw/sessions/{session_id}`, `GET /api/admin-accounts`, `POST /api/admin-accounts`, `GET /api/reviews`, `POST /api/reviews/{resource_kind}/{resource_id}/approve`, `POST /api/reviews/{resource_kind}/{resource_id}/reject`, `POST /api/task-targets/{task_target_id}/feedback`
  - `owner`:
    `DELETE /api/agents/{agent_id}`, `DELETE /api/openclaw/agents/{agent_id}`

## Bootstrap, Tokens, And Reviews

- Owner bootstrap is now one-time only and returns `409` after initialization.
- Human management login uses persisted admin accounts, not the bootstrap credential.
- OpenClaw runtime sessions are separate in-project credentials and authenticate with `session_key`.
- Managed agent tokens are separate external remote-access credentials and can be listed, minted, revoked, targeted by tasks, and scored with feedback.
- Agent-created secrets, capabilities, playbooks, and tasks stay in `pending_review` until a human reviews them in `/api/reviews`.
- Remote-access task runs record both `token_id` and `task_target_id`, and token feedback rolls up into token trust metrics.

## Playbook Search And Detail

- Management users can filter playbooks with:
  - `task_type`
  - `q` (free-text over title and body)
  - `tag`
- `GET /api/playbooks/search` now returns:
  - `items`: matched playbook records
  - `meta.total`: total matched records
  - `meta.items_count`: item count returned in this payload
  - `meta.applied_filters`: normalized filters used by the query
- The console includes:
  - list/search view at `/playbooks`
  - detail view at `/playbooks/{playbook_id}`
- Tasks can now reference one or more `playbook_ids` so operators can publish work together with reusable execution guidance.
- Agents can search the same knowledge surface through the MCP `search_playbooks` tool without needing a second business-logic path.

## Adapter Choices

- `openai`
  - Use for chat completions against the OpenAI-compatible `/chat/completions` flow.
- `github`
  - Use for GitHub REST API calls backed by a GitHub token.
  - Typical `adapter_config`:
    - `{"method":"GET","path":"/repos/{owner}/{repo}/issues"}`
- `generic_http`
  - Use for any remaining JSON API where a first-class adapter does not exist yet.
  - Typical `adapter_config`:
    - `{"url":"https://api.example.com/v1/run","method":"POST"}`

## Quick Start

1. Copy `.env.example` into `.env`.
2. Start the full stack with Docker Compose:

```bash
docker compose up -d --build
```

3. Or, if you only want dependency services for local host-based development:

```bash
docker compose up -d openbao postgres redis
```

4. Install the API and web dependencies:

```bash
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
cd apps/control-plane-v3 && npm install
```

5. Start the API and web apps:

```bash
SECRET_BACKEND=openbao OPENBAO_ADDR=http://127.0.0.1:8200 OPENBAO_TOKEN=root .venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
cd apps/control-plane-v3 && AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:8000 npm run dev
```

For lightweight local development without OpenBao, you can run the API with the default in-memory secret backend:

```bash
.venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

6. Run verification locally:

```bash
.venv/bin/pytest apps/api/tests -q
cd apps/control-plane-v3 && npm run build
```

## Secret Backend Modes

The API now supports two secret backend modes:

- `SECRET_BACKEND=openbao`
  This is the intended production direction. It requires both `OPENBAO_ADDR` and `OPENBAO_TOKEN`; if either is missing, the API now fails with an explicit configuration error instead of silently changing backends.
- `SECRET_BACKEND=memory`
  This is the default local mode for tests and lightweight development.

## Local OpenBao Dev Server

`docker-compose.yml` includes an OpenBao dev service based on the official `docker.io/openbao/openbao` image.

Start the local dependencies:

```bash
docker compose up -d openbao postgres redis
```

Use these environment variables for the API when you want real OpenBao-backed secrets:

```bash
export SECRET_BACKEND=openbao
export OPENBAO_ADDR=http://127.0.0.1:8200
export OPENBAO_TOKEN=root
export OPENBAO_MOUNT=secret
export OPENBAO_PREFIX=agent-share
```

Then run the API tests or local server from the repository root:

```bash
.venv/bin/pytest apps/api/tests -q
.venv/bin/uvicorn app.main:app --app-dir apps/api
```

## Current OpenBao Integration Scope

The current adapter writes and reads a single value field through KV v2 paths of the form:

- write: `/v1/<mount>/data/<prefix>/<secret-id>`
- read: `/v1/<mount>/data/<prefix>/<secret-id>`

The gateway resolves the runtime backend from `backend_ref`, so secrets created under different backends do not all have to use the same adapter at read time.
