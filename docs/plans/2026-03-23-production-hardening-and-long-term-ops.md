# Production Hardening And Long-Term Ops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current single-host dev-style deployment with a production-safe architecture that supports long-term operation, security hardening, disaster recovery, and repeatable releases.

**Architecture:** Stop treating the in-repo OpenBao dev container as a production dependency. Move the production path to a hardened topology: `caddy -> web -> api`, with Postgres and Redis on private service networks, and secrets resolved from an external or independently managed KV v2 compatible backend. Production configuration should fail closed when the secret backend is unavailable, while local development can keep the lightweight compose path.

**Tech Stack:** FastAPI, Next.js, Postgres, Redis, Caddy, Docker Compose, GitHub Actions, OpenBao or Vault-compatible KV v2 backend, Pytest, Playwright.

---

### Recommended Direction

**Recommendation:** Keep KV v2 compatibility in the API, but remove the embedded OpenBao dev service from the production topology and require a separately managed secret backend endpoint for production.

**Why this direction:**
- It preserves the app's current secret-backend abstraction and avoids rewriting the whole secret model immediately.
- It decouples application deploys from secret-store lifecycle, backup, and policy management.
- It gives us a safer production path quickly while still leaving room to migrate later to managed Vault, Infisical, or another platform.

**Alternatives considered:**
- Keep OpenBao in the app stack but harden it in place:
  Lowest migration cost, but still couples secret infrastructure to app deploys and adds operational burden immediately.
- Replace OpenBao integration entirely with env-file secrets only:
  Fastest short-term path, but it regresses secret management, rotation, and auditability.

### Task 1: Add failing verification for the new production baseline

**Files:**
- Modify: `tests/ops/test_container_artifacts.py`
- Create: `tests/ops/test_production_stack.py`
- Test: `tests/ops/test_container_artifacts.py`
- Test: `tests/ops/test_production_stack.py`

**Step 1: Write the failing test**

Add ops tests that assert:
- production compose includes `caddy`
- production compose does not run the OpenBao dev service by default
- production env examples require an external secret backend URL/token
- deploy workflow runs a post-deploy smoke check
- README documents external secret backend, backups, and restore expectations

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py tests/ops/test_production_stack.py`

Expected: FAIL because the current production assets still model the dev-style topology.

**Step 3: Write minimal implementation**

Create only the minimal production assets and docs required to satisfy the new expectations.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py tests/ops/test_production_stack.py`

Expected: PASS

### Task 2: Replace the production compose topology

**Files:**
- Modify: `docker-compose.prod.yml`
- Create: `ops/caddy/Caddyfile`
- Create: `ops/compose/prod.env.example`
- Test: `tests/ops/test_production_stack.py`

**Step 1: Write the failing test**

Extend `tests/ops/test_production_stack.py` to assert:
- `caddy` proxies web traffic publicly and API traffic privately
- `api` is bound only to localhost or an internal network
- `postgres` and `redis` are not publicly exposed in production
- `openbao` is absent from the production compose file
- healthchecks and restart policies exist for all long-running services

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_production_stack.py::test_production_compose_topology -v`

Expected: FAIL because the current production compose file still inherits the dev stack shape.

**Step 3: Write minimal implementation**

Implement a production compose file that:
- exposes only `caddy` publicly on `80/443`
- keeps `web`, `api`, `postgres`, and `redis` on private networks
- removes the in-stack OpenBao dependency
- reads secret backend settings from environment
- mounts Caddy data/config volumes for certificates

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_production_stack.py::test_production_compose_topology -v`

Expected: PASS

**Step 5: Commit**

```bash
git add docker-compose.prod.yml ops/caddy/Caddyfile ops/compose/prod.env.example tests/ops/test_production_stack.py tests/ops/test_container_artifacts.py
git commit -m "ops: harden production compose topology"
```

### Task 3: Make secret backend behavior fail closed in production

**Files:**
- Modify: `apps/api/app/config.py`
- Modify: `apps/api/app/services/secret_backend.py`
- Create: `apps/api/tests/test_secret_backend_production.py`
- Test: `apps/api/tests/test_secret_backend_production.py`

**Step 1: Write the failing test**

Add tests that assert:
- production mode with `SECRET_BACKEND=openbao` and missing credentials raises a startup configuration error
- local development can still opt into `memory`
- secret backend configuration supports external endpoint settings without depending on an in-stack container hostname

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests/test_secret_backend_production.py`

Expected: FAIL because the current backend silently falls back to memory.

**Step 3: Write minimal implementation**

Add configuration such as:
- `APP_ENV=development|staging|production`
- explicit validation that production cannot silently downgrade secret storage
- clearer startup errors for missing secret backend configuration

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests/test_secret_backend_production.py`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/config.py apps/api/app/services/secret_backend.py apps/api/tests/test_secret_backend_production.py
git commit -m "api: fail closed on production secret backend config"
```

### Task 4: Add reverse proxy, TLS, and health-based smoke verification

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `scripts/ops/smoke-test.sh`
- Create: `tests/ops/test_deploy_workflow.py`
- Test: `tests/ops/test_deploy_workflow.py`

**Step 1: Write the failing test**

Add tests that assert the deploy workflow:
- validates the merged production compose file
- restarts the stack
- runs a smoke test against `/healthz` and the web entrypoint through Caddy
- fails the deployment when the smoke test fails

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_deploy_workflow.py`

Expected: FAIL because the current deploy workflow only restarts containers.

**Step 3: Write minimal implementation**

Implement:
- remote compose validation
- smoke script execution after `docker compose up -d`
- optional `APP_BASE_URL` or `PUBLIC_BASE_URL` environment support for smoke checks

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_deploy_workflow.py`

Expected: PASS

**Step 5: Commit**

```bash
git add .github/workflows/deploy.yml scripts/ops/smoke-test.sh tests/ops/test_deploy_workflow.py
git commit -m "ops: add deploy smoke verification"
```

### Task 5: Add backup and restore operations

**Files:**
- Create: `scripts/ops/backup-postgres.sh`
- Create: `scripts/ops/restore-postgres.sh`
- Create: `scripts/ops/backup-redis.sh`
- Create: `docs/guides/production-operations.md`
- Create: `tests/ops/test_backup_scripts.py`
- Test: `tests/ops/test_backup_scripts.py`

**Step 1: Write the failing test**

Add tests that assert:
- backup scripts exist and are executable
- Postgres backup uses `pg_dump`
- restore script documents restore ordering and safety expectations
- operations guide includes backup cadence and restore drill steps

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_backup_scripts.py`

Expected: FAIL because backup assets are missing.

**Step 3: Write minimal implementation**

Create scripts and docs for:
- logical Postgres backups
- Redis snapshot backup handling
- restore sequencing
- secure artifact storage expectations

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_backup_scripts.py`

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ops/backup-postgres.sh scripts/ops/restore-postgres.sh scripts/ops/backup-redis.sh docs/guides/production-operations.md tests/ops/test_backup_scripts.py
git commit -m "ops: add backup and restore runbooks"
```

### Task 6: Add baseline observability

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/routes/__init__.py`
- Create: `apps/api/app/routes/metrics.py`
- Create: `apps/api/tests/test_metrics.py`
- Modify: `docker-compose.prod.yml`
- Test: `apps/api/tests/test_metrics.py`

**Step 1: Write the failing test**

Add tests that assert:
- the API exposes a metrics endpoint or structured telemetry surface
- production compose includes the required env/config for telemetry scraping or log shipping
- deploy docs describe where to look first during incidents

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests/test_metrics.py`

Expected: FAIL because there is no production observability baseline yet.

**Step 3: Write minimal implementation**

Implement:
- a simple metrics endpoint or instrumentation hook
- structured request logging for API startup and critical runtime paths
- minimal production wiring for metrics collection

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests/test_metrics.py`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/main.py apps/api/app/routes/__init__.py apps/api/app/routes/metrics.py apps/api/tests/test_metrics.py docker-compose.prod.yml
git commit -m "ops: add baseline production observability"
```

### Task 7: Update docs and operator onboarding

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/agent-quickstart.md`
- Create: `docs/guides/production-deployment.md`
- Test: `tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Extend docs-related ops tests to assert:
- README no longer recommends the OpenBao dev topology for production
- production deployment docs describe DNS, TLS, external secrets, backup, rollback, and smoke checks
- quickstart explicitly separates local development from production operations

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because the docs still mix local and production concerns.

**Step 3: Write minimal implementation**

Document:
- local vs production operating modes
- required secrets and DNS setup
- release, rollback, backup, restore, and incident-entry steps
- what remains intentionally out of scope

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

**Step 5: Commit**

```bash
git add README.md docs/guides/agent-quickstart.md docs/guides/production-deployment.md tests/ops/test_container_artifacts.py
git commit -m "docs: separate local and production operations"
```

### Task 8: Full verification

**Files:**
- Verify only

**Step 1: Run API and ops tests**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests tests/ops`

Expected: PASS

**Step 2: Run web build**

Run: `cd apps/web && npm run build`

Expected: PASS

**Step 3: Validate merged production compose**

Run: `docker compose --env-file ops/compose/prod.env.example -f docker-compose.yml -f docker-compose.prod.yml config`

Expected: PASS with no `openbao` production dependency.

**Step 4: Review deployment workflow**

Run: `sed -n '1,260p' .github/workflows/deploy.yml`

Expected: Includes validation, deploy, and smoke verification steps.

**Step 5: Commit**

```bash
git add .
git commit -m "ops: ship production hardening baseline"
```

## Phase Sequencing

Execute in this order:

1. Production topology replacement
2. Secret-backend fail-closed behavior
3. TLS and smoke-checked deploys
4. Backup and restore runbooks
5. Observability baseline
6. Documentation cleanup

## Explicit Non-Goals For This Phase

- Multi-region failover
- Kubernetes migration
- Full SSO or enterprise identity provider integration
- Secret rotation automation beyond establishing the safer production baseline
