# Human Console And Agent Workbench Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the management frontend into a human operator console where people can create in-project agents, configure governed capabilities, chat with agents, publish work, and always receive clear feedback when any publish/create action fails.

**Architecture:** Keep the FastAPI backend as the agent-facing control plane and governance API. Reframe the Next.js frontend as a human-first console that translates API/domain fields into guided workflows, removes broad slogan content, and exposes project agents plus workbench conversations as the primary path. Stabilize mutation behavior before larger UI restructuring so failures are visible during the whole refactor.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Alembic, Next.js App Router, React, SWR, Vitest, Testing Library, Pytest.

---

## Phase 0: Baseline And Scope Lock

### Task 0.1: Record The Current Frontend Surface

**Files:**
- Read: `apps/control-plane-v3/src/app/page.tsx`
- Read: `apps/control-plane-v3/src/app/identities/page.tsx`
- Read: `apps/control-plane-v3/src/app/identities/[agentId]/page.tsx`
- Read: `apps/control-plane-v3/src/app/assets/page.tsx`
- Read: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Read: `apps/control-plane-v3/src/app/tokens/page.tsx`
- Read: `apps/control-plane-v3/src/app/runs/page.tsx`
- Read: `apps/control-plane-v3/src/i18n/messages/en.json`
- Read: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`

**Step 1: Create a removal inventory**

List every always-visible slogan/workflow/explainer section in:
- Hub workflow card
- Identities workflow card
- Tokens workflow card
- Tasks workflow card
- Runs workflow card
- Any header descriptions that repeat the same concept as the page title

**Step 2: Classify each item**

Use these labels:
- `remove`: broad slogan content that does not help the current task
- `move-to-empty-state`: useful only before data exists
- `move-to-error-state`: useful only when a failure occurs
- `keep`: concrete operational status, filter, count, or action

**Step 3: Commit**

No code change in this task unless the inventory is stored. If storing it, append a short section to this plan or create a follow-up audit note.

**Removal inventory recorded 2026-04-29:**

- Hub workflow card (`hub.workflow.*`): `remove`. It is an always-visible explainer/navigation sequence. Replace later with concrete primary actions and operational sections. Keep quick actions, pending review list, and control-surface status as concrete operational content.
- Identities workflow card (`identities.workflow.*` and `WorkflowStepCard`): `remove`. It repeats onboarding-style routing guidance above the actual identity and agent lists. Keep search, refresh, focused identity, coverage metrics, human operators, and agent workspaces.
- Tokens workflow card (`tokens.workflow.*` and `WorkflowStepLink`): `remove`. It is broad guidance once token data/actions are visible. Keep token list, create/reveal actions, filters, metrics, and failure/relogin states.
- Tasks workflow card (`tasks.workflow.*` and `WorkflowLinkCard`): `remove`. It is persistent routing copy rather than task publishing or supervision work. Keep publish action, filters, metrics, task cards, target status, and task error states.
- Runs workflow card (`runs.workflow.*` and `RunsWorkflowCard`): `remove`. It is always-visible navigation copy on an execution-history page. Keep run filters, stats, run cards, and run detail modal.
- Header descriptions that restate page purpose on Hub/Identities/Assets/Tasks/Tokens/Runs: `remove` when duplicative during Phase 3. Keep descriptions only when they communicate a concrete status, permission boundary, empty-state instruction, or failure recovery path.
- Empty inventory explanations such as no secrets/capabilities/tasks/tokens/runs: `move-to-empty-state`. They are useful before data exists, not as persistent panels.
- Backend/session failure explanations and expired-session recovery copy: `move-to-error-state`. Keep them close to the failed action/query.
- Metrics, counts, filters, search, refresh, create/publish/reveal/review buttons, pending review lists, and live status cards: `keep`.

---

## Phase 1: Make Publish/Create Failures Impossible To Miss

### Task 1.1: Remove False Success From Task Publishing

**Files:**
- Modify: `apps/control-plane-v3/src/domains/task/hooks.ts`
- Test: `apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Test: `apps/control-plane-v3/src/domains/task/hooks.test.tsx` if a hook test file already exists, otherwise keep coverage in page tests.

**Problem:** `useCreateTask` currently inserts an optimistic draft task before the API call. If the API fails, the fake task can remain in the UI and the user may believe publishing succeeded.

**Step 1: Write failing test**

Add a test where task creation rejects with `new ApiError(500, 'Task backend unavailable')`.

Expected behavior:
- The create modal remains open.
- The error text is visible inside the modal.
- No new task card is visible.

**Step 2: Run failing test**

Run:

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/tasks/page.test.tsx
```

Expected: FAIL because the optimistic mutation can display fake success or cache state can remain stale.

**Step 3: Implement minimal fix**

In `useCreateTask`, remove the optimistic `mutate('/api/tasks', ...)` block. Call `api.createTask(taskData)` first, then `await mutate('/api/tasks')` only after the API succeeds.

**Step 4: Run tests**

Run:

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/tasks/page.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/task/hooks.ts apps/control-plane-v3/src/app/tasks/page.test.tsx
git commit -m "fix: avoid false task publish success"
```

### Task 1.2: Add A Shared Mutation Feedback Pattern

**Files:**
- Create: `apps/control-plane-v3/src/shared/mutations/use-mutation-feedback.ts`
- Create: `apps/control-plane-v3/src/shared/mutations/mutation-alert.tsx`
- Test: `apps/control-plane-v3/src/shared/mutations/use-mutation-feedback.test.tsx`
- Test: `apps/control-plane-v3/src/shared/mutations/mutation-alert.test.tsx`

**Goal:** Every create/publish/update/revoke action gets consistent pending, success, and error state.

**Behavior:**
- `error`: string shown as `role="alert"`
- `success`: string shown as `role="status"`
- `isSubmitting`: boolean
- `runMutation(fn, messages)`: wraps try/catch/finally
- ApiError detail is shown exactly.
- Unknown errors fall back to localized copy.

**Step 1: Write tests**

Test:
- ApiError detail is preserved.
- non-Error unknown fallback is used.
- success message is set only after mutation resolves.
- previous error clears before a new attempt.

**Step 2: Implement hook and alert component**

Keep the implementation small. Do not add a toast library yet. Use inline alert/status blocks so modals and forms remain self-contained.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/shared/mutations/use-mutation-feedback.test.tsx src/shared/mutations/mutation-alert.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/shared/mutations
git commit -m "feat: add shared mutation feedback"
```

### Task 1.3: Apply Mutation Feedback To Asset Publishing

**Files:**
- Modify: `apps/control-plane-v3/src/app/assets/use-assets-form.ts`
- Modify: `apps/control-plane-v3/src/app/assets/page.tsx`
- Test: `apps/control-plane-v3/src/app/assets/page.test.tsx`

**Current issues:**
- Secret/capability errors exist but are page-level or generic.
- Success is silent.
- Human-created assets may become active immediately while agent-created assets may become pending review; the UI should name the result.

**Step 1: Add failing tests**

Test secret create failure:
- API rejects with `ApiError(503, 'Secret backend unavailable')`.
- Modal remains open.
- `Secret backend unavailable` appears in `role="alert"`.

Test capability create failure:
- API rejects with `ApiError(400, 'Secret not found')`.
- Modal remains open.
- `Secret not found` appears in `role="alert"`.

Test success:
- Secret create resolves with `publication_status: 'active'`.
- A `role="status"` message says the secret was created.

**Step 2: Implement**

Use the shared feedback hook or match its interface if Task 1.2 is not yet merged. Display alerts inside the active modal, directly above form actions.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/assets/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/assets/use-assets-form.ts apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/app/assets/page.test.tsx
git commit -m "fix: surface asset publish failures"
```

### Task 1.4: Apply Mutation Feedback To Agent And Workbench Actions

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/agent-modal.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.tsx`
- Test: `apps/control-plane-v3/src/app/identities/page.test.tsx`
- Test: `apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx`

**Step 1: Add failing tests**

Test:
- Agent creation failure keeps modal open and shows backend detail.
- Workbench session creation failure shows error in the new-session panel.
- Message send failure keeps composer content and shows error.

**Step 2: Implement**

Use shared mutation feedback. Do not close modals/panels on failure. Clear success/error when the user edits the relevant form field.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/identities/page.test.tsx src/app/identities/[agentId]/workbench-panel.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/identities/agent-modal.tsx apps/control-plane-v3/src/app/identities/page.tsx apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.tsx apps/control-plane-v3/src/app/identities/page.test.tsx apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx
git commit -m "fix: show agent operation failures"
```

---

## Phase 2: Replace Manual Type Fields With Human Choices

### Task 2.1: Add Frontend Option Catalogs

**Files:**
- Create: `apps/control-plane-v3/src/lib/option-catalogs.ts`
- Create: `apps/control-plane-v3/src/lib/option-catalogs.test.ts`

**Catalogs:**
- `TASK_TYPE_OPTIONS`: `account_read`, `config_sync`, `prompt_run`, `analysis`, `deployment`
- `TASK_PRIORITY_OPTIONS`: `low`, `normal`, `high`, `critical`
- `SECRET_KIND_OPTIONS`: `api_token`, `oauth_token`, `webhook_secret`, `ssh_key`, `password`
- `PROVIDER_OPTIONS`: `openai`, `anthropic`, `deepseek`, `github`, `generic_http`
- `ENVIRONMENT_OPTIONS`: `development`, `staging`, `production`
- `AGENT_MODEL_OPTIONS`: start with known current models used by the project, plus empty/default
- `THINKING_LEVEL_OPTIONS`: align with backend defaults, not current mismatched labels
- `SANDBOX_MODE_OPTIONS`: align with backend defaults, not current mismatched labels
- `AUTH_METHOD_OPTIONS`: include `openclaw_session` as the default

**Step 1: Write tests**

Assert:
- All option values are unique.
- `openclaw_session` is the default auth method.
- `workspace-write` is present as a sandbox option.
- `balanced` is present as a thinking option.

**Step 2: Implement catalog**

Each option should include:

```ts
{
  value: string;
  labelKey: string;
  descriptionKey?: string;
}
```

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/lib/option-catalogs.test.ts
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/lib/option-catalogs.ts apps/control-plane-v3/src/lib/option-catalogs.test.ts apps/control-plane-v3/src/i18n/messages/en.json apps/control-plane-v3/src/i18n/messages/zh-CN.json
git commit -m "feat: add frontend option catalogs"
```

### Task 2.2: Replace Task Type Text Input With Select

**Files:**
- Modify: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tasks/use-tasks-form.ts`
- Test: `apps/control-plane-v3/src/app/tasks/page.test.tsx`

**Step 1: Add failing test**

Assert:
- Task type is a combobox/select.
- Selecting `config_sync` sends `task_type: 'config_sync'`.
- Freeform typing into task type is not required.

**Step 2: Implement**

Replace the `Input` for `tasks.form.taskType` with a select driven by `TASK_TYPE_OPTIONS`.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/tasks/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/tasks/page.tsx apps/control-plane-v3/src/app/tasks/use-tasks-form.ts apps/control-plane-v3/src/app/tasks/page.test.tsx
git commit -m "feat: choose task types from catalog"
```

### Task 2.3: Replace Asset Type Fields With Selectors

**Files:**
- Modify: `apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `apps/control-plane-v3/src/app/assets/use-assets-form.ts`
- Test: `apps/control-plane-v3/src/app/assets/page.test.tsx`

**Step 1: Add failing tests**

Assert:
- Secret kind is a select.
- Provider is a select.
- Environment is an optional select with a blank option.
- Capability required provider can default from selected secret.

**Step 2: Implement**

Use `SECRET_KIND_OPTIONS`, `PROVIDER_OPTIONS`, and `ENVIRONMENT_OPTIONS`.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/assets/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/app/assets/use-assets-form.ts apps/control-plane-v3/src/app/assets/page.test.tsx
git commit -m "feat: choose asset types from catalogs"
```

### Task 2.4: Replace Agent Freeform Policy Lists With Pickers

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/agent-modal.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Test: `apps/control-plane-v3/src/app/identities/page.test.tsx`

**Step 1: Add failing tests**

Assert:
- Auth method defaults to `openclaw_session`.
- Thinking level options include `balanced`.
- Sandbox options include `workspace-write`.
- Allowed capability ids are selected from existing capabilities, not comma-typed.
- Allowed task types are selected from `TASK_TYPE_OPTIONS`.

**Step 2: Implement**

Pass available capabilities into `AgentModal`. Replace comma fields with checkbox/multi-select groups.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/identities/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/identities/agent-modal.tsx apps/control-plane-v3/src/app/identities/page.tsx apps/control-plane-v3/src/app/identities/page.test.tsx
git commit -m "feat: configure agents with guided selectors"
```

---

## Phase 3: Reframe The Frontend Around Human Operator Work

### Task 3.1: Remove Always-Visible Workflow Slogan Cards

**Files:**
- Modify: `apps/control-plane-v3/src/app/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tokens/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/runs/page.tsx`
- Modify: `apps/control-plane-v3/src/i18n/messages/en.json`
- Modify: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`
- Test: corresponding page tests

**Step 1: Update tests**

Remove tests that assert workflow slogan cards exist. Replace with tests for concrete controls:
- Hub shows primary actions: create agent, open assets, publish task, review queue.
- Tasks page shows publish button, filters, task cards.
- Runs page shows run filters and run cards.
- Tokens page shows token list and create/reveal actions.
- Identities page shows human operators and agent workspaces.

**Step 2: Implement removal**

Remove always-visible workflow card components and unused translation keys.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/page.test.tsx src/app/identities/page.test.tsx src/app/tokens/page.test.tsx src/app/tasks/page.test.tsx src/app/runs/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app apps/control-plane-v3/src/i18n/messages/en.json apps/control-plane-v3/src/i18n/messages/zh-CN.json
git commit -m "refactor: remove slogan workflow panels"
```

### Task 3.2: Make Hub A Concrete Operations Dashboard

**Files:**
- Modify: `apps/control-plane-v3/src/app/page.tsx`
- Test: `apps/control-plane-v3/src/app/page.test.tsx`

**Target layout:**
- First row: operational counts and health
- Primary action bar: `Create agent`, `Configure capability`, `Publish task`, `Review pending`
- Agent activity section
- Pending human decisions section
- Recent failures section if backend data supports it

**Step 1: Write tests**

Assert the primary actions link to:
- `/identities` or open create agent action if implemented in-page
- `/assets`
- `/tasks`
- `/reviews`

**Step 2: Implement**

Use existing hooks. Avoid large descriptive paragraphs. Labels should be short action names.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/page.tsx apps/control-plane-v3/src/app/page.test.tsx
git commit -m "refactor: make hub action oriented"
```

---

## Phase 4: Make In-Project Agents The Primary Human Workflow

### Task 4.1: Promote Agent Creation On Identities Page

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/ai-agents-section.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/agent-management-card.tsx`
- Test: `apps/control-plane-v3/src/app/identities/page.test.tsx`

**Target behavior:**
- Empty state has a direct `Create project agent` button.
- Agent cards have clear actions: `Open`, `Chat`, `Edit`, `Delete`.
- `Chat` links to `/identities/{agentId}?tab=workbench` or directly sets the detail tab after routing support exists.

**Step 1: Write tests**

Assert:
- Empty agent list shows create button.
- Existing agent card has an `Open` link to detail page.
- Existing agent card has a `Chat` link/action.

**Step 2: Implement**

Keep existing detail page and workbench. Do not build a new chat backend.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/identities/page.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/identities/page.tsx apps/control-plane-v3/src/app/identities/ai-agents-section.tsx apps/control-plane-v3/src/app/identities/agent-management-card.tsx apps/control-plane-v3/src/app/identities/page.test.tsx
git commit -m "feat: promote project agent actions"
```

### Task 4.2: Support Direct Workbench Tab Routing

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/[agentId]/page.tsx`
- Test: `apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx`
- Add test if detail page lacks coverage.

**Step 1: Write failing test**

Navigate with `?tab=workbench` and assert the workbench panel is selected.

**Step 2: Implement**

Read `useSearchParams`. Initialize active tab from `tab` if it matches `TABS`. When a tab changes, optionally update query params.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/identities/[agentId]/workbench-panel.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/identities/[agentId]/page.tsx apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx
git commit -m "feat: route directly to agent workbench"
```

### Task 4.3: Improve Workbench Session Setup

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.tsx`
- Test: `apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx`

**Target behavior:**
- If no OpenAI capability is available, show an actionable empty state linking to `/assets`.
- If capabilities exist, new conversation requires only a title and capability selection.
- Message send failure keeps the typed message.
- Conversation creation success selects the new conversation.

**Step 1: Add failing tests**

Cover no-capabilities state and send failure preserving composer text.

**Step 2: Implement**

Use existing `useCapabilities`, `createAgentWorkbenchSession`, and `sendWorkbenchMessage`.

**Step 3: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/identities/[agentId]/workbench-panel.test.tsx
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.tsx apps/control-plane-v3/src/app/identities/[agentId]/workbench-panel.test.tsx
git commit -m "feat: guide agent workbench setup"
```

---

## Phase 5: Clarify API Audience And Response Semantics

### Task 5.1: Normalize Frontend Handling Of 201 vs 202

**Files:**
- Modify: `apps/control-plane-v3/src/lib/api-client.ts`
- Modify: `apps/control-plane-v3/src/domains/governance/api.ts`
- Modify: `apps/control-plane-v3/src/domains/task/api.ts`
- Test: `apps/control-plane-v3/src/lib/api-client.test.ts`

**Goal:** The frontend should know when a runtime-agent submission became pending review versus when a human action published immediately.

**Step 1: Write failing tests**

Test that `apiFetchWithMeta` or equivalent returns:
- `data`
- `status`
- `ok`

**Step 2: Implement cautiously**

Do not break existing `apiFetch<T>`. Add a sibling helper like:

```ts
export async function apiFetchWithMeta<T>(...): Promise<{ data: T; status: number }>
```

Use it only where the UI needs status semantics.

**Step 3: Apply to governance and task create calls**

Create responses can set success copy:
- 201: `Published`
- 202: `Submitted for review`

**Step 4: Run tests**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/lib/api-client.test.ts src/app/assets/page.test.tsx src/app/tasks/page.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/api-client.ts apps/control-plane-v3/src/domains/governance/api.ts apps/control-plane-v3/src/domains/task/api.ts apps/control-plane-v3/src/lib/api-client.test.ts apps/control-plane-v3/src/app/assets/page.test.tsx apps/control-plane-v3/src/app/tasks/page.test.tsx
git commit -m "feat: expose publish response status to frontend"
```

### Task 5.2: Add Backend Option Catalog Endpoint If Static Catalog Is Not Enough

**Files:**
- Create: `apps/api/app/routes/options.py`
- Create: `apps/api/app/schemas/options.py`
- Modify: `apps/api/app/factory.py`
- Test: `apps/api/tests/test_options_api.py`
- Modify frontend catalog hooks only if needed.

**Only do this if Phase 2 reveals static frontend catalogs are insufficient.**

**Endpoint shape:**

```json
{
  "task_types": ["account_read", "config_sync", "prompt_run"],
  "secret_kinds": ["api_token", "oauth_token"],
  "providers": ["openai", "anthropic", "github"],
  "agent": {
    "thinking_levels": ["balanced", "low", "high"],
    "sandbox_modes": ["workspace-write", "read-only"],
    "auth_methods": ["openclaw_session"]
  }
}
```

**Step 1: Write API test**

Assert management session can read options and unauthenticated callers cannot.

**Step 2: Implement route and schema**

Keep it read-only. Do not add persistence yet.

**Step 3: Run tests**

```bash
cd apps/api
uv run pytest tests/test_options_api.py tests/test_app_factory.py
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/api/app/routes/options.py apps/api/app/schemas/options.py apps/api/app/factory.py apps/api/tests/test_options_api.py
git commit -m "feat: expose management option catalog"
```

---

## Phase 6: Final Quality Pass

### Task 6.1: Run Focused Regression Suite

**Files:**
- No code changes unless failures are found.

**Commands:**

```bash
cd apps/control-plane-v3
npm run test:unit -- src/app/page.test.tsx src/app/identities/page.test.tsx src/app/identities/[agentId]/workbench-panel.test.tsx src/app/assets/page.test.tsx src/app/tasks/page.test.tsx src/app/tokens/page.test.tsx src/app/runs/page.test.tsx src/lib/api-client.test.ts src/lib/option-catalogs.test.ts
```

```bash
cd apps/api
uv run pytest tests/test_openclaw_agents_api.py tests/test_openclaw_workbench_api.py tests/test_tasks_api.py tests/test_access_tokens_api.py tests/test_app_factory.py tests/test_openapi_contract.py
```

Expected: all tests pass.

### Task 6.2: Run Full Frontend Static Checks

**Files:**
- No code changes unless failures are found.

**Commands:**

```bash
cd apps/control-plane-v3
npm run typecheck
npm run lint
npm run format:check
```

Expected: all checks pass.

### Task 6.3: Manual Browser Smoke

**Use:** browser-use/browser or Playwright.

**Flows:**
- Login.
- Create project agent.
- Configure secret and capability.
- Open agent detail and workbench.
- Create conversation.
- Send message.
- Publish task to token.
- Force one failed publish path and confirm visible error.

**Expected:**
- No blank screens.
- No invisible failures.
- No slogan panels in main workflow surfaces.
- All type-like inputs use select/multiselect or structured controls.

### Task 6.4: Final Commit Or PR

If all phases were committed individually, create a final summary commit only for docs if needed. Otherwise stop after the last functional commit.

Final verification:

```bash
git status --short
git log --oneline --max-count=10
```

Expected:
- Worktree clean.
- Commits are small and readable.

---

## Non-Goals

- Do not replace the backend agent runtime API.
- Do not remove remote access tokens; keep them as external runtime credentials.
- Do not build a new chat backend; use existing OpenClaw workbench routes.
- Do not add a toast dependency unless inline alerts prove insufficient.
- Do not make every option server-driven in the first pass.

## Product Acceptance Criteria

- A human operator can create an in-project agent without typing API enum values.
- A human operator can configure a capability and understand whether it is active or pending review.
- A human operator can open an agent page and start a workbench conversation.
- Any failed publish/create/send action leaves the user on the same surface and shows a clear error.
- Task publishing no longer shows optimistic fake success.
- Type-like fields use dropdowns, radio groups, checkboxes, or multiselect controls.
- Main pages prioritize actions, data, status, and failures over broad explanatory copy.
- The backend remains agent-server-first: API routes continue serving runtime agents directly while frontend speaks human language.
