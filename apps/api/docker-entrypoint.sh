#!/usr/bin/env bash
set -euo pipefail

# VaultGate Docker entrypoint
# Runs Alembic migration unless disabled, then execs the CMD.

if [ "${RUN_DB_MIGRATIONS_ON_STARTUP:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
    echo "[entrypoint] Running Alembic migration..."
    alembic -c /srv/agentShare/apps/api/alembic.ini upgrade head || {
        echo "[entrypoint] FATAL: Alembic migration failed. Exiting." >&2
        exit 1
    }
fi

echo "[entrypoint] Starting VaultGate API..."
exec "$@"
