# Phase 2 Fast-Track Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the project quickly by shipping the smallest complete Phase 2 surface that makes the control plane genuinely useful to agents: searchable playbooks, enforceable approval policy, one more first-class adapter, and MCP exposure on top of stable runtime APIs.

**Architecture:** Treat this as a fast-track completion plan, not an open-ended platform expansion. Prioritize end-to-end slices that create visible product value and reuse the existing stabilized API, auth, scope, and approval foundations instead of redesigning them. Avoid general policy languages, broad adapter marketplaces, and multi-tenant concerns in this phase.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, Playwright, OpenAPI, OpenBao, MCP tool server

---

## Fast-Track Rules

- Keep the Phase 2 scope to four delivery streams only:
  - richer playbook search and real playbook UX
  - approval policy model and enforcement
  - one additional first-class adapter
  - MCP server exposure
- Do not start multi-tenant isolation, workflow chaining, scheduled automation, or plugin marketplace work in this phase.
- Prefer reusing existing auth, session, scope, gateway, and approval code paths over inventing parallel abstractions.
- Every stream must end with API tests, web tests where applicable, and a short README or guide update.

### Task 1: Turn Playbooks Into A Real Agent Knowledge Surface

**Files:**
- Modify: `apps/api/app/schemas/playbooks.py`
- Modify: `apps/api/app/orm/playbook.py`
- Modify: `apps/api/app/repositories/playbook_repo.py`
- Modify: `apps/api/app/services/playbook_service.py`
- Modify: `apps/api/app/routes/playbooks.py`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/playbooks/page.tsx`
- Create: `apps/web/app/playbooks/[playbookId]/page.tsx`
- Create: `apps/web/tests/playbooks.spec.ts`
- Modify: `apps/api/tests/test_playbooks_api.py`
- Modify: `README.md`

**Why this is first:**
- The original roadmap explicitly puts richer playbook search first because it is the lowest-risk user-visible Phase 2 increment.
- The current implementation is still MVP-level: create plus task-type filter plus a simple list page.
- The project description says playbooks are shared reusable execution knowledge, but the current route still behaves like a management-only index.

**Definition of done:**
- Playbooks support at least these searchable fields:
  - `task_type`
  - free-text query over `title` and `body`
  - `tags`
- The API returns search metadata such as total count and applied filters.
- The web console has:
  - search input
  - tag/task-type filters
  - detail page with full body
  - empty/error states that reflect backend truth
- Decide and document whether playbook search is:
  - management-session only, or
  - safe for agent-authenticated discovery
- Task authors can attach or reference playbooks in a way a new operator or agent can actually use.

**Fast-track implementation notes:**
- Do not build embeddings or semantic search in this phase.
- Start with SQL `ILIKE` or equivalent text search over normalized columns.
- Add small structured fields if needed, for example `summary` or `audience`, but avoid a large content model redesign.
- If agent-readable search is allowed, keep write access management-only.

### Task 2: Upgrade Approval From A Manual Gate Into A Minimal Policy System

**Files:**
- Create: `apps/api/app/services/policy_service.py`
- Modify: `apps/api/app/services/approval_service.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/schemas/tasks.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Modify: `apps/api/app/orm/task.py`
- Modify: `apps/api/app/orm/capability.py`
- Modify: `apps/api/app/routes/approvals.py`
- Modify: `apps/web/app/approvals/page.tsx`
- Modify: `apps/web/components/approvals-table.tsx`
- Modify: `apps/web/components/task-form.tsx`
- Modify: `apps/web/components/capability-form.tsx`
- Create: `apps/api/tests/test_policy_service.py`
- Modify: `apps/api/tests/test_approval_policy.py`
- Modify: `apps/api/tests/test_approvals_api.py`
- Modify: `apps/web/tests/approvals.spec.ts`
- Modify: `README.md`

**Why this is second:**
- Approval already exists in runtime and UI, so this stream can compound existing work instead of starting from zero.
- The remaining gap is not approval plumbing; it is policy expressiveness and operator clarity.
- A minimal policy model unlocks safer MCP exposure and additional adapters later in the phase.

**Definition of done:**
- Policy decisions can depend on explicit runtime inputs instead of only `auto/manual`.
- The minimal supported policy dimensions are:
  - action type: `invoke` vs `lease`
  - risk level
  - provider or capability type
  - environment
  - optional task type
- Runtime actions can resolve to:
  - allow immediately
  - require manual approval
  - deny
- Approval objects record the rule or reason that triggered the decision.
- The approval UI shows why a request is pending and what policy caused it.

**Fast-track implementation notes:**
- Do not build a general DSL or nested boolean policy engine.
- Add a small explicit rule contract that can be evaluated deterministically in Python.
- Keep task-level and capability-level overrides, but merge them through one policy evaluator.
- Preserve the existing pending/approved/rejected/expired lifecycle.

### Task 3: Add One More First-Class Adapter And Standardize Adapter Contracts

**Files:**
- Create: `apps/api/app/services/adapters/github_adapter.py`
- Modify: `apps/api/app/services/adapters/base.py`
- Modify: `apps/api/app/services/adapters/registry.py`
- Modify: `apps/api/app/services/adapters/generic_http.py`
- Modify: `apps/api/app/services/adapters/openai_adapter.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Modify: `apps/web/components/capability-form.tsx`
- Modify: `apps/web/app/capabilities/page.tsx`
- Create: `apps/api/tests/test_github_adapter.py`
- Modify: `apps/api/tests/test_generic_http_adapter.py`
- Modify: `apps/api/tests/test_openai_adapter.py`
- Modify: `apps/api/tests/test_gateway_fail_closed.py`
- Modify: `docs/guides/agent-quickstart.md`
- Modify: `README.md`

**Why this is third:**
- The current registry only contains `generic_http` and `openai`.
- A second first-class provider proves the control plane is becoming a reusable integration platform instead of a one-provider demo.
- Adapter contract cleanup now reduces MCP complexity later because MCP tools can rely on predictable runtime behavior.

**Definition of done:**
- The system supports one more first-class adapter beyond OpenAI.
- Recommended target for fast completion: GitHub, because the current scope model already fits provider scopes and repository-like permissions.
- All adapters return a normalized runtime envelope with:
  - upstream status
  - sanitized response body
  - adapter type
  - explicit error mapping
- Capability creation and docs make it clear when to use:
  - `generic_http`
  - `openai`
  - the new first-class adapter

**Fast-track implementation notes:**
- Keep the new adapter narrow and opinionated.
- Support one high-value GitHub workflow first, for example REST calls with bearer token auth and repository-scoped actions.
- Do not add streaming or long-lived websocket behavior in this phase.

### Task 4: Expose Stable Control-Plane Operations Through MCP

**Files:**
- Create: `apps/api/app/mcp/server.py`
- Create: `apps/api/app/mcp/tools.py`
- Create: `apps/api/tests/test_mcp_server.py`
- Modify: `apps/api/app/auth.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/app/services/playbook_service.py`
- Modify: `README.md`
- Create: `docs/guides/mcp-quickstart.md`

**Why this is fourth:**
- The design explicitly says MCP should be layered on top of already-stable API operations.
- By this point playbooks, policy, and adapters will already reflect the real Phase 2 contract.
- MCP is the last major unlock for agent usability and ecosystem interoperability.

**Definition of done:**
- An MCP server exposes at least these tools:
  - `list_tasks`
  - `claim_task`
  - `complete_task`
  - `search_playbooks`
  - `invoke_capability`
  - `request_capability_lease`
- Tool descriptions are explicit enough for a new agent to self-discover expected inputs.
- MCP auth reuses existing control-plane credentials instead of inventing a second security model.
- Tool errors preserve the same semantics already used by the HTTP API, especially `403`, `409 approval_required`, and validation failures.

**Fast-track implementation notes:**
- Do not expose management-write tools first.
- Start with runtime and knowledge tools only.
- Keep MCP as a thin translation layer over existing services, not a second business-logic stack.

### Task 5: Close The Product Loop In The Web Console

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/nav-shell.tsx`
- Modify: `apps/web/app/playbooks/page.tsx`
- Modify: `apps/web/app/approvals/page.tsx`
- Modify: `apps/web/app/capabilities/page.tsx`
- Modify: `apps/web/app/tasks/page.tsx`
- Modify: `apps/web/tests/console.spec.ts`
- Modify: `apps/web/tests/capability-binding.spec.ts`
- Modify: `apps/web/tests/approvals.spec.ts`
- Create: `apps/web/tests/playbooks.spec.ts`

**Why this is separate from the backend streams:**
- The project will still feel unfinished if the console does not reveal the new knowledge, policy, and adapter capabilities clearly.
- This task keeps the UI aligned with the actual backend instead of letting API improvements hide in docs and tests.

**Definition of done:**
- The homepage makes the finished system understandable in one screen.
- Operators can:
  - find playbooks
  - understand approval reasons
  - choose the right adapter type
  - follow the MCP quickstart
- No page silently hides missing backend support behind fake healthy state.

**Fast-track implementation notes:**
- Focus on clarity and operational flow, not broad visual redesign.
- Add short explanatory copy where policy or adapter choice is easy to misuse.

### Task 6: Ship A Single Phase 2 Exit Gate

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/agent-quickstart.md`
- Create: `docs/guides/mcp-quickstart.md`
- Verify: `apps/api/tests/*.py`
- Verify: `apps/web/tests/*.spec.ts`

**Required verification:**
- `.venv/bin/pytest apps/api/tests/test_playbooks_api.py apps/api/tests/test_policy_service.py apps/api/tests/test_approval_policy.py apps/api/tests/test_github_adapter.py apps/api/tests/test_mcp_server.py -q`
- `.venv/bin/pytest apps/api/tests -q`
- `cd apps/web && npm run build`
- `cd apps/web && npx playwright test`
- `docker compose up -d`
- `curl http://127.0.0.1:8000/healthz`
- Verify MCP quickstart against the local server with one successful tool call and one expected policy-blocked tool call

**Exit criteria:**
- A new operator can create knowledge, publish tasks, review policy-blocked actions, and understand adapter choices from the web console.
- A new agent can discover the system through OpenAPI or MCP without source diving.
- The project has one credible non-OpenAI integration path.
- Phase 2 is complete enough that remaining work can be honestly described as expansion, not foundational missing pieces.

## Recommended Fast-Track Delivery Order

1. Task 1 and Task 5 together for the first visible product jump.
2. Task 2 next because policy correctness protects the rest of the phase.
3. Task 3 immediately after policy so the new adapter inherits the right runtime contract.
4. Task 4 only when the previous three are green.
5. Task 6 as a hard ship gate, not a documentation afterthought.

## Suggested Timeboxing

- Wave 1:
  - playbook API plus search UX
  - homepage and console copy updates
- Wave 2:
  - minimal approval policy model
  - approval reasons in API and UI
- Wave 3:
  - GitHub adapter
  - adapter contract cleanup
- Wave 4:
  - MCP server
  - final verification and docs

## Defer Explicitly

- Multi-tenant isolation
- Agent-to-agent delegation
- Workflow chaining
- Scheduled tasks
- Semantic search or embeddings for playbooks
- A generic policy DSL
- Broad adapter marketplace support
