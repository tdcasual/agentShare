# Agent Control Plane

Human-and-agent control plane for secret-backed capabilities, lightweight tasks, and reusable playbooks.

## Agent Quickstart

Start with the operational guide:

- `docs/guides/agent-quickstart.md`

The quickstart is the shortest path from agent key to completed task and includes proxy invoke plus lease examples.

## Runtime Safety Notes

- Proxy invoke now fails closed when an adapter cannot reach its upstream or is misconfigured. The API returns a `502` instead of synthesizing a fake success payload.
- Lease responses are currently explicit metadata placeholders. They record policy-approved lease context, but do not include raw secret text or a derived session artifact yet.

## API Discovery And Console Auth

- Machine-readable sources of truth:
  - Swagger UI: `http://127.0.0.1:8000/docs`
  - OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Current web console auth path:
  - The web console exchanges the bootstrap management credential once at `POST /api/session/login`.
  - The API responds with a short-lived `management_session` cookie, and the console forwards that cookie on management reads and writes.
  - Runtime agent operations continue to use `Authorization: Bearer $ACP_AGENT_KEY`.
- Production caution:
  - Do not deploy with `BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key`.
  - Replace `MANAGEMENT_SESSION_SECRET=changeme-management-session-secret` before exposing the console to real users.

## Route Policy Split

- Public routes:
  - `GET /healthz`
  - `/docs` and `/openapi.json`
  - `POST /api/session/login`
- Agent-authenticated runtime routes:
  - `GET /api/agents/me`
  - `GET /api/tasks`
  - `POST /api/tasks/{task_id}/claim`
  - `POST /api/tasks/{task_id}/complete`
  - `POST /api/capabilities/{capability_id}/invoke`
  - `POST /api/capabilities/{capability_id}/lease`
- Management-session protected routes:
  - `GET /api/session/me`
  - `POST /api/session/logout`
  - `POST /api/secrets`, `GET /api/secrets`
  - `POST /api/capabilities`, `GET /api/capabilities`
  - `POST /api/tasks`
  - `GET /api/agents`, `POST /api/agents`, `DELETE /api/agents/{agent_id}`
  - `GET /api/runs`
  - `POST /api/playbooks`, `GET /api/playbooks/search`

## Quick Start

1. Copy `.env.example` into your local shell environment or preferred env file.
2. Start the local dependencies:

```bash
docker compose up -d openbao postgres redis
```

3. Install the API and web dependencies:

```bash
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
cd apps/web && npm install
```

4. Start the API and web apps:

```bash
SECRET_BACKEND=openbao OPENBAO_ADDR=http://127.0.0.1:8200 OPENBAO_TOKEN=root .venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
cd apps/web && AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:8000 npm run dev
```

5. Run verification locally:

```bash
.venv/bin/pytest apps/api/tests -q
cd apps/web && npm run build && npx playwright test
```

## Secret Backend Modes

The API now supports two secret backend modes:

- `SECRET_BACKEND=openbao`
  This is the intended production direction. When `OPENBAO_ADDR` and `OPENBAO_TOKEN` are set, secrets are written to OpenBao through the KV v2 API.
- `SECRET_BACKEND=memory`
  This is the local fallback mode for tests and lightweight development.

If `SECRET_BACKEND` is left as `openbao` but the OpenBao address or token is missing, the app safely falls back to the in-memory backend instead of failing during local development.

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
