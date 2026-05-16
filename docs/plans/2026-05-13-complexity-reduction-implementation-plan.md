# Complexity Reduction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce architectural and workflow complexity in AgentShare without breaking the governed publishing, review, approval, and runtime flows.

**Architecture:** This plan reduces complexity by narrowing boundaries instead of introducing new abstraction layers. The main moves are: isolate runtime/demo behavior from the management console, converge human publish flows onto guided form definitions, centralize workflow state rules in backend/domain contracts, and reduce deployment/documentation branching.

**Tech Stack:** Next.js 15, React 19, SWR, Vitest, Playwright, FastAPI, SQLAlchemy, Alembic, Redis, OpenBao, Docker Compose, GitHub Actions

---

## Scope and sequencing

This plan is intentionally ordered from lowest-risk/highest-leverage toward deeper structural cleanup:

1. Stabilize shell boundaries
2. Converge publish-entry UX
3. Separate frontend management/runtime domains
4. Centralize backend workflow state and orchestration
5. Generate and enforce shared contracts
6. Simplify observability and error loops
7. Reduce deployment branching
8. Archive or delete dead paths

The rule for every phase: do not expand product surface while complexity-reduction work is in progress.

---

### Task 1: Lock runtime/demo behavior behind explicit route boundaries

**Files:**
- Modify: `apps/control-plane-v3/src/app/layout.tsx`
- Modify: `apps/control-plane-v3/src/components/runtime-provider.tsx`
- Modify: `apps/control-plane-v3/src/hooks/use-shell-identity.ts`
- Test: `apps/control-plane-v3/src/components/runtime-provider.test.tsx`
- Test: `apps/control-plane-v3/src/hooks/use-shell-identity.test.ts`
- Test: `apps/control-plane-v3/src/app/runtime-context-consistency.test.ts`

**Step 1: Write the failing test**

Add or extend tests so that:
- `/demo*` routes require runtime
- management routes never require runtime
- public non-demo routes such as `/docs` never inherit runtime identity

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/components/runtime-provider.test.tsx src/hooks/use-shell-identity.test.ts src/app/runtime-context-consistency.test.ts
```

Expected: at least one failure showing runtime/demo and management shells are still mixed.

**Step 3: Write minimal implementation**

Implement a route-scoped runtime wrapper and make `useShellIdentity()` runtime-optional outside demo routes. Do not allow management pages to initialize runtime plugins, registries, or demo identities.

**Step 4: Run test to verify it passes**

Run the same command and confirm PASS.

**Step 5: Run workflow smoke**

Run:

```bash
cd apps/control-plane-v3
npm run test:e2e -- publishing.spec.ts
```

Expected: PASS. Publishing flow still works.

**Step 6: Commit**

```bash
git add apps/control-plane-v3/src/app/layout.tsx \
  apps/control-plane-v3/src/components/runtime-provider.tsx \
  apps/control-plane-v3/src/components/runtime-provider.test.tsx \
  apps/control-plane-v3/src/hooks/use-shell-identity.ts \
  apps/control-plane-v3/src/hooks/use-shell-identity.test.ts
git commit -m "refactor: isolate runtime shell to demo routes"
```

---

### Task 2: Converge human publish flows onto guided field definitions

**Files:**
- Modify: `apps/control-plane-v3/src/app/tasks/use-tasks-form.ts`
- Modify: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/assets/use-assets-form.ts`
- Modify: `apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `apps/control-plane-v3/src/i18n/messages/en.json`
- Modify: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`
- Test: `apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Test: `apps/control-plane-v3/src/app/assets/page.test.tsx`
- Test: `apps/control-plane-v3/test/e2e/publishing.spec.ts`

**Step 1: Write the failing test**

Add or keep tests that prove:
- task publish does not require hand-authored raw JSON
- capability publish keeps the strongest available secret prefills
- secret, capability, and task failure states remain visible and actionable

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tasks/page.test.tsx src/app/assets/page.test.tsx
```

Expected: failures showing raw JSON dependency or dropped prefills.

**Step 3: Write minimal implementation**

Converge task/secret/capability publish onto guided fields, dropdowns, and derived defaults. Use controlled submit functions so page hydration, button behavior, and modal state are stable in E2E.

**Step 4: Run tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tasks/page.test.tsx src/app/assets/page.test.tsx
npm run test:e2e -- publishing.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/tasks/use-tasks-form.ts \
  apps/control-plane-v3/src/app/tasks/page.tsx \
  apps/control-plane-v3/src/app/assets/use-assets-form.ts \
  apps/control-plane-v3/src/app/assets/page.tsx \
  apps/control-plane-v3/src/i18n/messages/en.json \
  apps/control-plane-v3/src/i18n/messages/zh-CN.json \
  apps/control-plane-v3/src/app/tasks/page.test.tsx \
  apps/control-plane-v3/src/app/assets/page.test.tsx \
  apps/control-plane-v3/test/e2e/publishing.spec.ts
git commit -m "refactor: simplify human publishing flows"
```

---

### Task 3: Split frontend management-domain hooks from runtime-domain hooks

**Files:**
- Create: `apps/control-plane-v3/src/domains/runtime/`
- Modify: `apps/control-plane-v3/src/hooks/use-identity.ts`
- Modify: `apps/control-plane-v3/src/hooks/use-shell-identity.ts`
- Modify: `apps/control-plane-v3/src/components/runtime-provider.tsx`
- Modify: `apps/control-plane-v3/src/interfaces/human/layout/index.tsx`
- Create or modify tests under:
  - `apps/control-plane-v3/src/hooks/`
  - `apps/control-plane-v3/src/app/runtime-context-consistency.test.ts`

**Step 1: Write the failing test**

Write tests or consistency checks proving:
- management layout imports session-backed hooks only
- runtime/demo pages import runtime-backed hooks only
- generic hooks do not silently depend on runtime context unless they live under runtime scope

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/runtime-context-consistency.test.ts src/hooks/use-shell-identity.test.ts
```

Expected: failure because shared hooks still blur management/runtime concerns.

**Step 3: Write minimal implementation**

Move runtime-only identity access into explicit runtime-facing modules. Keep management-facing hooks in session/SWR land. Layout should not need to know demo implementation details.

**Step 4: Run tests**

Run the same command plus:

```bash
cd apps/control-plane-v3
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/hooks apps/control-plane-v3/src/domains/runtime apps/control-plane-v3/src/interfaces/human/layout/index.tsx
git commit -m "refactor: separate management and runtime hook layers"
```

---

### Task 4: Replace distributed workflow rules with explicit backend state transitions

**Files:**
- Modify: `apps/api/app/services/review_service.py`
- Modify: `apps/api/app/services/approval_service.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/services/capability_service.py`
- Modify: `apps/api/app/services/access_policy.py`
- Modify: `apps/api/app/routes/reviews.py`
- Modify: `apps/api/app/routes/tasks.py`
- Test: relevant `apps/api/tests/test_*.py`

**Step 1: Write the failing test**

Add tests for:
- allowed and forbidden transitions
- retry behavior after approval/rejection
- side effects that must happen atomically
- publish/review/reject paths that currently rely on route-level logic

Use focused tests like:

```python
def test_reject_transition_marks_resource_and_cleans_side_effects():
    ...
```

**Step 2: Run test to verify it fails**

Run only the targeted tests:

```bash
cd apps/api
pytest tests/test_review_queue_api.py tests/test_tasks_api.py -q
```

Expected: failures showing state logic is still spread across layers.

**Step 3: Write minimal implementation**

Move transition rules into service-level orchestration functions. Routes should only authenticate, validate request shape, and call a service method. All domain transitions should be explicit and testable.

**Step 4: Run tests**

Run:

```bash
cd apps/api
pytest tests/test_review_queue_api.py tests/test_tasks_api.py tests/test_approvals_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services apps/api/app/routes apps/api/tests
git commit -m "refactor: centralize workflow state transitions"
```

---

### Task 5: Make form/catalog contracts generated and enforce drift checks

**Files:**
- Modify: `apps/api/app/services/intake_catalog.py`
- Modify: `apps/control-plane-v3/src/lib/forms/generated/intake-catalog.json`
- Modify: `scripts/export-intake-catalog.py`
- Modify: `scripts/check-intake-drift.py`
- Modify: `apps/control-plane-v3/package.json`
- Test: contract tests already referenced by `test:contracts`

**Step 1: Write the failing test**

Add a drift test that fails when:
- backend field definitions change without generated frontend updates
- enums, placeholders, or defaults diverge

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/control-plane-v3
npm run test:contracts
```

Expected: FAIL after introducing a controlled catalog mismatch.

**Step 3: Write minimal implementation**

Treat backend intake catalog as source of truth for guided forms. Reduce hard-coded frontend field logic where catalog data is already available.

**Step 4: Run tests**

Run:

```bash
cd apps/control-plane-v3
npm run sync:contracts
npm run test:contracts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services/intake_catalog.py \
  apps/control-plane-v3/src/lib/forms/generated/intake-catalog.json \
  scripts/export-intake-catalog.py \
  scripts/check-intake-drift.py \
  apps/control-plane-v3/package.json
git commit -m "build: enforce generated form contract drift checks"
```

---

### Task 6: Strengthen frontend and backend observability around user-facing failures

**Files:**
- Modify: `apps/control-plane-v3/src/lib/logger.ts`
- Modify: `apps/control-plane-v3/src/lib/api-client.ts`
- Modify: `apps/control-plane-v3/src/components/error-boundary.tsx`
- Modify: `apps/control-plane-v3/src/app/error.tsx`
- Modify: `apps/api/app/factory.py`
- Modify: `apps/api/app/observability.py` (if present)
- Modify: `docs/guides/observability-baseline.md`
- Test: `apps/control-plane-v3/src/lib/logger.test.ts`
- Test: `apps/control-plane-v3/src/lib/api-client.test.ts`

**Step 1: Write the failing test**

Add tests for:
- correlation ID propagation
- persisted browser error entries
- request log consistency
- stable error capture in boundaries

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/lib/logger.test.ts src/lib/api-client.test.ts
```

**Step 3: Write minimal implementation**

Make correlation IDs explicit from browser to backend response logs. Prefer a bounded local persistence strategy on the frontend and structured request logging on the backend.

**Step 4: Run tests**

Run frontend targeted tests plus a small API request-log test set if available.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/logger.ts \
  apps/control-plane-v3/src/lib/api-client.ts \
  apps/control-plane-v3/src/components/error-boundary.tsx \
  apps/control-plane-v3/src/app/error.tsx \
  apps/api/app/factory.py \
  docs/guides/observability-baseline.md
git commit -m "feat: improve cross-layer error observability"
```

---

### Task 7: Collapse deployment paths into three supported modes

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/deployment-manual.md`
- Modify: `docs/guides/production-deployment.md`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `docker-compose.coolify.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `scripts/ops/verify-control-plane.sh`
- Test: `tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Add or extend ops tests that assert:
- local dev mode remains supported
- single-host production mode remains supported
- Coolify mode remains supported
- unsupported or duplicate env branches are documented as non-canonical

**Step 2: Run test to verify it fails**

Run:

```bash
pytest tests/ops/test_container_artifacts.py -q
```

**Step 3: Write minimal implementation**

Reduce deployment guidance to:
- local development
- production compose
- Coolify

Remove or clearly archive side-path instructions that are no longer canonical.

**Step 4: Run tests**

Run the ops test plus:

```bash
./scripts/ops/verify-control-plane.sh
```

**Step 5: Commit**

```bash
git add README.md docs/guides docker-compose*.yml .github/workflows/deploy.yml scripts/ops/verify-control-plane.sh tests/ops/test_container_artifacts.py
git commit -m "docs: reduce deployment branching"
```

---

### Task 8: Archive non-canonical plans and mark current authority

**Files:**
- Modify: `docs/plans/README.md`
- Modify: `README.md`
- Modify: `apps/control-plane-v3/README.md`
- Create: `docs/guides/current-architecture-authority.md`
- Optionally move outdated docs under an archival subsection

**Step 1: Write the failing test**

Add a lightweight consistency check if one exists, or write a documentation review checklist that fails CI when required canonical docs are missing.

**Step 2: Run verification**

At minimum, manually verify:
- a newcomer can identify the canonical architecture document in under 1 minute
- implementation plans are clearly marked historical vs current

**Step 3: Write minimal implementation**

Create one current authority document that says:
- where architecture truth lives
- where API truth lives
- where deployment truth lives
- which documents are archival

**Step 4: Verify**

Run markdown/link checks if available. Otherwise do targeted manual review and note it.

**Step 5: Commit**

```bash
git add docs/plans/README.md README.md apps/control-plane-v3/README.md docs/guides/current-architecture-authority.md
git commit -m "docs: establish canonical architecture authority"
```

---

### Task 9: Remove dead compatibility paths after the new boundaries hold

**Files:**
- Modify or delete deprecated runtime helpers in `apps/control-plane-v3/src/core/runtime.ts`
- Modify or delete unused route/demo shims after search confirms no references
- Modify stale tests and docs

**Step 1: Identify removable code**

Run:

```bash
cd apps/control-plane-v3
rg -n "getRuntime|initializeRuntime\\(|deprecated|TODO.*compat"
```

**Step 2: Write the failing test**

Add a regression test ensuring pages no longer bypass scoped providers or canonical hooks.

**Step 3: Remove the smallest dead slice**

Delete only code that has:
- no production references
- replacement already in place
- passing tests after removal

**Step 4: Run tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run
npm run build
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/core/runtime.ts apps/control-plane-v3/src app docs
git commit -m "refactor: remove obsolete compatibility paths"
```

---

## Release gates for the full initiative

Do not declare the complexity-reduction initiative complete until all of the following are true:

1. Management routes no longer initialize runtime/demo infrastructure.
2. Guided publish flows fully replace raw high-risk input on the main human path.
3. Backend workflow state transitions are service-owned and explicitly tested.
4. Form/catalog drift is checked automatically.
5. Correlation IDs and error logging are traceable from browser to backend logs.
6. Only three deployment modes are documented as supported.
7. Canonical architecture and operational authority docs are obvious.
8. Dead compatibility code has been removed, not just deprecated.

## Verification bundle

Minimum verification before closing the initiative:

```bash
cd apps/control-plane-v3
npm run check
npm test -- --run
npm run test:e2e -- publishing.spec.ts

cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest -q

cd /Users/lvxiaoer/Documents/codeWork/agentShare
pytest tests/ops/test_container_artifacts.py -q
./scripts/ops/verify-control-plane.sh
```

## Recommended execution order in this repository

1. Task 1
2. Task 2
3. Task 6
4. Task 3
5. Task 4
6. Task 5
7. Task 7
8. Task 8
9. Task 9

That order keeps user-facing stability first, then trims deeper architectural complexity once the workflow surface is stable.
