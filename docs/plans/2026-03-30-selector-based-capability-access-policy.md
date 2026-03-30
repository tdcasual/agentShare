# Selector-Based Capability Access Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve capability access control from token-only allowlists into a selector-based policy model that can target all runtime tokens, specific tokens, whole agents, and token label groups without rewriting the runtime gateway again later.

**Architecture:** Keep access control attached to capabilities, not raw secrets. Replace the current `explicit_tokens + token_ids` shape with a selector-oriented policy document that is still stored as JSON on `capabilities.access_policy`. Evaluate selectors in one shared runtime authorization path so `invoke` and `lease` stay behaviorally aligned. Use existing runtime principal fields such as `token_id`, `agent_id`, `labels`, and `scopes` as the first matching surface, and defer named access-set tables until reuse pressure is real.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js, SWR

---

### Task 1: Replace the token-only policy model with a selector model

**Files:**
- Modify: `apps/api/app/models/access_policy.py`
- Modify: `apps/api/app/models/capability.py`
- Modify: `apps/api/app/schemas/capabilities.py`
- Test: `apps/api/tests/test_capability_access_policy.py`

**Step 1: Write a failing test**

Cover these payloads:
- default `all_tokens`
- `selectors` with `kind=token`
- `selectors` with `kind=agent`
- `selectors` with `kind=token_label`
- invalid selector shapes

**Step 2: Run the test to verify it fails**

Run: `./.venv/bin/pytest apps/api/tests/test_capability_access_policy.py -q`

**Step 3: Write minimal implementation**

Replace the current model:

```json
{ "mode": "all_tokens" }
```

or

```json
{
  "mode": "selectors",
  "selectors": [
    { "kind": "token", "ids": ["token-1"] },
    { "kind": "agent", "ids": ["agent-a"] },
    { "kind": "token_label", "key": "environment", "values": ["prod"] }
  ]
}
```

Recommended shape in code:
- `CapabilityAccessPolicy`
- `CapabilityAccessSelector`
- `SelectorKind = "token" | "agent" | "token_label"`

Validation rules:
- `all_tokens` forces `selectors=[]`
- `selectors` mode requires at least one selector
- `token` and `agent` require non-empty `ids`
- `token_label` requires `key` and non-empty `values`
- dedupe `ids` and `values`

**Step 4: Run the test to verify it passes**

Run: `./.venv/bin/pytest apps/api/tests/test_capability_access_policy.py -q`

### Task 2: Move access-policy validation to runtime-aware selectors

**Files:**
- Modify: `apps/api/app/services/access_policy.py`
- Modify: `apps/api/app/repositories/agent_token_repo.py`
- Optionally modify: `apps/api/app/repositories/agent_repo.py`
- Test: `apps/api/tests/test_capability_access_policy.py`

**Step 1: Write failing tests**

Cover validation for:
- unknown `token` selector ids
- unknown `agent` selector ids
- structurally valid `token_label` selectors

**Step 2: Run the tests to verify they fail**

Run: `./.venv/bin/pytest apps/api/tests/test_capability_access_policy.py -q`

**Step 3: Write minimal implementation**

Add a single validator entry point such as:
- `validate_capability_access_policy(session, raw_policy)`

Validation behavior:
- `token` selectors verify active token ids via `AgentTokenRepository`
- `agent` selectors verify existing active agents
- `token_label` selectors only validate shape, not cardinality

Keep serialization in one place so ORM, API, and runtime all normalize through the same code.

**Step 4: Run the tests to verify they pass**

Run: `./.venv/bin/pytest apps/api/tests/test_capability_access_policy.py -q`

### Task 3: Evaluate selectors against the authenticated runtime principal

**Files:**
- Modify: `apps/api/app/services/access_policy.py`
- Modify: `apps/api/app/services/gateway.py`
- Modify: `apps/api/app/auth.py`
- Test: `apps/api/tests/test_invoke_api.py`
- Test: `apps/api/tests/test_lease_api.py`

**Step 1: Write failing runtime tests**

Add coverage for:
- token selector allows the named token and rejects others
- agent selector allows all tokens minted for the named agent
- token label selector allows tokens with matching labels
- all selector matching is shared by `invoke` and `lease`

**Step 2: Run the tests to verify they fail**

Run: `./.venv/bin/pytest apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py -q`

**Step 3: Write minimal implementation**

Replace `ensure_token_access_allowed(raw_policy, token_id)` with something like:
- `ensure_runtime_access_allowed(raw_policy, principal)`

Matching rules:
- `all_tokens` always allows
- `selectors` allows when any selector matches
- `token` matches `principal.token_id`
- `agent` matches `principal.agent_id`
- `token_label` matches `principal.labels[key] in values`

Do not scatter checks across routes. Keep the call site centralized inside the shared gateway authorization path.

**Step 4: Run the tests to verify they pass**

Run: `./.venv/bin/pytest apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py -q`

### Task 4: Migrate stored capability policies to the new shape

**Files:**
- Create: `apps/api/alembic/versions/20260330_02_selector_based_capability_access_policy.py`
- Modify: `apps/api/app/factory.py`
- Modify: `apps/api/app/db.py`
- Test: `apps/api/tests/test_alembic_migrations.py`
- Test: `apps/api/tests/test_startup.py`

**Step 1: Write failing migration coverage**

Cover:
- a capability with `all_tokens`
- a capability with legacy `explicit_tokens`
- startup upgrades converting old JSON to the new selector form

**Step 2: Run the tests to verify they fail**

Run: `./.venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py -q`

**Step 3: Write minimal migration**

Transform legacy rows:

```json
{ "mode": "explicit_tokens", "token_ids": ["token-1"] }
```

into:

```json
{
  "mode": "selectors",
  "selectors": [
    { "kind": "token", "ids": ["token-1"] }
  ]
}
```

Do not keep long-term dual-format runtime logic if migration can fully normalize data.

**Step 4: Run the tests to verify they pass**

Run: `./.venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py -q`

### Task 5: Expand the assets UI from token-only targeting to selector targeting

**Files:**
- Modify: `apps/control-plane-v3/src/domains/governance/types.ts`
- Modify: `apps/control-plane-v3/src/domains/governance/api.ts`
- Modify: `apps/control-plane-v3/src/domains/governance/hooks.ts`
- Modify: `apps/control-plane-v3/src/app/assets/page.tsx`
- Optionally modify: `apps/control-plane-v3/src/domains/identity/types.ts`
- Test: frontend typecheck only unless a focused component test is already present

**Step 1: Run typecheck to verify the old types fail the new contract**

Run: `npm run typecheck`

**Step 2: Write minimal implementation**

Replace the current two-state UI:
- `all_tokens`
- `explicit_tokens`

with selector-building UI:
- all tokens
- specific tokens
- specific agents
- token labels

Form behavior:
- selecting “specific tokens” creates one `kind=token` selector
- selecting “specific agents” creates one `kind=agent` selector
- selecting label facets creates one or more `kind=token_label` selectors
- display cards summarize selectors in readable language instead of raw JSON

Use existing `useAgentsWithTokens()` data first. Derive label facets from token labels on the client. Do not add a new facet API unless the page becomes too heavy.

**Step 3: Run typecheck to verify it passes**

Run: `npm run typecheck`

### Task 6: Verify the end-to-end selector model

**Files:**
- No code changes required

**Step 1: Run focused backend verification**

Run: `./.venv/bin/pytest apps/api/tests/test_capability_access_policy.py apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py -q`

**Step 2: Run frontend verification**

Run: `npm run typecheck`

**Step 3: Run browser smoke checks**

Verify in the control plane:
- create a capability targeting a token
- create a capability targeting an agent
- create a capability targeting a token label
- confirm cards render readable summaries
- confirm `/assets` still loads without runtime errors

**Step 4: Run one DB-level sanity check**

Run:

```bash
sqlite3 apps/api/agent_share.db "select name, access_policy from capabilities order by created_at desc limit 10;"
```

Expected:
- no legacy `explicit_tokens` rows remain
- selector-based JSON persists as intended

### Task 7: Defer named access sets until reuse is real

**Files:**
- No implementation in this phase

**Step 1: Document the deliberate non-goal**

Record in code comments or docs that this phase intentionally does not add:
- `access_sets` table
- access-set membership APIs
- nested selector composition

**Step 2: Define the next expansion trigger**

Only add named sets when at least one of these is true:
- the same selector bundles are reused across multiple capabilities
- operators need centrally edited membership
- selector documents become noisy enough to hurt UX

**Step 3: Preserve one forward-compatible extension point**

Reserve room for future selector kinds such as:
- `access_set`
- `agent_label`
- `scope`

without changing the gateway call pattern again.
