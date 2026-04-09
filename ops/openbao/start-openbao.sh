#!/bin/sh
set -eu

BOOTSTRAP_DIR="${OPENBAO_BOOTSTRAP_DIR:-/openbao/bootstrap}"
DATA_DIR="${OPENBAO_DATA_DIR:-/openbao/data}"
CONFIG_FILE="${OPENBAO_CONFIG_FILE:-/openbao/config/openbao.hcl}"
INIT_FILE="${OPENBAO_INIT_FILE:-$BOOTSTRAP_DIR/init.json}"
TOKEN_FILE="${OPENBAO_TOKEN_FILE_PATH:-$BOOTSTRAP_DIR/root-token}"
SEAL_KEY_FILE="${OPENBAO_STATIC_SEAL_KEY_FILE:-$BOOTSTRAP_DIR/static-seal.key}"
LOCAL_ADDR="${OPENBAO_LOCAL_ADDR:-http://127.0.0.1:8200}"

mkdir -p "$BOOTSTRAP_DIR" "$DATA_DIR"

if [ ! -f "$SEAL_KEY_FILE" ]; then
  umask 077
  dd if=/dev/urandom of="$SEAL_KEY_FILE" bs=32 count=1 >/dev/null 2>&1
fi

openbao server -config="$CONFIG_FILE" &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}

trap cleanup INT TERM

attempt=0
while [ "$attempt" -lt 60 ]; do
  if wget -q -O /tmp/openbao-init.json "$LOCAL_ADDR/v1/sys/init"; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if ! [ -f /tmp/openbao-init.json ]; then
  echo "OpenBao did not become reachable in time" >&2
  exit 1
fi

if grep -q '"initialized"[[:space:]]*:[[:space:]]*false' /tmp/openbao-init.json; then
  umask 077
  openbao operator init -format=json -key-shares=1 -key-threshold=1 >"$INIT_FILE"
fi

if [ -f "$INIT_FILE" ] && [ ! -f "$TOKEN_FILE" ]; then
  umask 077
  tr -d '\n' <"$INIT_FILE" | sed -n 's/.*"root_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' >"$TOKEN_FILE"
fi

wait "$server_pid"
