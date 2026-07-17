#!/usr/bin/env sh

set -eu

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${COMPOSE_ENV_FILE:=.env.production}"
: "${COMPOSE_RELEASE_ENV_FILE:=.release.env}"
: "${POSTGRES_SERVICE:=postgres}"
: "${POSTGRES_MAX_DISK_PERCENT:=80}"
: "${POSTGRES_MAX_INODE_PERCENT:=80}"
: "${REQUIRE_POSTGRES_REPLICA:=false}"

compose() {
  docker compose --env-file "${COMPOSE_ENV_FILE}" --env-file "${COMPOSE_RELEASE_ENV_FILE}" \
    -f "${COMPOSE_FILE}" "$@"
}

settings="$(compose exec -T "${POSTGRES_SERVICE}" psql -v ON_ERROR_STOP=1 -AtF '|' \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT current_setting('fsync'), current_setting('synchronous_commit'), current_setting('full_page_writes'), current_setting('archive_mode'), current_setting('data_checksums')")"

if [ "${settings}" != "on|on|on|on|on" ]; then
  echo "PostgreSQL durability settings are unsafe: ${settings}" >&2
  exit 1
fi

replica_count="$(compose exec -T "${POSTGRES_SERVICE}" psql -v ON_ERROR_STOP=1 -At \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT COUNT(*) FROM pg_stat_replication")"
if [ "${REQUIRE_POSTGRES_REPLICA}" = "true" ] && [ "${replica_count}" -lt 1 ]; then
  echo "A PostgreSQL replica is required but pg_stat_replication is empty." >&2
  exit 1
fi

wal_file="$(compose exec -T "${POSTGRES_SERVICE}" psql -v ON_ERROR_STOP=1 -At \
  --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-vaultgate}" \
  -c "SELECT pg_walfile_name(pg_switch_wal())")"

attempt=1
while [ "${attempt}" -le 20 ]; do
  if compose exec -T "${POSTGRES_SERVICE}" test -f "/var/lib/postgresql/wal-archive/${wal_file}"; then
    break
  fi
  if [ "${attempt}" -eq 20 ]; then
    echo "WAL archive did not receive ${wal_file} within 20 seconds." >&2
    exit 1
  fi
  sleep 1
  attempt=$((attempt + 1))
done

disk_percent="$(compose exec -T "${POSTGRES_SERVICE}" sh -c \
  "df -P /var/lib/postgresql/data | awk 'NR == 2 {gsub(/%/, \"\", \$5); print \$5}'")"
inode_percent="$(compose exec -T "${POSTGRES_SERVICE}" sh -c \
  "df -Pi /var/lib/postgresql/data | awk 'NR == 2 {gsub(/%/, \"\", \$5); print \$5}'")"

if [ "${disk_percent}" -ge "${POSTGRES_MAX_DISK_PERCENT}" ]; then
  echo "PostgreSQL data storage is ${disk_percent}% full." >&2
  exit 1
fi
if [ "${inode_percent}" -ge "${POSTGRES_MAX_INODE_PERCENT}" ]; then
  echo "PostgreSQL data storage has used ${inode_percent}% of its inodes." >&2
  exit 1
fi

echo "PostgreSQL durability check passed: settings=${settings}, replicas=${replica_count}, disk=${disk_percent}%, inodes=${inode_percent}%, archived_wal=${wal_file}"
