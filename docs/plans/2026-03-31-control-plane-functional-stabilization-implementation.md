# Control Plane Functional Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore production-usable auth, routing, shell behavior, and API connectivity in `apps/control-plane-v3` without changing UI structure, styling, or visual design.

**Architecture:** Keep the existing Next.js App Router + SWR + same-origin proxy approach, but make the browser-to-backend contract truthful and centralized. Fix the proxy boundary first, then collapse entry/session resolution onto one canonical contract, then make route policy authoritative, and finally retarget broken shell actions to existing functional surfaces so the app behaves coherently without a UI redesign.

**Tech Stack:** Next.js 15 App Router, React 19, SWR, Vitest, jsdom, curl, Playwright CLI.

---

## Scope

- In scope:
  - API proxy contract
  - bootstrap/session/login/logout flow
  - route access policy and guard behavior
  - shell state source selection
  - broken route/action targets
  - test coverage and smoke verification
  - functional docs
- Out of scope:
  - layout changes
  - typography, color, spacing, animation, illustration, or other UI styling work
  - building real backend implementations for `/identities` or `/spaces`
  - redesigning placeholders that are already explicit and honest

## Current Facts To Preserve

- Backend management routes in `apps/api` are mounted under `/api/*`, for example:
  - `/api/bootstrap/status`
  - `/api/session/login`
  - `/api/session/me`
  - `/api/agents`
  - `/api/tasks`
- Frontend `apiFetch()` already assumes the browser contract is `same-origin /api/*`.
- Fresh browser validation on `2026-03-31` showed:
  - `GET /api/bootstrap/status` returned `404`
  - `GET /api/api/bootstrap/status` returned `200`
  - `POST /api/session/login` returned `404`
  - `GET /api/agents` returned `404`
  - `GET /api/api/agents` returned `401`
- Conclusion:
  - the frontend caller contract is reasonable,
  - but the Next.js proxy target contract is still off by one `/api` prefix.

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-03-31-frontend-functional-refactor-requirements.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/docs/api-endpoints.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/api/[...path]/route.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/session.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/session-state.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/route-guard.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/route-policy.ts`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/index.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/header.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/create-menu.tsx`

## Task 1: Normalize The Backend API Target Once

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/backend-api-url.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/backend-api-url.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/api/[...path]/route.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/docs/api-endpoints.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/README.md`

**Step 1: Write the failing test**

Add a small pure helper test that proves:

- `http://localhost:8000` + `session/me` becomes `http://localhost:8000/api/session/me`
- `http://localhost:8000/api` + `session/me` stays `http://localhost:8000/api/session/me`
- leading slashes in path segments do not create `//`

Use a focused test like:

```ts
import { describe, expect, it } from 'vitest';
import { buildBackendApiUrl } from '@/lib/backend-api-url';

describe('buildBackendApiUrl', () => {
  it('adds one api prefix when the backend base is origin-only', () => {
    expect(buildBackendApiUrl('http://localhost:8000', '/session/me')).toBe(
      'http://localhost:8000/api/session/me',
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/backend-api-url.test.ts
```

Expected: FAIL because the helper does not exist yet and the current proxy still forwards to `http://localhost:8000/<path>`.

**Step 3: Write minimal implementation**

Implement a single helper that:

- accepts `BACKEND_API_URL`
- trims trailing slash
- appends `/api` only when the configured base does not already end with `/api`
- trims leading slashes from the forwarded path
- preserves query strings separately

Update the route handler to call that helper instead of interpolating `${API_BASE_URL}/${path}` directly.

Do not change any page component in this task.

**Step 4: Run test and smoke check**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/backend-api-url.test.ts
npm run typecheck
npm run build
```

Then run:

```bash
curl -i http://localhost:3004/api/bootstrap/status
curl -i http://localhost:3004/api/session/me
curl -i http://localhost:3004/api/agents
```

Expected:

- unit test PASS
- typecheck PASS
- build PASS
- `GET /api/bootstrap/status` is no longer `404` from a bad prefix
- `GET /api/session/me` returns `401` when unauthenticated, not `404`
- `GET /api/agents` returns `401` when unauthenticated, not `404`

**Step 5: Commit**

```bash
git add src/lib/backend-api-url.ts src/lib/backend-api-url.test.ts src/app/api/[...path]/route.ts docs/api-endpoints.md README.md
git commit -m "fix(control-plane-v3): normalize backend api proxy target"
```

## Task 2: Unify Entry And Session Resolution

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/entry-state.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/entry-state.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/session.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/session-state.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/login/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/route-guard.tsx`

**Step 1: Write the failing tests**

Create tests for one canonical resolver that maps transport results into these states only:

- `bootstrap_required`
- `login_required`
- `authenticated_ready`
- `unavailable`

Cover at least:

- bootstrap says `initialized: false` -> `bootstrap_required`
- bootstrap initialized + session `401` -> `login_required`
- bootstrap initialized + valid session -> `authenticated_ready`
- backend `404`/`503`/network failure -> `unavailable`

Use a focused shape like:

```ts
it('returns login_required when bootstrap is ready and session is unauthorized', async () => {
  const state = await resolveEntryState({
    getBootstrapStatus: async () => ({ initialized: true }),
    getSession: async () => {
      throw new ApiError(401, 'Missing management session');
    },
  });
  expect(state.kind).toBe('login_required');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/entry-state.test.ts
```

Expected: FAIL because the canonical resolver does not exist yet and the app still spreads this logic across multiple files.

**Step 3: Write minimal implementation**

Implement a shared resolver module and make all of these callers consume it:

- root page
- login page preflight
- route guard bootstrap/session check
- any centralized session bootstrap path

Rules:

- map unauthorized to `login_required`
- map uninitialized bootstrap to `bootstrap_required`
- map transport/contract failures to `unavailable`
- keep existing page markup intact

Do not introduce a second state vocabulary in this task.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/entry-state.test.ts src/app/control-plane-pages.test.ts
npm run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/entry-state.ts src/lib/entry-state.test.ts src/lib/session.ts src/lib/session-state.ts src/app/login/page.tsx src/app/page.tsx src/components/route-guard.tsx src/app/control-plane-pages.test.ts
git commit -m "refactor(control-plane-v3): unify entry and session resolution"
```

## Task 3: Make Route Policy The Single Functional Authority

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/route-policy.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/route-policy.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/route-guard.tsx`

**Step 1: Write the failing tests**

Add route-policy tests that prove:

- `/tokens`, `/assets`, `/tasks`, `/reviews`, `/settings`, `/identities`, and `/spaces` all require authenticated management state
- `/demo/identities` and `/demo/spaces` remain explicitly demo
- `/marketplace` is explicit placeholder/unavailable rather than silently “real”
- `/logout` is allowed as an auth transition route if added later

Use a focused test like:

```ts
it('blocks anonymous access to identities', () => {
  expect(isRouteAllowed('/identities', 'anonymous')).toEqual({
    allowed: false,
    redirect: '/login',
    reason: 'Authentication required for /identities',
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/route-policy.test.ts
```

Expected: FAIL because `/identities` and `/spaces` are not yet represented in the policy table and guard behavior still mixes policy-driven and ad hoc checks.

**Step 3: Write minimal implementation**

Update `route-policy.ts` so every active route belongs to one product mode only.

Required outcomes:

- add `/identities` and `/spaces` as authenticated management routes
- keep `/demo/*` explicitly demo
- keep `/marketplace` explicit placeholder/unavailable
- remove any remaining ad hoc gate logic in `route-guard.tsx` that duplicates the policy table

Do not alter page markup or add visual affordances in this task.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/route-policy.test.ts src/app/control-plane-pages.test.ts
npm run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/route-policy.ts src/lib/route-policy.test.ts src/components/route-guard.tsx src/app/control-plane-pages.test.ts
git commit -m "refactor(control-plane-v3): centralize route access policy"
```

## Task 4: Stop Using Local Runtime Truth For The Management Shell

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/hooks/use-shell-identity.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/hooks/use-shell-identity.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/index.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/header.tsx`

**Step 1: Write the failing tests**

Add tests that prove:

- on `/demo/*`, the shell may still use runtime/demo identities
- on authenticated management routes, the shell derives the current operator from management session state instead of runtime registry state
- management routes do not need runtime presence data to render the shell

Use a test shape like:

```ts
it('returns session-backed shell identity on management routes', async () => {
  const result = buildShellIdentityState({
    pathname: '/tokens',
    session: { state: 'authenticated', email: 'owner@example.com', role: 'owner' },
    runtime: demoRuntimeState,
  });
  expect(result.currentIdentity?.profile.name).toContain('owner@example.com');
  expect(result.onlineIdentities).toEqual([]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-shell-identity.test.ts
```

Expected: FAIL because the shell currently always reads runtime identity registry data through `useIdentities()`.

**Step 3: Write minimal implementation**

Create a dedicated hook or pure adapter for shell identity sourcing:

- management routes:
  - derive current operator from authenticated session
  - return empty `onlineIdentities` unless a real backend source exists
- demo routes:
  - continue using runtime/demo data

Keep the header/sidebar visuals untouched. Only change where the data comes from.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-shell-identity.test.ts
npm run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/use-shell-identity.ts src/hooks/use-shell-identity.test.ts src/interfaces/human/layout/index.tsx src/interfaces/human/layout/header.tsx
git commit -m "refactor(control-plane-v3): separate shell state from demo runtime"
```

## Task 5: Eliminate Broken Shell Action Targets Without Redesign

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/logout/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/shell-route-integrity.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/header.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/components/create-menu.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/route-policy.ts`

**Step 1: Write the failing tests**

Add tests that prove:

- header actions do not navigate to missing routes
- create-menu actions only target routes that exist right now
- `/logout` performs a functional auth transition instead of returning `404`

Use a focused test like:

```ts
it('does not point create-menu actions to missing routes', () => {
  expect(getCreateActionTargets()).toEqual([
    '/tokens',
    '/settings',
    '/tokens',
    '/spaces',
    '/settings',
  ]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/app/shell-route-integrity.test.ts
```

Expected: FAIL because current targets include `/profile`, `/logout`, `/tokens/create`, and `/spaces/create`, and several of those routes do not exist.

**Step 3: Write minimal implementation**

Implement the smallest behavior-only fix:

- add `/logout` page that calls logout and redirects to `/login`
- retarget `Profile` to `/settings` until a real profile surface exists
- retarget create-menu destinations to existing functional pages:
  - create agent -> `/tokens`
  - create human -> `/settings`
  - create token -> `/tokens`
  - create space -> `/spaces`

Do not restyle controls and do not create brand-new UI flows in this task.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/app/shell-route-integrity.test.ts src/app/control-plane-pages.test.ts
npm run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/logout/page.tsx src/app/shell-route-integrity.test.ts src/interfaces/human/layout/header.tsx src/components/create-menu.tsx src/lib/route-policy.ts src/app/control-plane-pages.test.ts
git commit -m "fix(control-plane-v3): align shell actions with real routes"
```

## Phase Verification

Run the full local verification set after Tasks 1-5:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/lib/backend-api-url.test.ts src/lib/entry-state.test.ts src/lib/route-policy.test.ts src/hooks/use-shell-identity.test.ts src/app/shell-route-integrity.test.ts src/app/control-plane-pages.test.ts
npm run typecheck
npm run build
```

Then start the app:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx next start -p 3004
```

Run HTTP checks:

```bash
curl -i http://localhost:3004/api/bootstrap/status
curl -i http://localhost:3004/api/session/me
curl -i http://localhost:3004/api/agents
curl -i http://localhost:3004/api/tasks
```

Expected:

- bootstrap returns `200`
- unauthenticated session returns `401`
- protected management resources return `401` when unauthenticated, not `404`
- no endpoint requires `/api/api/...`

Run browser smoke checks:

```bash
"$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" open http://localhost:3004/login --headed
"$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" snapshot
```

Then verify manually:

- login page no longer shows `Not Found` from bootstrap/session preflight
- valid login redirects to `/tokens`
- `/identities` and `/spaces` load their authenticated placeholders instead of bouncing due to broken API paths
- `/logout` signs out and returns to `/login`
- create-menu and user-menu actions no longer hit `404`

## Non-Goals For This Batch

- Do not redesign `/identities` or `/spaces`
- Do not introduce new visual states
- Do not convert demo pages into real backend implementations
- Do not change the shell layout or component styling

## Risks To Watch

- Do not “fix” the proxy by prepending `/api` inside every domain client; the normalization must happen once at the boundary.
- Do not keep two competing entry/session vocabularies after Task 2.
- Do not let management routes read seeded runtime identities after Task 4.
- Do not leave stale docs claiming API alignment is complete until the new smoke checks pass.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-31-control-plane-functional-stabilization-implementation.md`.

Two execution options:

**1. Subagent-Driven (this session)** - implement task-by-task here, reviewing after each task.

**2. Parallel Session (separate)** - open a dedicated execution session and follow this plan with `executing-plans`.

If we execute in this session, create a dedicated worktree first and keep the batch strictly non-UI.
