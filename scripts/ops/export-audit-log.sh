#!/usr/bin/env sh

set -eu

: "${AUDIT_EXPORT_DIR:=./exports/audit}"
: "${AUDIT_EXPORT_LIMIT:=100000}"
: "${AUDIT_EXPORT_PREVIOUS_HASH:=}"
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

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${AUDIT_EXPORT_DIR}"
chain_state_file="${AUDIT_EXPORT_DIR}/.chain-head"
if [ -z "${AUDIT_EXPORT_PREVIOUS_HASH}" ]; then
  if [ -f "${chain_state_file}" ]; then
    AUDIT_EXPORT_PREVIOUS_HASH="$(sed -n '1p' "${chain_state_file}")"
  else
    AUDIT_EXPORT_PREVIOUS_HASH="0000000000000000000000000000000000000000000000000000000000000000"
  fi
fi
export_file="${AUDIT_EXPORT_DIR}/audit-${timestamp}.jsonl"
temporary_file="${export_file}.tmp"

set -- python -m app.durability audit-export \
  --limit "${AUDIT_EXPORT_LIMIT}" \
  --previous-hash "${AUDIT_EXPORT_PREVIOUS_HASH}"
if [ -n "${AUDIT_EXPORT_SINCE:-}" ]; then
  set -- "$@" --since "${AUDIT_EXPORT_SINCE}"
fi

# Intentional word splitting: release_env_file_args is empty or two words.
docker compose --env-file "${COMPOSE_ENV_FILE}" ${release_env_file_args} \
  -f "${COMPOSE_FILE}" exec -T "${API_SERVICE}" "$@" > "${temporary_file}"
mv "${temporary_file}" "${export_file}"
sha256sum "${export_file}" > "${export_file}.sha256"
chmod 600 "${export_file}" "${export_file}.sha256"

if [ -s "${export_file}" ]; then
  chain_head="$(sed -n '$s/.*"digest": "\([0-9a-f][0-9a-f]*\)".*/\1/p' "${export_file}")"
  if [ "${#chain_head}" -ne 64 ]; then
    echo "Unable to determine the audit export chain head." >&2
    exit 1
  fi
  printf '%s\n' "${chain_head}" > "${chain_state_file}.tmp"
  mv "${chain_state_file}.tmp" "${chain_state_file}"
  chmod 600 "${chain_state_file}"
fi

echo "Integrity-chained audit export written to ${export_file}"
