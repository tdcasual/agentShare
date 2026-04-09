# Controlled Dream Mode V1 Implementation Plan

This plan assumes the current **agent server first** baseline remains intact. Dream Mode extends the primary OpenClaw-style session path inside the server; it does not redefine the product around tokens or a hidden autonomous sidecar.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a bounded "dream mode" to the OpenClaw-native runtime so an in-project agent can plan, reflect, accumulate reusable memory, and propose follow-up work without turning the system into an unbounded autonomous background agent.

**Architecture:** Dream Mode V1 should extend the current OpenClaw session-bound runtime instead of replacing it. The backend should add explicit dream policy, persisted dream runs, step records, and memory notes, then expose those through management routes and MCP tools. The runtime may continue itself only inside hard limits for budget, step count, task creation, and approval policy; it should not gain a hidden daemon loop or opaque self-directed behavior.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js 15, React 19, TypeScript, SWR, Vitest, Pytest

---

## Scope Decision

Dream Mode V1 intentionally **does** include:

- explicit per-agent dream policy
- persisted plan / reflect / summarize artifacts
- bounded dream runs attached to one agent and one session
- optional follow-up task proposals created by runtime agents
- memory search/write tools for reusable working knowledge
- management visibility into dream state, cost, and stop reasons

Dream Mode V1 intentionally **does not** include:

- hidden chain-of-thought persistence
- a general background scheduler or daemon worker
- open-ended self-replication or multi-agent swarm behavior
- automatic capability escalation beyond the current approval model
- backward compatibility for old token-centric runtime semantics

## Product Decision

For this repository, "dream mode" should mean **controlled autonomous continuation**, not "infinite internal thinking".

The runtime already has strong primitives:

- OpenClaw-native agent identity and session auth
- MCP tool catalog
- task queue and completion flow
- capability approval and lease controls
- management-visible events and runs

The missing piece is a **bounded execution loop** with memory and planning artifacts. That is the smallest version that can feel closer to Claude Code while still fitting the control-plane architecture.

## Target Model

Add four new runtime concepts:

- `DreamPolicy`: per-agent autonomy configuration such as `enabled`, `max_steps_per_run`, `max_followup_tasks`, `allow_task_proposal`, `allow_memory_write`, `require_human_review_for_followups`, `max_context_tokens`
- `DreamRun`: one bounded autonomous run linked to `agent_id`, `session_id`, optional `task_id`, `objective`, `status`, `stop_reason`, `step_budget`, `consumed_steps`
- `DreamStep`: one persisted planning/reflection/action step with `step_type`, `status`, `input_payload`, `output_payload`, `token_usage`, `created_task_id`
- `MemoryNote`: reusable notes created by runtime or management with `scope`, `kind`, `content`, `source_run_id`, `importance`, `tags`

Dream Mode V1 should support this lifecycle:

1. Management or runtime starts a dream run with an explicit objective.
2. Runtime writes an initial plan step.
3. Runtime can read relevant memory and playbooks before acting.
4. Runtime can reflect after task completion or failure.
5. Runtime may propose a follow-up task only if both route policy and dream policy allow it.
6. Runtime stops when budget, policy, approval boundary, or explicit completion is reached.

## Suggested API Surface

Add management/runtime routes:

- `POST /api/openclaw/dream-runs`
- `GET /api/openclaw/dream-runs`
- `GET /api/openclaw/dream-runs/{run_id}`
- `POST /api/openclaw/dream-runs/{run_id}/steps`
- `POST /api/openclaw/dream-runs/{run_id}/stop`
- `GET /api/openclaw/memory`
- `POST /api/openclaw/memory`

Add MCP tools:

- `dream.runs.start`
- `dream.runs.record_step`
- `dream.runs.stop`
- `dream.memory.search`
- `dream.memory.write`
- `dream.tasks.propose_followup`

Do **not** add a server-side infinite `continue_forever` tool in V1. Continuation should remain explicit and bounded.

## Repository Strategy

Recommended delivery order:

1. Freeze current runtime behavior and define Dream Mode boundaries with tests
2. Add persistence for dream policy, run, step, and memory records
3. Add bounded dream orchestration services
4. Expose management routes and MCP tools
5. Add management UI visibility
6. Update docs and verify full release readiness

### Task 1: Freeze Dream Mode Boundaries With Characterization Tests

**Files:**
- Create: `apps/api/tests/test_dream_mode_characterization.py`
- Modify: `apps/api/tests/test_openclaw_characterization.py`
- Modify: `apps/api/tests/test_openclaw_tool_catalog.py`
- Create: `apps/control-plane-v3/src/app/identities/dream-mode-characterization.test.tsx`

**Step 1: Write the failing tests**

Add backend characterization tests for:

- an OpenClaw session-authenticated runtime can start a bounded dream run
- a dream run cannot exceed its configured step budget
- a dream run cannot create unlimited follow-up tasks
- approval-required capability flow still blocks autonomous continuation
- memory notes are explicit records and not hidden transcript dumps

Add frontend characterization tests for:

- management UI can surface dream policy and recent dream runs
- stop reasons and budget counters are visible

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_dream_mode_characterization.py apps/api/tests/test_openclaw_tool_catalog.py -q
cd apps/control-plane-v3 && npm test -- --run src/app/identities/dream-mode-characterization.test.tsx
```

Expected: fail because dream mode schema and routes do not exist yet.

**Step 3: Preserve existing business guarantees**

Make sure current task claim/complete, capability invoke/lease, and playbook search tests remain unchanged except where new dream metadata must be asserted.

**Step 4: Re-run focused tests**

Expected: new dream tests fail; existing OpenClaw characterization tests still pass.

**Step 5: Commit**

```bash
git add apps/api/tests apps/control-plane-v3/src/app/identities
git commit -m "test: freeze controlled dream mode boundaries"
```

### Task 2: Add Dream Policy, Run, Step, And Memory Persistence

**Files:**
- Modify: `apps/api/app/orm/openclaw_agent.py`
- Create: `apps/api/app/orm/openclaw_dream_run.py`
- Create: `apps/api/app/orm/openclaw_dream_step.py`
- Create: `apps/api/app/orm/openclaw_memory_note.py`
- Modify: `apps/api/app/orm/__init__.py`
- Create: `apps/api/app/repositories/openclaw_dream_run_repo.py`
- Create: `apps/api/app/repositories/openclaw_dream_step_repo.py`
- Create: `apps/api/app/repositories/openclaw_memory_repo.py`
- Modify: `apps/api/app/schemas/openclaw_agents.py`
- Create: `apps/api/app/schemas/openclaw_dream_runs.py`
- Create: `apps/api/app/schemas/openclaw_memory.py`
- Create: `apps/api/alembic/versions/20260408_01_controlled_dream_mode.py`
- Modify: `apps/api/tests/test_alembic_migrations.py`

**Step 1: Write the failing migration/repository tests**

Add tests for:

- `openclaw_agents` gains a `dream_policy` JSON column with a safe default
- dream runs can be created and filtered by `agent_id`, `session_id`, and `status`
- dream steps can record `plan`, `reflect`, `propose_task`, and `stop` step types
- memory notes can be stored and searched by tag and scope

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_repositories.py -q
```

Expected: fail because the new tables and fields do not exist.

**Step 3: Implement the schema**

Minimum data shape:

- `openclaw_agents.dream_policy`
- `openclaw_dream_runs`: `id`, `agent_id`, `session_id`, `task_id`, `objective`, `status`, `stop_reason`, `step_budget`, `consumed_steps`, `created_followup_tasks`, `started_by_actor_type`, `started_by_actor_id`
- `openclaw_dream_steps`: `id`, `run_id`, `step_index`, `step_type`, `status`, `input_payload`, `output_payload`, `token_usage`, `created_task_id`
- `openclaw_memory_notes`: `id`, `agent_id`, `session_id`, `run_id`, `scope`, `kind`, `importance`, `tags`, `content`

Safe defaults:

- dream mode disabled by default
- low step budget
- follow-up task creation disabled by default
- memory writes disabled unless explicitly enabled

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/orm apps/api/app/repositories apps/api/app/schemas apps/api/alembic apps/api/tests
git commit -m "feat: add controlled dream mode persistence"
```

### Task 3: Add Dream Policy Evaluation And Runtime Services

**Files:**
- Modify: `apps/api/app/models/runtime_principal.py`
- Modify: `apps/api/app/services/openclaw_runtime_service.py`
- Create: `apps/api/app/services/openclaw_dream_service.py`
- Create: `apps/api/app/services/openclaw_memory_service.py`
- Create: `apps/api/app/services/openclaw_dream_policy_service.py`
- Modify: `apps/api/app/auth.py`
- Modify: `apps/api/tests/test_openclaw_sessions_api.py`
- Create: `apps/api/tests/test_openclaw_dream_service.py`

**Step 1: Write the failing service tests**

Add tests for:

- runtime principal carries `dream_policy`
- dream run start is rejected when the agent dream policy is disabled
- `record_step` increments budget counters and stops the run at its max
- follow-up task proposal is rejected when `allow_task_proposal` is false
- memory write is rejected when `allow_memory_write` is false

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_openclaw_dream_service.py apps/api/tests/test_openclaw_sessions_api.py -q
```

Expected: fail because runtime principal and dream services do not yet support policy enforcement.

**Step 3: Implement minimal orchestration**

Service responsibilities:

- `openclaw_runtime_service.py`: include `dream_policy` in the runtime principal
- `openclaw_dream_policy_service.py`: normalize defaults and enforce budget/follow-up/memory rules
- `openclaw_dream_service.py`: start runs, append steps, stop runs, compute stop reasons
- `openclaw_memory_service.py`: write memory records, search memory by scope/tag/query

V1 rules:

- all dream activity must be attached to an authenticated OpenClaw session
- all dream runs must be explicit records with visible objective and status
- exceeding any configured budget must hard-stop the run
- capability approval conflicts must stop or pause the run with an explicit stop reason

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/models apps/api/app/services apps/api/app/auth.py apps/api/tests
git commit -m "feat: add controlled dream mode policy services"
```

### Task 4: Expose Dream Routes And MCP Tools

**Files:**
- Create: `apps/api/app/routes/openclaw_dream_runs.py`
- Create: `apps/api/app/routes/openclaw_memory.py`
- Modify: `apps/api/app/routes/__init__.py`
- Modify: `apps/api/app/mcp/tools.py`
- Modify: `apps/api/app/mcp/server.py`
- Modify: `apps/api/app/services/openclaw_tool_catalog_service.py`
- Modify: `apps/api/app/routes/tasks.py`
- Create: `apps/api/tests/test_openclaw_dream_routes.py`
- Create: `apps/api/tests/test_openclaw_memory_routes.py`
- Modify: `apps/api/tests/test_openclaw_tool_catalog.py`
- Modify: `apps/api/tests/test_mcp_server.py`

**Step 1: Write the failing route and MCP tests**

Add tests for:

- management can list dream runs across agents
- runtime can start and append steps to its own dream run
- runtime can search and write memory only within its policy
- MCP `tools/list` includes the new dream tools
- MCP tool execution returns structured stop reasons when the dream run hits policy boundaries

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_openclaw_dream_routes.py apps/api/tests/test_openclaw_memory_routes.py apps/api/tests/test_mcp_server.py apps/api/tests/test_openclaw_tool_catalog.py -q
```

Expected: fail because the routes and tool bindings do not exist.

**Step 3: Implement the minimal API surface**

Route behavior:

- management routes read all dream runs and memory for inspection
- runtime routes only operate on the authenticated session/agent scope
- `POST /api/openclaw/dream-runs/{run_id}/stop` records a visible stop reason

Tool behavior:

- `dream.runs.start`: create a run with explicit objective and budget
- `dream.runs.record_step`: append one step and update counters
- `dream.runs.stop`: close the run with a stop reason
- `dream.memory.search`: search visible memory notes
- `dream.memory.write`: create one visible memory record
- `dream.tasks.propose_followup`: create a new pending-review or active task using current route policy and dream policy

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/routes apps/api/app/mcp apps/api/app/services apps/api/tests
git commit -m "feat: add dream mode routes and mcp tools"
```

### Task 5: Wire Follow-Up Task Proposal And Stop/Review Behavior

**Files:**
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/services/review_service.py`
- Modify: `apps/api/app/services/event_service.py`
- Modify: `apps/api/app/routes/reviews.py`
- Create: `apps/api/tests/test_dream_followup_tasks.py`

**Step 1: Write the failing integration tests**

Add tests for:

- runtime-created follow-up tasks respect `tasks:create` route policy
- dream-created tasks inherit `pending_review` when the actor is a runtime agent
- dream runs record the created task id in the corresponding dream step
- approval-required capability conflicts produce a dream stop or pause event instead of silent retry loops

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_dream_followup_tasks.py apps/api/tests/test_review_queue_api.py -q
```

Expected: fail because dream follow-up task linkage and stop behavior are not implemented.

**Step 3: Implement the integration**

Rules:

- follow-up tasks created by runtime should use the existing `create_task` service, not a parallel dream-only task model
- the dream step should persist the created task id
- when approval or policy blocks continuation, record a deterministic dream stop reason such as `approval_required`, `budget_exhausted`, `task_proposal_disallowed`, or `manual_stop`
- emit events so operators can understand why the dream run stopped

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/services apps/api/app/routes apps/api/tests
git commit -m "feat: connect dream mode to follow-up task proposals"
```

### Task 6: Add Management Visibility In The Control Plane

**Files:**
- Modify: `apps/control-plane-v3/src/domains/identity/types.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/api.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/hooks.ts`
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/ai-agents-section.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/agent-management-card.tsx`
- Create: `apps/control-plane-v3/src/app/identities/dream-run-list.tsx`
- Create: `apps/control-plane-v3/src/app/identities/dream-policy-card.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.test.tsx`
- Create: `apps/control-plane-v3/src/app/identities/dream-policy-card.test.tsx`

**Step 1: Write the failing UI tests**

Add tests for:

- agent details show dream policy status and limits
- management can see recent dream runs, stop reasons, and step counts
- dream mode disabled state is rendered clearly
- loading and error states degrade cleanly

**Step 2: Run the focused failing tests**

Run:

```bash
cd apps/control-plane-v3 && npm test -- --run src/app/identities/page.test.tsx src/app/identities/dream-policy-card.test.tsx
```

Expected: fail because dream policy and run components do not exist.

**Step 3: Implement the UI**

Show:

- whether dream mode is enabled
- max steps / follow-up task limits
- recent dream runs with `objective`, `status`, `stop_reason`, `consumed_steps`
- links or affordances to inspect a run once detail pages exist

Do not build a heavy "agent thought stream" console in V1. Keep UI management-first and auditable.

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/identity apps/control-plane-v3/src/app/identities
git commit -m "feat: show dream mode policy and runs in identities ui"
```

### Task 7: Documentation, OpenAPI, And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/agent-quickstart.md`
- Create: `docs/guides/dream-mode-quickstart.md`
- Modify: `apps/api/app/routes/openclaw_agents.py`
- Modify: `apps/api/app/routes/openclaw_sessions.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/reviews.py`

**Step 1: Write missing docs assertions or snapshot updates**

If OpenAPI or route description tests exist, update them first so the docs work stays test-backed.

**Step 2: Update operator/runtime docs**

Document:

- what dream mode is and is not
- how to enable it safely
- how to start a dream run
- how to interpret stop reasons
- how follow-up task proposal and review work

**Step 3: Run full verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: backend tests, frontend tests, and production build all pass.

**Step 4: Fix any failures and re-run verification**

Do not claim completion until the verification script passes cleanly.

**Step 5: Commit**

```bash
git add README.md docs apps/api/app/routes
git commit -m "docs: add controlled dream mode operator guidance"
```

## Rollout Recommendation

Ship this in two release gates:

1. **Dark launch**
   Keep `dream_policy.enabled = false` by default for all agents. Validate persistence, routes, UI visibility, and stop reasons with test agents only.

2. **Single-agent pilot**
   Enable dream mode for one low-risk OpenClaw agent with:
   - small step budget
   - follow-up task creation disabled at first
   - memory write enabled only for low-risk scopes
   - operator review on all runtime-created tasks

Only after a stable pilot should follow-up task proposal be enabled.

## Key Risks

- runaway task creation if follow-up proposal is not budgeted correctly
- accidental hidden-thought storage if transcript and memory boundaries are not explicit
- operator confusion if stop reasons are not normalized and visible
- approval loops if blocked capability actions retry instead of stopping
- UI bloat if V1 tries to become a live agent console instead of a management surface

## Recommended First Slice

If time is tight, implement only:

- `dream_policy` on agents
- `dream_runs` and `dream_steps`
- `dream.runs.start`, `dream.runs.record_step`, `dream.runs.stop`
- management visibility in `/identities`

Defer memory search/write and follow-up task proposal to the next slice.
