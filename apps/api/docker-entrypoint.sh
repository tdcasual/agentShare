#!/usr/bin/env bash
set -euo pipefail

# VaultGate Docker entrypoint
# Runs Alembic migration unless disabled, then execs the CMD.

if [ "${RUN_DB_MIGRATIONS_ON_STARTUP:-true}" = "true" ]; then
    echo "[entrypoint] Running Alembic migration with the database migration lock..."
    python -c 'from app.db import migrate_db; migrate_db()' || {
        echo "[entrypoint] FATAL: Alembic migration failed. Exiting." >&2
        exit 1
    }
fi

echo "[entrypoint] Starting VaultGate API..."
exec "$@"
