# Catalog And Marketplace Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the existing operator-facing marketplace into a truthful catalog domain with canonical release history, explicit version semantics, and UI behavior that reflects catalog truth instead of synthesized fallback state.

**Architecture:** Build on the shipped catalog V1 instead of replacing it. First tighten backend release semantics so published state always comes from durable release records. Then add version history and release metadata needed for operator inspection. Finally update the marketplace page to present pending, rejected, and published states through one coherent governance model.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, Next.js 15 App Router, React 19, TypeScript, SWR, Vitest.

---

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-control-plane-architecture-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-audit-and-governance-event-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/catalog_service.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/catalog.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/api.ts`

## Scope

- In scope:
  - canonical release-backed catalog reads
  - release history and current version semantics
  - optional notes/changelog metadata
  - explicit status and kind filters
  - marketplace UI alignment with release truth
- Out of scope:
  - public marketplace
  - ratings or reviews by end users
  - billing, subscriptions, or purchase flows
  - playbook publication in this plan

## Task 1: Remove Synthetic Catalog Truth And Establish Canonical Release Semantics

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/catalog_release.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/catalog_release_repo.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/catalog.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/catalog_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_04_catalog_release_hardening.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_catalog_api.py`

**Step 1: Extend the failing backend tests**

Cover:

- published items are backed by real release rows
- current version is explicit
- older versions can be returned in release history
- a resource without a release row is not silently treated as published

**Step 2: Run the focused backend tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py -q
```

Expected: FAIL because the current service still synthesizes catalog items when release rows are missing.

**Step 3: Write the minimal backend hardening**

Implement:

- canonical release-only published reads
- release metadata fields such as `release_notes` or `changelog`
- explicit latest-version selection
- a clear contract for version history

Do not add public distribution logic.

**Step 4: Re-run the focused backend tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/catalog_release.py apps/api/app/repositories/catalog_release_repo.py apps/api/app/schemas/catalog.py apps/api/app/services/catalog_service.py apps/api/alembic/versions/20260402_04_catalog_release_hardening.py apps/api/tests/test_catalog_api.py
git commit -m "feat(catalog): harden release-backed catalog semantics"
```

## Task 2: Add Release History And Filtering To The Catalog API

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/catalog.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/catalog.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/catalog_service.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_catalog_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_search_api.py`

**Step 1: Add failing API contract tests**

Cover:

- list current catalog items by `resource_kind`
- filter by `release_status`
- fetch release history for one resource
- preserve focused entry links from search into marketplace resource context

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py apps/api/tests/test_search_api.py -q
```

Expected: FAIL because the API does not yet expose explicit history/filter contracts.

**Step 3: Write the minimal API implementation**

Add:

- query params for `resource_kind` and `release_status`
- release history response for one resource
- clear schema fields for `current_release` and `prior_releases`

Keep the contract operator-facing and internal. Do not expose storefront concepts.

**Step 4: Re-run the focused tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py apps/api/tests/test_search_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/routes/catalog.py apps/api/app/schemas/catalog.py apps/api/app/services/catalog_service.py apps/api/tests/test_catalog_api.py apps/api/tests/test_search_api.py
git commit -m "feat(catalog): add history and filtering contracts"
```

## Task 3: Align Marketplace UI With Canonical Catalog Truth

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/api.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/hooks.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/catalog/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/marketplace/page.test.tsx`

**Step 1: Extend the failing frontend tests**

Cover:

- published cards render only release-backed catalog entries
- release version and release notes render on the published panel
- pending and rejected review items remain sourced from review truth, not catalog truth
- focused `resourceKind/resourceId` entry still works

**Step 2: Run the focused frontend tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx
```

Expected: FAIL because the UI currently assumes the simpler V1 catalog contract.

**Step 3: Write the minimal frontend implementation**

Update the marketplace page so:

- pending and rejected continue to come from review state
- published items come only from release-backed catalog state
- operators can inspect current version and version history summary
- missing catalog data produces an explicit empty state instead of silent synthesis

**Step 4: Re-run the frontend tests and typecheck**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx
npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/catalog/api.ts apps/control-plane-v3/src/domains/catalog/hooks.ts apps/control-plane-v3/src/domains/catalog/types.ts apps/control-plane-v3/src/app/marketplace/page.tsx apps/control-plane-v3/src/app/marketplace/page.test.tsx
git commit -m "feat(marketplace): align UI with canonical catalog releases"
```

## Task 4: Full Verification And Release Readiness Check

**Step 1: Run focused cross-domain verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_catalog_api.py apps/api/tests/test_reviews_api.py apps/api/tests/test_search_api.py -q
cd apps/control-plane-v3 && npx vitest run src/app/marketplace/page.test.tsx
cd apps/control-plane-v3 && npm run typecheck
```

Expected: PASS.

**Step 2: Run the unified repository verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 3: Report readiness**

State whether the marketplace is now:

- release-backed
- governance-consistent
- still intentionally operator-facing and non-public

