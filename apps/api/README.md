# VaultGate API

FastAPI + async SQLAlchemy backend: encrypted Secret storage, administrator Sessions, `vgm_` management Tokens, and the Agent Token/grant model behind `/api/admin/*` and `/api/vault/*`.

Key disciplines:

- **Locked dependencies.** `requirements.lock` is generated with hashes and must be installed with `pip install --require-hashes`; see "Supply Chain Pinning" in `docs/guides/production-operations.md` for the regeneration command.
- **Migration discipline.** Every schema change ships as an Alembic migration under `alembic/versions/`, and a new migration must pass `alembic check` with zero drift against the ORM models.
- **Startup migrations.** `docker-entrypoint.sh` runs `alembic upgrade head` before uvicorn; on PostgreSQL the migration runs under an advisory lock, so multiple API replicas can start concurrently. Set `RUN_DB_MIGRATIONS_ON_STARTUP=false` only when an external pipeline owns schema changes.

Local development:

```bash
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
.venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```
