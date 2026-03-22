# Docker And Image Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production-oriented container images for the API and web apps, a GitHub Actions workflow that builds and publishes those images, and a complete Docker Compose stack that can run the project end to end.

**Architecture:** Build two first-class images from the monorepo: one for `apps/api` and one for `apps/web`. Publish them to GHCR from GitHub Actions on `main` and tags, while keeping PR builds as validation-only. Use a root-level Compose file to orchestrate `web`, `api`, `postgres`, `redis`, and `openbao`, with environment-driven configuration and health-based startup ordering.

**Tech Stack:** FastAPI, Next.js, Docker multi-stage builds, GitHub Actions, GHCR, Docker Compose.

---

### Task 1: Add failing verification for container artifacts

**Files:**
- Create: `tests/ops/test_container_artifacts.py`
- Test: `tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Create a Python test file that asserts:
- `.github/workflows/docker-images.yml` exists
- `apps/api/Dockerfile` exists
- `apps/web/Dockerfile` exists
- `docker-compose.yml` includes `web` and `api` services

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because one or more files do not exist yet.

**Step 3: Write minimal implementation**

Create only the missing artifact files with minimal valid content so the test can pass.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 2: Add first-class Dockerfiles

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Modify: `apps/api/pyproject.toml`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert:
- API Dockerfile exposes port `8000`
- Web Dockerfile exposes port `3000`
- API Dockerfile installs project dependencies
- Web Dockerfile runs `next build`

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL on missing directives/content.

**Step 3: Write minimal implementation**

- API image:
  - Python 3.12 slim
  - install package from `apps/api`
  - run `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Web image:
  - Node 22
  - install from `apps/web`
  - build with `npm run build`
  - run `npm run start -- --hostname 0.0.0.0 --port 3000`

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 3: Expand Docker Compose into a full stack

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert:
- Compose defines `web`, `api`, `postgres`, `redis`, and `openbao`
- `web` depends on `api`
- `api` depends on `postgres` and `redis`
- Compose contains named volumes or persistent mounts for stateful services

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because current compose file is incomplete.

**Step 3: Write minimal implementation**

- Keep root `docker-compose.yml`
- Add `web` service
- Add healthchecks and service dependency conditions
- Add named volumes for Postgres, Redis, and OpenBao dev data where appropriate
- Use `${VAR:-default}` style env wiring

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 4: Add GitHub Actions image pipeline

**Files:**
- Create: `.github/workflows/docker-images.yml`
- Modify: `.github/workflows/ci.yml`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert:
- `docker-images.yml` logs into GHCR
- it builds both `api` and `web`
- it tags images with branch/SHA metadata
- it avoids pushing on pull requests

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because workflow is absent or incomplete.

**Step 3: Write minimal implementation**

- Use `docker/setup-buildx-action`
- Use `docker/login-action`
- Use `docker/metadata-action`
- Use `docker/build-push-action`
- Publish:
  - `ghcr.io/<owner>/agentshare-api`
  - `ghcr.io/<owner>/agentshare-web`

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 5: Document the runtime workflow

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

Extend `tests/ops/test_container_artifacts.py` to assert README contains:
- `docker compose up -d`
- a section mentioning GHCR or GitHub Actions image publishing
- guidance for required environment variables

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: FAIL because docs are incomplete.

**Step 3: Write minimal implementation**

Document:
- local compose usage
- image publishing behavior
- production image override examples
- required secrets/env vars

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

### Task 6: Full verification

**Files:**
- Verify only

**Step 1: Run artifact tests**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q tests/ops/test_container_artifacts.py`

Expected: PASS

**Step 2: Run full API tests**

Run: `PYTHONPATH=apps/api ./.venv/bin/pytest -q`

Expected: PASS

**Step 3: Run web build**

Run: `cd apps/web && npm run build`

Expected: PASS

**Step 4: Validate compose**

Run: `docker compose config`

Expected: Valid merged compose output with no syntax errors.

**Step 5: Commit**

```bash
git add .github/workflows/docker-images.yml .github/workflows/ci.yml apps/api/Dockerfile apps/web/Dockerfile docker-compose.yml .env.example README.md tests/ops/test_container_artifacts.py docs/plans/2026-03-23-docker-and-image-pipeline.md
git commit -m "ops: add image pipeline and compose stack"
```
