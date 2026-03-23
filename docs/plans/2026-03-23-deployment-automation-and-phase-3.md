# Deployment Automation And Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Actions driven single-host deployment path for the published container images, then define the next project phase needed to turn the control plane into a production-ready service.

**Architecture:** Reuse the existing GHCR image pipeline and root `docker-compose.yml`, then layer a deployment override file on top for server usage. The deployment workflow will sync the compose assets to a remote host over SSH, log the server into GHCR, and restart the stack with pinned image tags. After the deployment baseline is in place, Phase 3 should focus on operational hardening, stronger auth, and observability.

**Tech Stack:** GitHub Actions, GHCR, Docker Compose, SSH, FastAPI, Next.js.

---

### Task 1: Add failing verification for deployment artifacts

**Files:**
- Modify: `tests/ops/test_container_artifacts.py`
- Test: `tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Extend the ops artifact test to assert:
- `.github/workflows/deploy.yml` exists
- `docker-compose.prod.yml` exists
- `.env.production.example` exists
- `README.md` documents GitHub deployment secrets and rollback guidance

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because deployment assets are not present yet.

**Step 3: Write minimal implementation**

Create only the missing deployment files and the minimum docs needed to satisfy the new assertions.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 2: Add GitHub Actions remote deployment workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert the workflow:
- supports `workflow_dispatch`
- reacts to successful image publishing on `main`
- uses SSH-based deployment
- performs `docker compose pull`
- performs `docker compose up -d --remove-orphans`

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because the workflow does not exist yet.

**Step 3: Write minimal implementation**

Build a workflow that:
- computes the image namespace and chosen image tag
- uploads compose assets to the remote host
- seeds `.env.production` from a GitHub secret when needed
- logs into GHCR on the remote host
- restarts the stack with Compose

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 3: Add production compose override and environment template

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.production.example`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert:
- prod compose references `API_IMAGE` and `WEB_IMAGE`
- prod compose sets restart policies
- prod compose enables secure management cookies by default
- the environment template includes production placeholders

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because the production override is missing.

**Step 3: Write minimal implementation**

Create a production override that:
- disables local builds
- consumes published GHCR image tags
- sets restart policies for long-running services
- keeps the same logical service topology as local compose

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 4: Document deployment and rollback

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert README includes:
- required GitHub secrets
- server prerequisites
- deployment trigger behavior
- rollback instructions using explicit image tags

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because the deployment docs are incomplete.

**Step 3: Write minimal implementation**

Document:
- which secrets and server packages are required
- how the server gets `.env.production`
- how to run or rerun the deploy workflow
- how to roll back to a release or SHA image tag
- current limitations of the single-host OpenBao dev setup

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 5: Full verification

**Files:**
- Verify only

**Step 1: Run ops tests**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q apps/api/tests tests/ops`

Expected: PASS

**Step 2: Run web build**

Run: `cd apps/web && npm run build`

Expected: PASS

**Step 3: Validate compose files**

Run: `docker compose -f docker-compose.yml -f docker-compose.prod.yml config`

Expected: Valid merged compose output.

**Step 4: Commit**

```bash
git add .github/workflows/deploy.yml docker-compose.prod.yml .env.production.example README.md tests/ops/test_container_artifacts.py docs/plans/2026-03-23-deployment-automation-and-phase-3.md
git commit -m "ops: add deployment automation"
```

## Next Phase Roadmap

After this deployment baseline lands, the next phase should focus on:

1. **Operational hardening**
   - Replace the OpenBao dev setup with a hardened secret backend or managed secret store.
   - Add a reverse proxy, TLS termination, and domain-based routing for the web and API surfaces.
   - Add backups and restore drills for Postgres and Redis.

2. **Authentication and governance**
   - Introduce operator identities beyond the bootstrap credential.
   - Add role-based access for approvals, secrets, and agent management.
   - Expand auditability for approvals, runtime invokes, and session activity.

3. **Observability and runtime resilience**
   - Add structured logs, metrics, and health dashboards.
   - Add background job visibility and retry tracking for task execution.
   - Add production smoke tests that run after deployment.

4. **Agent self-serve maturity**
   - Improve agent onboarding and capability discovery in the web console.
   - Add richer playbook composition, filtering, and execution feedback.
   - Add safer promotion rules for moving new capabilities into production.
