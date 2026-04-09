# Control Plane Gap Closure Implementation Plan

## Historical Status

This file is retained as historical implementation context for the gap-closure phase that moved the repository toward a truthful trial-run baseline. It should not replace the current `agent server first` framing used in the guides.

Read these guides first for the current architecture position:

- `docs/guides/agent-server-first.md`
- `docs/guides/agent-quickstart.md`
- `docs/guides/production-deployment.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining product, release, governance, and platform gaps so the current control plane can move from an impressive beta into a truthful trial-run baseline with a clear path to enterprise hardening.

**Architecture:** Execute the work in four layers. First, lock the repository into a reproducible release-ready state. Second, close the operator workflow loop across inbox, search, tasks, identities, reviews, marketplace, and assets so every governance action resolves to one canonical truth. Third, harden operator identity, policy, and audit semantics inside the app boundary. Fourth, prepare the handoff to platform-owned work for SSO, managed stateful services, HA, and centralized observability.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, Next.js 15 App Router, React 19, TypeScript, SWR, Vitest, Docker Compose, GitHub Actions.

---

## Scope

- In scope:
  - release readiness and local verification
  - focused deep links and cross-surface control-plane closure
  - governance truth consistency across assets, reviews, marketplace, and inbox
  - operator policy matrix, audit coverage, and auth abstraction seams
  - marketplace and spaces v1 productization inside the current repository
  - observability and runbook hardening that can be owned by the app repo
- Out of scope:
  - full SSO implementation with a real identity provider
  - managed Postgres, Redis, and secret backend provisioning
  - multi-host failover orchestration
  - centralized alerting infra outside the repository
  - a complete redesign of the current UI shell

## Current Facts To Preserve

- The functional management routes already exist in `apps/control-plane-v3`:
  - `/`
  - `/inbox`
  - `/identities`
  - `/spaces`
  - `/marketplace`
  - `/reviews`
  - `/tokens`
  - `/tasks`
  - `/assets`
  - `/settings`
- The backend already exposes real management/runtime APIs in `apps/api/app/routes`.
- The repository already includes strong test coverage:
  - frontend: `32` files / `136` tests passing
  - backend: `246` tests passing when run through the prepared `.venv`
- The repo already documents two near-term truth anchors:
  - `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-01-release-readiness-repair-plan.md`
  - `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-01-control-plane-closure-and-governance-plan.md`
- The platform boundary is explicit:
  - `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-01-release-readiness-repair-plan.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-01-control-plane-closure-and-governance-plan.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/inbox/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/reviews/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/access_policy.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/search_service.py`

## Delivery Phases

- `P0`: trial-run blocker removal
- `P1`: operator workflow closure and governance correctness
- `P2`: app-bound productization and trust hardening
- `P3`: platform handoff and enterprise-readiness boundary

## Task 1: Establish One Truthful Repository Verification Command (`P0`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/ops/verify-control-plane.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/ops/bootstrap-dev-runtime.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_container_artifacts.py`

**Step 1: Write the failing ops assertion**

Add or extend an ops-level test that asserts the repo publishes one documented verification entrypoint and that the referenced command/script actually exists.

Use a focused test shape like:

```python
from pathlib import Path

def test_verify_control_plane_script_exists():
    script = Path("scripts/ops/verify-control-plane.sh")
    assert script.exists()
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_container_artifacts.py -q
```

Expected: FAIL because the unified verification script does not exist yet.

**Step 3: Write minimal implementation**

Create `scripts/ops/verify-control-plane.sh` that runs, in order:

- backend tests via `.venv/bin/pytest apps/api/tests tests/ops -q`
- frontend tests via `npm test -- --run`
- frontend typecheck
- frontend lint
- frontend build
- `docker compose config`

Keep the script:

- strict with `set -euo pipefail`
- root-relative
- readable enough for humans to run locally and CI to reuse

Update:

- `README.md` to point at the new command as the primary verification path
- `bootstrap-dev-runtime.sh` to mention it after setup
- `.github/workflows/ci.yml` to prefer the same command instead of duplicating shell fragments

**Step 4: Run test and full verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_container_artifacts.py -q
./scripts/ops/verify-control-plane.sh
```

Expected:

- ops test PASS
- the verification script exits successfully

**Step 5: Commit**

```bash
git add scripts/ops/verify-control-plane.sh README.md scripts/ops/bootstrap-dev-runtime.sh .github/workflows/ci.yml tests/ops/test_container_artifacts.py
git commit -m "chore(release): unify control plane verification"
```

## Task 2: Finish Release Readiness Drift Repair (`P0`)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/env.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/docker-images.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/check-intake-drift.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_intake_catalog_export.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/package.json`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_bootstrap_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runtime.py`

**Step 1: Run the documented failing checks**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest \
  apps/api/tests/test_admin_accounts_api.py \
  apps/api/tests/test_runtime.py \
  apps/api/tests/test_bootstrap_api.py \
  tests/ops/test_intake_catalog_export.py -q
```

Expected: FAIL if migration target drift or path drift remains.

**Step 2: Implement the minimal release fixes**

- Keep Alembic migration targeting aligned with the caller-supplied DB URL.
- Remove any stale assumptions that the web app lives in `apps/web`.
- Ensure frontend package scripts expose the same quality floor the repo now documents.

Do not redesign functionality in this task. Only remove drift that makes the repo less truthful than the current implementation.

**Step 3: Re-run the focused release checks**

Run the same command from Step 1.

Expected: PASS.

**Step 4: Re-run the repository verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/alembic/env.py .github/workflows/docker-images.yml scripts/check-intake-drift.py tests/ops/test_intake_catalog_export.py apps/control-plane-v3/package.json
git commit -m "fix(release): align migrations and repo paths with control-plane-v3"
```

## Task 3: Close Inbox/Search To Management-Surface Deep Links (`P1`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/control-plane-links.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/control-plane-links.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/focused-entry.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/focused-entry.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/inbox/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/reviews/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/global-search.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/search_service.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/inbox/page-focus.test.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_events_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_search_api.py`

**Step 1: Write the failing tests**

Cover these exact contracts:

- agent search result -> `/identities?agentId=<id>`
- task search result -> `/tasks?taskId=<id>`
- secret search result -> `/assets?resourceKind=secret&resourceId=<id>`
- capability search result -> `/assets?resourceKind=capability&resourceId=<id>`
- inbox event selection -> banner/highlight/CTA on `/inbox?eventId=<event-id>`
- focused entry pages highlight and filter the matching resource instead of opening generic lists

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npx vitest run \
  src/lib/control-plane-links.test.ts \
  src/lib/focused-entry.test.ts \
  src/app/inbox/page.test.tsx \
  src/app/inbox/page-focus.test.tsx \
  src/app/tasks/page.test.tsx \
  src/app/reviews/page.test.tsx \
  src/app/identities/page.test.tsx \
  src/app/assets/page.test.tsx \
  src/app/spaces/page.test.tsx
```

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_events_api.py apps/api/tests/test_search_api.py -q
```

Expected: FAIL because focused deep links are still incomplete or generic.

**Step 3: Write minimal implementation**

Implement one canonical route grammar only:

- `/inbox?eventId=<id>`
- `/tasks?taskId=<id>`
- `/reviews?resourceKind=<kind>&resourceId=<id>`
- `/identities?agentId=<id>` or `/identities?adminId=<id>`
- `/assets?resourceKind=<kind>&resourceId=<id>`
- `/spaces?agentId=<id>&eventId=<id>`
- `/marketplace?resourceKind=<kind>&resourceId=<id>`

Rules:

- search and event serialization must emit those URLs
- pages must interpret them the same way
- selected items must be visually emphasized and contextually summarized
- no duplicate detail-route system should be introduced

**Step 4: Run focused verification**

Run the commands from Step 2, then:

```bash
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run build
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/control-plane-links.ts apps/control-plane-v3/src/lib/control-plane-links.test.ts apps/control-plane-v3/src/lib/focused-entry.ts apps/control-plane-v3/src/lib/focused-entry.test.ts apps/control-plane-v3/src/app/inbox/page.tsx apps/control-plane-v3/src/app/tasks/page.tsx apps/control-plane-v3/src/app/reviews/page.tsx apps/control-plane-v3/src/app/identities/page.tsx apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/app/spaces/page.tsx apps/control-plane-v3/src/components/global-search.tsx apps/api/app/services/event_service.py apps/api/app/services/search_service.py apps/api/tests/test_events_api.py apps/api/tests/test_search_api.py
git commit -m "feat(control-plane): close focused deep-link workflow"
```

## Task 4: Unify Governance Truth Across Reviews, Assets, Marketplace, And Inbox (`P1`)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/reviews/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/governance/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/governance/hooks.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/review_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.test.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/reviews/page.test.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/assets/page.test.tsx`

**Step 1: Write the failing tests**

Add tests proving that after a human approves or rejects an item:

- reviews shows the updated state
- assets shows the same updated state
- marketplace shows the same updated state
- inbox/event copy does not imply a conflicting status

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx src/app/reviews/page.test.tsx src/app/assets/page.test.tsx
```

Expected: FAIL if any surface still derives status differently.

**Step 3: Write minimal implementation**

- Define one frontend governance status mapping helper if one does not already cover every surface.
- Ensure backend review transitions publish the same canonical state that every page consumes.
- Remove contradictory surface-specific wording such as implying a second approval path in marketplace.

**Step 4: Run verification**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx src/app/reviews/page.test.tsx src/app/assets/page.test.tsx
npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/marketplace/page.tsx apps/control-plane-v3/src/app/reviews/page.tsx apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/domains/governance/types.ts apps/control-plane-v3/src/domains/governance/hooks.ts apps/api/app/services/review_service.py apps/api/app/services/event_service.py
git commit -m "fix(governance): unify status truth across operator surfaces"
```

## Task 5: Introduce An Explicit Operator Action Policy Matrix (`P1`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/operator-policy-matrix.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/access_policy.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/policy_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/admin_accounts.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agents.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/reviews.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_authorization_policy.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_roles.py`

**Step 1: Write the failing policy tests**

Cover at least:

- `owner` can bootstrap/administer everything
- `admin` can manage agents/tokens/tasks but cannot disable the owner
- `operator` can review, inspect, and submit operational actions but cannot create admin accounts
- `viewer` can read but not mutate

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest \
  apps/api/tests/test_authorization_policy.py \
  apps/api/tests/test_management_roles.py -q
```

Expected: FAIL because route-level permissions are not yet fully aligned to one action matrix.

**Step 3: Write minimal implementation**

- Express policy in one service layer vocabulary, not scattered route conditionals.
- Gate each mutating route through explicit action checks such as:
  - `admin_accounts:create`
  - `admin_accounts:disable`
  - `agents:create`
  - `tokens:issue`
  - `reviews:decide`
  - `tasks:create`
- Document the matrix in `docs/guides/operator-policy-matrix.md`.

**Step 4: Run verification**

Run the same command from Step 2, then:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_admin_accounts_api.py apps/api/tests/test_reviews_api.py apps/api/tests/test_tasks_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/guides/operator-policy-matrix.md apps/api/app/services/access_policy.py apps/api/app/services/policy_service.py apps/api/app/routes/admin_accounts.py apps/api/app/routes/agents.py apps/api/app/routes/reviews.py apps/api/app/routes/tasks.py apps/api/tests/test_authorization_policy.py apps/api/tests/test_management_roles.py
git commit -m "feat(policy): add explicit operator action matrix"
```

## Task 6: Expand Audit Coverage For Human Governance And Token Operations (`P1`)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/audit_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/review_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/agent_token_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/reviews.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agent_tokens.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_observability_logging.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_review_queue_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_agent_tokens_api.py`

**Step 1: Write the failing audit tests**

Add tests proving that these operations emit durable audit/event records with actor, target, decision, and reason metadata where applicable:

- approve review
- reject review
- issue token
- revoke token
- disable admin account

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest \
  apps/api/tests/test_observability_logging.py \
  apps/api/tests/test_review_queue_api.py \
  apps/api/tests/test_agent_tokens_api.py -q
```

Expected: FAIL where action metadata is missing or incomplete.

**Step 3: Write minimal implementation**

- Emit one canonical audit event per high-trust action.
- Include:
  - actor type/id
  - subject type/id
  - action verb
  - governance decision where relevant
  - rejection reason where relevant
- Reuse existing event/audit infrastructure instead of inventing a new ledger.

**Step 4: Run verification**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/app/services/event_service.py apps/api/app/services/review_service.py apps/api/app/services/agent_token_service.py apps/api/app/routes/reviews.py apps/api/app/routes/agent_tokens.py apps/api/tests/test_observability_logging.py apps/api/tests/test_review_queue_api.py apps/api/tests/test_agent_tokens_api.py
git commit -m "feat(audit): record governance and token trust actions"
```

## Task 7: Productize Marketplace Into A Versioned Agent Catalog V1 (`P2`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/catalog_release.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/catalog_release_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/catalog.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/catalog.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_01_catalog_release_v1.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/api.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/hooks.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_catalog_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.test.tsx`

**Step 1: Write the failing tests**

Define a minimal V1 catalog contract that supports:

- listing published entries
- showing current version and prior versions
- showing adoption counts or placeholder counts derived from current targets
- filtering by status and kind

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py -q
cd apps/control-plane-v3 && npx vitest run src/app/marketplace/page.test.tsx
```

Expected: FAIL because the catalog domain does not exist yet.

**Step 3: Write minimal implementation**

Implement a V1 model only:

- no ratings system
- no public marketplace
- no billing/subscription

Required fields:

- `resource_kind`
- `resource_id`
- `version`
- `release_status`
- `released_at`
- `released_by_actor_id`
- optional notes/changelog

Use marketplace as the operator-facing catalog of agent-published governed assets, not a public storefront.

**Step 4: Run verification**

Run the commands from Step 2, then:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_reviews_api.py apps/api/tests/test_search_api.py -q
cd apps/control-plane-v3 && npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/catalog_release.py apps/api/app/repositories/catalog_release_repo.py apps/api/app/routes/catalog.py apps/api/app/schemas/catalog.py apps/api/alembic/versions/20260402_01_catalog_release_v1.py apps/api/app/routes/__init__.py apps/control-plane-v3/src/app/marketplace/page.tsx apps/control-plane-v3/src/domains/catalog/api.ts apps/control-plane-v3/src/domains/catalog/hooks.ts apps/api/tests/test_catalog_api.py apps/control-plane-v3/src/app/marketplace/page.test.tsx
git commit -m "feat(marketplace): add versioned agent catalog v1"
```

## Task 8: Turn Spaces Into A Real Operational Container (`P2`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space_member.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space_timeline_entry.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/space_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/spaces.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/spaces.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_02_spaces_v1.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/api.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/hooks.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_spaces_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.test.tsx`

**Step 1: Write the failing tests**

Cover a minimal `Spaces V1` contract:

- create/list spaces
- attach members
- show timeline entries sourced from tasks/reviews/events
- filter a space by agent or event context

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_api.py -q
cd apps/control-plane-v3 && npx vitest run src/app/spaces/page.test.tsx
```

Expected: FAIL because spaces are still an aggregate dashboard, not a persisted domain.

**Step 3: Write minimal implementation**

Implement only the following:

- `space`
- `space_member`
- `space_timeline_entry`

Do not implement:

- chat transport
- websocket collaboration
- arbitrary document editing

Goal: make `/spaces` a real contextual container for operations, not a placeholder for future collaboration fantasies.

**Step 4: Run verification**

Run the commands from Step 2, then:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_events_api.py apps/api/tests/test_tasks_api.py -q
cd apps/control-plane-v3 && npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/space.py apps/api/app/orm/space_member.py apps/api/app/orm/space_timeline_entry.py apps/api/app/repositories/space_repo.py apps/api/app/routes/spaces.py apps/api/app/schemas/spaces.py apps/api/alembic/versions/20260402_02_spaces_v1.py apps/api/app/routes/__init__.py apps/control-plane-v3/src/app/spaces/page.tsx apps/control-plane-v3/src/domains/space/api.ts apps/control-plane-v3/src/domains/space/hooks.ts apps/api/tests/test_spaces_api.py apps/control-plane-v3/src/app/spaces/page.test.tsx
git commit -m "feat(spaces): add persisted operational spaces v1"
```

## Task 9: Add An Operator Auth Provider Seam For Future SSO (`P2`)

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/operator_identity_provider.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/operator_identity_local.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/config.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_operator_identity_provider.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`

**Step 1: Write the failing tests**

Define the seam with a test double:

- session login delegates credential verification to a provider interface
- the current local/password flow remains the default implementation
- config selects the provider implementation

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_operator_identity_provider.py apps/api/tests/test_session_auth.py -q
```

Expected: FAIL because session auth is still tightly coupled to the current local flow.

**Step 3: Write minimal implementation**

Create a tiny provider abstraction:

- `authenticate(email, password) -> operator identity or failure`
- default local implementation backed by the existing password service

Do not build real SSO in this task. Only create the seam so future SSO work is additive rather than disruptive.

**Step 4: Run verification**

Run the commands from Step 2, then:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_management_auth.py apps/api/tests/test_bootstrap_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services/operator_identity_provider.py apps/api/app/services/operator_identity_local.py apps/api/app/services/session_service.py apps/api/app/routes/session.py apps/api/app/config.py apps/api/tests/test_operator_identity_provider.py docs/guides/production-security.md
git commit -m "refactor(auth): add operator identity provider seam"
```

## Task 10: Harden App-Bound Observability And Trial-Run Operations (`P2`)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/observability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/ops/smoke-test.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_trial_run_readiness.py`

**Step 1: Write the failing ops/readiness tests**

Add tests for:

- documented smoke probes
- documented backup/restore expectations
- required metrics endpoints and counters
- explicit trial-run checklist sections in ops docs

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_trial_run_readiness.py apps/api/tests/test_metrics.py -q
```

Expected: FAIL because the trial-run checklist is not yet formalized end-to-end.

**Step 3: Write minimal implementation**

- add any missing request/governance metrics needed for an operator trial run
- extend smoke tests to cover the main UI and API health expectations
- document:
  - startup verification
  - backup cadence
  - restore drill cadence
  - secret rotation rehearsal expectations
  - governance workflow spot-checks

**Step 4: Run verification**

Run the command from Step 2, then:

```bash
./scripts/ops/smoke-test.sh
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/observability.py apps/api/app/routes/metrics.py scripts/ops/smoke-test.sh docs/guides/production-operations.md docs/guides/production-security.md tests/ops/test_trial_run_readiness.py
git commit -m "chore(ops): harden trial-run observability and runbooks"
```

## Task 11: Produce The Platform Handoff Package (`P3`)

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-handoff-checklist.md`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_platform_handoff_docs.py`

**Step 1: Write the failing doc tests**

Assert the handoff docs explicitly cover:

- managed Postgres migration expectations
- managed Redis expectations
- external secret backend ownership
- SSO ownership boundary
- HA failover ownership
- centralized alerting ownership
- exit criteria for calling the repository “trial-run ready” vs “enterprise-ready”

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py -q
```

Expected: FAIL because the handoff checklist does not exist yet.

**Step 3: Write minimal implementation**

Document two explicit thresholds:

- `trial-run ready`
  - repo-owned, single-host, controlled-environment baseline
- `enterprise-ready`
  - requires platform-owned SSO, managed data services, HA, and centralized alerting

Do not move platform work back into the app repo. Make the ownership boundary clearer.

**Step 4: Run verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/guides/platform-roadmap.md docs/guides/platform-handoff-checklist.md tests/ops/test_platform_handoff_docs.py
git commit -m "docs(platform): add handoff checklist and readiness boundary"
```

## Final Verification

**Step 1: Run the complete repository verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 2: Run focused milestone verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
cd apps/control-plane-v3 && npm test -- --run
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run lint
cd apps/control-plane-v3 && npm run build
docker compose config
```

Expected: PASS.

**Step 3: Report milestone state**

Summarize status in four lines:

- `P0`: release-ready or blocked
- `P1`: operator-closed-loop or blocked
- `P2`: app-bound trust/productization or blocked
- `P3`: platform handoff prepared or blocked

Call out residual blockers separately from longer-term platform work.
