# OpenClaw Native Agent Migration Implementation Plan

## Historical Status

This file is retained as historical migration context. It is **not** the current source of truth for how the product should be explained to operators, contributors, or external agent-runtime integrators.

Read these guides first for the current framing:

- `docs/guides/agent-server-first.md`
- `docs/guides/agent-quickstart.md`
- `docs/guides/admin-bootstrap-and-token-ops.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current database-and-token-centric agent model with an OpenClaw-native agent model built around agent workspace, session, tools/skills, and gateway-driven runtime behavior, without preserving legacy agent compatibility.

**Architecture:** The control plane should stop treating `agents` and `agent_tokens` as the primary runtime identity surface. Instead, the backend should expose OpenClaw-style agent records, workspace bootstrap files, session control, and tool catalog execution while keeping the existing business domains (`tasks`, `capabilities`, `playbooks`, `approvals`, `runs`) as managed services behind the OpenClaw agent runtime. The frontend should pivot from "agent CRUD + token issuance" to "agent workspace + session + tool/sandbox management".

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js 15, React 19, TypeScript, SWR, Vitest, Pytest

---

## Scope Decision

This migration intentionally **does not** preserve:

- legacy bearer-token runtime auth as the primary agent execution path
- legacy `agent_tokens` management UI and API semantics
- bootstrap-agent-as-runtime-identity behavior
- field-level backward compatibility for `AgentIdentity`

This migration **does** preserve business functionality:

- tasks can still be listed, claimed, and completed
- capabilities can still be invoked or leased with approval and policy gates
- playbooks remain searchable knowledge
- reviews, runs, events, spaces, and governance semantics stay intact

## Target Model

After migration, the primary runtime concepts should be:

- `OpenClawAgent`: identity, label, status, model defaults, workspace path, sandbox/tool policy
- `OpenClawAgentWorkspace`: managed bootstrap files such as `AGENTS.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md`, optional `HEARTBEAT.md`, `MEMORY.md`
- `OpenClawSession`: session key, session id, agent binding, transcript metadata, token accounting, updated time
- `OpenClawToolBinding`: declarative mapping from control-plane business actions to tools exposed through the OpenClaw-compatible tool catalog
- `OpenClawRuntimePolicy`: sandbox mode, workspace rules, allowed tools, approval integration, optional per-agent model defaults

The current repository-owned control-plane domains should move under that runtime:

- `tasks` become OpenClaw tools plus session-linked work state
- `capabilities` become privileged tools guarded by policy/approval
- `playbooks` become searchable knowledge tools
- `runs` and `events` become execution/audit artifacts associated with OpenClaw agent sessions

## Repository Strategy

Recommended delivery order:

1. Freeze current behavior with characterization tests
2. Introduce new OpenClaw-native schema and domain models alongside old code
3. Move backend runtime/auth/session entrypoints to the new model
4. Move frontend identity management to the new model
5. Remove legacy token/bootstrap runtime paths
6. Re-run release verification and documentation pass

Do **not** attempt a compatibility shim that lets old and new runtime paths coexist for long. That would keep the most confusing parts of both systems.

### Task 1: Freeze Current Business Behavior With Characterization Tests

**Files:**
- Modify: `apps/api/tests/test_agent_auth.py`
- Modify: `apps/api/tests/test_runs_api.py`
- Modify: `apps/api/tests/test_task_targets_api.py`
- Modify: `apps/api/tests/test_invoke_api.py`
- Modify: `apps/api/tests/test_search_api.py`
- Modify: `apps/control-plane-v3/src/app/identities/page.test.tsx`
- Create: `apps/api/tests/test_openclaw_characterization.py`
- Create: `apps/control-plane-v3/src/app/identities/openclaw-characterization.test.tsx`

**Step 1: Write failing characterization tests**

Capture the business outcomes that must survive the migration:

- an authenticated agent runtime can list work
- an authenticated agent runtime can claim and complete allowed tasks
- privileged capability access still respects policy and approval checks
- playbook search still returns knowledge results
- the management UI can still inspect agents, sessions, and governance state

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_openclaw_characterization.py -q
cd apps/control-plane-v3 && npm test -- --run src/app/identities/openclaw-characterization.test.tsx
```

Expected: new tests fail because the OpenClaw-native surfaces do not exist yet.

**Step 3: Keep existing tests unchanged except for naming**

Refactor only enough to make the tests clearly describe business behavior instead of legacy token mechanics.

**Step 4: Re-run focused tests**

Expected: legacy behavior tests still pass; new OpenClaw-native tests still fail.

**Step 5: Commit**

```bash
git add apps/api/tests apps/control-plane-v3/src/app/identities
git commit -m "test: freeze agent business behavior for openclaw migration"
```

### Task 2: Introduce OpenClaw-Native Domain Models And Schema

**Files:**
- Create: `apps/api/app/orm/openclaw_agent.py`
- Create: `apps/api/app/orm/openclaw_agent_file.py`
- Create: `apps/api/app/orm/openclaw_session.py`
- Create: `apps/api/app/orm/openclaw_tool_binding.py`
- Modify: `apps/api/app/orm/__init__.py`
- Create: `apps/api/app/repositories/openclaw_agent_repo.py`
- Create: `apps/api/app/repositories/openclaw_session_repo.py`
- Create: `apps/api/app/repositories/openclaw_agent_file_repo.py`
- Create: `apps/api/app/schemas/openclaw_agents.py`
- Create: `apps/api/app/schemas/openclaw_sessions.py`
- Create: `apps/api/alembic/versions/20260407_01_openclaw_native_agents.py`
- Modify: `apps/api/tests/test_alembic_migrations.py`

**Step 1: Write failing migration and repository tests**

Add tests for:

- new tables exist after `alembic upgrade head`
- workspace file bootstrap records can be created and listed
- session records are per-agent and can store transcript metadata
- tool bindings can be declared independently of capabilities

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_repositories.py -q
```

Expected: fail because the new models and migration do not exist.

**Step 3: Implement the new schema**

Minimum new tables:

- `openclaw_agents`
- `openclaw_agent_files`
- `openclaw_sessions`
- `openclaw_tool_bindings`

Minimum columns:

- `openclaw_agents`: `id`, `name`, `status`, `workspace_root`, `agent_dir`, `model`, `thinking_level`, `sandbox_mode`, `tools_policy`, `skills_policy`
- `openclaw_agent_files`: `agent_id`, `file_name`, `content`, `updated_at`
- `openclaw_sessions`: `id`, `agent_id`, `session_key`, `display_name`, `channel`, `subject`, `updated_at`, `input_tokens`, `output_tokens`, `context_tokens`
- `openclaw_tool_bindings`: `name`, `agent_id`, `binding_kind`, `binding_target`, `approval_mode`, `enabled`

**Step 4: Re-run the focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/orm apps/api/app/repositories apps/api/app/schemas apps/api/alembic apps/api/tests
git commit -m "feat: add openclaw native agent schema"
```

### Task 3: Replace Runtime Identity And Session Resolution

**Files:**
- Modify: `apps/api/app/models/runtime_principal.py`
- Modify: `apps/api/app/models/agent.py`
- Modify: `apps/api/app/auth.py`
- Create: `apps/api/app/services/openclaw_runtime_service.py`
- Create: `apps/api/app/services/openclaw_session_service.py`
- Modify: `apps/api/app/config.py`
- Modify: `apps/api/app/factory.py`
- Modify: `apps/api/tests/test_agent_auth.py`
- Create: `apps/api/tests/test_openclaw_session_service.py`

**Step 1: Write failing auth and session tests**

Add tests for:

- runtime identity can be resolved from an OpenClaw-native agent/session binding
- bootstrap human setup remains management-only and no longer acts as the runtime agent model
- session lookup returns OpenClaw session metadata rather than token metadata

**Step 2: Run the focused failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_agent_auth.py apps/api/tests/test_openclaw_session_service.py -q
```

Expected: fail because auth still depends on `agent_tokens`.

**Step 3: Implement minimal runtime replacement**

- redefine `RuntimePrincipal` around `agent_id`, `session_id`, `session_key`, `workspace_root`, `tool_policy`, `sandbox_mode`
- make `auth.py` resolve runtime identity through OpenClaw-native session/agent services
- keep human management session auth separate and unchanged
- stop using bootstrap agent as a runtime fallback

**Step 4: Re-run the focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/models apps/api/app/auth.py apps/api/app/services apps/api/app/config.py apps/api/app/factory.py apps/api/tests
git commit -m "feat: switch runtime identity to openclaw sessions"
```

### Task 4: Replace Legacy Agent Routes With OpenClaw Agent And Workspace Routes

**Files:**
- Replace: `apps/api/app/routes/agents.py`
- Replace: `apps/api/app/routes/agent_tokens.py`
- Create: `apps/api/app/routes/openclaw_agents.py`
- Create: `apps/api/app/routes/openclaw_sessions.py`
- Create: `apps/api/app/routes/openclaw_agent_files.py`
- Modify: `apps/api/app/routes/__init__.py`
- Modify: `apps/api/tests/test_api_key_auth.py`
- Create: `apps/api/tests/test_openclaw_agents_api.py`
- Create: `apps/api/tests/test_openclaw_sessions_api.py`

**Step 1: Write failing route tests**

Define the new backend contract:

- `GET /api/openclaw/agents`
- `POST /api/openclaw/agents`
- `PATCH /api/openclaw/agents/{agent_id}`
- `DELETE /api/openclaw/agents/{agent_id}`
- `GET /api/openclaw/agents/{agent_id}/files`
- `PUT /api/openclaw/agents/{agent_id}/files/{file_name}`
- `GET /api/openclaw/sessions`
- `GET /api/openclaw/sessions/{session_id}`

**Step 2: Run failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_openclaw_agents_api.py apps/api/tests/test_openclaw_sessions_api.py -q
```

Expected: fail because routes do not exist.

**Step 3: Implement minimal routes**

- management routes expose agent records, workspace bootstrap files, and session index
- remove token issuance endpoints from the primary API surface
- use workspace files as first-class editable records

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/routes apps/api/tests
git commit -m "feat: add openclaw agent and session management routes"
```

### Task 5: Re-Expose Tasks, Capabilities, And Playbooks As OpenClaw Tools

**Files:**
- Modify: `apps/api/app/mcp/server.py`
- Modify: `apps/api/app/mcp/tools.py`
- Create: `apps/api/app/services/openclaw_tool_catalog_service.py`
- Create: `apps/api/app/schemas/openclaw_tools.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/tests/test_invoke_api.py`
- Modify: `apps/api/tests/test_task_targets_api.py`
- Create: `apps/api/tests/test_openclaw_tool_catalog.py`

**Step 1: Write failing tool catalog tests**

The new catalog should expose business operations as OpenClaw-friendly tools:

- `tasks.list`
- `tasks.claim`
- `tasks.complete`
- `playbooks.search`
- `capabilities.invoke`
- `capabilities.request_lease`

**Step 2: Run failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_openclaw_tool_catalog.py -q
```

Expected: fail because the old MCP tool names and response shape still exist.

**Step 3: Implement minimal tool catalog conversion**

- rename and normalize tool ids to namespaced OpenClaw-style tool names
- keep internal business services mostly intact
- preserve approval and policy checks during tool execution
- make the route surface look like OpenClaw-native agent tooling, even if internal implementations still call existing services

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/api/app/mcp apps/api/app/services apps/api/app/schemas apps/api/tests
git commit -m "feat: expose control plane actions as openclaw tools"
```

### Task 6: Replace Frontend Identity Management With OpenClaw Agent Workspace Management

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/ai-agents-section.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/agent-management-card.tsx`
- Create: `apps/control-plane-v3/src/app/identities/openclaw-agent-workspace-card.tsx`
- Create: `apps/control-plane-v3/src/app/identities/openclaw-session-panel.tsx`
- Modify: `apps/control-plane-v3/src/domains/identity/api.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/hooks.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/types.ts`

**Step 1: Write failing UI tests**

New UI expectations:

- agents show workspace and runtime configuration, not token issuance controls
- session list is visible under each agent
- bootstrap files can be inspected and edited
- actions focus on create/update workspace, inspect sessions, and manage enabled tools

**Step 2: Run failing tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/identities/page.test.tsx
```

Expected: fail because UI still assumes tokens.

**Step 3: Implement the new management surface**

- rename the section from AI agents to OpenClaw agents where appropriate
- remove primary CTA emphasis on token issuance
- add workspace bootstrap file views
- add session summaries
- add tool/sandbox policy summaries

**Step 4: Re-run focused tests**

Expected: pass.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/identities apps/control-plane-v3/src/domains/identity
git commit -m "feat: replace identity ui with openclaw agent workspace management"
```

### Task 7: Remove Legacy Token-Centric Runtime Paths

**Files:**
- Delete or heavily modify: `apps/api/app/orm/agent_token.py`
- Delete or heavily modify: `apps/api/app/repositories/agent_token_repo.py`
- Delete or heavily modify: `apps/api/app/services/agent_token_service.py`
- Modify: `apps/api/app/routes/bootstrap.py`
- Modify: `apps/api/app/services/session_service.py`
- Modify: `apps/api/app/factory.py`
- Modify: `README.md`
- Modify: `docs/guides/agent-quickstart.md`
- Modify: `apps/api/tests/conftest.py`

**Step 1: Write failing removal tests**

Add tests that assert:

- runtime no longer depends on bearer token issuance endpoints
- bootstrap remains only a first-owner management path
- docs no longer describe token issuance as the standard agent runtime contract

**Step 2: Run failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests/test_api_key_auth.py apps/api/tests/test_bootstrap_api.py -q
```

Expected: fail because legacy runtime assumptions still exist.

**Step 3: Remove the old runtime model**

- eliminate token management as the default runtime pattern
- narrow bootstrap to operator initialization only
- keep only the minimal compatibility needed inside the same branch while migration code is landing

**Step 4: Re-run focused tests**

Expected: pass with the new route and auth contract.

**Step 5: Commit**

```bash
git add apps/api README.md docs/guides/agent-quickstart.md
git commit -m "refactor: remove legacy token-centric agent runtime"
```

### Task 8: Full Verification, Docs, And Release Readiness Pass

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/ops/verify-control-plane.sh`
- Create: `docs/guides/openclaw-agent-operations.md`
- Create: `docs/audits/2026-04-07-openclaw-native-agent-audit.md`

**Step 1: Add failing documentation and verification expectations**

Add tests or assertions that:

- CI verifies the OpenClaw-native routes and session model
- docs explain workspace files, session ownership, and tool catalog behavior
- release verification covers backend, frontend, and agent-session flows

**Step 2: Run failing tests**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest tests/ops -q
cd apps/control-plane-v3 && npm run check
```

Expected: fail until docs and verification entrypoints are updated.

**Step 3: Update docs and scripts**

- document the new mental model clearly
- add verification for session routes and workspace file management
- ensure CI no longer references token-centric agent flows

**Step 4: Run the full verification**

Run:

```bash
PYTHONPATH=apps/api ./.venv/bin/pytest apps/api/tests tests/ops -q
cd apps/control-plane-v3 && npm run check
cd apps/control-plane-v3 && npm test -- --run
cd apps/control-plane-v3 && npm run build
cd /Users/lvxiaoer/Documents/codeWork/agentShare && ./scripts/ops/verify-control-plane.sh
```

Expected: all pass.

**Step 5: Commit**

```bash
git add README.md .github/workflows/ci.yml scripts/ops/verify-control-plane.sh docs apps/api/tests tests/ops
git commit -m "docs: finalize openclaw native agent migration"
```

## Key Risks

- The current `tasks` and `capabilities` services assume a compact runtime identity; moving to session-centric identities will expose hidden coupling.
- Frontend identity pages currently encode token-oriented user journeys; those screens will need structural, not cosmetic, changes.
- The current `/mcp` shape is only MCP-like. It should not be mistaken for full OpenClaw gateway compatibility.
- Bootstrap and management setup must remain human-safe while the runtime agent model changes underneath.

## Recommended Non-Goals

- Do not add ACP harness support in this migration.
- Do not preserve old route names unless strictly needed within one branch during refactor.
- Do not attempt remote filesystem mirroring for real OpenClaw host paths yet; start with repository-owned persisted workspace records.

## Acceptance Criteria

- Backend agent model is OpenClaw-native: workspace, files, sessions, tool policy, sandbox policy
- Frontend management UI reflects that model
- Existing business value remains: tasks, capabilities, playbooks, approvals, runs, events
- Legacy token-centric runtime paths are removed
- CI and local verification pass on the new model

## Recommendation

Implement this as a dedicated migration branch and treat it as the start of `v2`, not a patch release. The current codebase is strong enough to support the transition, but the change is architectural and should not be hidden behind small incremental wording.
