# V1 Release Blockers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the confirmed v1 release blockers across backend validation, production smoke/deploy consistency, and frontend API/auth routing.

**Architecture:** Keep the existing FastAPI and Next.js structure, but tighten contracts at the boundaries where production behavior drifted from local/test behavior. Backend and ops fixes stay in the main session; frontend proxy and middleware fixes are delegated in parallel with a disjoint write set.

**Tech Stack:** FastAPI, Pydantic, pytest, Next.js 15, TypeScript, Vitest, Docker Compose, Caddy, GitHub Actions.

---

### Task 1: Backend owner bootstrap password policy

**Files:**
- Modify: `apps/api/app/schemas/bootstrap.py`
- Test: `apps/api/tests/test_bootstrap_api.py`

**Step 1: Write the failing test**
- Add a test asserting `/api/bootstrap/setup-owner` rejects a password shorter than 12 characters with status `422`.

**Step 2: Run test to verify it fails**
- Run: `cd apps/api && ../../.venv/bin/pytest tests/test_bootstrap_api.py -q`
- Expected: FAIL because the current schema accepts the short password.

**Step 3: Write minimal implementation**
- Add `min_length=12` to the bootstrap password field to align owner bootstrap with invited admin account policy.

**Step 4: Run test to verify it passes**
- Run: `cd apps/api && ../../.venv/bin/pytest tests/test_bootstrap_api.py -q`
- Expected: PASS.

### Task 2: Production metrics exposure contract

**Files:**
- Modify: `ops/caddy/Caddyfile`
- Modify: `scripts/ops/smoke-test.sh`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/guides/production-operations.md`
- Modify: `docs/guides/production-deployment.md`
- Test: `tests/ops/test_container_artifacts.py`
- Test: `tests/ops/test_trial_run_readiness.py`
- Test: `tests/ops/test_deploy_workflow.py`
- Test: `tests/ops/test_production_stack.py`

**Step 1: Write or tighten failing tests**
- Update ops tests so they assert one consistent story:
  - Caddy explicitly proxies `/metrics`.
  - Deploy smoke text references the same public metric path.
  - Docs describe the same exposure model.

**Step 2: Run tests to verify they fail**
- Run: `PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_container_artifacts.py tests/ops/test_trial_run_readiness.py tests/ops/test_deploy_workflow.py tests/ops/test_production_stack.py -q`
- Expected: FAIL because current Caddy config omits `/metrics` while scripts/docs require it.

**Step 3: Write minimal implementation**
- Add `/metrics` routing to Caddy.
- Keep smoke checks aligned with the public entrypoint used by deploy.
- Update docs so operators are told the same topology the code actually deploys.

**Step 4: Run tests to verify they pass**
- Re-run the focused ops test command above.

### Task 3: Frontend production API proxy configuration

**Owner:** `kimicode`

**Files:**
- Modify: `apps/control-plane-v3/src/app/api/[...path]/route.ts`
- Modify: `apps/control-plane-v3/src/lib/backend-api-url.test.ts`
- Optional docs/tests if needed: `apps/control-plane-v3/README.md`, `tests/ops/test_demo_stack_script.py`

**Step 1: Write failing test**
- Add or extend tests to prove the proxy accepts the production env var contract, preferring `BACKEND_API_URL` when set and otherwise honoring `AGENT_CONTROL_PLANE_API_URL`.

**Step 2: Run test to verify it fails**
- Run the focused frontend test command for the added case.

**Step 3: Write minimal implementation**
- Make the route handler resolve backend origin from both env names without changing the browser-facing `/api/*` contract.

**Step 4: Run tests to verify it passes**
- Re-run focused tests, then `npm run test:unit` if touched areas warrant it.

### Task 4: Frontend middleware auth parsing and role-policy drift

**Owner:** `kimicode`

**Files:**
- Modify: `apps/control-plane-v3/src/middleware.ts`
- Modify or reuse: `apps/control-plane-v3/src/lib/role-system.ts`
- Test: add focused middleware/policy tests under `apps/control-plane-v3/src`

**Step 1: Write failing tests**
- Add tests proving:
  - the middleware can read the current two-part management session token shape,
  - the middleware and shared route-role policy do not drift on protected routes.

**Step 2: Run tests to verify they fail**
- Run focused Vitest command for the new middleware/policy tests.

**Step 3: Write minimal implementation**
- Parse the actual session token format or deliberately stop pretending to do server-side role extraction unless verified.
- Remove duplicated route-role mappings in favor of one shared source.

**Step 4: Run tests to verify they pass**
- Re-run focused middleware tests, then `npm run test:unit`.

### Task 5: Final verification

**Files:**
- No required source changes.

**Step 1: Backend and ops verification**
- Run: `cd apps/api && ../../.venv/bin/pytest tests/test_bootstrap_api.py -q`
- Run: `PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_container_artifacts.py tests/ops/test_trial_run_readiness.py tests/ops/test_deploy_workflow.py tests/ops/test_production_stack.py -q`

**Step 2: Full repo verification**
- Run: `./scripts/ops/verify-control-plane.sh`

**Step 3: Frontend delegated verification**
- Require `kimicode` to report:
  - changed files,
  - exact test commands run,
  - whether any residual frontend issues remain for post-v1 cleanup.
