# Project Optimization Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the optimization roadmap in a way that measurably improves contract consistency, test reliability, API composition, operator authentication, operator UX, and production observability without destabilizing the already-working control plane.

**Architecture:** Deliver this work in dependency order. First converge intake metadata so the API and console stop drifting. Then harden the test/runtime boundary, extract the FastAPI app factory, and strengthen management session identity. Only after those foundations are stable should we add payload-preview/template UX and deeper observability. Each task below is independently shippable and should end in a green test/build state.

**Tech Stack:** FastAPI, Next.js App Router, TypeScript, Pytest, Playwright, Postgres, Redis, Docker Compose, GitHub Actions.

---

## Execution Rules

- Do not implement this plan on `main`. Use `superpowers:using-git-worktrees` first and create an isolated branch such as `codex/project-optimization-phase1`.
- Follow `superpowers:test-driven-development` for every behavior change: write the failing test first, watch it fail, then add the minimal implementation.
- Keep commits small and phase-aligned. Do not combine intake convergence, auth refactors, and ops hardening in one commit.
- After each numbered task, run the listed verification command before moving on.

## Suggested Batch Boundaries

**Batch 1: Contract convergence**

- Task 1
- Task 2
- Task 3

**Batch 2: Reliability and application composition**

- Task 4
- Task 5

**Batch 3: Authentication and operator workflow**

- Task 6
- Task 7

**Batch 4: Production quality**

- Task 8
- Task 9

## Preparation: Create isolated workspace and prove baseline

Run these commands before Task 1:

```bash
git -C /Users/lvxiaoer/Documents/codeWork/agentShare status -sb
git -C /Users/lvxiaoer/Documents/codeWork/agentShare worktree list
```

Create the worktree using `superpowers:using-git-worktrees`, then verify the baseline inside the new worktree:

```bash
cd <new-worktree>
PYTHONPATH=apps/api pytest apps/api/tests tests/ops -q
cd apps/web && npm ci
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected baseline:

- API tests pass
- ops tests pass
- web unit tests pass
- web build passes
- Playwright passes

If any baseline command fails, stop and resolve or explicitly document the pre-existing failure before changing code.

### Task 1: Freeze intake parity with failing tests

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_intake_catalog_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/contracts.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/catalog-adapter.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/catalog-adapter.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/catalog-types.ts`

**Step 1: Write the failing test**

Add tests that assert:

- the API intake catalog exposes all resource kinds with stable variant ids;
- the web layer can normalize an `IntakeCatalogResponse` into renderer-ready contracts;
- read-only/default field semantics survive normalization;
- capability `secret_id` remains inventory-backed and is not hardcoded into static options.

The new TypeScript test should build a tiny catalog fixture that mirrors the API response shape and assert that the adapter returns contracts compatible with the current `IntakeFormRenderer`.

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_intake_catalog_api.py -q
cd apps/web && npx tsx --test lib/forms/__tests__/catalog-adapter.test.ts lib/forms/__tests__/contracts.test.ts
```

Expected:

- Python test still passes or tightens existing expectations
- TypeScript adapter test fails because the adapter layer does not exist yet

**Step 3: Write minimal implementation**

Implement:

- a web-side type for the backend catalog payload;
- a `catalog-adapter.ts` helper that converts API catalog sections/fields into `IntakeVariantContract[]`;
- normalization rules for `text`, `password`, `textarea`, `number`, `select`, `switch`, `json`, and `chips` controls;
- an extension point for capability secret inventory so runtime options can still be injected from page data.

Do not switch the pages yet. Only add the adapter and make the tests prove that the API payload can drive the renderer shape.

**Step 4: Run test to verify it passes**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_intake_catalog_api.py -q
cd apps/web && npx tsx --test lib/forms/__tests__/catalog-adapter.test.ts lib/forms/__tests__/contracts.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/tests/test_intake_catalog_api.py apps/web/lib/forms/__tests__/catalog-adapter.test.ts apps/web/lib/forms/__tests__/contracts.test.ts apps/web/lib/forms/catalog-adapter.ts apps/web/lib/forms/catalog-types.ts
git commit -m "feat(web): add intake catalog adapter foundation"
```

### Task 2: Switch management pages to use the intake catalog

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/api.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/secrets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/capabilities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/tasks/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/agents/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/agent-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/index.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`

**Step 1: Write the failing test**

Add coverage that proves:

- `/secrets`, `/capabilities`, `/tasks`, and `/agents` build their form contracts from `GET /api/intake-catalog`;
- capability forms still merge live secret inventory into the adapted catalog;
- variant switching continues to update defaults and read-only fields correctly.

Prefer extending the existing Playwright test and adding a focused unit test around the new `getIntakeCatalog()` API helper.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && npx tsx --test lib/forms/__tests__/catalog-adapter.test.ts
cd apps/web && npx playwright test tests/intake-variants.spec.ts
```

Expected: FAIL because the pages still read static local registries.

**Step 3: Write minimal implementation**

Implement:

- `getIntakeCatalog()` in `apps/web/lib/api.ts`;
- server-side fetching of the catalog in each management page;
- form component props that accept adapted contracts rather than importing static registries directly;
- minimal `IntakeFormRenderer` changes only if needed to support catalog-driven options and labels.

Keep serializer/validator behavior exactly as it is today. Only change where metadata comes from.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && npx tsx --test lib/forms/__tests__/catalog-adapter.test.ts lib/forms/__tests__/contracts.test.ts
cd apps/web && npx playwright test tests/intake-variants.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/api.ts apps/web/app/secrets/page.tsx apps/web/app/capabilities/page.tsx apps/web/app/tasks/page.tsx apps/web/app/agents/page.tsx apps/web/components/secrets-form.tsx apps/web/components/capability-form.tsx apps/web/components/task-form.tsx apps/web/components/agent-form.tsx apps/web/components/forms/intake-form-renderer.tsx apps/web/lib/forms/index.ts apps/web/tests/intake-variants.spec.ts
git commit -m "feat(web): drive intake forms from backend catalog"
```

### Task 3: Remove duplicated intake metadata and add a temporary drift guard

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/secrets-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/capabilities-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/tasks-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/agents-contracts.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/check-intake-drift.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/package.json`

**Step 1: Write the failing test**

Add a drift check that fails when:

- a web contract file still defines authoritative field labels/defaults/options already present in the API catalog;
- variant ids diverge between backend catalog and web adapters;
- CI stops running the drift check.

The Python script should exit non-zero when it detects duplicated authoritative metadata or mismatched variant lists.

**Step 2: Run test to verify it fails**

Run:

```bash
python scripts/check-intake-drift.py
```

Expected: FAIL because duplicated registry metadata still exists.

**Step 3: Write minimal implementation**

Refactor resource-specific contract files so they keep only:

- serializers;
- resource-specific validators;
- capability secret-option injection helpers.

Then wire the drift script into CI and optionally expose it as:

```json
"test:contracts": "python ../../scripts/check-intake-drift.py"
```

inside `apps/web/package.json`.

**Step 4: Run test to verify it passes**

Run:

```bash
python scripts/check-intake-drift.py
PYTHONPATH=apps/api pytest apps/api/tests/test_intake_catalog_api.py -q
cd apps/web && npm run test:unit
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/forms/secrets-contracts.ts apps/web/lib/forms/capabilities-contracts.ts apps/web/lib/forms/tasks-contracts.ts apps/web/lib/forms/agents-contracts.ts scripts/check-intake-drift.py .github/workflows/ci.yml apps/web/package.json
git commit -m "chore: eliminate intake metadata drift"
```

### Task 4: Make Playwright database lifecycle deterministic

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/playwright.config.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/setup/test-db.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/package.json`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/helpers.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`

**Step 1: Write the failing test**

Add test coverage or assertions that prove:

- each Playwright run gets a unique database file or temp directory;
- cleanup happens even on failure paths where possible;
- the API server command does not leave repo-root sqlite files behind.

At minimum, add a unit-style helper test for the temp-path generator and a config assertion that the path is rooted under the OS temp directory.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && npx tsx --test tests/setup/test-db.ts
```

Expected: FAIL because the temp DB helper does not exist and the current config still points at `../../agent_share_playwright_$$.db`.

**Step 3: Write minimal implementation**

Implement:

- a helper that creates a deterministic temp directory per Playwright worker or process;
- config wiring so `DATABASE_URL` points into that temp location;
- best-effort cleanup hooks;
- an npm script if needed for local cleanup.

Do not change test behavior or page semantics.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && npx tsx --test tests/setup/test-db.ts
cd apps/web && npx playwright test tests/intake-variants.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests/setup/test-db.ts apps/web/package.json apps/web/tests/helpers.ts apps/web/tests/intake-variants.spec.ts
git commit -m "test(web): isolate playwright database lifecycle"
```

### Task 5: Extract the FastAPI application factory

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_app_factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/config.py`

**Step 1: Write the failing test**

Add tests that assert:

- `create_app()` returns a FastAPI app with `/healthz`, `/metrics`, `/api/session/login`, and `/api/intake-catalog` mounted;
- lifespan startup still seeds the bootstrap agent once;
- tests can create an app instance without importing a globally initialized `app` object.

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_app_factory.py apps/api/tests/test_session_auth.py -q
```

Expected: FAIL because `create_app()` does not exist and `conftest.py` imports `app` directly from `app.main`.

**Step 3: Write minimal implementation**

Implement:

- `create_app(settings: Settings | None = None) -> FastAPI`;
- route-registration helpers in `app/routes/__init__.py`;
- app-level middleware registration inside the factory;
- `app.main` as a tiny module that instantiates `app = create_app()`.

Update tests to call the factory where practical, but keep the public `app` import working for uvicorn.

**Step 4: Run test to verify it passes**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_app_factory.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/main.py apps/api/app/factory.py apps/api/app/routes/__init__.py apps/api/tests/conftest.py apps/api/tests/test_app_factory.py apps/api/app/config.py
git commit -m "refactor(api): extract application factory"
```

### Task 6: Introduce a first-class management session identity model

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/sessions.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`

**Step 1: Write the failing test**

Add tests that assert:

- session tokens carry a stable identity payload instead of the hardcoded `"management"` subject only;
- decoding rejects malformed version data and missing required claims;
- `/api/session/me` returns the normalized operator identity and role from the token;
- logout still invalidates the cookie path correctly.

Start with one operator model only, for example `actor_id`, `role`, `auth_method`, `issued_at`, `expires_at`, and `ver`.

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py -q
```

Expected: FAIL because the richer identity payload and decoder validation do not exist yet.

**Step 3: Write minimal implementation**

Implement:

- a typed management-session payload model;
- issuance/decoding helpers that validate required claims and version;
- `ManagementIdentity` hydration from the typed payload instead of raw dict access;
- route responses that surface the normalized identity fields.

Do not implement RBAC yet. Stay focused on identity clarity and session correctness.

**Step 4: Run test to verify it passes**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/auth.py apps/api/app/services/session_service.py apps/api/app/routes/session.py apps/api/app/schemas/sessions.py apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py
git commit -m "feat(api): normalize management session identity"
```

### Task 7: Harden the console login/session flow around the richer identity

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/login/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/management-session.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/management-session.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/helpers.ts`

**Step 1: Write the failing test**

Add coverage that proves:

- login persists the management cookie and follows the intended redirect;
- session expiry or invalid-cookie states send the operator back to `/login`;
- the UI can display clearer operator/session-state feedback based on `/api/session/me`.

Use Playwright for the end-to-end login state and a focused server-action or helper test for cookie parsing if needed.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && npx playwright test tests/management-session.spec.ts
```

Expected: FAIL because the new identity-aware UI and session-expiry handling are not implemented yet.

**Step 3: Write minimal implementation**

Implement:

- login-page copy and error handling that reflects session expiry explicitly;
- management-session helper updates that align with the richer `/api/session/me` contract;
- server-action handling that clears bad cookies and redirects predictably.

Keep UX changes small and trust-oriented. Do not redesign the whole login experience.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && npx playwright test tests/management-session.spec.ts tests/intake-variants.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/login/page.tsx apps/web/app/actions.ts apps/web/lib/management-session.ts apps/web/tests/management-session.spec.ts apps/web/tests/helpers.ts
git commit -m "feat(web): harden management session flow"
```

### Task 8: Add payload preview and reusable intake templates

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-payload-preview.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-template-menu.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/agent-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/utils.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-preview.spec.ts`

**Step 1: Write the failing test**

Add tests that assert:

- the current form state renders a live payload preview before submit;
- switching variants updates the preview immediately;
- applying a saved local template hydrates the form and updates the preview;
- advanced fields only appear in the preview when populated.

Templates can be browser-local in the first pass. Do not add a backend template store yet.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && npx playwright test tests/intake-preview.spec.ts
```

Expected: FAIL because no preview/template UI exists.

**Step 3: Write minimal implementation**

Implement:

- a read-only payload preview component fed by `currentContract.serialize(values)`;
- lightweight local template persistence keyed by `resourceKind` and `variant`;
- small form-level controls for saving and reapplying a template.

Do not change server actions or API payload schema in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && npx playwright test tests/intake-preview.spec.ts tests/intake-variants.spec.ts
cd apps/web && npm run build
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/forms/intake-form-renderer.tsx apps/web/components/forms/intake-payload-preview.tsx apps/web/components/forms/intake-template-menu.tsx apps/web/components/secrets-form.tsx apps/web/components/capability-form.tsx apps/web/components/task-form.tsx apps/web/components/agent-form.tsx apps/web/lib/forms/utils.ts apps/web/tests/intake-preview.spec.ts
git commit -m "feat(web): add intake payload previews and templates"
```

### Task 9: Expand observability and deployment verification

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_metrics_observability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Add tests that assert:

- request logs emit stable keys such as request id, method, path, status, and duration;
- `/metrics` includes at least request-count and error-count style counters in addition to uptime;
- deploy documentation and workflow continue to advertise smoke verification and operational expectations;
- ops tests fail if observability docs or workflow hooks regress.

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_metrics_observability.py tests/ops/test_container_artifacts.py -q
```

Expected: FAIL because metrics are still minimal and log/request correlation is not asserted yet.

**Step 3: Write minimal implementation**

Implement:

- a simple request id or correlation id in the API middleware;
- in-memory counters or another lightweight metric path that augments the Prometheus payload;
- doc updates describing what operators should inspect during incidents;
- deploy workflow/doc alignment if new observability expectations are added.

Keep this task lightweight. Do not introduce a full tracing stack here.

**Step 4: Run test to verify it passes**

Run:

```bash
PYTHONPATH=apps/api pytest apps/api/tests/test_metrics_observability.py tests/ops/test_container_artifacts.py -q
PYTHONPATH=apps/api pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/main.py apps/api/app/routes/metrics.py apps/api/tests/test_metrics_observability.py .github/workflows/deploy.yml docs/guides/production-operations.md docs/guides/production-security.md tests/ops/test_container_artifacts.py
git commit -m "ops: deepen observability and deployment verification"
```

## Final Verification Before Merge

After Task 9, run the full project verification suite from the worktree:

```bash
cd <worktree-root>
PYTHONPATH=apps/api pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected final result:

- API tests pass
- ops tests pass
- web unit tests pass
- web build passes
- Playwright passes

## Merge Sequence

Merge in this order if splitting across branches:

1. intake convergence branch
2. playwright reliability branch
3. app factory branch
4. auth/session branch
5. preview/templates branch
6. observability branch

This order reduces merge conflicts in:

- `apps/web/components/forms/intake-form-renderer.tsx`
- `apps/web/app/actions.ts`
- `apps/api/app/main.py`
- `apps/api/tests/conftest.py`
- `.github/workflows/ci.yml`

## Success Criteria

The plan is complete when all of the following are true:

- intake metadata is no longer silently duplicated across API and web layers;
- Playwright no longer depends on brittle repo-root sqlite artifacts;
- FastAPI can be composed through `create_app()` and tested without a globally imported singleton;
- management sessions carry a clear normalized identity contract;
- operators can preview and reuse intake payloads before submit;
- observability is stronger than simple uptime-only metrics;
- the full verification suite passes before merge.
