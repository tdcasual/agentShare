# Coolify Deployment

Deploy VaultGate on [Coolify](https://coolify.io) (v4+) using `docker-compose.coolify.yml`.
Coolify owns the edge — Traefik reverse proxy, managed TLS certificates, and routing — so this
stack has no Caddy service, no custom networks, and no static IPs.

## Architecture on Coolify

```
Internet → Coolify Traefik edge (TLS) → web (Next.js, the only public domain)
                                       → same-origin /api → Next proxy → api (FastAPI, internal)
                                                                         → postgres (internal)
```

- **Traefik edge**: terminates TLS and forwards to `web:3000`. Managed entirely by Coolify.
- **web**: the Next.js management console. This is the only service you assign a domain to.
  The browser always calls the same-origin `/api` proxy; there is no public client-side API
  base URL.
- **api**: the FastAPI backend, reachable only inside the compose network (`expose: 8000`,
  no published ports).
- **postgres**: PostgreSQL 16, internal only, data in the `postgres-data` volume.

### Why there is no Caddy

The standard production stack (`docker-compose.prod.yml`) runs Caddy as the TLS-terminating
edge proxy. On Coolify that role is already filled by the platform's Traefik instance, which
handles certificate issuance and renewal, so running a second edge proxy would be redundant.

### X-Forwarded-For trust chain

Traefik appends the client IP it observes to the end of any client-supplied
`X-Forwarded-For` chain, which means earlier entries can be spoofed. The Next.js `/api`
proxy therefore forwards only the **rightmost** chain entry — the IP the edge actually saw —
to the API. In the Caddy topology the edge overwrites the header with a single entry, so the
same code behaves identically there. The API in turn only trusts `X-Forwarded-For` from
`TRUSTED_PROXY_CIDRS` (see below), which must cover the Coolify proxy networks.

## Prerequisites

- A running Coolify v4 instance with a server configured.
- A domain (for example `vaultgate.example.com`) whose DNS A/AAAA record points at the
  Coolify server's public IP.
- A git repository containing this codebase that Coolify can access (GitHub/GitLab app or
  a deploy key for private repositories).

## Step-by-step

1. In the Coolify UI, create a **Project** (or pick an existing one), then add a **Resource →
   Docker Compose** service from your git repository.
2. Set the compose file path to `docker-compose.coolify.yml` and the branch you deploy from.
3. Fill in the environment variables (table below) in the Coolify environment editor.
4. Assign the domain to the **web** service only: set `https://vaultgate.example.com` as its
   domain. Coolify generates the Traefik route and requests the TLS certificate. Leave `api`
   and `postgres` without domains — they stay internal.
5. Deploy.

### Environment variables

| Variable | Required | Description | Example |
|---|---:|---|---|
| `ENCRYPTION_KEY` | yes | Base64-encoded 32-byte AES key. Generate with `python3 -c 'import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'` | `bJ9...=` |
| `ENCRYPTION_ACTIVE_KEY_ID` | no | Key id for newly encrypted values (default `current`) | `current` |
| `ENCRYPTION_KEYRING` | no | JSON object of legacy key ids to keys, used during rotation (default `{}`) | `{"old":"..."}` |
| `POSTGRES_DB` | no | Database name (default `vaultgate`) | `vaultgate` |
| `POSTGRES_USER` | no | Database user (default `postgres`) | `postgres` |
| `POSTGRES_PASSWORD` | yes | Database password | long random string |
| `BOOTSTRAP_TOKEN` | production | One-time credential of at least 32 characters for first-time setup; API startup fails without it. Rotate or destroy it once the administrator is initialized | `openssl rand -hex 32` output |
| `CORS_ALLOWED_ORIGINS` | yes | Exact browser origin. The CSRF Origin check on session mutations compares against this value, so it must match the public URL exactly | `https://vaultgate.example.com` |
| `SESSION_SECURE` | production | Must be `true` behind HTTPS (compose default `true`) | `true` |
| `TRUSTED_PROXY_CIDRS` | no | Proxy IPs/CIDRs trusted for `X-Forwarded-For`. Default `172.16.0.0/12` covers Docker's bridge networks where Coolify's Traefik runs. This is the trust boundary for audit IP attribution and IP-based rate limiting — narrow it to the actual proxy subnet if you know it | `172.16.0.0/12` |
| `DATABASE_URL` | no | Leave empty to use the bundled `postgres` service via the structured `POSTGRES_*` settings. Set explicitly (URL-encoded) only for an external database | `postgresql://...` |
| `VAULTGATE_API_URL` | no | Internal API origin used by the web same-origin proxy (default `http://api:8000`) | `http://api:8000` |
| `VAULTGATE_API_TIMEOUT_MS` | no | Web proxy upstream timeout in milliseconds (default `30000`) | `30000` |
| `RUN_DB_MIGRATIONS_ON_STARTUP` | no | `true` (default) runs Alembic migrations under the PostgreSQL advisory lock before uvicorn starts | `true` |

`*_FILE` variants (`POSTGRES_PASSWORD_FILE`, `ENCRYPTION_KEY_FILE`, `BOOTSTRAP_TOKEN_FILE`,
`ENCRYPTION_KEYRING_FILE`, `DATABASE_URL_FILE`) are also passed through. They read from
`/run/secrets/vaultgate` inside the containers, which the compose file bind-mounts from
`VAULTGATE_SECRETS_DIR` (default `./.vaultgate-secrets` relative to the repository checkout).

### Smoke check

After the deploy finishes, verify from any host:

```bash
curl -sS https://vaultgate.example.com/healthz
curl -sS https://vaultgate.example.com/readyz
```

`/readyz` returns 200 only when the database and the encryption round trip are healthy.

## First-time setup

Open `https://vaultgate.example.com/setup` and create the single administrator. The setup
endpoint requires the `BOOTSTRAP_TOKEN` you configured — it proves the person initializing
the instance controls the deployment. Once the administrator exists the bootstrap endpoints
close; rotate or remove `BOOTSTRAP_TOKEN` from the environment afterwards, as recommended in
the deployment manual.

## Backups

Two options:

1. **Bundled postgres + `scripts/ops/backup-postgres.sh`** — the script runs `pg_dump`
   (custom format) through `docker compose exec` and keeps the last 30 dumps. On Coolify,
   schedule it from the host cron or a Coolify scheduled task, pointing it at this stack:

   ```bash
   COMPOSE_FILE=docker-compose.coolify.yml COMPOSE_ENV_FILE=.env \
     BACKUP_DIR=/srv/backups/vaultgate ./scripts/ops/backup-postgres.sh
   ```

   Adjust the env file path to where you keep the stack's variables on the host. Store the
   dumps off the server.

2. **Coolify managed PostgreSQL** — replace the bundled `postgres` service with a Coolify
   database resource and set `DATABASE_URL` (URL-encoded) on the `api` service. You get
   Coolify's built-in scheduled backups, but you give up the stack-local volume and must keep
   the database and application backups consistent yourself.

Either way, test restores before you need them; see
`docs/guides/production-operations.md` for the recovery procedure.

## Updates

1. Push to the branch Coolify deploys from.
2. Trigger **Redeploy** in Coolify (or let the GitHub webhook do it). Coolify rebuilds the
   images from git and recreates the containers.
3. On startup, the API entrypoint runs `alembic upgrade head` under a PostgreSQL advisory
   lock before uvicorn serves traffic (`RUN_DB_MIGRATIONS_ON_STARTUP=true`, the default).
   Leave it enabled; set it to `false` only when an external migration pipeline owns schema
   changes and you can guarantee migrations complete before any API replica receives traffic.
4. Verify `/readyz`, a browser login, and one Agent Token read.

Rollback notes: redeploy the previous git revision in Coolify. Migrations are forward-only —
if the new release applied schema changes, restore the pre-upgrade database backup together
with the old revision instead of rolling back code alone.

## Monitoring and troubleshooting

- Health endpoints: `/healthz` (liveness) and `/readyz` (dependency readiness).
- Alert rules and exporter wiring: `docs/guides/monitoring.md`. Probe
  `https://<your-domain>/readyz` with the blackbox exporter as described there.
- Symptom-driven recovery: `docs/guides/troubleshooting.md`. Note that its compose commands
  assume the standard production layout; on Coolify, use the service logs/exec in the Coolify
  UI (or `docker compose -f docker-compose.coolify.yml ...` on the host) instead.

## Differences from the standard production deployment

| Aspect | Standard (`docker-compose.prod.yml`, see `deployment-manual.md`) | Coolify (`docker-compose.coolify.yml`) |
|---|---|---|
| Edge proxy / TLS | Caddy container with automatic Let's Encrypt | Coolify-managed Traefik; assign the domain to `web` |
| Networks | Custom `edge`/`data` networks, static Caddy IP | Coolify-managed networks; none defined in the file |
| Container source | Pre-built images (`WEB_IMAGE`/`API_IMAGE`/...) | Built from git by Coolify (`build:` sections) |
| Ports | Only Caddy publishes 80/443 | Nothing published; `web`/`api` use `expose` |
| `TRUSTED_PROXY_CIDRS` default | `172.30.0.2/32` (the static Caddy IP) | `172.16.0.0/12` (Docker bridge ranges for Traefik) |
| `PUBLIC_HOST` / `ACME_EMAIL` | Required by Caddy | Not used; the domain lives in the Coolify UI |
| Postgres WAL archive volume | `postgres-wal-archive` for PITR | Not included; use `pg_dump` backups or a managed DB |
| Secrets directory | `./.vaultgate-secrets` bind mount | Same, relative to the Coolify repository checkout |
