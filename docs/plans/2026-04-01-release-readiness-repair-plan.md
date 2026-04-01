# Release Readiness Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the repository to a truthful, releasable state where backend migrations target the intended database, the frontend builds cleanly, and CI/deployment assets align with the real app location.

**Architecture:** Fix the release blockers in dependency order. First restore backend runtime correctness so startup and API tests reflect reality. Then align repository automation and ops assertions around `apps/control-plane-v3` instead of the stale `apps/web` path. Finally finish the in-progress inbox/notifications integration so the frontend passes typecheck, lint, and production build again.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, Next.js 15, TypeScript, ESLint, Vitest, Docker Compose, GitHub Actions

---

### Task 1: Backend Migration Targeting

**Files:**
- Modify: `apps/api/alembic/env.py`
- Test: `apps/api/tests/test_admin_accounts_api.py`
- Test: `apps/api/tests/test_runtime.py`
- Test: `apps/api/tests/test_bootstrap_api.py`

**Step 1: Run failing backend tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest \
  apps/api/tests/test_admin_accounts_api.py \
  apps/api/tests/test_runtime.py \
  apps/api/tests/test_bootstrap_api.py -q
```

Expected: failures showing missing `agents` table or bootstrap/runtime startup regressions.

**Step 2: Implement the minimal migration-target fix**

- Keep Alembic respecting the URL already injected by `migrate_db(...)`.
- Do not overwrite `sqlalchemy.url` with a fresh `Settings().database_url` when the caller already provided one.

**Step 3: Re-run the targeted backend tests**

Run the same command from Step 1.

Expected: the migration/bootstrap/runtime failures are gone.

### Task 2: Release Asset Path Realignment

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/docker-images.yml`
- Modify: `scripts/ops/bootstrap-dev-runtime.sh`
- Modify: `README.md`
- Modify: `tests/ops/test_container_artifacts.py`
- Modify: `tests/ops/test_intake_catalog_export.py`
- Modify: `scripts/check-intake-drift.py`
- Modify or create any frontend package/script references needed under `apps/control-plane-v3`

**Step 1: Run failing release-path assertions**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_container_artifacts.py tests/ops/test_intake_catalog_export.py -q
```

Expected: failures referencing missing `apps/web/*` files or scripts.

**Step 2: Implement the minimal path/script alignment**

- Update CI, Docker image workflow, bootstrap script, ops tests, and docs to point at `apps/control-plane-v3`.
- Make the frontend package expose whatever scripts the repo now claims are part of the quality floor.
- Keep docs and tests truthful to the current repository structure.

**Step 3: Re-run the targeted ops assertions**

Run the same command from Step 1.

Expected: ops path drift failures are gone.

### Task 3: Frontend Inbox And Notification Stabilization

**Files:**
- Modify: `apps/control-plane-v3/src/hooks/use-notifications.ts`
- Modify: `apps/control-plane-v3/src/hooks/use-notifications.test.ts`
- Modify: `apps/control-plane-v3/src/components/notifications.tsx`
- Modify: `apps/control-plane-v3/src/app/inbox/page.tsx`
- Modify: any directly implicated lint/build blockers touched by the inbox/event integration

**Step 1: Run failing frontend verification**

Run:

```bash
cd apps/control-plane-v3
npm run typecheck
npm run build
```

Expected: type failures centered on notifications/inbox availability state.

**Step 2: Add or update tests first**

- Ensure the notifications hook tests describe the intended backend-only inbox source contract.
- If needed, add focused tests for inbox behavior before changing implementation.

**Step 3: Implement the minimal frontend fix**

- Make availability/source handling internally consistent.
- Remove stale unreachable `unavailable` branches or restore a truthful union if the product really supports that state.
- Keep the dropdown and inbox surfaces aligned with the event domain contract.

**Step 4: Re-run focused frontend tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/hooks/use-notifications.test.ts src/app/inbox/page.test.tsx
```

Expected: targeted tests pass.

**Step 5: Re-run frontend verification**

Run:

```bash
cd apps/control-plane-v3
npm run typecheck
npm run build
```

Expected: both commands pass.

### Task 4: Frontend Lint Baseline Recovery

**Files:**
- Modify: only the frontend files still failing lint after Task 3

**Step 1: Run lint**

Run:

```bash
cd apps/control-plane-v3
npm run lint
```

Expected: current error list.

**Step 2: Fix lint errors in small, behavior-safe batches**

- Prioritize rule-of-hooks, unused imports/vars, forbidden `require`, and malformed `if` statements.
- Avoid unrelated redesign or refactor churn.

**Step 3: Re-run lint**

Run the same command from Step 1.

Expected: zero lint errors.

### Task 5: Final Release Verification

**Step 1: Run the complete repo verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
cd apps/control-plane-v3 && npm test -- --run
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run lint
cd apps/control-plane-v3 && npm run build
docker compose config
```

Expected: all commands pass.

**Step 2: Report release status**

- Summarize what changed.
- State whether the repo is now ready to publish.
- Call out any residual non-blocking risks separately from blockers.
