# Alignment Gap Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the remaining high-priority frontend/backend alignment gaps without changing the existing UI style, then re-audit the result.

**Architecture:** Keep the current page structure and visual language, but tighten route roles, gate data fetching by role where needed, surface explicit unauthorized/forbidden states, and replace placeholder tests with real smoke coverage. Favor small behavioral changes over page redesigns.

**Tech Stack:** Next.js App Router, React, SWR, Vitest, Testing Library

---

### Task 1: Lock down route-role regressions with tests

**Files:**
- Create: `apps/control-plane-v3/src/lib/role-system.test.ts`
- Modify: `apps/control-plane-v3/src/lib/role-system.ts`
- Modify: `apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx`

**Step 1: Write the failing test**

- Assert `/tasks` requires `admin`
- Assert `/spaces` requires `viewer`

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/lib/role-system.test.ts`

**Step 3: Write minimal implementation**

- Update route role mapping
- Update sidebar visibility requirements to match

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/lib/role-system.test.ts`

### Task 2: Make `/spaces` readable for viewer/operator and degrade admin-only panels

**Files:**
- Modify: `apps/control-plane-v3/src/app/spaces/page.tsx`
- Modify: `apps/control-plane-v3/src/app/spaces/spaces-list.tsx`
- Modify: `apps/control-plane-v3/src/domains/space/components/member-manager.tsx`
- Modify: `apps/control-plane-v3/src/domains/event/hooks.ts`
- Modify: `apps/control-plane-v3/src/domains/review/hooks.ts`
- Modify: `apps/control-plane-v3/src/domains/governance/hooks.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/hooks.ts`
- Modify: `apps/control-plane-v3/src/app/spaces/page.test.tsx`

**Step 1: Write the failing tests**

- Viewer can render the base spaces list without admin-only panels
- Viewer cannot see create/add-member controls
- Filtered spaces list refreshes after add-member

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/app/spaces/page.test.tsx`

**Step 3: Write minimal implementation**

- Add role-aware fetch gating for admin-only queries
- Render base spaces content for any management session
- Hide create/add-member UI for viewer
- Keep existing styling intact
- Refresh both unfiltered and filtered spaces keys after membership changes

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/app/spaces/page.test.tsx`

### Task 3: Surface forbidden state across affected pages

**Files:**
- Modify: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/spaces/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/approvals/page.tsx`
- Modify: `apps/control-plane-v3/src/app/playbooks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/runs/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/spaces/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.test.tsx`

**Step 1: Write the failing tests**

- Query/action `403` displays forbidden-specific UI instead of generic error

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/app/tasks/page.test.tsx src/app/spaces/page.test.tsx src/app/identities/page.test.tsx`

**Step 3: Write minimal implementation**

- Consume `shouldShowForbidden`
- Render `ManagementForbiddenAlert`
- Clear auth-state handling consistently around refresh/actions

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/app/tasks/page.test.tsx src/app/spaces/page.test.tsx src/app/identities/page.test.tsx`

### Task 4: Replace placeholder page tests with real smoke tests

**Files:**
- Modify: `apps/control-plane-v3/src/app/approvals/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/playbooks/page.test.tsx`
- Modify: `apps/control-plane-v3/src/app/runs/page.test.tsx`

**Step 1: Write the failing tests**

- Basic render
- Empty state or loaded state
- Unauthorized/forbidden or refresh behavior

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/app/approvals/page.test.tsx src/app/playbooks/page.test.tsx src/app/runs/page.test.tsx`

**Step 3: Write minimal implementation/mocks**

- Build realistic mocks
- Remove `it.skip`
- Add stable smoke assertions

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/app/approvals/page.test.tsx src/app/playbooks/page.test.tsx src/app/runs/page.test.tsx`

### Task 5: Finish identities management-hub affordances

**Files:**
- Modify: `apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/human-operators-section.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/agent-management-card.tsx`
- Modify: `apps/control-plane-v3/src/app/identities/page.test.tsx`

**Step 1: Write the failing tests**

- Human account details expose a clear path to disable/manage accounts
- Agent details expose a clear path to manage/revoke tokens

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/app/identities/page.test.tsx`

**Step 3: Write minimal implementation**

- Add explicit navigation affordances into existing cards/sections
- Keep copy and styling aligned with current page language

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/app/identities/page.test.tsx`

### Task 6: Final verification and re-audit

**Files:**
- Create: `docs/audits/2026-04-04-frontend-backend-alignment-post-fix-audit.md`

**Step 1: Run full focused verification**

Run:

```bash
npm exec tsc -- --noEmit
npm exec vitest run src/lib/role-system.test.ts src/lib/route-policy.test.ts src/app/shell-route-integrity.test.ts src/app/tasks/page.test.tsx src/app/spaces/page.test.tsx src/app/identities/page.test.tsx src/app/approvals/page.test.tsx src/app/playbooks/page.test.tsx src/app/runs/page.test.tsx
```

**Step 2: Re-audit**

- Document what is closed
- Document any remaining gap or residual risk

