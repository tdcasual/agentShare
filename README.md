# Agent Control Plane

Human-and-agent control plane for secret-backed capabilities, lightweight tasks, and reusable playbooks.

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
