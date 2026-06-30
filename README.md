# VaultGate

Simple key storage and token issuance service.

## Architecture

VaultGate is a minimal vault for storing secrets (accounts, passwords, API keys) and issuing scoped bearer tokens that agents use to retrieve authorized secrets at runtime.

```
FastAPI (Python) + PostgreSQL + Next.js
```

- **API** -- FastAPI backend at `apps/api/`
- **Web** -- Next.js management console at `apps/control-plane-v3/`
- **Database** -- PostgreSQL (SQLite for local dev)
- **Encryption** -- AES-256-GCM in application layer

## Core Features

- **Secret CRUD** -- Create, read, update, and delete secrets through the web UI or management API. Secrets are encrypted at rest with AES-256-GCM.
- **Token management with scopes** -- Issue bearer tokens with configurable scopes and TTL. Tokens grant runtime access to authorized secrets.
- **Vault runtime API** -- Agents authenticate with `Authorization: Bearer <token>` to retrieve secrets within their scope.
- **Audit logging** -- Every secret access and token operation is logged.

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Web | Next.js, React, Tailwind CSS |
| Database | PostgreSQL (production), SQLite (local dev) |
| Encryption | AES-256-GCM (ENCRYPTION_KEY) |
| Containerization | Docker, Docker Compose |

## Quick Start

```bash
cp .env.example .env
docker compose up -d --build
```

Then open:

- Web UI: `http://127.0.0.1:3000`
- API docs: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

Stop and remove containers:

```bash
docker compose down
```

Stop and remove containers plus database volumes:

```bash
docker compose down -v
```

## API Overview

VaultGate exposes six route groups:

| Group | Prefix | Description |
|-------|--------|-------------|
| Bootstrap | `/api/bootstrap` | Health check, initial owner setup |
| Authentication | `/api/session` | Login, logout, current user |
| Secrets | `/api/secrets` | Secret CRUD (web UI) |
| Tokens | `/api/tokens` | Token management with scopes |
| Vault | `/api/vault` | Runtime API (Bearer token auth) |
| Runtime | `/api/me` | Token verification |

All management routes require a session cookie. Runtime routes (`/api/vault`, `/api/me`) accept `Authorization: Bearer <token>`.

## Development

### Local development without Docker

1. Install dependencies:

```bash
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
cd apps/control-plane-v3 && npm install
```

2. Start the API (uses SQLite by default):

```bash
.venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

3. Start the web UI:

```bash
cd apps/control-plane-v3 && VAULTGATE_API_URL=http://127.0.0.1:8000 npm run dev
```

### Local development with Docker services

Start only the dependency services and run the API locally:

```bash
docker compose up -d postgres
```

Then set the database URL and run the API:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vaultgate .venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

### Run tests

```bash
.venv/bin/pytest apps/api/tests -q
cd apps/control-plane-v3 && npm run build
```

### Production deployment

For production, use `docker-compose.prod.yml` with a properly configured `.env.production`:

```bash
cp ops/compose/prod.env.example .env.production
# edit .env.production with strong keys and production URLs
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Generate production keys:

```bash
# ENCRYPTION_KEY (AES-256, base64-encoded 32 bytes)
python -c 'import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'

# SESSION_SECRET
python -c 'import secrets; print(secrets.token_urlsafe(32))'
```
