# Control Plane Closure And Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current control plane into a coherent operator workflow by connecting inbox events, global search, governance review, assets, identities, tasks, and spaces with precise contextual deep links instead of generic list-page navigation.

**Architecture:** Keep the existing list-style management pages as the canonical surfaces and avoid introducing a second hierarchy of detail pages for now. Close the loop by standardizing contextual query parameters, teaching backend search/events to emit those links, and teaching each page to focus, filter, and highlight the relevant entity when entered from inbox or search.

**Tech Stack:** Next.js 15 App Router, React 19, SWR, Vitest, FastAPI, SQLAlchemy, pytest.

---

## Scope

- In scope:
  - inbox-to-page deep links
  - search result deep links
  - focused page entry states on existing pages
  - governance status consistency across marketplace, reviews, and assets
  - demo sandbox containment and local navigation
  - targeted tests and full frontend verification
- Out of scope:
  - creating a second set of entity detail pages
  - redesigning the overall shell or navigation information architecture
  - changing authentication model
  - introducing real-time websockets

## Current Facts To Preserve

- The main management routes already exist and are backend-backed:
  - `/inbox`
  - `/identities`
  - `/spaces`
  - `/marketplace`
  - `/reviews`
  - `/tokens`
  - `/tasks`
  - `/assets`
  - `/settings`
- The demo area is now intentionally explicit:
  - `/demo`
  - `/demo/identities`
  - `/demo/spaces`
- Search and inbox are present but still route too generically:
  - backend search currently sends agents to `/identities`, tasks to `/tasks`, assets/skills to `/assets`, and most events to `/inbox`
  - inbox can open `action_url`, but the target pages do not yet interpret focused context
- The existing product semantics should not change:
  - `Inbox` is for agent feedback, completion events, expirations, and system alerts
  - `Marketplace` is agent-published and human-governed
  - `Identities` is the roster for humans and agents, with human management responsibility

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/inbox/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/components/global-search.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/tasks/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/reviews/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/identities/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/assets/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/spaces/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/marketplace/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/lib/route-policy.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/domains/event/types.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/domains/search/types.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/services/event_service.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/services/search_service.py`

## Canonical Query Contract

Use the existing list pages as focused entry surfaces by standardizing these query parameters:

- `/inbox?eventId=<event-id>`
- `/tasks?taskId=<task-id>`
- `/reviews?resourceKind=<kind>&resourceId=<id>`
- `/identities?agentId=<agent-id>` or `/identities?adminId=<admin-id>`
- `/assets?resourceKind=secret&resourceId=<secret-id>`
- `/assets?resourceKind=capability&resourceId=<capability-id>`
- `/spaces?agentId=<agent-id>&eventId=<event-id>`
- `/marketplace?resourceKind=<kind>&resourceId=<id>`

Do not invent route-local parameter names if one of the above already covers the case.

## Task 1: Standardize Contextual Deep Links At The Source

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/lib/control-plane-links.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/lib/control-plane-links.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/domains/search/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/components/global-search.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/services/search_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/services/event_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/tests/test_search_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/tests/test_events_api.py`

**Step 1: Write the failing tests**

Add frontend unit tests for a pure helper that builds exact focused hrefs.

Cover at least:

- agent result -> `/identities?agentId=<id>`
- task result -> `/tasks?taskId=<id>`
- secret result -> `/assets?resourceKind=secret&resourceId=<id>`
- capability result -> `/assets?resourceKind=capability&resourceId=<id>`
- event result with explicit action -> preserve that action
- event result without explicit action -> derive from `subject_type` and `subject_id`

Also extend backend API tests so `/api/search?q=...` returns focused hrefs instead of generic list routes.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/lib/control-plane-links.test.ts src/components/global-search.test.tsx
```

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api
pytest tests/test_search_api.py tests/test_events_api.py -q
```

Expected: FAIL because the helper does not exist yet and the backend still emits generic hrefs.

**Step 3: Write minimal implementation**

Implement a frontend helper with pure builders such as:

- `buildIdentityHref({ agentId })`
- `buildTaskHref(taskId)`
- `buildReviewHref(resourceKind, resourceId)`
- `buildAssetHref(resourceKind, resourceId)`
- `buildSpaceHref({ agentId, eventId })`

Mirror the same route contract in backend search/event serialization. Do not create separate route grammars in Python and TypeScript.

Rules:

- preserve existing `action_url` when explicitly supplied
- derive missing event action URLs from subject metadata
- never return a generic `/assets` or `/tasks` href when a focused href can be produced

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/lib/control-plane-links.test.ts src/components/global-search.test.tsx
npm run typecheck
```

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api
pytest tests/test_search_api.py tests/test_events_api.py -q
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/control-plane-links.ts apps/control-plane-v3/src/lib/control-plane-links.test.ts apps/control-plane-v3/src/domains/search/types.ts apps/control-plane-v3/src/components/global-search.test.tsx apps/api/app/services/search_service.py apps/api/app/services/event_service.py apps/api/tests/test_search_api.py apps/api/tests/test_events_api.py
git commit -m "feat(control-plane): standardize contextual deep links"
```

## Task 2: Make Inbox A Focused Event Workspace Instead Of A Flat Feed

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/inbox/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/inbox/page.test.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/inbox/page-focus.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/domains/event/types.ts`

**Step 1: Write the failing tests**

Add UI tests proving that:

- `/inbox?eventId=event-1` visually highlights the targeted event
- the page renders a focused context summary above the feed when a known event is selected
- the selected card exposes clear CTA text like `Open task`, `Open review item`, `Open identity`, or `Open space`
- `Mark as read` still works for the selected event

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/inbox/page.test.tsx src/app/inbox/page-focus.test.tsx
```

Expected: FAIL because inbox does not yet read query params or render focused entry state.

**Step 3: Write minimal implementation**

Implement the smallest focused inbox behavior:

- read `eventId` from `useSearchParams`
- locate the selected event in the loaded feed
- render a compact context banner when found
- visually emphasize the selected event card
- keep all existing inbox actions intact

If needed, lightly type `metadata` in `Event` so button copy can reflect known subject kinds without unsafe casts.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/inbox/page.test.tsx src/app/inbox/page-focus.test.tsx
npm run typecheck
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/inbox/page.tsx apps/control-plane-v3/src/app/inbox/page.test.tsx apps/control-plane-v3/src/app/inbox/page-focus.test.tsx apps/control-plane-v3/src/domains/event/types.ts
git commit -m "feat(inbox): add focused event workspace entry state"
```

## Task 3: Teach Existing Management Pages To Accept Focus Context

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/lib/focused-entry.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/lib/focused-entry.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/reviews/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/reviews/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/identities/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/assets/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/spaces/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/spaces/page.test.tsx`

**Step 1: Write the failing tests**

Write focused entry tests for each page using query parameters instead of brand-new routes:

- tasks: highlights the selected task when `taskId` is present
- reviews: prefilters by `resourceKind` and highlights `resourceId`
- identities: highlights the selected agent or human account card
- assets: selects the correct resource lane and emphasizes the target asset
- spaces: brings the selected agent/event context into the header summary

Prefer source-backed or component-level tests over heavy browser tests.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/lib/focused-entry.test.ts src/app/tasks/page.test.tsx src/app/reviews/page.test.tsx src/app/identities/page.test.tsx src/app/assets/page.test.tsx src/app/spaces/page.test.tsx
```

Expected: FAIL because none of these pages currently interpret focused query context.

**Step 3: Write minimal implementation**

Implement one shared helper that:

- reads a search-param map
- extracts known focus keys
- returns typed focus state for each page

Then apply only the minimum UI changes needed:

- preselect filter chips when query params imply them
- visually emphasize the matched row/card
- render a small context banner rather than redesigning page layout

Do not add new modals, drawers, or second-level routes.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/lib/focused-entry.test.ts src/app/tasks/page.test.tsx src/app/reviews/page.test.tsx src/app/identities/page.test.tsx src/app/assets/page.test.tsx src/app/spaces/page.test.tsx
npm run typecheck
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/focused-entry.ts apps/control-plane-v3/src/lib/focused-entry.test.ts apps/control-plane-v3/src/app/tasks/page.tsx apps/control-plane-v3/src/app/tasks/page.test.tsx apps/control-plane-v3/src/app/reviews/page.tsx apps/control-plane-v3/src/app/reviews/page.test.tsx apps/control-plane-v3/src/app/identities/page.tsx apps/control-plane-v3/src/app/identities/page.test.tsx apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/app/assets/page.test.tsx apps/control-plane-v3/src/app/spaces/page.tsx apps/control-plane-v3/src/app/spaces/page.test.tsx
git commit -m "feat(control-plane): add focused entry states to management pages"
```

## Task 4: Unify Governance Status Across Marketplace, Reviews, And Assets

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/domains/governance/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/marketplace/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/marketplace/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/reviews/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/reviews/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/assets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/assets/page.test.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/schemas/capabilities.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/app/schemas/secrets.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/tests/test_capabilities_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api/tests/test_secrets_api.py`

**Step 1: Write the failing tests**

Add tests proving that marketplace, reviews, and assets speak the same status vocabulary.

Minimum statuses:

- `pending_review`
- `approved`
- `rejected`
- `active`
- `expired`

UI assertions should prove that:

- marketplace cards show governance state and human oversight wording
- approved items surface as active inventory in assets
- rejected items remain review items and do not appear as active assets

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx src/app/reviews/page.test.tsx src/app/assets/page.test.tsx
```

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api
pytest tests/test_capabilities_api.py tests/test_secrets_api.py -q
```

Expected: FAIL because status semantics are not fully normalized yet.

**Step 3: Write minimal implementation**

Normalize governance types in one place, then update marketplace, reviews, and assets to consume them.

Rules:

- keep marketplace agent-owned
- keep reviews human-governed
- let assets represent only inventory that has cleared governance or clearly indicate its pending/expired state

Do not add a second approval system.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/marketplace/page.test.tsx src/app/reviews/page.test.tsx src/app/assets/page.test.tsx
npm run typecheck
```

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api
pytest tests/test_capabilities_api.py tests/test_secrets_api.py -q
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/governance/types.ts apps/control-plane-v3/src/app/marketplace/page.tsx apps/control-plane-v3/src/app/marketplace/page.test.tsx apps/control-plane-v3/src/app/reviews/page.tsx apps/control-plane-v3/src/app/reviews/page.test.tsx apps/control-plane-v3/src/app/assets/page.tsx apps/control-plane-v3/src/app/assets/page.test.tsx apps/api/app/schemas/capabilities.py apps/api/app/schemas/secrets.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_secrets_api.py
git commit -m "feat(governance): unify marketplace review and asset status flow"
```

## Task 5: Finish Sandbox Containment So Demo Never Becomes A Shadow Product

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/demo/layout.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/demo/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/demo/identities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/demo/spaces/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3/src/app/demo-pages.test.ts`

**Step 1: Write the failing tests**

Add tests proving that:

- every demo page can navigate back to `/demo`
- every demo page links to the equivalent live management surface
- the sandbox layout explains when the page should be retired

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/demo-pages.test.ts
```

Expected: FAIL because local demo-to-demo and demo-to-live orientation is still incomplete.

**Step 3: Write minimal implementation**

Add a compact local sandbox navigation pattern shared by all demo pages:

- `Back to Sandbox Directory`
- `View live identities`
- `View live spaces`

Keep the demo area out of primary navigation.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/demo-pages.test.ts
npm run typecheck
```

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/demo/layout.tsx apps/control-plane-v3/src/app/demo/page.tsx apps/control-plane-v3/src/app/demo/identities/page.tsx apps/control-plane-v3/src/app/demo/spaces/page.tsx apps/control-plane-v3/src/app/demo-pages.test.ts
git commit -m "feat(demo): add sandbox-local navigation and live route handoffs"
```

## Task 6: Run The Full Closure Verification Matrix

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/docs/guides/platform-roadmap.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/docs/guides/production-operations.md`

**Step 1: Write the verification checklist into docs**

Document one operator walkthrough:

1. open an inbox event
2. jump to a focused task/review/identity/asset/space page
3. perform a human governance action
4. verify the marketplace/assets view reflects the same state
5. compare equivalent demo route only as a sandbox reference

**Step 2: Run the full test matrix**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/control-plane-v3
npx vitest run src/app/control-plane-pages.test.ts src/app/page.test.tsx src/app/identities/page.test.tsx src/app/marketplace/page.test.tsx src/app/management-placeholders.test.ts src/app/demo-pages.test.ts src/app/shell-route-integrity.test.ts src/app/inbox/page.test.tsx src/app/spaces/page.test.tsx src/app/reviews/page.test.tsx src/app/tokens/page.test.tsx src/app/tasks/page.test.tsx src/app/assets/page.test.tsx src/app/settings/page.test.tsx src/components/global-search.test.tsx src/hooks/use-notifications.test.ts src/lib/route-policy.test.ts
npm run typecheck
```

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/codex-events-inbox-search/apps/api
pytest tests/test_search_api.py tests/test_events_api.py tests/test_capabilities_api.py tests/test_secrets_api.py tests/test_token_feedback_api.py -q
```

If browser smoke validation is available, also run one manual walkthrough from `/inbox` and one from `Cmd/Ctrl+K` search.

**Step 3: Commit**

```bash
git add docs/guides/platform-roadmap.md docs/guides/production-operations.md
git commit -m "docs(control-plane): record closure verification workflow"
```

## Exit Criteria

This phase is complete only when all of the following are true:

- inbox events land operators in focused, relevant management context
- search results no longer drop users into generic list pages when a focused entry exists
- tasks, reviews, identities, assets, and spaces all accept the canonical query contract
- marketplace, reviews, and assets express one governance state machine
- demo routes remain explicitly sandbox-only and never masquerade as live functionality
- the frontend and backend verification commands above pass fresh
