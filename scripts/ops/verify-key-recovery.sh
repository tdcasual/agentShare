#!/usr/bin/env sh

set -eu

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${API_SERVICE:=api}"

# The release env file pins image digests during deploys. It is optional for
# local/ops invocations: only pass it to docker compose when it exists.
release_env_file_args=""
if [ -f "${COMPOSE_RELEASE_ENV_FILE}" ]; then
  release_env_file_args="--env-file ${COMPOSE_RELEASE_ENV_FILE}"
fi

# Intentional word splitting: release_env_file_args is empty or two words.
docker compose --env-file "${COMPOSE_ENV_FILE}" ${release_env_file_args} \
  -f "${COMPOSE_FILE}" exec -T "${API_SERVICE}" \
  python -m app.durability keyring-audit
