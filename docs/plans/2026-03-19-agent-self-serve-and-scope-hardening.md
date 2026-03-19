# Agent Self-Serve And Scope Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the control plane understandable and usable by a new agent without human coaching, while upgrading token scope and authorization from stored metadata into enforced runtime policy.

**Architecture:** Treat onboarding, API discoverability, and authorization as one system instead of separate concerns. First publish a trustworthy self-serve entrypoint for humans and agents, then remove UI behaviors that hide backend truth, then enforce the policy fields that already exist, and finally upgrade token scope into a normalized, checkable contract between secrets, capabilities, tasks, and agents.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, Playwright, OpenAPI, OpenBao

---

### Task 1: Publish A Real Agent Quickstart

**Files:**
- Modify: `README.md`
- Create: `docs/guides/agent-quickstart.md`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/agents/page.tsx`
- Modify: `apps/web/components/agent-key-display.tsx`
- Test: `apps/web/tests/console.spec.ts`

**Why this comes first:**
- The project already has the right concepts, but there is no single document that teaches an agent or integrator the happy path.
- Without a quickstart, agents must reverse-engineer the flow from scattered pages, tests, and route names.

**Definition of done:**
- A single guide shows the minimal end-to-end sequence:
  1. get or create an agent key
  2. verify identity with `GET /api/agents/me`
  3. list tasks
  4. claim a task
  5. invoke a capability or request a lease
  6. complete the task
- The homepage and Agents page link to the guide.
- The one-time API key display includes a concrete "what to do next" snippet instead of only showing the token.

**Notes for implementation:**
- Keep the quickstart short and operational. Prefer `curl` examples over prose.
- Include one proxy example and one lease example.
- Include expected response shapes and common failure codes (`401`, `403`, `409`).
- Explicitly say that `/docs` and `/openapi.json` are the machine-readable sources of truth.

### Task 2: Make The API Self-Describing For Agents

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/schemas/agents.py`
- Modify: `apps/api/app/schemas/secrets.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Modify: `apps/api/app/schemas/tasks.py`
- Modify: `apps/api/app/schemas/invoke.py`
- Create: `apps/api/tests/test_openapi_contract.py`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/agents/page.tsx`

**Why this comes second:**
- FastAPI already emits OpenAPI, but the schema is too bare to act as a good self-teaching surface.
- Agents can discover routes today, but not the intended call order, example payloads, or policy semantics.

**Definition of done:**
- The generated OpenAPI includes:
  - endpoint summaries and descriptions
  - example request bodies for create, claim, invoke, lease, and complete operations
  - clear descriptions of `allowed_mode`, `lease_allowed`, `required_capability_ids`, `allowed_capability_ids`, and `allowed_task_types`
  - the existing bearer auth scheme on all agent-only routes
- The UI links to Swagger UI and raw OpenAPI when an API base URL is configured.
- A contract test fails if key routes or security declarations disappear.

**Notes for implementation:**
- Use `FastAPI(..., description=..., openapi_tags=...)`.
- Add `model_config = {"json_schema_extra": {...}}` or equivalent examples on the Pydantic models.
- Prefer examples that match the quickstart guide exactly.

### Task 3: Stop Hiding Backend Truth Behind Silent Fallbacks

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/playbooks/page.tsx`
- Modify: `apps/web/app/secrets/page.tsx`
- Modify: `apps/web/app/capabilities/page.tsx`
- Modify: `apps/web/app/tasks/page.tsx`
- Modify: `apps/web/app/agents/page.tsx`
- Modify: `apps/web/app/runs/page.tsx`
- Test: `apps/web/tests/console.spec.ts`
- Test: `apps/web/tests/secret-to-task.spec.ts`
- Test: `apps/web/tests/capability-binding.spec.ts`

**Why this comes third:**
- A self-serve product must tell the truth when the backend is missing or broken.
- The current fallback data makes the UI look healthy even when the API is not connected.

**Definition of done:**
- Silent production-path fallback data is removed.
- If the API base URL is missing, the UI clearly says it is in demo or disconnected mode.
- If API requests fail, the page surfaces the error state instead of showing fake data.
- Playbooks load from the real backend instead of hardcoded data.

**Notes for implementation:**
- Keep mock data only behind an explicit demo-mode flag such as `AGENT_CONTROL_PLANE_DEMO_MODE`.
- Return a typed result shape from the web data layer, for example `{ items, error, source }`, instead of collapsing all failures into fallback lists.
- Make the error copy actionable: missing API URL, unauthorized bootstrap key, backend unavailable.

### Task 4: Enforce The Authorization Fields That Already Exist

**Files:**
- Modify: `apps/api/app/auth.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/invoke.py`
- Modify: `apps/api/app/routes/leases.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/app/repositories/task_repo.py`
- Create: `apps/api/tests/test_authorization_policy.py`
- Modify: `apps/api/tests/test_tasks_api.py`
- Modify: `apps/api/tests/test_invoke_api.py`
- Modify: `apps/api/tests/test_lease_api.py`

**Why this comes fourth:**
- The agent model already stores `allowed_capability_ids` and `allowed_task_types`, but runtime code does not enforce them.
- This is the smallest change that materially improves safety without redesigning the data model.

**Definition of done:**
- Claiming a task requires the task type to be allowed for the agent, unless the allowlist is empty and the intended policy is "no restriction".
- Invoking a capability requires:
  - the capability to be allowed for the agent
  - the task to exist
  - the task to be claimed by the calling agent, unless the route is explicitly meant for unclaimed dry runs
  - the capability to appear in `required_capability_ids` when the task declares requirements
- Lease issuance requires all of the above plus:
  - `task.lease_allowed == true`
  - `capability.allowed_mode != "proxy_only"`
- Violations return `403` instead of succeeding with a structurally valid but unauthorized response.

**Notes for implementation:**
- Pass the full `AgentIdentity` into service functions instead of only `agent.id`.
- Add small helper functions in `auth.py` or a new policy module so route files stay thin.
- Decide and document the semantics of empty allowlists before coding. Recommended default:
  - bootstrap agent: unrestricted
  - non-bootstrap agents: explicit allowlists preferred, empty means unrestricted only until Phase 2 policy UI exists

### Task 5: Turn Token Scope Into A First-Class Contract

**Files:**
- Modify: `apps/api/app/schemas/secrets.py`
- Modify: `apps/api/app/orm/secret.py`
- Modify: `apps/api/app/routes/secrets.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Modify: `apps/api/app/orm/capability.py`
- Modify: `apps/api/app/services/capability_service.py`
- Create: `apps/api/app/services/scope_policy.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/web/components/secrets-form.tsx`
- Modify: `apps/web/components/capability-form.tsx`
- Modify: `apps/web/app/actions.ts`
- Modify: `apps/web/app/secrets/page.tsx`
- Modify: `apps/web/app/capabilities/page.tsx`
- Create: `apps/api/tests/test_scope_policy.py`
- Modify: `apps/web/tests/capability-binding.spec.ts`

**Why this comes fifth:**
- The current `scope` field is opaque JSON metadata. It can describe a token, but the system cannot safely reason about it.
- "Token scope" needs to mean something enforceable, not just something stored.

**Definition of done:**
- The project distinguishes between:
  - secret metadata
  - upstream provider scopes on the credential
  - internal authorization on the agent
  - task-required capabilities
- A capability can declare a required subset of secret scope, for example provider, environment, or provider scopes.
- Binding a secret to a capability fails if the secret scope cannot satisfy the capability contract.
- Invoke and lease continue to reject actions if the bound secret and capability become incompatible.

**Recommended normalized model:**
- Keep a generic metadata bag for display-only fields.
- Add explicit machine-checkable fields such as:
  - `provider: str`
  - `environment: str | None`
  - `provider_scopes: list[str]`
  - `resource_selector: str | None`
- Add explicit capability constraints such as:
  - `required_provider: str`
  - `required_provider_scopes: list[str]`
  - `allowed_environments: list[str]`

**Notes for implementation:**
- Avoid trying to infer provider scope semantics from arbitrary JSON keys at runtime.
- For MVP hardening, exact-match or subset-match checks are enough. Do not build a full policy language yet.
- Backfill current UI defaults so the first OpenAI and GitHub examples still work.

### Task 6: Protect Human Management Routes Deliberately

**Files:**
- Modify: `apps/api/app/routes/secrets.py`
- Modify: `apps/api/app/routes/capabilities.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/agents.py`
- Modify: `apps/web/app/actions.ts`
- Modify: `README.md`
- Create: `apps/api/tests/test_management_auth.py`

**Why this comes sixth:**
- Today several management routes are writable or readable without a clearly defined human-auth boundary.
- Even if the long-term answer is session auth for humans, the current system still needs an intentional temporary policy.

**Definition of done:**
- The project documents which routes are:
  - public bootstrap
  - agent-authenticated
  - bootstrap-key protected
  - future human-session routes
- Secret creation, capability creation, and agent management are no longer implicitly open.
- The web console uses the intended management credential path consistently.

**Notes for implementation:**
- If full human auth is not part of this phase, protect management routes with the bootstrap agent key and document that this is temporary.
- Do not silently reuse the same path for agent runtime auth and human console auth without stating that choice.

### Task 7: Add A Verification Gate For Self-Serve And Scope Behavior

**Files:**
- Modify: `README.md`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/api/tests/test_api_key_auth.py`
- Create: `apps/api/tests/test_openapi_contract.py`
- Create: `apps/api/tests/test_authorization_policy.py`
- Create: `apps/api/tests/test_scope_policy.py`
- Verify: `apps/web/tests/*.spec.ts`

**Required verification:**
- `.venv/bin/pytest apps/api/tests/test_api_key_auth.py apps/api/tests/test_management_auth.py apps/api/tests/test_authorization_policy.py apps/api/tests/test_scope_policy.py apps/api/tests/test_openapi_contract.py -q`
- `.venv/bin/pytest apps/api/tests -q`
- `cd apps/web && npm run build`
- `cd apps/web && npx playwright test`

**Exit criteria:**
- A new integrator can start at the homepage, reach the quickstart, and successfully verify an agent identity.
- Swagger UI and raw OpenAPI are useful enough for an agent to infer request bodies without reading source.
- The UI no longer fakes healthy state when the backend is missing.
- Agent runtime authorization uses `allowed_task_types`, `allowed_capability_ids`, `required_capability_ids`, `lease_allowed`, and capability mode.
- Token scope checks happen at bind time and remain enforced at runtime.

### Recommended Execution Order

1. Task 3 first if you want truthful demos immediately.
2. Task 4 next if you want the biggest safety gain with the least schema churn.
3. Task 1 and Task 2 together if your current pain is onboarding and self-discovery.
4. Task 5 only after Task 4 is green, because normalized scope is the only part that changes the data contract.
5. Task 6 before any external sharing of the web console.
