# Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the five review findings around production database configuration drift, duplicate migration execution, incorrect secret scope persistence, missing setup translation content, and invalid 404 link/button semantics.

**Architecture:** Reuse the existing single-source database URL derivation pattern from the Coolify compose path for the production compose path, keep schema migration ownership in the container entrypoint, and preserve secret scope as first-class structured data at write time. For the frontend, close the i18n gap in locale resources and render the 404 action as a single interactive element.

**Tech Stack:** Docker Compose, FastAPI, SQLAlchemy, Alembic, Pytest, Next.js, React, Vitest

---

### Task 1: Lock production compose to a single database password source

**Files:**
- Modify: `docker-compose.prod.yml`
- Modify: `ops/compose/prod.env.example`
- Modify: `tests/ops/test_container_artifacts.py`
- Modify: `README.md`
- Modify: `docs/guides/production-deployment.md`
- Modify: `docs/guides/deployment-manual.md`

**Step 1: Write the failing test**

Add or update assertions so production compose accepts an optional `DATABASE_URL` override but otherwise derives it from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`, and so the production env example tells operators to leave `DATABASE_URL` unset for the default same-stack Postgres path.

**Step 2: Run test to verify it fails**

Run: `pytest tests/ops/test_container_artifacts.py -q`
Expected: FAIL because production artifacts still require a separately maintained `DATABASE_URL`.

**Step 3: Write minimal implementation**

Update production compose and docs to use the derived default URL and document explicit override-only usage.

**Step 4: Run test to verify it passes**

Run: `pytest tests/ops/test_container_artifacts.py -q`
Expected: PASS for the updated production compose assertions.

### Task 2: Make container entrypoint the sole migration owner

**Files:**
- Modify: `apps/api/tests/test_app_factory.py`
- Modify: `apps/api/app/factory.py`

**Step 1: Write the failing test**

Add a factory test that starts the app with `migrate_db` patched and asserts startup does not call it from the FastAPI lifespan.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_app_factory.py -q`
Expected: FAIL because `create_app()` currently triggers `migrate_db()` during lifespan startup.

**Step 3: Write minimal implementation**

Remove the lifespan migration call while keeping bootstrap/setup seeding behavior intact.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_app_factory.py -q`
Expected: PASS with startup initialization still happening exactly once.

### Task 3: Persist structured secret scope correctly

**Files:**
- Modify: `apps/api/tests/test_secrets_api.py`
- Modify: `apps/api/app/routes/secrets.py`

**Step 1: Write the failing test**

Add a secret creation test that asserts the stored database row keeps a structured `scope` object derived from provider/environment/provider_scopes/resource_selector instead of metadata.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_secrets_api.py -q`
Expected: FAIL because `create_secret()` currently stores metadata in the `scope` column.

**Step 3: Write minimal implementation**

Introduce a shared scope builder and use it both when persisting and serializing secret responses.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_secrets_api.py -q`
Expected: PASS with the stored row and response both using the same structured scope shape.

### Task 4: Close the first-run setup i18n gap and 404 accessibility issue

**Files:**
- Modify: `apps/control-plane-v3/src/app/setup/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/not-found.tsx`
- Add or Modify: `apps/control-plane-v3/src/app/not-found.test.tsx`
- Modify: `apps/control-plane-v3/src/i18n/messages/en.json`
- Modify: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`

**Step 1: Write the failing test**

Add one test that asserts both locale files include `auth.setup.description`, and another that asserts the 404 page exposes a single home link instead of nested button/link controls.

**Step 2: Run test to verify it fails**

Run: `cd apps/control-plane-v3 && npm run test:unit -- src/app/setup/page.test.tsx src/app/not-found.test.tsx`
Expected: FAIL because the locale key is missing and the 404 page nests a link inside a button.

**Step 3: Write minimal implementation**

Add the missing locale strings and render the 404 action as a `Button` that uses the link as the outer control.

**Step 4: Run test to verify it passes**

Run: `cd apps/control-plane-v3 && npm run test:unit -- src/app/setup/page.test.tsx src/app/not-found.test.tsx`
Expected: PASS with translated setup copy and valid interaction semantics.

### Task 5: Final verification

**Files:**
- No code changes required

**Step 1: Run backend verification**

Run: `cd apps/api && pytest tests/test_app_factory.py tests/test_secrets_api.py -q`
Expected: PASS

**Step 2: Run frontend verification**

Run: `cd apps/control-plane-v3 && npm run test:unit -- src/app/setup/page.test.tsx src/app/not-found.test.tsx`
Expected: PASS

**Step 3: Run ops verification**

Run: `pytest tests/ops/test_container_artifacts.py -q`
Expected: PASS
