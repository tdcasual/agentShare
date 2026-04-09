# Frontend Backend Contract Drift Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove transport-model drift between the API and `control-plane-v3` for tasks, runs, agent tokens, and token feedback without changing product behavior.

**Architecture:** Keep the backend response shapes stable unless a small contract clarification is needed, and make the frontend honest by separating snake_case transport DTOs from UI-facing models. Route-facing hooks should fetch transport DTOs, transform them in one place, and expose consistent models to pages and composite hooks. Add explicit regression tests on both sides so drift becomes visible immediately.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, SWR, TypeScript, Vitest, Pytest

---

### Task 1: Freeze The Current Backend Transport Contract

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_tasks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runs_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_agent_tokens_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_token_feedback_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_openapi_contract.py`

**Step 1: Write the failing test**

Add assertions that the current public transport remains snake_case and does not silently promise extra camelCase fields for:
- `/api/tasks`
- `/api/runs`
- `/api/agent-tokens/bulk`
- `/api/token-feedback/bulk`

**Step 2: Run test to verify it fails**

Run:

```bash
.venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py apps/api/tests/test_agent_tokens_api.py apps/api/tests/test_token_feedback_api.py apps/api/tests/test_openapi_contract.py -q
```

Expected: fail if the current transport is not explicitly characterized yet.

**Step 3: Write minimal implementation**

If tests fail because the backend contract is currently underspecified, make the minimum backend test or schema adjustment needed so the contract is explicit. Do not redesign the API.

**Step 4: Run test to verify it passes**

Run:

```bash
.venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py apps/api/tests/test_agent_tokens_api.py apps/api/tests/test_token_feedback_api.py apps/api/tests/test_openapi_contract.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py apps/api/tests/test_agent_tokens_api.py apps/api/tests/test_token_feedback_api.py apps/api/tests/test_openapi_contract.py
git commit -m "test(api): freeze transport response contracts"
```

### Task 2: Introduce Honest Task Domain Transport Types And Transformers

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/task/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/task/hooks.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/task/hooks-dashboard.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/task/api.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/task/transformers.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/composite-hooks-safety.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- task hooks transform snake_case API payloads into stable UI models
- dashboard code no longer relies on raw mixed-shape task/token/feedback objects
- the tasks page still renders with transformed models

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:unit -- src/app/tasks/page.test.tsx src/app/composite-hooks-safety.test.ts
```

Expected: FAIL until the task domain exposes a real transport-to-model boundary.

**Step 3: Write minimal implementation**

Implement:
- explicit transport DTOs for task domain resources
- one canonical mapper from transport DTOs to frontend models
- hook-level transformation before data reaches pages
- compatibility-preserving optimistic task creation logic

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:unit -- src/app/tasks/page.test.tsx src/app/composite-hooks-safety.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/task/types.ts apps/control-plane-v3/src/domains/task/hooks.ts apps/control-plane-v3/src/domains/task/hooks-dashboard.ts apps/control-plane-v3/src/domains/task/api.ts apps/control-plane-v3/src/domains/task/transformers.ts apps/control-plane-v3/src/app/tasks/page.test.tsx apps/control-plane-v3/src/app/composite-hooks-safety.test.ts
git commit -m "refactor(web): separate task transport dto from ui model"
```

### Task 3: Align Identity Token Consumption With Real Transport Shapes

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/identity/api.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/identity/hooks.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/tokens/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/identities/page.test.tsx`

**Step 1: Write the failing test**

Add assertions that bulk token loading and identity views work from snake_case transport responses instead of assuming camelCase runtime fields.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:unit -- src/app/tokens/page.test.tsx src/app/identities/page.test.tsx
```

Expected: FAIL if identity flows still depend on mixed transport/model shapes.

**Step 3: Write minimal implementation**

Keep API paths unchanged, but return or normalize token records through one honest transport boundary before they reach hooks and pages.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:unit -- src/app/tokens/page.test.tsx src/app/identities/page.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/identity/api.ts apps/control-plane-v3/src/domains/identity/hooks.ts apps/control-plane-v3/src/app/tokens/page.test.tsx apps/control-plane-v3/src/app/identities/page.test.tsx
git commit -m "refactor(web): normalize identity token transport"
```

### Task 4: Full Drift Verification

**Files:**
- Modify only if verification exposes an actual regression

**Step 1: Run contract verification**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:contracts
.venv/bin/pytest -q
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run test:unit
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run build
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run check
```

Expected: all pass.

**Step 2: Fix only real drift regressions**

If any verification fails, fix the smallest mismatch and rerun the same command until green.

**Step 3: Commit**

```bash
git add -A
git commit -m "test: verify frontend backend contract alignment"
```
