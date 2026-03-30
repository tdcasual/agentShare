# Capability Token Access Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add token-scoped access control for governed credentials so operators can publish secrets/capabilities to all tokens by default or restrict them to selected tokens.

**Architecture:** Introduce a reusable token access policy value object and store it on capabilities as structured JSON. Enforce the policy in the runtime gateway so both proxy invocation and lease issuance share the same authorization check. Expose the policy through the management API and a minimal control-plane UI for secret and capability creation.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js, SWR

---

### Task 1: Model the access policy

**Files:**
- Create: `apps/api/app/models/access_policy.py`
- Modify: `apps/api/app/orm/capability.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Modify: `apps/api/app/services/capability_service.py`
- Test: `apps/api/tests/test_capability_access_policy.py`

**Step 1: Write a failing test**

Cover the default `all_tokens` policy and the explicit-token policy in the capability API response.

**Step 2: Run the test to verify it fails**

Run: `./.venv/bin/pytest tests/test_capability_access_policy.py -q`

**Step 3: Write minimal implementation**

Add a reusable access policy model and persist it on capabilities.

**Step 4: Run the test to verify it passes**

Run: `./.venv/bin/pytest tests/test_capability_access_policy.py -q`

### Task 2: Enforce the policy at runtime

**Files:**
- Create: `apps/api/app/services/access_policy.py`
- Modify: `apps/api/app/services/gateway.py`
- Test: `apps/api/tests/test_invoke_api.py`
- Test: `apps/api/tests/test_lease_api.py`

**Step 1: Write failing tests**

Add runtime tests proving disallowed tokens cannot invoke or lease a capability and allowed tokens still can.

**Step 2: Run the tests to verify they fail**

Run: `./.venv/bin/pytest tests/test_invoke_api.py tests/test_lease_api.py -q`

**Step 3: Write minimal implementation**

Check the authenticated runtime token against the capability access policy inside the shared gateway authorization path.

**Step 4: Run the tests to verify they pass**

Run: `./.venv/bin/pytest tests/test_invoke_api.py tests/test_lease_api.py -q`

### Task 3: Migrate the database schema

**Files:**
- Create: `apps/api/alembic/versions/20260330_01_capability_access_policy.py`
- Test: `apps/api/tests/test_alembic_migrations.py`
- Test: `apps/api/tests/test_startup.py`

**Step 1: Write failing coverage if needed**

Ensure upgraded schemas expose the new capability access policy column.

**Step 2: Run the tests to verify they fail**

Run: `./.venv/bin/pytest tests/test_alembic_migrations.py tests/test_startup.py -q`

**Step 3: Write minimal migration**

Add the new capability column and make startup upgrade it via Alembic.

**Step 4: Run the tests to verify they pass**

Run: `./.venv/bin/pytest tests/test_alembic_migrations.py tests/test_startup.py -q`

### Task 4: Add a minimal management UI

**Files:**
- Create: `apps/control-plane-v3/src/domains/governance/api.ts`
- Create: `apps/control-plane-v3/src/domains/governance/hooks.ts`
- Create: `apps/control-plane-v3/src/domains/governance/types.ts`
- Create: `apps/control-plane-v3/src/domains/governance/index.ts`
- Modify: `apps/control-plane-v3/src/lib/api-client.ts`
- Modify: `apps/control-plane-v3/src/domains/index.ts`
- Modify: `apps/control-plane-v3/src/lib/api.ts`
- Modify: `apps/control-plane-v3/src/app/assets/page.tsx`

**Step 1: Write failing UI-safe tests if practical**

At minimum, type-driven coverage should require the new access policy types and payload shape.

**Step 2: Run type checks to verify the current code fails**

Run: `npm run typecheck`

**Step 3: Write minimal implementation**

Use the existing assets page as a management surface for listing secrets/capabilities and creating capabilities with either `all_tokens` or explicit token targeting.

**Step 4: Run type checks to verify they pass**

Run: `npm run typecheck`

### Task 5: Verify the full flow

**Files:**
- No code changes required

**Step 1: Run focused backend verification**

Run: `./.venv/bin/pytest tests/test_capability_access_policy.py tests/test_invoke_api.py tests/test_lease_api.py tests/test_alembic_migrations.py tests/test_startup.py -q`

**Step 2: Run frontend verification**

Run: `npm run typecheck`

**Step 3: Run browser smoke checks**

Open the control plane, create/list capabilities, and confirm assets/tasks/reviews still render without runtime errors.
