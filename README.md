# VaultGate

VaultGate is a small self-hosted credential gateway for one administrator and multiple Agents.

The administrator stores encrypted Secrets, creates Agents, issues one or more `vg_` Tokens for each Agent, and explicitly selects which Secrets every Token may read. Tags are UI metadata only and never grant access dynamically.

## Architecture

- FastAPI and async SQLAlchemy backend: `apps/api/`
- Next.js management console: `apps/control-plane-v3/`
- PostgreSQL in production; SQLite for local development
- AES-256-GCM encrypted Secret values with versioned payloads
- Server-side, revocable administrator Sessions
- Separate `vgm_` management Tokens for administrator automation

## API

Management endpoints use `/api/admin/*` and accept either the browser Session cookie or `Authorization: Bearer vgm_...`.

Important groups:

| Purpose | Endpoint |
|---|---|
| First-time setup | `/api/admin/bootstrap/*` |
| Administrator Session | `/api/admin/session/*` |
| Management Tokens | `/api/admin/management-tokens` |
| Secrets | `/api/admin/secrets` |
| Agents | `/api/admin/agents` |
| Agent Tokens and grants | `/api/admin/tokens/*` |
| Audit | `/api/admin/audit-logs`, `/api/admin/audit-stats` |

Agent runtime endpoints use `/api/vault/*` and accept only `vg_` Tokens:

- `GET /api/vault/me`
- `GET /api/vault/secrets`
- `GET /api/vault/secrets/{id}`
- `GET /api/vault/secrets/{id}/value`

`vg_` and `vgm_` credentials are rejected outside their respective API boundary.

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

- Web UI: `http://127.0.0.1:3000`
- API documentation: `http://127.0.0.1:8000/docs`
- Readiness: `http://127.0.0.1:8000/readyz`

The first browser visit redirects to setup. Create the administrator, then create Secrets and Agents through the UI.

## Development

```bash
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
cd apps/control-plane-v3 && npm install
```

Run the API:

```bash
.venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

Run the web application:

```bash
cd apps/control-plane-v3
VAULTGATE_API_URL=http://127.0.0.1:8000 npm run dev
```

The browser always calls the same-origin `/api` proxy; there is no public client-side API base URL.

## Verification

```bash
./scripts/ops/verify-control-plane.sh
```

This runs backend static analysis/tests, operations contract tests, frontend checks/tests, and the production build.

## Production

```bash
cp ops/compose/prod.env.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Generate the encryption key:

```bash
python3 -c 'import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'
```

Before upgrading an existing deployment, back up PostgreSQL. Container startup runs `alembic upgrade head`; the migration preserves current users, Secrets, Tokens, grants, and audit records while introducing Agents and server-side administrator authentication.

See:

- `docs/guides/deployment-manual.md`
- `docs/guides/production-security.md`
- `docs/guides/production-operations.md`
- `docs/guides/agent-quickstart.md`
