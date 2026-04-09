#!/bin/sh
set -eu

if [ "${RUN_DB_MIGRATIONS_ON_STARTUP:-true}" = "true" ]; then
  cd /srv/agentShare/apps/api
  alembic upgrade head
  cd /srv/agentShare
fi

exec "$@"
