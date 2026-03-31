# Shell Follow-Ups Functional Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the remaining shell-level functional incoherence in `apps/control-plane-v3` without changing UI design, focusing on notifications, navigation targets, and truthful placeholder states.

**Architecture:** Keep the current authenticated shell structure, but replace silent or noisy fallback behavior with explicit frontend contracts. First, stop the shell from issuing known-missing notification requests. Next, centralize tablet/mobile navigation onto the same real route set as the desktop shell. Finally, make `/identities` and `/spaces` honest authenticated placeholders that no longer describe local runtime truth as if it were production-backed.

**Tech Stack:** Next.js App Router, React 19, SWR, Vitest, jsdom, Playwright CLI.

---

## Task 1: Make Notifications Explicitly Unavailable Instead Of Noisy

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/hooks/use-notifications.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/hooks/use-notifications.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/components/notifications.tsx`

**Step 1: Write the failing test**

Add tests that prove:

- the frontend can expose notifications as `unavailable` without calling `fetch`
- mark-read mutations no-op cleanly when notifications are unavailable

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts
```

Expected: FAIL because the hook currently always attempts `/api/notifications`.

**Step 3: Write minimal implementation**

- Introduce a small explicit notifications source contract in the hook
- Return `{ availability: 'unavailable' }` without making backend requests
- Keep returned notifications empty and mark-read operations harmless
- Update the notifications dropdown copy to reflect explicit unavailability rather than generic fetch failure

**Step 4: Run tests again**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts
```

Expected: PASS

## Task 2: Unify Shell Navigation Targets Across Devices

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/components/shell-navigation.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/components/tablet-sidebar.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/components/mobile-nav.tsx`

**Step 1: Write the failing test**

Add tests that prove tablet/mobile navigation only points to routes that currently exist:

- no `/docs`
- no `/teams`
- no `/notifications`
- same route family as the desktop shell

**Step 2: Run test to verify it fails**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/components/shell-navigation.test.ts
```

Expected: FAIL because tablet navigation still points at missing routes.

**Step 3: Write minimal implementation**

- Export canonical nav items for tablet/mobile
- Retarget tablet links to existing functional pages only
- Keep current visual structure intact

**Step 4: Run tests again**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/components/shell-navigation.test.ts
```

Expected: PASS

## Task 3: Make Identities And Spaces Truthful Authenticated Placeholders

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/app/management-placeholders.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/app/identities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3/src/app/spaces/page.tsx`

**Step 1: Write the failing test**

Add tests that prove these authenticated placeholder pages:

- do not claim runtime/local state is the current source of truth
- explicitly describe the feature as unavailable or pending backend support
- may still link to the demo route as an explicit demo path

**Step 2: Run test to verify it fails**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/app/management-placeholders.test.ts
```

Expected: FAIL because the current copy still describes runtime/demo truth for management surfaces.

**Step 3: Write minimal implementation**

- Update placeholder copy only as needed for functional truthfulness
- Preserve layout and UI structure
- Keep authenticated route guards intact

**Step 4: Run tests again**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/app/management-placeholders.test.ts
```

Expected: PASS

## Phase Verification

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/control-plane-functional-stabilization/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts src/components/shell-navigation.test.ts src/app/management-placeholders.test.ts src/app/shell-route-integrity.test.ts src/app/control-plane-pages.test.ts
npm run build
npm run typecheck
```

Then smoke-check:

- authenticated shell no longer emits `/api/notifications` 404s
- tablet/mobile navigation no longer points to missing routes
- `/identities` and `/spaces` remain authenticated but are functionally honest placeholders
